/**
 * 存款利息計算機
 * 支援單利與複利
 */

export type InterestType = "simple" | "compound";

export interface SavingsInterestResult {
  interest: number;        // 利息金額（元）
  totalAmount: number;     // 到期本利和（元）
  effectiveRate: number;   // 實際年利率（%）
}

/**
 * @param principal 本金（元）
 * @param annualRate 年利率（百分比，如 1.5 表示 1.5%）
 * @param months 存款期間（月）
 * @param type 計息方式（單利/複利）
 */
export function calculateSavingsInterest(
  principal: number,
  annualRate: number,
  months: number,
  type: InterestType
): SavingsInterestResult {
  if (
    isNaN(principal) || principal <= 0 ||
    isNaN(annualRate) || annualRate < 0 ||
    isNaN(months) || months <= 0
  ) {
    return { interest: 0, totalAmount: 0, effectiveRate: 0 };
  }

  const rate = annualRate / 100;
  const years = months / 12;

  let totalAmount: number;
  if (type === "simple") {
    totalAmount = principal * (1 + rate * years);
  } else {
    // 複利按月計算
    const monthlyRate = rate / 12;
    totalAmount = principal * Math.pow(1 + monthlyRate, months);
  }

  const interest = totalAmount - principal;
  const effectiveRate = years > 0 ? (interest / principal / years) * 100 : 0;

  return {
    interest: Math.round(interest * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 1000) / 1000,
  };
}
