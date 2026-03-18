/**
 * 退休金試算
 * 計算退休時總資產與退休後每月可動用金額
 */

export interface RetirementResult {
  totalAsset: number;          // 退休時總資產（元）
  monthlyBudget: number;       // 退休後每月可動用金額（元）
  totalContribution: number;   // 總投入本金（元）
  totalInterest: number;       // 複利增值（元）
}

/**
 * @param currentAge 目前年齡
 * @param retireAge 退休年齡
 * @param currentSavings 目前存款（元）
 * @param monthlySavings 每月儲蓄（元）
 * @param annualReturnRate 預期年化報酬率（百分比，如 5 表示 5%）
 * @param lifeExpectancy 退休後餘命（年，預設 30）
 */
export function calculateRetirement(
  currentAge: number,
  retireAge: number,
  currentSavings: number,
  monthlySavings: number,
  annualReturnRate: number,
  lifeExpectancy: number = 30
): RetirementResult {
  if (
    isNaN(currentAge) || currentAge < 0 || currentAge >= 100 ||
    isNaN(retireAge) || retireAge <= currentAge || retireAge > 100 ||
    isNaN(currentSavings) || currentSavings < 0 ||
    isNaN(monthlySavings) || monthlySavings < 0 ||
    isNaN(annualReturnRate) || annualReturnRate < 0
  ) {
    return { totalAsset: 0, monthlyBudget: 0, totalContribution: 0, totalInterest: 0 };
  }

  const years = retireAge - currentAge;
  const monthlyRate = annualReturnRate / 100 / 12;
  const months = years * 12;

  // 現有存款的複利終值
  const savingsFV = annualReturnRate === 0
    ? currentSavings
    : currentSavings * Math.pow(1 + annualReturnRate / 100, years);

  // 每月定期定額的複利終值
  let monthlyFV: number;
  if (monthlyRate === 0) {
    monthlyFV = monthlySavings * months;
  } else {
    monthlyFV = monthlySavings * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  }

  const totalAsset = savingsFV + monthlyFV;
  const totalContribution = currentSavings + monthlySavings * months;
  const totalInterest = Math.max(0, totalAsset - totalContribution);

  // 退休後每月可動用（簡單除法，不考慮退休後通膨）
  const monthlyBudget = totalAsset / (lifeExpectancy * 12);

  return {
    totalAsset: Math.round(totalAsset),
    monthlyBudget: Math.round(monthlyBudget),
    totalContribution: Math.round(totalContribution),
    totalInterest: Math.round(totalInterest),
  };
}
