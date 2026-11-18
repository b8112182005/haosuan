// 抓補助項目的主管機關網頁，和上次的快照比對，列出新增與消失的句子。
//   node scripts/local/watch-official-pages.mjs [--all] [--ids a,b] [--ollama] [--out report.md] [--snapshots <dir>] [--data <path>]
//
// 為什麼放在維護者的電腦跑：政府網站常擋雲端機房的 IP，從家裡的網路抓得到的比較多；
// 判讀也交給本機的 Ollama，不用付雲端模型的錢。
// 這支腳本只產報告：不寫 research/、src/data/，不發任何訊息。
// 快照在報告輸出完成之後才寫：中途中斷（Ctrl+C、Ollama 卡住、報告檔寫不進去）時，下次重跑還會看到同一批變動。
// 報告和本機模型的判讀都只是線索，要改資料一律回到網頁核對原文。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { generate, pickModel, resolveHost } from "./ollama.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const USER_AGENT = "haoye-page-watch/1.0";
export const CONCURRENCY = 4;
export const FETCH_TIMEOUT_MS = 15000;
export const MAX_SENTENCES = 10;
export const FOOTER = "這份報告只是線索。要改資料時，到網頁核對原文，改 research/ 之後跑 npm run data:build。";
export const OLLAMA_QUESTION = "這個變動有沒有影響受理期間、截止日、金額、名額，或經費是否用完？先回答「有」或「沒有」，再用一句話說明。";

// ---- 選項目 ----

/** 預設只看會突然變的項目：經費用完就停、還沒公告、年底有提醒、115／116 年度的方案 */
export function isWatchedByDefault(item) {
  return (
    item.deadline?.budget_limited === true ||
    item.status_2026 === "pending" ||
    Boolean(item.year_end_notice) ||
    /115|116/.test(item.name ?? "")
  );
}

export function selectItems(items, { all = false, ids = null } = {}) {
  if (ids && ids.length > 0) {
    const wanted = new Set(ids);
    return { items: items.filter((i) => wanted.has(i.id)), unknown: ids.filter((id) => !items.some((i) => i.id === id)) };
  }
  return { items: all ? items : items.filter(isWatchedByDefault), unknown: [] };
}

function label(item) {
  return item.city ? `${item.city}・${item.short_name || item.name}` : item.short_name || item.name;
}

// ---- HTML 轉純文字 ----

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ensp: " ", emsp: " ", hellip: "…", middot: "・", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", ndash: "–", mdash: "—" };

export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/**
 * 拿掉 script、style、註解與標籤，區塊標籤換成換行（之後才能依換行切句），
 * 實體轉回字元，每行的連續空白收成一個。
 */
export function htmlToText(html) {
  const text = String(html)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<\/?(?:br|p|div|li|ul|ol|tr|td|th|table|section|article|header|footer|nav|h[1-6]|dt|dd|blockquote|pre|form|option)\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " ");
  return decodeEntities(text)
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t\f\v 　]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

// ---- 句子比對 ----

