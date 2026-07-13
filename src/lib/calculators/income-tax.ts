/**
 * 薪資所得稅試算邏輯
 * 依台灣 114 年度（2025 年所得，2026 年 5 月申報）綜合所得稅規定
 * 財政部公告：114 年度因 CPI 漲幅 2.29% 未達 3% 調整門檻，金額與 113 年度相同
 * 資料來源：財政部賦稅署、財政部稅務入口網
 */

export interface IncomeTaxInput {
  annualSalary: number;          // 年薪（元）
  numDependents: number;          // 受撫養親屬人數（不含本人）
  hasSpouse: boolean;             // 是否已婚（配偶免稅額）
  numElderlyDependents: number;   // 70 歲以上直系尊親屬人數
}

export interface IncomeTaxResult {
  annualSalary: number;
  salaryDeduction: number;       // 薪資所得特別扣除額
  personalExemption: number;     // 個人免稅額
  spouseExemption: number;       // 配偶免稅額
  dependentExemption: number;    // 受撫養親屬免稅額
  standardDeduction: number;     // 標準扣除額
  netIncome: number;             // 綜合所得淨額
  taxableIncome: number;         // 應稅所得額
  taxAmount: number;             // 應納稅額
  taxRate: number;               // 適用稅率（%）
  effectiveRate: number;         // 有效稅率（%）
  monthlyTax: number;            // 月均稅額
  breakdown: TaxBreakdown[];
}

export interface TaxBreakdown {
  bracket: string;
  income: number;
  rate: number;
  tax: number;
}

/** 114 年度綜合所得稅稅率級距 */
const TAX_BRACKETS = [
  { max: 590000, rate: 0.05 },
  { max: 1330000, rate: 0.12 },
  { max: 2660000, rate: 0.20 },
  { max: 4980000, rate: 0.30 },
  { max: Infinity, rate: 0.40 },
];

/** 114 年度各項金額（元） */
const DEDUCTIONS = {
  salarySpecial: 218000,         // 薪資所得特別扣除額
  personal: 97000,               // 個人免稅額
  personalElderly: 145500,       // 70 歲以上直系尊親屬免稅額（1.5 倍）
  standardSingle: 131000,        // 標準扣除額（單身）
  standardMarried: 262000,       // 標準扣除額（已婚）
};

/**
 * 試算薪資所得稅
 */
export function calculateIncomeTax(input: IncomeTaxInput): IncomeTaxResult {
  const {
    annualSalary,
    numDependents,
    hasSpouse,
    numElderlyDependents,
  } = input;

  // 1. 薪資所得特別扣除額（不超過薪資本身）
  const salaryDeduction = Math.min(annualSalary, DEDUCTIONS.salarySpecial);

  // 2. 個人免稅額
  const personalExemption = DEDUCTIONS.personal;

  // 3. 配偶免稅額
  const spouseExemption = hasSpouse ? DEDUCTIONS.personal : 0;

  // 4. 受撫養親屬免稅額（70 歲以上 1.5 倍，其餘 1 倍）
  // 防禦：70歲以上人數不可超過總親屬人數
  const safeElderlyDependents = Math.min(numElderlyDependents, numDependents);
  const regularDependents = Math.max(0, numDependents - safeElderlyDependents);
  const dependentExemption =
    regularDependents * DEDUCTIONS.personal +
    safeElderlyDependents * DEDUCTIONS.personalElderly;

  // 5. 標準扣除額
  const standardDeduction = hasSpouse
    ? DEDUCTIONS.standardMarried
    : DEDUCTIONS.standardSingle;

  // 6. 綜合所得淨額 = 薪資 - 薪資特扣 - 所有免稅扣除
  const totalDeductions =
    salaryDeduction +
    personalExemption +
    spouseExemption +
    dependentExemption +
    standardDeduction;

  const netIncome = Math.max(0, annualSalary - totalDeductions);

  // 7. 計算應納稅額（累進稅率）
  const breakdown: TaxBreakdown[] = [];
  let remaining = netIncome;
  let totalTax = 0;
  let prevMax = 0;
  let applicableRate = 0.05;

  for (const bracket of TAX_BRACKETS) {
    if (remaining <= 0) break;
    const taxableInBracket = Math.min(remaining, bracket.max - prevMax);
    const tax = taxableInBracket * bracket.rate;
    totalTax += tax;
    applicableRate = bracket.rate;

    if (taxableInBracket > 0) {
      breakdown.push({
        bracket: bracket.max === Infinity
          ? `${(prevMax / 10000).toFixed(0)} 萬以上`
          : `${(prevMax / 10000).toFixed(0)}～${(bracket.max / 10000).toFixed(0)} 萬`,
        income: taxableInBracket,
        rate: bracket.rate * 100,
        tax: Math.round(tax),
      });
    }

    remaining -= taxableInBracket;
    prevMax = bracket.max;
  }

  const taxAmount = Math.round(totalTax);
  const effectiveRate =
    annualSalary > 0
      ? Math.round((taxAmount / annualSalary) * 10000) / 100
      : 0;

  return {
    annualSalary,
    salaryDeduction,
    personalExemption,
    spouseExemption,
    dependentExemption,
    standardDeduction,
    netIncome,
    taxableIncome: netIncome,
    taxAmount,
    taxRate: applicableRate * 100,
    effectiveRate,
    monthlyTax: Math.round(taxAmount / 12),
    breakdown,
  };
}
