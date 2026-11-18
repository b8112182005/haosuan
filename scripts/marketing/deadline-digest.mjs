// 每週補助期限摘要：從 src/data/subsidies.json 挑出快截止、快開始受理的項目，產出貼文草稿（Markdown）。
// .github/workflows/marketing-weekly.yml 每週一跑一次開成 issue；也可以手動跑：
//   node --no-warnings scripts/marketing/deadline-digest.mjs [YYYY-MM-DD]
//
// 為什麼不用 AI 寫：貼文裡的日期和金額要和網站上的資料一字不差，直接從資料產生就不會編出數字。
// 為什麼要排除「照上一期推算」和期限未驗證的項目：貼文會被轉傳，錯的日期收不回來。
// 這些項目另外列在「先查證再貼」，查到公告後可以手動補進貼文。
// 經費用完就提前結束的項目（deadline.budget_limited）在那一行後面註明；
// 其中 last_checked 缺或超過 14 天沒更新的，不進貼文：期限還沒到不代表還領得到，經費可能已經用完。
// 每年固定期間的提醒（year_end_notice）依今天落在哪段日期另列一節，只收可信度不是 low 的項目。
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  resolveSubsidyDeadline,
  isProjected,
  formatLocalDate,
  parseDateString,
  diffDays,
  toDateString,
} from "../../src/lib/subsidy/deadline.ts";
import { amountHeadline } from "../../src/lib/subsidy/format.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_SITE = "https://haosuan.vercel.app";

export const CLOSING_DAYS = 30;
export const URGENT_DAYS = 7;
export const OPENING_DAYS = 14;
// 經費有限的項目，最近一次確認還在受理的日期距離今天超過這個天數就不貼
export const BUDGET_FRESH_DAYS = 14;
export const BUDGET_STALE_NOTE = "（經費可能已用完，先看主管機關網站，確認後更新 last_checked）";

/** 台灣的今天：CI 跑在 UTC，週一 00:00 UTC 是台灣週一早上 8 點，日期要用台灣時區算 */
export function taipeiToday(now = new Date()) {
  const text = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return parseDateString(text);
}

/** 經費有限、而且沒有 last_checked 或 last_checked 距今超過 14 天 */
export function isBudgetStale(item, today) {
  if (item.deadline?.budget_limited !== true) return false;
  const checked = parseDateString(String(item.deadline?.last_checked ?? ""));
  return !checked || diffDays(checked, today) > BUDGET_FRESH_DAYS;
}

function deadlineUnverified(item) {
  return (item.unverified_fields ?? []).some((f) => /^deadline/.test(String(f)));
}

/**
 * 分四組：7 天內截止、8～30 天內截止、14 天內開始受理、先查證再貼。
 * 只收 status_2026 是 active、可信度不是 low 的項目；地方項目標出縣市。
 */
export function buildDigest(items, today, dataVersion) {
  const dataDate = parseDateString(dataVersion) ?? today;
  const urgent = [];
  const closing = [];
  const opening = [];
  const needsCheck = [];
  for (const item of items) {
    if (item.status_2026 !== "active") continue;
    const state = resolveSubsidyDeadline(item, today);
    if (state.kind !== "upcoming") continue;
    const startsIn = state.start && !state.open ? diffDays(today, state.start) : null;
    const isClosing = state.open && state.daysLeft >= 0 && state.daysLeft <= CLOSING_DAYS;
    const isOpening = startsIn != null && startsIn >= 0 && startsIn <= OPENING_DAYS;
    if (!isClosing && !isOpening) continue;
    const row = { item, state, startsIn, budgetStale: isBudgetStale(item, today) };
    if (row.budgetStale || item.confidence === "low" || deadlineUnverified(item) || isProjected(item.deadline, state, dataDate)) {
      needsCheck.push(row);
      continue;
    }
    if (isOpening) opening.push(row);
    else if (state.daysLeft <= URGENT_DAYS) urgent.push(row);
    else closing.push(row);
  }
  const byDays = (a, b) => a.state.daysLeft - b.state.daysLeft;
  urgent.sort(byDays);
  closing.sort(byDays);
  opening.sort((a, b) => a.startsIn - b.startsIn);
  needsCheck.sort(byDays);
  return { today, urgent, closing, opening, needsCheck, yearEnd: buildYearEnd(items, today) };
}

