import type { Subsidy, SubsidyDeadline } from "./types";

/**
 * 截止日計算。全部用「本地日期」的年月日整數運算，不碰時分秒與時區：
 * 使用者在台灣，手機時區就是台灣；靜態輸出時 server 沒有「今天」，
 * 所以所有需要「今天」的計算都要在 client 端呼叫（傳入 today）。
 */

export interface LocalDate {
  y: number;
  m: number; // 1-12
  d: number; // 1-31
}

export function todayLocal(now: Date = new Date()): LocalDate {
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

export function toDateString(date: LocalDate): string {
  return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
}

export function formatLocalDate(date: LocalDate, withYear = true): string {
  const md = `${date.m}/${date.d}`;
  return withYear ? `${date.y}/${md}` : md;
}

function toUtcMs(date: LocalDate): number {
  return Date.UTC(date.y, date.m - 1, date.d);
}

/** 兩個日期相差天數（b - a），今天到今天 = 0 */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / 86_400_000);
}

/** 月底自動修正：2/30 → 2/28（或閏年 2/29） */
function clampDay(y: number, m: number, d: number): LocalDate {
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { y, m, d: Math.min(d, last) };
}

export type DeadlineState =
  | { kind: "none"; label: string }                       // 隨到隨辦／依事件／未知
  | { kind: "ended"; label: string }                      // 方案已結束
  | { kind: "budget"; label: string }                     // 額滿即止，沒有日期
  // 有明確截止日。start 是這一期的開始日（沒有就是 null），用來判斷這一期是不是照往年日期推算出來的
  | { kind: "upcoming"; label: string; date: LocalDate; daysLeft: number; open: boolean; start: LocalDate | null };

/** 超過這個天數就不顯示「剩 N 天」，改顯示日期：「剩 1,507 天」沒有人看得懂 */
export const FAR_DAYS = 365;

/**
 * 依今天算出下一個截止日。
 * - fixed_annual / window：有 end_month/end_day 就算「今年或明年的那一天」；
 *   有 start 的話另外回報現在是否在開放期間內（open）。
 * - 有 end_year：只辦一次的期間，用指定的年份算；過了就是結束，不滾到下一年。
 * - budget_until_exhausted：若有 end 日期仍算截止，否則回報額滿即止。
 * - varies：各地或每年日期不同，不給日期。
 */
export function resolveDeadline(deadline: SubsidyDeadline, today: LocalDate): DeadlineState {
  if (deadline.type === "ended") return { kind: "ended", label: "已結束" };
  if (deadline.type === "rolling") return { kind: "none", label: "隨到隨辦" };
  if (deadline.type === "event_based") return { kind: "none", label: "依事件計算期限" };
  if (deadline.type === "varies") return { kind: "none", label: "依公告為準" };
  if (deadline.type === "unknown" && !deadline.end_month) return { kind: "none", label: "期限未公告" };

  const em = deadline.end_month;
  const ed = deadline.end_day ?? 31;
  if (!em) {
    if (deadline.type === "budget_until_exhausted") return { kind: "budget", label: "額滿即止" };
    return { kind: "none", label: "全年受理" };
  }

  // 沒有年份的期間：算「今年或明年的那一段」
  const yearless = (sm: number | null, sd: number | null, endMonth: number, endDay: number) => {
    let e = clampDay(today.y, endMonth, endDay);
    if (toUtcMs(e) < toUtcMs(today)) e = clampDay(today.y + 1, endMonth, endDay);
    let st: LocalDate | null = null;
    if (sm) {
      // 開放期間若跨年（例如 12/1 ～ 1/31），start 要用截止日那一年或前一年
      st = clampDay(e.y, sm, sd ?? 1);
      if (toUtcMs(st) > toUtcMs(e)) st = clampDay(e.y - 1, sm, sd ?? 1);
    }
    return { start: st, end: e };
  };

  let end: LocalDate;
  let start: LocalDate | null = null;
  if (deadline.end_year) {
    end = clampDay(deadline.end_year, em, ed);
    if (toUtcMs(end) < toUtcMs(today)) return { kind: "ended", label: `${formatLocalDate(end)} 已截止` };
    // 多年期的期間只有在明寫開始年份時才判斷「還沒開始」；沒寫就當作已經在期間內
    if (deadline.start_month && deadline.start_year) {
      start = clampDay(deadline.start_year, deadline.start_month, deadline.start_day ?? 1);
    }
  } else {
    // 一年有好幾段期間時：開放中的優先（取最快截止的那一段）；都沒開放就取最快開始的那一段
    const windows = [
      yearless(deadline.start_month, deadline.start_day, em, ed),
      ...(deadline.extra_windows ?? []).map((w) => yearless(w.start_month, w.start_day, w.end_month, w.end_day)),
    ];
    const rank = (w: { start: LocalDate | null; end: LocalDate }) => {
      const isOpen = w.start ? toUtcMs(today) >= toUtcMs(w.start) : true;
      return isOpen ? diffDays(today, w.end) : 100_000 + diffDays(today, w.start as LocalDate);
    };
    const best = windows.reduce((a, w) => (rank(w) < rank(a) ? w : a));
    end = best.end;
    start = best.start;
  }

  const daysLeft = diffDays(today, end);
  const open = start ? toUtcMs(today) >= toUtcMs(start) : true;

  let label: string;
  if (daysLeft === 0) label = "今天截止";
  else if (!open && start) {
    // 還沒開始的期間，使用者要知道的是哪一天開始；每年固定的項目加「每年」提醒這是照往年的日期
    const startText = formatLocalDate(start, start.y !== today.y && start.y !== today.y + 1);
    label = deadline.type === "fixed_annual" ? `每年 ${formatLocalDate(start, false)} 開始` : `${startText} 開始`;
  } else if (daysLeft > FAR_DAYS) label = `${formatLocalDate(end)} 截止`;
  else label = `剩 ${daysLeft} 天`;

  return { kind: "upcoming", label, date: end, daysLeft, open, start };
}

