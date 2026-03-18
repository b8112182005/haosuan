/**
 * 房貸試算機邏輯
 * 支援本息均攤（等額本息）與本金均攤（等額本金）兩種還款方式
 */

export type RepaymentType = "equal-payment" | "equal-principal";

export interface MortgageResult {
  loanAmount: number;
  annualRate: number;
  months: number;
  repaymentType: RepaymentType;
  firstMonthPayment: number;
  lastMonthPayment: number;
  totalPayment: number;
  totalInterest: number;
  schedule: MonthlySchedule[];
}

export interface MonthlySchedule {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

/**
 * 計算房貸
 * @param loanAmount 貸款金額（元）
 * @param annualRatePercent 年利率（%，例如 2.1 表示 2.1%）
 * @param years 貸款年限
 * @param repaymentType 還款方式
 */
export function calculateMortgage(
  loanAmount: number,
  annualRatePercent: number,
  years: number,
  repaymentType: RepaymentType
): MortgageResult {
  const months = years * 12;
  const monthlyRate = annualRatePercent / 100 / 12;
  const schedule: MonthlySchedule[] = [];

  if (repaymentType === "equal-payment") {
    // 等額本息：每月固定還款金額
    const monthlyPayment =
      monthlyRate === 0
        ? loanAmount / months
        : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
          (Math.pow(1 + monthlyRate, months) - 1);

    let balance = loanAmount;
    let totalPayment = 0;

    for (let i = 1; i <= months; i++) {
      const interest = balance * monthlyRate;
      const principal = monthlyPayment - interest;
      balance = Math.max(0, balance - principal);
      const payment = Math.round(monthlyPayment * 100) / 100;
      totalPayment += payment;

      schedule.push({
        month: i,
        payment,
        principal: Math.round(principal * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        balance: Math.round(balance * 100) / 100,
      });
    }

    return {
      loanAmount,
      annualRate: annualRatePercent,
      months,
      repaymentType,
      firstMonthPayment: Math.round(monthlyPayment),
      lastMonthPayment: Math.round(monthlyPayment),
      totalPayment: Math.round(totalPayment),
      totalInterest: Math.round(totalPayment - loanAmount),
      schedule: schedule.slice(0, 360), // 最多 30 年
    };
  } else {
    // 等額本金：每月固定還本金，利息遞減
    const monthlyPrincipal = loanAmount / months;
    let balance = loanAmount;
    let totalPayment = 0;

    for (let i = 1; i <= months; i++) {
      const interest = balance * monthlyRate;
      const payment = monthlyPrincipal + interest;
      balance = Math.max(0, balance - monthlyPrincipal);
      totalPayment += payment;

      schedule.push({
        month: i,
        payment: Math.round(payment),
        principal: Math.round(monthlyPrincipal),
        interest: Math.round(interest * 100) / 100,
        balance: Math.round(balance * 100) / 100,
      });
    }

    return {
      loanAmount,
      annualRate: annualRatePercent,
      months,
      repaymentType,
      firstMonthPayment: Math.round(schedule[0].payment),
      lastMonthPayment: Math.round(schedule[schedule.length - 1].payment),
      totalPayment: Math.round(totalPayment),
      totalInterest: Math.round(totalPayment - loanAmount),
      schedule,
    };
  }
}
