import { EXCEPTION_MARK, type Evaluation } from "./eligibility";
import { resolveSubsidyDeadline, type LocalDate } from "./deadline";
import { showApplyNow } from "./reminderPreset";
import { CATEGORY_ORDER, type SubsidyCategory } from "./types";

/**
 * 試算結果頁怎麼分組。
 *
 * 原本是「條件相符／可能符合／不限身分／不符合」四張清單，每項一張完整卡片：
 * 填完 7 題的人要捲過 60 幾張卡，相符清單的前幾名還會是租約須知這類沒有錢可以領的項目，
 * 而最多人領的租金補貼因為要看全家所得，被排在第二張清單的中間。
 *
 * 現在先用項目的種類（kind）分開：可以領、可以用的（benefit）按生活分類列；
 * 要繳、要辦的期限（obligation）和須知、工具（info）各自一區，不和補助搶位置。
 * 同一個分類裡相符的在前、要再確認的在後，兩種放在一起看，不用在兩張清單之間來回找。
 */

/**
 * - match：填的條件對得上，而且至少對上一條
 * - check：沒有一條確定不符，但有條件沒填，或要用全家所得、財產、報稅級距自己核對
 * - situational：資料裡沒有年齡、縣市、身分這類能比對的門檻，遇到那個情況才用得上（職災給付、長照、買節能家電）。
 *   引擎判成 eligible，但它不是「對上你的條件」，所以不算進相符的數字。
 *   要先買車、買家電才領得到的補助（needs_purchase）也歸這裡：住在新北、滿 18 歲的人對得上電動機車補助的條件，
 *   但不買車就領不到，算成「條件相符」會把相符的數字灌水
 * - unlikely：卡在試算沒有問的身分（原住民、新住民、農民、純電動車車主），
 *   或是你不符合、只有條文的例外才適用。多數人用不到，每個分類收成一行
 * - no：至少一條確定不符
 */
export type RowStatus = "match" | "check" | "situational" | "unlikely" | "no";

export interface ResultRow {
  evaluation: Evaluation;
  status: RowStatus;
  /** 現在在受理期間內而且有截止日：剩幾天。隨到隨辦、還沒開始、已結束都是 null */
  daysLeft: number | null;
  /** 從申請日或文件備齊當月起算，而且現在送得了 */
  applyNow: boolean;
}

/** 一張清單：畫面上直接列出來的，加上收成一行的 */
export interface RowList {
  /** 相符 → 要確認 → 遇到才用得上 */
  rows: ResultRow[];
  /** 限特定身分或例外情形，收成一行 */
  unlikely: ResultRow[];
}

export interface CategoryGroup extends RowList {
  category: SubsidyCategory;
  match: number;
  check: number;
  situational: number;
}

export interface ExcludedGroup {
  category: SubsidyCategory;
  rows: ResultRow[];
}

/**
 * 放進「先處理」的原因：
 * - apply_now：從申請日起算，越晚送領得越少
 * - closing：60 天內截止
 */
export type PickReason = "apply_now" | "closing";

export interface ResultPick {
  row: ResultRow;
  why: PickReason;
}

export interface ResultsView {
  /** 相符或要確認的補助裡，有時間壓力的幾項 */
  picks: ResultPick[];
  /** 可以領、可以用的，依 CATEGORY_ORDER；沒有任何項目的分類不列 */
  benefits: CategoryGroup[];
  /** 要繳、要辦的期限，近的在前 */
  obligations: RowList;
  /** 跟這個人有關的繳費、辦理期限裡，最近的一個還剩幾天；都沒有日期時是 null */
  obligationsNearestDays: number | null;
  /** 須知與工具。整區收合、展開後全部列出，所以不再另外分「少數情形」（unlikely 一律是空的） */
  info: RowList;
  /** 不符合的，三種都算 */
  excluded: ExcludedGroup[];
  /** match、check、situational、unlikely 只算 benefit。畫面上的數字都從這裡拿，標題和清單才會一致 */
  counts: {
    match: number;
    check: number;
    situational: number;
    unlikely: number;
    obligations: number;
    info: number;
    excluded: number;
  };
}

export const PICK_LIMIT = 5;
/** 幾天內截止算有時間壓力。30 天太短：年底截止的項目 11 月初就該開始備文件 */
export const PICK_CLOSING_DAYS = 60;
const PICK_APPLY_NOW_MAX = 3;

