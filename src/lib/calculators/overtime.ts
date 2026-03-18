/**
 * 加班費計算機邏輯
 * 依台灣勞基法第 24 條計算加班費
 * 資料來源：勞動部 https://www.mol.gov.tw
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
  // 時薪 = 月薪 / 240（依勞基法，以月薪 / 30天 / 8小時 計算）
  const dailyWage = monthlySalary / 30;
  const hourlyWage = Math.round((monthlySalary / 240) * 100) / 100;
  const breakdown: OvertimeBreakdown[] = [];
  let totalPay = 0;

  if (overtimeType === "weekday") {
    // 平日加班：第 1、2 小時 × 1/3，第 3 小時以後 × 2/3
    const t1 = Math.min(hours, 2);
    const t2 = Math.max(0, hours - 2);

    if (t1 > 0) {
      const pay = Math.round(hourlyWage * (1 + 1 / 3) * t1 * 100) / 100;
      totalPay += pay;
      breakdown.push({ period: "前 2 小時", hours: t1, rate: 1 + 1 / 3, pay });
    }
    if (t2 > 0) {
      const pay = Math.round(hourlyWage * (1 + 2 / 3) * t2 * 100) / 100;
      totalPay += pay;
      breakdown.push({ period: "第 3 小時以後", hours: t2, rate: 1 + 2 / 3, pay });
    }
  } else if (overtimeType === "rest-day") {
    // 休息日加班：勞基法第 24 條第 2 項
    // 不足 2 小時以 2 小時計
    // 前 2 小時：時薪 × 1.34（另加 1/3）
    // 第 3～8 小時：時薪 × 1.67（另加 2/3）
    // 超過 8 小時：時薪 × 1.67（同上，依勞動部實務）
    // 另：至少給付一日工資（差額獨立列示）
    const billableHours = Math.max(2, hours); // 不足 2 小時以 2 小時計
    const t1 = Math.min(billableHours, 2);
    const t2 = Math.min(Math.max(0, billableHours - 2), 6);
    const t3 = Math.max(0, billableHours - 8);

    if (t1 > 0) {
      const pay = Math.round(hourlyWage * (1 + 1 / 3) * t1 * 100) / 100;
      totalPay += pay;
      breakdown.push({ period: "前 2 小時", hours: t1, rate: 1 + 1 / 3, pay });
    }
    if (t2 > 0) {
      const pay = Math.round(hourlyWage * (1 + 2 / 3) * t2 * 100) / 100;
      totalPay += pay;
      breakdown.push({ period: "第 3～8 小時", hours: t2, rate: 1 + 2 / 3, pay });
    }
    if (t3 > 0) {
      const pay = Math.round(hourlyWage * (1 + 2 / 3) * t3 * 100) / 100;
      totalPay += pay;
      breakdown.push({ period: "超過 8 小時", hours: t3, rate: 1 + 2 / 3, pay });
    }

    // 保證最低一日工資（差額獨立列示，不隱藏）
    if (totalPay < dailyWage) {
      const diff = Math.round((dailyWage - totalPay) * 100) / 100;
      totalPay = Math.round(dailyWage * 100) / 100;
      breakdown.push({ period: "補足一日工資差額", hours: 0, rate: 0, pay: diff });
    }
  } else {
    // 國定假日：每工作時數按時薪加倍發給（勞基法第 39 條）
    const pay = Math.round(hourlyWage * 2 * hours * 100) / 100;
    totalPay = pay;
    breakdown.push({ period: `國定假日`, hours, rate: 2, pay });
  }

  return {
    hourlyWage,
    overtimeType,
    overtimeHours: hours,
    overtimePay: Math.round(totalPay * 100) / 100,
    breakdown,
  };
}

export const overtimeTypeLabels: Record<OvertimeType, string> = {
  weekday: "平日（一～五）",
  "rest-day": "休息日（例假日）",
  holiday: "國定假日",
};