/**
 * 這一期的日期是不是推算出來的：資料整理完之後才開始的期間，日期是照上一期抄的，主管機關還沒公告。
 * 有 end_year 的一次性期間是公告過的確定日期，不算推算。dataDate 傳資料版本的日期。
 */
export function isProjected(deadline: SubsidyDeadline, state: DeadlineState, dataDate: LocalDate): boolean {
  if (state.kind !== "upcoming" || deadline.end_year) return false;
  // 主管機關已經公告到這一天：截止日在它以前的那一期是確定的日期
  const confirmed = deadline.confirmed_through ? parseDateString(deadline.confirmed_through) : null;
  if (confirmed && toUtcMs(state.date) <= toUtcMs(confirmed)) return false;
  if (state.start) return toUtcMs(state.start) > toUtcMs(dataDate);
  return state.date.y > dataDate.y;
}

/** "2026-11-14" → LocalDate；格式不對回 null */
export function parseDateString(value: string): LocalDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null;
}

export function resolveSubsidyDeadline(subsidy: Pick<Subsidy, "deadline">, today: LocalDate): DeadlineState {
  return resolveDeadline(subsidy.deadline, today);
}

/** 緊急程度，給 UI 配色用 */
export function urgency(state: DeadlineState): "urgent" | "soon" | "later" | "none" {
  if (state.kind !== "upcoming") return "none";
  if (state.daysLeft <= 7) return "urgent";
  if (state.daysLeft <= 30) return "soon";
  return "later";
}

/** 開放期間的文字，例如「每年 5/1 ～ 5/31」；有填年份的一次性期間會帶年份 */
export function describeWindow(deadline: SubsidyDeadline): string {
  const endYear = deadline.end_year ? `${deadline.end_year}/` : "";
  const startYear = deadline.start_year ? `${deadline.start_year}/` : "";
  const end = deadline.end_month ? `${endYear}${deadline.end_month}/${deadline.end_day ?? "月底"}` : null;
  const start = deadline.start_month ? `${startYear}${deadline.start_month}/${deadline.start_day ?? 1}` : null;
  switch (deadline.type) {
    case "fixed_annual": {
      const extra = (deadline.extra_windows ?? []).map((w) => `${w.start_month}/${w.start_day} ～ ${w.end_month}/${w.end_day}`);
      if (start && end) return `每年 ${[`${start} ～ ${end}`, ...extra].join("、")}`;
      return end ? `每年 ${end} 截止` : "每年固定期間";
    }
    case "window":
      // 只有結束年份、沒有開始年份的多年期方案（免稅到 2030 年）：開始的月日沒有意義，只講到哪一天
      if (deadline.end_year && !deadline.start_year) return end ? `到 ${end} 為止` : "限期受理";
      return start && end ? `${start} ～ ${end}` : end ? `${end} 截止` : "限期受理";
    case "budget_until_exhausted":
      return end ? `至 ${end}，額滿即止` : "額滿即止";
    case "rolling":
      return "隨到隨辦";
    case "event_based":
      return "依事件計算";
    case "varies":
      return "各地或每年的日期不同，依公告為準";
    case "ended":
      return "已結束";
    default:
      return end ? `${end} 截止` : "期限未公告";
  }
}
