/**
 * 印花稅計算機（台灣）
 * 依契稅類型計算印花稅
 */

export type StampDutyType = "sale" | "gift" | "other";

export const stampDutyLabels: Record<StampDutyType, string> = {
  sale: "買賣契約（0.1%）",
  gift: "贈與契約（0.12%）",
  other: "其他契約（0.12%）",
};

const stampDutyRates: Record<StampDutyType, number> = {
  sale: 0.001,
  gift: 0.0012,
  other: 0.0012,
};

export interface StampDutyResult {
  stampDuty: number;   // 印花稅金額（元）
  rate: number;        // 適用費率（%）
}

/**
 * @param amount 交易金額（元）
 * @param type 交易類型
 */
export function calculateStampDuty(
  amount: number,
  type: StampDutyType
): StampDutyResult {
  if (isNaN(amount) || amount <= 0) {
    return { stampDuty: 0, rate: 0 };
  }

  const rate = stampDutyRates[type];
  const stampDuty = Math.ceil(amount * rate); // 印花稅無條件進位至整數元

  return {
    stampDuty,
    rate: rate * 100,
  };
}