/** 依句號（。）與換行切句，空的丟掉 */
export function splitSentences(text) {
  return String(text)
    .split(/[\n。]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const DATE_PATTERNS = [
  /\d{2,3}\s*\/\s*\d{1,2}\s*\/\s*\d{1,2}/, // 116/01/10
  /\d{1,2}\s*月\s*\d{1,2}\s*日/, // 1 月 10 日
  /\d{4}\s*-\s*\d{1,2}\s*-\s*\d{1,2}/, // 2027-01-10
  /\d{4}\s*\/\s*\d{1,2}\s*\/\s*\d{1,2}/, // 2027/01/10
  /\d{2,3}\s*年\s*\d{1,2}\s*月/, // 116 年 1 月
];
const AMOUNT_PATTERN = /(?:NT\$|\$)\s*\d|\d[\d,.]*\s*(?:元|萬|億)/;
const KEYWORDS = ["額滿", "用罄", "截止", "延長", "停止受理"];

/** 含日期、金額或關鍵字的句子：這類變動最可能影響使用者該不該申請 */
export function isImportant(sentence) {
  return DATE_PATTERNS.some((re) => re.test(sentence)) || AMOUNT_PATTERN.test(sentence) || KEYWORDS.some((k) => sentence.includes(k));
}

/** 重要的排前面；同組維持網頁上的順序 */
export function sortImportantFirst(sentences) {
  const important = sentences.filter(isImportant);
  const rest = sentences.filter((s) => !isImportant(s));
  return [...important, ...rest];
}

/** 比對兩份文字的句子集合，回傳新增與消失的句子（已把重要的排前面，不限數量） */
export function diffSentences(oldText, newText) {
  const before = splitSentences(oldText);
  const after = splitSentences(newText);
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const dedupe = (list) => [...new Set(list)];
  return {
    added: sortImportantFirst(dedupe(after.filter((s) => !beforeSet.has(s)))),
    removed: sortImportantFirst(dedupe(before.filter((s) => !afterSet.has(s)))),
  };
}

// ---- 抓網頁 ----

/** 依 Content-Type 的 charset 或 <meta charset> 解碼；政府網站還有 big5 的 */
export function decodeBody(buffer, contentType = "") {
  let charset = /charset=["']?([\w-]+)/i.exec(contentType)?.[1];
  if (!charset) {
    const head = Buffer.from(buffer.subarray(0, 2048)).toString("latin1");
    charset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1];
  }
  try {
    return new TextDecoder(charset || "utf-8").decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

const CERT_ERROR = /UNABLE_TO_VERIFY|CERT_|SELF_SIGNED/;
export const CERT_HINT = "Node 的憑證庫比瀏覽器少，先在瀏覽器確認網頁正常";

/**
 * 連線失敗的原因文字。憑證錯誤另外加一句：不少 .gov.tw 的憑證鏈缺中繼憑證，瀏覽器會自己補，
 * Node 不會，所以「憑證錯誤」不代表網頁壞了。
 */
export function connectionFailureReason(err) {
  const detail = err?.cause?.code || err?.cause?.message || err?.message || String(err);
  const codes = [err?.code, err?.cause?.code, err?.cause?.message, err?.message].filter((v) => typeof v === "string").join(" ");
  const base = `連線失敗：${detail}`;
  return CERT_ERROR.test(codes) ? `${base}（${CERT_HINT}）` : base;
}

/** 抓一個網址。回傳 {ok:true, text} 或 {ok:false, reason}，不丟例外 */
export async function fetchPageText(url, { timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  let res;
  try {
    res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") return { ok: false, reason: `逾時（${Math.round(timeoutMs / 1000)} 秒沒回應）` };
    return { ok: false, reason: connectionFailureReason(err) };
  }
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
  const type = res.headers.get("content-type") || "";
  if (type && !/html|xml|text\/plain/i.test(type)) return { ok: false, reason: `不是網頁（${type.split(";")[0]}），要自己打開看` };
  let text;
  try {
    text = htmlToText(decodeBody(new Uint8Array(await res.arrayBuffer()), type));
  } catch (err) {
    return { ok: false, reason: `讀取內容失敗：${err?.message || err}` };
  }
  // 沒有文字多半是頁面靠 JavaScript 才顯示；拿空內容覆蓋快照，下次會把整頁都當成新增
  if (text.length < 20) return { ok: false, reason: "頁面幾乎沒有文字（可能要執行 JavaScript 才會顯示內容）" };
  return { ok: true, text };
}

/** 同時最多 limit 個，結果維持原順序 */
export async function mapLimit(list, limit, fn) {
  const results = new Array(list.length);
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const i = next++;
      results[i] = await fn(list[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker));
  return results;
}

// ---- 快照 ----

function snapshotPath(dir, id) {
  // id 理論上只有英數與連字號；仍然過濾，避免 ../ 把檔案寫到快照目錄外面
  return join(dir, `${String(id).replace(/[^A-Za-z0-9._-]/g, "_")}.txt`);
}

/** 快照存「切好句、一句一行」的文字，下次比對不受 HTML 排版變動影響 */
function normalize(text) {
  return splitSentences(text).join("\n") + "\n";
}

export const SHRINK_RATIO = 0.3;
export const GONE_RATIO = 0.9;
export const SHRINK_REASON = "內容大幅縮水，可能是擋頁或維護中";

/**
 * 新抓到的內容是不是「整頁換了」：擋頁、維護中、改版出錯的頁面，句子數會掉到舊的三成以下，
 * 或舊的句子幾乎全不見。拿這種內容覆蓋快照，下次頁面恢復時會把整頁都當成新增。
 */
export function looksBlocked(previousText, newText) {
  const before = new Set(splitSentences(previousText));
  const after = new Set(splitSentences(newText));
  if (before.size === 0) return false;
  const gone = [...before].filter((s) => !after.has(s)).length;
  return after.size < before.size * SHRINK_RATIO || gone >= before.size * GONE_RATIO;
}

/**
 * 看每個項目的網頁。回傳每項的結果：
 * { item, status: "changed" | "unchanged" | "new" | "failed", reason?, added?, removed?, snapshot? }
 * 這裡不寫快照：new 與 changed 的結果帶著 snapshot: { file, text }，
 * 報告輸出完成後呼叫 commitSnapshots 才寫。
 */
export async function watchItems(items, { snapshotsDir, fetchFn = fetchPageText, concurrency = CONCURRENCY } = {}) {
  // 不同項目可能指向同一個網址（同一個主管機關頁面），一次執行只抓一次
  const pageCache = new Map();
  const getPage = (url) => {
    if (!pageCache.has(url)) pageCache.set(url, fetchFn(url));
    return pageCache.get(url);
  };
  return mapLimit(items, concurrency, async (item) => {
    if (!item.official_url) return { item, status: "failed", reason: "資料裡沒有 official_url" };
    const page = await getPage(item.official_url);
    if (!page.ok) return { item, status: "failed", reason: page.reason };
    const text = normalize(page.text);
    const file = snapshotPath(snapshotsDir, item.id);
    if (!existsSync(file)) return { item, status: "new", snapshot: { file, text } };
    const previous = readFileSync(file, "utf8");
    if (normalize(previous) === text) return { item, status: "unchanged" };
    if (looksBlocked(previous, text)) return { item, status: "failed", reason: SHRINK_REASON };
    const { added, removed } = diffSentences(previous, text);
    return { item, status: "changed", added, removed, snapshot: { file, text } };
  });
}

/** 把 watchItems 結果裡的新快照寫進磁碟。要在報告輸出完成之後呼叫 */
export function commitSnapshots(results) {
  let written = 0;
  for (const r of results) {
    if (!r.snapshot) continue;
    mkdirSync(dirname(r.snapshot.file), { recursive: true });
    writeFileSync(r.snapshot.file, r.snapshot.text);
    written++;
  }
  return written;
}

// ---- 本機模型判讀 ----

export function buildInterpretPrompt(result) {
  const list = (title, sentences) =>
    [`${title}：`, ...(sentences.length ? sentences.slice(0, MAX_SENTENCES).map((s) => `- ${s}`) : ["（無）"])].join("\n");
  return [
    `下面是政府網頁「${result.item.name}」這次和上次相比的變動。`,
    "",
    list("新增的句子", result.added),
    "",
    list("消失的句子", result.removed),
    "",
    OLLAMA_QUESTION,
  ].join("\n");
}

/** 對有變動的項目問本機模型。連不上就警告一次、其餘照常；回傳 Map(item.id → 文字) */
export async function interpretChanges(results, { host, model, generateFn = generate, warn = (m) => console.error(m) } = {}) {
  const notes = new Map();
  const changed = results.filter((r) => r.status === "changed");
  if (changed.length === 0) return notes;
  let chosen = model;
  try {
    chosen = await pickModel({ host, model });
    for (const r of changed) {
      notes.set(r.item.id, (await generateFn({ host, model: chosen, prompt: buildInterpretPrompt(r) })).trim());
    }
  } catch (err) {
    warn(`警告：本機模型判讀失敗，報告照常輸出但沒有判讀。${err.message}`);
  }
  return notes;
}

// ---- 報告 ----

export function taipeiNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function sentenceList(title, sentences) {
  if (sentences.length === 0) return [`${title}：無`];
  const lines = [`${title}：`];
  sentences.slice(0, MAX_SENTENCES).forEach((s) => lines.push(`- ${s}`));
  if (sentences.length > MAX_SENTENCES) lines.push(`- （另有 ${sentences.length - MAX_SENTENCES} 句沒列出，到網頁看）`);
  return lines;
}

export function renderReport(results, { now = new Date(), notes = new Map() } = {}) {
  const by = (status) => results.filter((r) => r.status === status);
  const changed = by("changed");
  const failed = by("failed");
  const added = by("new");
  const unchanged = by("unchanged");
  const out = [
    "# 官方網頁變動檢查",
    "",
    `檢查時間：${taipeiNow(now)}（台灣時間）`,
    `共 ${results.length} 項：有變動 ${changed.length}、抓不到 ${failed.length}、新增快照 ${added.length}、沒變 ${unchanged.length}`,
    "",
    `## 有變動（${changed.length}）`,
    "",
  ];
  if (changed.length === 0) out.push("無", "");
  for (const r of changed) {
    out.push(`### ${label(r.item)}（${r.item.id}）`, "", r.item.official_url, "");
    out.push(...sentenceList("新增的句子", r.added), "");
    out.push(...sentenceList("消失的句子", r.removed), "");
    if (notes.has(r.item.id)) out.push("#### 本機模型的初步判讀（要對照網頁確認）", "", notes.get(r.item.id), "");
  }
  out.push(`## 抓不到（${failed.length}）`, "");
  if (failed.length === 0) out.push("無", "");
  else {
    failed.forEach((r) => out.push(`- ${label(r.item)}（${r.item.id}）：${r.reason}　${r.item.official_url ?? ""}`.trimEnd()));
    out.push("");
  }
  out.push(`## 新增快照（${added.length}）`, "");
  if (added.length === 0) out.push("無", "");
  else {
    out.push("第一次看到，下次執行才會比對。", "");
    added.forEach((r) => out.push(`- ${label(r.item)}（${r.item.id}）`));
    out.push("");
  }
  out.push(`## 沒變：${unchanged.length} 項`, "", "---", FOOTER);
  return out.join("\n");
}

// ---- 命令列 ----

export function parseArgs(argv) {
  const opts = { all: false, ids: null, ollama: false, out: null, snapshots: null, data: null };
  const value = (i, name) => {
    if (i + 1 >= argv.length) throw new Error(`${name} 後面要接值`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all") opts.all = true;
    else if (a === "--ollama") opts.ollama = true;
    else if (a === "--ids") opts.ids = value(i++, a).split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--out") opts.out = value(i++, a);
    else if (a === "--snapshots") opts.snapshots = value(i++, a);
    else if (a === "--data") opts.data = value(i++, a);
    else throw new Error(`不認得的參數：${a}`);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const dataPath = resolve(opts.data ?? join(ROOT, "src", "data", "subsidies.json"));
  const snapshotsDir = resolve(opts.snapshots ?? join(ROOT, ".local", "snapshots"));
  const data = JSON.parse(readFileSync(dataPath, "utf8"));
  const { items, unknown } = selectItems(data.items, opts);
  if (unknown.length > 0) console.error(`警告：資料裡沒有這些 id：${unknown.join("、")}`);
  console.error(`檢查 ${items.length} 項（同時最多 ${CONCURRENCY} 個）…`);

  const results = await watchItems(items, { snapshotsDir });
  const notes = opts.ollama ? await interpretChanges(results, { host: resolveHost() }) : new Map();
  const report = renderReport(results, { notes });

  if (opts.out) {
    const outPath = resolve(opts.out);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, report + "\n");
    const count = (s) => results.filter((r) => r.status === s).length;
    console.log(`報告寫到 ${outPath}（有變動 ${count("changed")}、抓不到 ${count("failed")}、新增快照 ${count("new")}）`);
  } else {
    // 等 stdout 寫完再存快照：管線被關掉時寫入會失敗，那時不能先把快照蓋掉
    await new Promise((done, fail) => process.stdout.write(report + "\n", (err) => (err ? fail(err) : done())));
  }
  // 報告已經在使用者手上，這時才把新內容記成「上次看到的」
  commitSnapshots(results);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
