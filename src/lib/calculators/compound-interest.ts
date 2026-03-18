/**
 * 複利計算機邏輯
 * 計算複利終值、現值，支援定期定額投入
 */

export interface CompoundInterestInput {
  principal: number;          // 本金（元）
  annualRate: number;         // 年利率（%）
  years: number;              // 投資年限
  monthlyContribution: number; // 每月定期投入（元，可為 0）
  compoundFrequency: CompoundFrequency;
}

export type CompoundFrequency = "monthly" | "quarterly" | "annually";

export interface CompoundInterestResult {
  principal: number;
  totalContributions: number;
  totalInterest: number;
  finalAmount: number;
  returnRate: number;        // 總報酬率（%）
  yearlyData: YearlyData[];
}

export interface YearlyData {
  year: number;
  balance: number;
  contributions: number;
  interest: number;
}

/**
 * 計算複利終值
 */
export function calculateCompoundInterest(
  input: CompoundInterestInput
): CompoundInterestResult {
  const {
    principal,
    annualRate,
    years,
    monthlyContribution,
    compoundFrequency,
  } = input;

  const periodsPerYear =
    compoundFrequency === "monthly" ? 12 :
    compoundFrequency === "quarterly" ? 4 : 1;

  const ratePerPeriod = annualRate / 100 / periodsPerYear;
  const totalPeriods = years * periodsPerYear;
  const monthsPerPeriod = 12 / periodsPerYear;

  const yearlyData: YearlyData[] = [];
  let balance = principal;
  let totalContributions = principal;
  let totalInterestAccum = 0;

  for (let period = 1; period <= totalPeriods; period++) {
    // 定期投入（每個計息週期投入）
    const periodicContribution = monthlyContribution * monthsPerPeriod;
    balance += periodicContribution;
    totalContributions += periodicContribution;

    // 計息
    const interest = balance * ratePerPeriod;
    balance += interest;
    totalInterestAccum += interest;

    // 記錄年度數據
    if (period % periodsPerYear === 0) {
      const year = period / periodsPerYear;
      yearlyData.push({
        year,
        balance: Math.round(balance),
        contributions: Math.round(totalContributions),
        interest: Math.round(totalInterestAccum),
      });
    }
  }

  const finalAmount = Math.round(balance);
  const totalContrib = Math.round(totalContributions);
  const totalInterest = Math.round(balance - totalContributions);
  const returnRate =
    totalContrib > 0
      ? Math.round(((finalAmount - totalContrib) / totalContrib) * 10000) / 100
      : 0;

  return {
    principal,
    totalContributions: totalContrib,
    totalInterest,
    finalAmount,
    returnRate,
    yearlyData,
  };
}
