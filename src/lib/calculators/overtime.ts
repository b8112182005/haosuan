/**
 * 加班費計算機邏輯
 * 依台灣勞動基準法第 24、39 條計算加班費（月薪制）
 * 資料來源：勞動部 https://www.mol.gov.tw、台北市勞動局加班費 Q&A
 *
 * 計算基準（月薪制，加班費為「另再加給」之金額）：
 * - 時薪 = 月薪 / 240（月薪 / 30 天 / 8 小時）
 * - 日薪 = 月薪 / 30
 *
 * 平日延長工時（勞基法 §24 I）：
 *   前 2 小時 ×4/3，第 3 小時起 ×5/3
 * 休息日出勤（勞基法 §24 II／III，2018-03-01 起核實計算，已無「做1給4」最低保障）：
 *   前 2 小時 ×4/3，第 3～8 小時 ×5/3，超過 8 小時 ×8/3（2又2/3）
 * 國定假日出勤（勞基法 §39）：
 *   8 小時以內「加發一日工資」（不因時數多寡而不同）；
 *   超過 8 小時部分，依平日延長工時加給（前 2 小時 ×4/3，其後 ×5/3）
 */

export type OvertimeType = "weekday" | "rest-day" | "holiday";

export interface OvertimeResult {
  hourlyWage: number;
  overtimeType: OvertimeType;
  overtimeHours: number;
  overtimePay: number;
  breakdown: OvertimeBreakdown[];
}

export interface OvertimeBreakdown {
  period: string;
  hours: number;
  rate: number;
  pay: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * 計算加班費
 * @param monthlySalary 月薪（元）
 * @param overtimeType 加班類型
 * @param hours 加班時數
 */
export function calculateOvertime(
  monthlySalary: number,
  overtimeType: OvertimeType,
  hours: number
): OvertimeResult {
  const dailyWage = monthlySalary / 30;
  const hourlyWage = round2(monthlySalary / 240);
  const breakdown: OvertimeBreakdown[] = [];
  let totalPay = 0;

  if (overtimeType === "weekday") {
    // 平日延長工時：前 2 小時 ×4/3，第 3 小時起 ×5/3
    const t1 = Math.min(hours, 2);
    const t2 = Math.max(0, hours - 2);

    if (t1 > 0) {
      const pay = round2(hourlyWage * (1 + 1 / 3) * t1);
      totalPay += pay;
      breakdown.push({ period: "前 2 小時", hours: t1, rate: 1 + 1 / 3, pay });
    }
    if (t2 > 0) {
      const pay = round2(hourlyWage * (1 + 2 / 3) * t2);
      totalPay += pay;
      breakdown.push({ period: "第 3 小時起", hours: t2, rate: 1 + 2 / 3, pay });
    }
  } else if (overtimeType === "rest-day") {
    // 休息日出勤：核實計算（不足 1 小時以 1 小時計由 UI 控制）
    // 前 2 小時 ×4/3，第 3～8 小時 ×5/3，超過 8 小時 ×8/3
    const t1 = Math.min(hours, 2);
    const t2 = Math.min(Math.max(0, hours - 2), 6);
    const t3 = Math.max(0, hours - 8);

    if (t1 > 0) {
      const pay = round2(hourlyWage * (1 + 1 / 3) * t1);
      totalPay += pay;
      breakdown.push({ period: "前 2 小時", hours: t1, rate: 1 + 1 / 3, pay });
    }
    if (t2 > 0) {
      const pay = round2(hourlyWage * (1 + 2 / 3) * t2);
      totalPay += pay;
      breakdown.push({ period: "第 3～8 小時", hours: t2, rate: 1 + 2 / 3, pay });
    }
    if (t3 > 0) {
      const pay = round2(hourlyWage * (2 + 2 / 3) * t3);
      totalPay += pay;
      breakdown.push({ period: "超過 8 小時", hours: t3, rate: 2 + 2 / 3, pay });
    }
  } else {
    // 國定假日（勞基法 §39）：8 小時內加發一日工資；超過部分依平日延長工時加給
    const dayPay = round2(dailyWage);
    totalPay += dayPay;
    breakdown.push({
      period: "加發一日工資",
      hours: Math.min(hours, 8),
      rate: 1,
      pay: dayPay,
    });

    const extra = Math.max(0, hours - 8);
    if (extra > 0) {
      const e1 = Math.min(extra, 2);
      const e2 = Math.max(0, extra - 2);
      if (e1 > 0) {
        const pay = round2(hourlyWage * (1 + 1 / 3) * e1);
        totalPay += pay;
        breakdown.push({ period: "超過 8 小時 前 2 小時", hours: e1, rate: 1 + 1 / 3, pay });
      }
      if (e2 > 0) {
        const pay = round2(hourlyWage * (1 + 2 / 3) * e2);
        totalPay += pay;
        breakdown.push({ period: "超過 10 小時", hours: e2, rate: 1 + 2 / 3, pay });
      }
    }
  }

  return {
    hourlyWage,
    overtimeType,
    overtimeHours: hours,
    overtimePay: round2(totalPay),
    breakdown,
  };
}

export const overtimeTypeLabels: Record<OvertimeType, string> = {
  weekday: "平日（一～五）",
  "rest-day": "休息日",
  holiday: "國定假日",
};
