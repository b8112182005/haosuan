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
  | { kind: "upcoming"; label: string; date: LocalDate; daysLeft: number; open: boolean }; // 有明確截止日

/**
 * 依今天算出下一個截止日。
 * - fixed_annual / window：有 end_month/end_day 就算「今年或明年的那一天」；
 *   有 start 的話另外回報現在是否在開放期間內（open）。
 * - budget_until_exhausted：若有 end 日期仍算截止，否則回報額滿即止。
 */
export function resolveDeadline(deadline: SubsidyDeadline, today: LocalDate): DeadlineState {
  if (deadline.type === "ended") return { kind: "ended", label: "已結束" };
  if (deadline.type === "rolling") return { kind: "none", label: "隨到隨辦" };
  if (deadline.type === "event_based") return { kind: "none", label: "依事件計算期限" };
  if (deadline.type === "unknown" && !deadline.end_month) return { kind: "none", label: "期限未公告" };

  const em = deadline.end_month;
  const ed = deadline.end_day ?? 31;
  if (!em) {
    if (deadline.type === "budget_until_exhausted") return { kind: "budget", label: "額滿即止" };
    return { kind: "none", label: "全年受理" };
  }

  let end = clampDay(today.y, em, ed);
  if (toUtcMs(end) < toUtcMs(today)) end = clampDay(today.y + 1, em, ed);
  const daysLeft = diffDays(today, end);

  let open = true;
  if (deadline.start_month) {
    const sd = deadline.start_day ?? 1;
    // 開放期間若跨年（例如 12/1 ～ 1/31），start 要用截止日那一年或前一年
    let start = clampDay(end.y, deadline.start_month, sd);
    if (toUtcMs(start) > toUtcMs(end)) start = clampDay(end.y - 1, deadline.start_month, sd);
    open = toUtcMs(today) >= toUtcMs(start);
  }

  const label = daysLeft === 0 ? "今天截止" : open ? `剩 ${daysLeft} 天` : `${formatLocalDate(end, false)} 截止，尚未開放`;
  return { kind: "upcoming", label, date: end, daysLeft, open };
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

/** 開放期間的文字，例如「每年 5/1 ～ 5/31」 */
export function describeWindow(deadline: SubsidyDeadline): string {
  const end = deadline.end_month ? `${deadline.end_month}/${deadline.end_day ?? "月底"}` : null;
  const start = deadline.start_month ? `${deadline.start_month}/${deadline.start_day ?? 1}` : null;
  switch (deadline.type) {
    case "fixed_annual":
      return start && end ? `每年 ${start} ～ ${end}` : end ? `每年 ${end} 截止` : "每年固定期間";
    case "window":
      return start && end ? `${start} ～ ${end}` : end ? `${end} 截止` : "限期受理";
    case "budget_until_exhausted":
      return end ? `至 ${end}，額滿即止` : "額滿即止";
    case "rolling":
      return "隨到隨辦";
    case "event_based":
      return "依事件計算";
    case "ended":
      return "已結束";
    default:
      return end ? `${end} 截止` : "期限未公告";
  }
}
