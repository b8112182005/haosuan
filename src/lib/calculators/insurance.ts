/**
 * 勞健保費計算機（台灣 2024 年費率）
 * 勞保：10.5%（員工負擔 20%，即 2.1%）
 * 健保：5.17%（員工負擔 30%，即 1.551%）
 */

export interface InsuranceResult {
  laborInsurance: number;    // 勞保費（員工負擔）
  healthInsurance: number;   // 健保費（員工負擔）
  totalDeduction: number;    // 合計扣除
  netSalary: number;         // 每月實領薪資
  // 僅供參考
  laborInsuranceTotal: number; // 勞保費總額（雇主+員工）
  healthInsuranceTotal: number; // 健保費總額
}

// 勞保投保薪資級距（2024 年）
// 簡化：直接以月薪計算，不做分級（實際應按級距）
const LABOR_RATE = 0.105;       // 勞保費率 10.5%
const LABOR_EMPLOYEE_RATIO = 0.20; // 員工負擔 20%
const HEALTH_RATE = 0.0517;     // 健保費率 5.17%
const HEALTH_EMPLOYEE_RATIO = 0.30; // 員工負擔 30%

/**
 * @param monthlySalary 月薪（元）
 * @param dependents 眷屬人數（0-n，每位眷屬加算健保費）
 */
export function calculateInsurance(
  monthlySalary: number,
  dependents: number = 0
): InsuranceResult {
  if (isNaN(monthlySalary) || monthlySalary <= 0) {
    return {
      laborInsurance: 0,
      healthInsurance: 0,
      totalDeduction: 0,
      netSalary: 0,
      laborInsuranceTotal: 0,
      healthInsuranceTotal: 0,
    };
  }

  const safeMonthly = Math.max(0, monthlySalary);
  const safeDeps = Math.max(0, Math.floor(isNaN(dependents) ? 0 : dependents));

  // 勞保費（員工負擔）= 月薪 × 10.5% × 20%
  const laborInsuranceTotal = safeMonthly * LABOR_RATE;
  const laborInsurance = Math.round(laborInsuranceTotal * LABOR_EMPLOYEE_RATIO);

  // 健保費（員工負擔）= 月薪 × 5.17% × 30% × (1 + 眷屬人數)
  const healthInsuranceTotal = safeMonthly * HEALTH_RATE;
  const healthInsurance = Math.round(
    healthInsuranceTotal * HEALTH_EMPLOYEE_RATIO * (1 + safeDeps)
  );

  const totalDeduction = laborInsurance + healthInsurance;
  const netSalary = Math.round(safeMonthly - totalDeduction);

  return {
    laborInsurance,
    healthInsurance,
    totalDeduction,
    netSalary,
    laborInsuranceTotal: Math.round(laborInsuranceTotal),
    healthInsuranceTotal: Math.round(healthInsuranceTotal),
  };
}