const FAR = 100_000;
const days = (row: ResultRow) => row.daysLeft ?? FAR;
const idOf = (row: ResultRow) => row.evaluation.subsidy.id;

export function toRow(evaluation: Evaluation, today: LocalDate): ResultRow {
  const { subsidy, verdict, matched, excepted } = evaluation;
  const state = resolveSubsidyDeadline(subsidy, today);
  const special = Boolean(subsidy.conditions?.special_identity?.trim());
  const status: RowStatus =
    verdict === "not_eligible"
      ? "no"
      : verdict === "eligible"
        ? matched.length > 0 && subsidy.needs_purchase !== true
          ? "match"
          : "situational"
        : special || (excepted > 0 && subsidy.conditions?.show_exceptions !== true)
          ? "unlikely"
          : "check";
  return {
    evaluation,
    status,
    daysLeft: state.kind === "upcoming" && state.open ? state.daysLeft : null,
    applyNow: showApplyNow(subsidy.late_consequence?.apply_now === true, state),
  };
}

const STATUS_RANK: Record<RowStatus, number> = { match: 0, check: 1, situational: 2, unlikely: 3, no: 4 };

/**
 * 同一張清單裡的順序：相符 → 要確認 → 遇到才用得上。
 * 同一種裡面，越晚送領越少的排最前；要確認的再看「還差幾條」，其餘看對上幾條、哪個先截止。
 */
function compareRows(a: ResultRow, b: ResultRow): number {
  const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
  if (byStatus !== 0) return byStatus;
  if (a.applyNow !== b.applyNow) return a.applyNow ? -1 : 1;
  if (a.status === "check") {
    const byUnknown = a.evaluation.unknown.length - b.evaluation.unknown.length;
    if (byUnknown !== 0) return byUnknown;
  }
  const byMatched = b.evaluation.matched.length - a.evaluation.matched.length;
  if (byMatched !== 0) return byMatched;
  return days(a) - days(b);
}

function split(rows: ResultRow[], compare: (a: ResultRow, b: ResultRow) => number): RowList {
  return {
    rows: rows.filter((r) => r.status !== "unlikely").sort(compare),
    unlikely: rows.filter((r) => r.status === "unlikely"),
  };
}

/**
 * 能不能放進「先處理」。這一區放在結果頁最上面，挑錯一項比漏掉一項傷：
 * - 相符的可以；要確認的只收「只差一條」的（租金補貼只差全家所得）。差好幾條的多半是題目沒答完，
 *   只因為對上「18 歲以上」就被排到最前面，等於叫人去趕一個不相干的截止日
 * - 限特定縣市的項目，縣市要對得上（沒填縣市的人不會同時被催台北和高雄的敬老卡）
 * - 要先買東西才領得到的不放（needs_purchase）
 */
function canPick(row: ResultRow): boolean {
  const { subsidy, matched, unknown } = row.evaluation;
  if (subsidy.needs_purchase === true) return false;
  if (matched.length === 0) return false;
  if (row.status !== "match" && !(row.status === "check" && unknown.length === 1)) return false;
  // 引擎對上縣市時寫的是「設籍或居住<縣市>」
  if (subsidy.city && !matched.some((text) => text.includes(subsidy.city as string))) return false;
  return true;
}

function pickRows(candidates: ResultRow[]): ResultPick[] {
  const picks: ResultPick[] = [];
  const taken = new Set<string>();
  const add = (row: ResultRow, why: PickReason) => {
    if (picks.length >= PICK_LIMIT || taken.has(idOf(row))) return;
    taken.add(idOf(row));
    picks.push({ row, why });
  };
  // 越晚送領越少的先講：它的截止日還很遠也不該等。相符的排在要確認的前面
  candidates
    .filter((r) => r.applyNow)
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || days(a) - days(b))
    .slice(0, PICK_APPLY_NOW_MAX)
    .forEach((r) => add(r, "apply_now"));
  candidates
    .filter((r) => r.daysLeft !== null && r.daysLeft <= PICK_CLOSING_DAYS)
    .sort((a, b) => days(a) - days(b) || STATUS_RANK[a.status] - STATUS_RANK[b.status])
    .forEach((r) => add(r, "closing"));
  return picks;
}

