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
    // 例假日（休息日）加班：前 2 小時 × 1/3，3～8 小時 × 2/3，超過 8 小時 × 另計
    // 台灣勞基法：休息日至少給付「一日工資」，工作每小時再加給不足 2 小時以 2 小時計
    // 簡化計算：2 小時以內按 2 小時計，每多 2 小時多算一個工資單位
    const brackets = [
      { max: 2, rate: dailyWage / 8 * (1 + 1/3) },
      { max: 8, rate: dailyWage / 8 * (1 + 2/3) },
      { max: Infinity, rate: dailyWage / 8 * (1 + 2/3) },
    ];

    let remaining = hours;
    let prevMax = 0;
    const labels = ["前 2 小時", "第 3～8 小時", "超過 8 小時"];

    for (let i = 0; i < brackets.length; i++) {
      if (remaining <= 0) break;
      const { max, rate } = brackets[i];
      const h = Math.min(remaining, max - prevMax);
      if (h <= 0) { prevMax = max; continue; }
      const pay = Math.round(rate * h * 100) / 100;
      totalPay += pay;
      breakdown.push({ period: labels[i], hours: h, rate: rate / (dailyWage / 8), pay });
      remaining -= h;
      prevMax = max;
    }

    // 加上「一日工資」差額（至少支付一日工資）
    const minPay = dailyWage;
    if (totalPay < minPay) {
      // 補差額（不另列breakdown，直接補到最低）
      const diff = minPay - totalPay;
      totalPay = minPay;
      if (breakdown.length > 0) {
        breakdown[breakdown.length - 1].pay += Math.round(diff * 100) / 100;
      }
    }
  } else {
    // 國定假日：給付雙薪（加班部分按正常工資加倍）
    const pay = Math.round(dailyWage * 2 * 100) / 100;
    totalPay = pay;
    breakdown.push({ period: `國定假日 ${hours} 小時`, hours, rate: 2, pay });
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