function parseMonthDay(text) {
  const match = /^(\d{2})-(\d{2})$/.exec(String(text ?? ""));
  return match ? Number(match[1]) * 100 + Number(match[2]) : null;
}

/**
 * 今天（含頭尾）落在 year_end_notice 的 from～to 之內，status_2026 是 active、confidence 不是 low 的項目。
 * from、to 是 MM-DD，from 比 to 晚代表跨年（例如 12-01～01-31）。
 * 區間判斷寫在這裡而不 import src 的檔案：這支腳本只 import 既有的兩個 .ts，維持 CI 的 Node 22 能直接跑。
 */
export function buildYearEnd(items, today) {
  const t = today.m * 100 + today.d;
  const rows = [];
  for (const item of items) {
    const notice = item.year_end_notice;
    // 可信度低的項目，年底卡裡的日期與規則沒核對完，貼出去會被轉傳
    if (item.status_2026 !== "active" || item.confidence === "low" || !notice) continue;
    const from = parseMonthDay(notice.from);
    const to = parseMonthDay(notice.to);
    if (from == null || to == null) continue;
    const inRange = from <= to ? t >= from && t <= to : t >= from || t <= to;
    if (inRange) rows.push({ item, notice });
  }
  return rows;
}

function label(item) {
  return item.city ? `${item.city}・${item.short_name || item.name}` : item.short_name || item.name;
}

function link(site, item) {
  return `${site}/subsidy/${item.id}`;
}

/**
 * 只有「民眾領得到的錢」才寫金額：繳稅、繳費期限的 amount 是公式或罰鍰，寫進貼文會被讀成補助金額。
 * 判斷和 src/lib/subsidy/format.ts 的 shortUnit 一致：單位是元或點、括號裡不是罰鍰／自付／門檻。
 */
export function moneyText(item) {
  const { max, unit } = item.amount ?? {};
  if (item.category === "tax" || !(max > 0) || !unit) return null;
  if (!/^[元點]/.test(unit) || /罰|自付|自提|院所|門檻/.test(unit)) return null;
  return amountHeadline(item.amount);
}

function line(site, row) {
  const { item, state, startsIn, budgetStale } = row;
  const when =
    startsIn != null
      ? `${formatLocalDate(state.start, false)} 開始受理，${formatLocalDate(state.date, false)} 截止`
      : state.daysLeft === 0
        ? `今天（${formatLocalDate(state.date, false)}）截止`
        : `${formatLocalDate(state.date, false)} 截止，剩 ${state.daysLeft} 天`;
  const money = moneyText(item);
  // 經費用完就停：只寫截止日會讓人以為到那天前都領得到。
  // 太久沒確認的（先查證再貼那一節）改寫成要去查，不能還說「會提前結束」好像知道還在受理
  const budget = budgetStale ? BUDGET_STALE_NOTE : item.deadline?.budget_limited === true ? "（經費用完會提前結束）" : "";
  return (money ? `${label(item)}：${when}；${money}` : `${label(item)}：${when}`) + budget;
}

/** Threads／Facebook 一則：最多列 6 項，超過的說「還有 N 項」，避免貼文長到沒人看完 */
function socialPost(site, digest) {
  const rows = [...digest.urgent, ...digest.closing].slice(0, 6);
  if (rows.length === 0 && digest.opening.length === 0) return null;
  const md = `${digest.today.m}/${digest.today.d}`;
  const parts = [`30 天內到期的補助申請與繳費期限（${md} 整理）`, ""];
  rows.forEach((row, i) => parts.push(`${i + 1}. ${line(site, row)}`));
  const rest = digest.urgent.length + digest.closing.length - rows.length;
  if (rest > 0) parts.push(`還有 ${rest} 項，完整清單在連結裡。`);
  if (digest.opening.length > 0) {
    parts.push("", "快要開始受理：");
    digest.opening.slice(0, 3).forEach((row) => parts.push(`・${line(site, row)}`));
  }
  parts.push(
    "",
    `資格、要帶的文件、申請網址：${site}/subsidy`,
    "這是我整理的免費工具，不是政府網站；每一項都附主管機關的來源網址，申請前以公告為準。",
  );
  return parts.join("\n");
}

