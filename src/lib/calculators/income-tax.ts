/**
 * 薪資所得稅試算邏輯
 * 依 115 年度（2026 年所得，2027 年 5 月申報）綜合所得稅規定。
 *
 * 來源：財政部「公告 115 年度綜合所得稅及所得基本稅額相關免稅額、扣除額、課稅級距及計算退職所得定額免稅之金額」
 *   https://www.mof.gov.tw/singlehtml/384fb3077bb349ea973e7fc6f13b6974?cntId=34b463dc8f1b49f29d440d92a6fd5139
 * 消費者物價指數較 113 年度上漲 4.13%，達到 3% 的調整門檻，所以免稅額、標準扣除額、薪資所得特別扣除額與課稅級距都調高。
 * 114 年度（2026 年 5 月申報）的金額與 113 年度相同：免稅額 97,000、標準扣除額 131,000、薪資所得特別扣除額 218,000、
 * 級距 59 萬／133 萬／266 萬／498 萬。
 */

/** 畫面與文案共用的年度標示 */
export const TAX_YEAR_LABEL = "115 年度（2026 年所得，2027 年 5 月申報）";

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

/** 115 年度綜合所得稅稅率級距 */
const TAX_BRACKETS = [
  { max: 610000, rate: 0.05 },
  { max: 1380000, rate: 0.12 },
  { max: 2770000, rate: 0.20 },
  { max: 5190000, rate: 0.30 },
  { max: Infinity, rate: 0.40 },
];

/** 115 年度各項金額（元） */
const DEDUCTIONS = {
  salarySpecial: 227000,         // 薪資所得特別扣除額
  personal: 101000,              // 個人免稅額
  personalElderly: 151500,       // 70 歲以上直系尊親屬免稅額（1.5 倍）
  standardSingle: 136000,        // 標準扣除額（單身）
  standardMarried: 272000,       // 標準扣除額（已婚）
};

/**
 * 試算薪資所得稅
 */
export function calculateIncomeTax(input: IncomeTaxInput): IncomeTaxResult {
  const { annualSalary, hasSpouse } = input;
  // 人數不會是負的；輸入框打了負號時當成 0，不要讓免稅額變成負數
  const numDependents = Math.max(0, input.numDependents);
  const numElderlyDependents = Math.max(0, input.numElderlyDependents);

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
