/**
 * 提醒模組的日期工具。
 *
 * 全部用「本地日曆日」字串 YYYY-MM-DD 運算，不經過 new Date('YYYY-MM-DD')：
 * 那個寫法會被當成 UTC 午夜，在台灣（UTC+8）看起來沒事，
 * 但使用者出國或裝置時區設錯時，截止日會差一天。
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1) return false;
  return d <= daysInMonth(y, mo);
}

export function daysInMonth(year: number, month1to12: number): number {
  // 第 0 天 = 上個月最後一天，所以 new Date(y, m, 0) 就是 m 月的天數
  return new Date(year, month1to12, 0).getDate();
}

/** 把 YYYY-MM-DD 拆成數字，不合法回傳 null。 */
export function splitDate(dateStr: string): { y: number; m: number; d: number } | null {
  if (!isDateString(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m, d };
}

/** 本地時區的 Date（指定時分），不合法回傳 null。 */
export function parseLocalDate(dateStr: string, hour = 0, minute = 0): Date | null {
  const p = splitDate(dateStr);
  if (!p) return null;
  return new Date(p.y, p.m - 1, p.d, hour, minute, 0, 0);
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayLocal(now: Date = new Date()): string {
  return toDateString(now);
}

/**
 * 兩個日曆日相差幾天。用 Date.UTC 做差是為了避開日光節約時間：
 * 本地午夜相減在換日光節約的那一天會差 1 小時，除以 86400000 就不是整數。
 */
export function daysBetween(fromDate: string, toDate: string): number {
  const a = splitDate(fromDate);
  const b = splitDate(toDate);
  if (!a || !b) return Number.NaN;
  const ua = Date.UTC(a.y, a.m - 1, a.d);
  const ub = Date.UTC(b.y, b.m - 1, b.d);
  return Math.round((ub - ua) / 86_400_000);
}

/** 距離 targetDate 還有幾天；0 = 今天，負數 = 已過。 */
export function daysUntil(targetDate: string, from: string = todayLocal()): number {
  return daysBetween(from, targetDate);
}

export function addDays(dateStr: string, n: number): string {
  const p = splitDate(dateStr);
  if (!p) return dateStr;
  // Date 建構子會自動處理月底、跨年進位
  return toDateString(new Date(p.y, p.m - 1, p.d + n));
}

/** 加 n 年；2 月 29 日遇到平年會變成 2 月 28 日，而不是溢位到 3 月 1 日。 */
export function addYears(dateStr: string, n: number): string {
  const p = splitDate(dateStr);
  if (!p) return dateStr;
  const y = p.y + n;
  const d = Math.min(p.d, daysInMonth(y, p.m));
  return toDateString(new Date(y, p.m - 1, d));
}

/**
 * 每年重複的期限：已經過了就往後推，直到今天或之後。
 * 用迴圈而不是只加一年，因為 app 可能兩年沒開。
 */
export function nextYearlyOccurrence(dateStr: string, from: string = todayLocal()): string {
  let next = dateStr;
  let guard = 0;
  while (daysUntil(next, from) < 0 && guard < 200) {
    next = addYears(next, 1);
    guard += 1;
  }
  return next;
}

/** YYYY-MM-DD → YYYY/MM/DD，給畫面與通知文字用。 */
export function formatDate(dateStr: string): string {
  const p = splitDate(dateStr);
  if (!p) return dateStr;
  return `${p.y}/${String(p.m).padStart(2, '0')}/${String(p.d).padStart(2, '0')}`;
}

/** YYYY-MM-DD → YYYYMMDD，Google 日曆與 .ics 的全天日期格式。 */
export function toCompactDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}