export function buildResultsView(evaluations: Evaluation[], today: LocalDate): ResultsView {
  const rows = evaluations.map((e) => toRow(e, today));
  const open = rows.filter((r) => r.status !== "no");
  const ofKind = (kind: string) => open.filter((r) => r.evaluation.subsidy.kind === kind);
  const benefitRows = ofKind("benefit");

  const benefits: CategoryGroup[] = [];
  for (const category of CATEGORY_ORDER) {
    const inCategory = benefitRows.filter((r) => r.evaluation.subsidy.category === category);
    if (inCategory.length === 0) continue;
    const list = split(inCategory, compareRows);
    const count = (status: RowStatus) => list.rows.filter((r) => r.status === status).length;
    benefits.push({ category, ...list, match: count("match"), check: count("check"), situational: count("situational") });
  }

  const excluded: ExcludedGroup[] = [];
  for (const category of CATEGORY_ORDER) {
    const inCategory = rows.filter((r) => r.status === "no" && r.evaluation.subsidy.category === category);
    if (inCategory.length > 0) excluded.push({ category, rows: inCategory });
  }

  // 繳費與辦理期限照「下一個要注意的日子」排。還沒開始的那一期也有日期，排在隨到隨辦的前面
  const nextDate = (r: ResultRow) => {
    const state = resolveSubsidyDeadline(r.evaluation.subsidy, today);
    return state.kind === "upcoming" ? state.daysLeft : FAR;
  };
  const obligations = split(ofKind("obligation"), (a, b) => nextDate(a) - nextDate(b));
  const openDays = obligations.rows.map((r) => r.daysLeft).filter((d): d is number => d !== null);
  const info: RowList = { rows: ofKind("info").sort(compareRows), unlikely: [] };

  const picks = pickRows(benefitRows.filter(canPick));

  const sum = (pick: (g: CategoryGroup) => number) => benefits.reduce((n, g) => n + pick(g), 0);
  return {
    picks,
    benefits,
    obligations,
    obligationsNearestDays: openDays.length > 0 ? Math.min(...openDays) : null,
    info,
    excluded,
    counts: {
      match: sum((g) => g.match),
      check: sum((g) => g.check),
      situational: sum((g) => g.situational),
      unlikely: sum((g) => g.unlikely.length),
      obligations: obligations.rows.length,
      info: info.rows.length,
      excluded: excluded.reduce((n, g) => n + g.rows.length, 0),
    },
  };
}

/**
 * 清單一列只有兩行的空間。所得門檻的原文常是各縣市金額的對照表，截成兩行會停在某個縣市的數字中間，
 * 等於什麼都沒說；清單上只講要確認的是哪一種東西，金額與全文在項目頁。
 */
function shortUnknown(text: string): string {
  if (text.startsWith("所得或財產門檻：")) return "全家所得或財產有沒有超過門檻，金額在項目頁";
  if (text.startsWith("綜所稅稅率門檻：")) return "報稅適用的稅率有沒有超過門檻，規定在項目頁";
  return text;
}

export interface ReasonLine {
  tone: "ok" | "ask" | "no" | "plain";
  text: string;
}

/** 每一列底下那一行：為什麼相符、還要確認什麼、給誰用、哪一條不符。完整的逐條比對在項目頁 */
export function reasonLine(row: ResultRow): ReasonLine {
  const { matched, unknown, failed, subsidy } = row.evaluation;
  if (row.status === "no") return { tone: "no", text: failed[0] ?? "條件不符" };
  if (row.status === "match") return { tone: "ok", text: `相符：${matched.join("、")}` };
  if (row.status === "situational") {
    if (subsidy.needs_purchase === true && matched.length > 0) return { tone: "plain", text: `買了才領得到。你符合：${matched.join("、")}` };
    const who = subsidy.eligibility?.[0]?.trim();
    return { tone: "plain", text: who ? `對象：${who}` : "沒有年齡、縣市、身分門檻" };
  }
  const rest = unknown.length - 1;
  const more = rest > 0 ? `（另有 ${rest} 條）` : "";
  const first = unknown[0] ?? "申請條件";
  const cut = first.indexOf(EXCEPTION_MARK);
  if (cut >= 0) {
    const note = first.slice(cut + EXCEPTION_MARK.length);
    // 例外很常見的項目直接講例外（150cc 以上的機車也要繳牌照稅）。
    // 其餘先講一般不適用：寫成「要確認：限低收入戶，你不是」的話，前後兩句互相打架
    return row.status === "check"
      ? { tone: "ask", text: `要確認：${note}${more}` }
      : { tone: "ask", text: `一般不適用：${first.slice(0, cut)}。例外：${note}${more}` };
  }
  return { tone: "ask", text: `要確認：${shortUnknown(first)}${more}` };
}
