/**
 * 日期天數計算機邏輯
 * 計算兩個日期之間的差距
 */

export interface DateDiffResult {
  totalDays: number;
  years: number;
  months: number;
  days: number;
  weeks: number;
  remainingDays: number;
  workdays: number;
}

/**
 * 計算兩個日期的差距
 * @param startDate 開始日期
 * @param endDate 結束日期
 */
export function calculateDateDiff(
  startDate: Date,
  endDate: Date
): DateDiffResult {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // 確保 start <= end
  const [d1, d2] = start <= end ? [start, end] : [end, start];

  const totalDays = Math.round(
    (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)
  );

  const weeks = Math.floor(totalDays / 7);
  const remainingDays = totalDays % 7;

  // 年月日分解
  let years = d2.getFullYear() - d1.getFullYear();
  let months = d2.getMonth() - d1.getMonth();
  let days = d2.getDate() - d1.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(d2.getFullYear(), d2.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // 工作天數（排除週六、週日）
  let workdays = 0;
  const cursor = new Date(d1);
  while (cursor < d2) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) workdays++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return { totalDays, years, months, days, weeks, remainingDays, workdays };
}