/** LINE 群組一則一項：短，只放一個連結 */
function lineMessages(site, digest) {
  return [...digest.urgent, ...digest.closing.slice(0, 3)].map(
    (row) => `${line(site, row)}\n資格與文件：${link(site, row.item)}`,
  );
}

export function renderDigest(digest, site = DEFAULT_SITE) {
  const out = [];
  out.push(`補助資料版本與網站相同；日期依台灣時間 ${toDateString(digest.today)} 計算。`, "");
  const section = (title, rows) => {
    out.push(`## ${title}（${rows.length}）`, "");
    if (rows.length === 0) out.push("無", "");
    else {
      rows.forEach((row) => out.push(`- ${line(site, row)}　${link(site, row.item)}`));
      out.push("");
    }
  };
  section(`${URGENT_DAYS} 天內截止`, digest.urgent);
  section(`${URGENT_DAYS + 1}～${CLOSING_DAYS} 天內截止`, digest.closing);
  section(`${OPENING_DAYS} 天內開始受理`, digest.opening);

  const yearEnd = digest.yearEnd ?? [];
  out.push(`## 年底提醒（${yearEnd.length}）`, "");
  if (yearEnd.length === 0) out.push("無", "");
  else {
    yearEnd.forEach(({ item, notice }) => {
      const post = [
        notice.title,
        ...(notice.lines ?? []),
        `資格與文件：${link(site, item)}`,
        "這是我整理的免費工具，不是政府網站；申請前以主管機關公告為準。",
      ];
      out.push(`### ${label(item)}`, "", "```text", post.join("\n"), "```", "");
    });
  }

  out.push("## 貼文草稿", "");
  const post = socialPost(site, digest);
  if (post) {
    out.push("### Threads／Facebook（一則）", "", "```text", post, "```", "");
  } else {
    out.push(`這週沒有 ${CLOSING_DAYS} 天內截止或 ${OPENING_DAYS} 天內開始的已查證項目，可以改貼一則計算機或疑難雜症問答。`, "");
  }
  const msgs = lineMessages(site, digest);
  if (msgs.length > 0) {
    out.push("### LINE 群組（一則一項）", "");
    msgs.forEach((m) => out.push("```text", m, "```", ""));
  }

  out.push(`## 先查證再貼（${digest.needsCheck.length}）`, "");
  if (digest.needsCheck.length === 0) out.push("無", "");
  else {
    out.push(
      `這些項目的日期是照上一期推算、期限欄位未驗證、可信度低，或經費有限但 ${BUDGET_FRESH_DAYS} 天內沒確認過還在受理（last_checked）。確認主管機關公告後才放進貼文，並更新 research/ 的資料。`,
      "",
    );
    digest.needsCheck.forEach((row) => out.push(`- ${line(site, row)}　${link(site, row.item)}`));
    out.push("");
  }
  out.push("---", "貼文規則：不寫「官方」「政府推出」這類讓人以為是政府帳號的字；日期與金額照上面複製，不要改寫；每則都附網址。");
  return out.join("\n");
}

function main() {
  const arg = process.argv[2];
  const today = arg ? parseDateString(arg) : taipeiToday();
  if (!today) {
    console.error(`日期格式要是 YYYY-MM-DD：${arg}`);
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(join(ROOT, "src", "data", "subsidies.json"), "utf8"));
  const site = (process.env.SITE_URL || DEFAULT_SITE).replace(/\/$/, "");
  process.stdout.write(renderDigest(buildDigest(data.items, today, data.version), site) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
