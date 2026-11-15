/**
 * 勞健保費計算機：115 年（2026）一般受僱勞工每月的自付額。
 *
 * 勞保＋就業保險
 *   來源：勞保局「勞工保險普通事故保險費及就業保險保險費合計之被保險人與投保單位分擔金額表（自 115 年 1 月 1 日起適用）」
 *   https://www.bli.gov.tw/0011588.html
 *   普通事故保險費率 11.5%、就業保險費率 1%，被保險人負擔 20%。
 *   兩項各自四捨五入後相加：40,100 元那一級是 922 + 80 = 1,002 元，合併後再四捨五入會變成 1,003 元，和官方表差 1 元。
 *   用這個算法逐一對過官方表的全部 28 個等級（全月），金額都相同。
 *
 * 健保
 *   來源：健保署「投保金額分級表（115.01.01 生效）」與「保險費負擔金額表（三）公、民營事業、機構及有一定雇主之受僱者（115.1.1 生效）」
 *   https://www.nhi.gov.tw/ch/cp-19421-f9533-2569-1.html
 *   https://www.nhi.gov.tw/ch/cp-19418-9eefb-2576-1.html
 *   費率 5.17%，被保險人負擔 30%；每人的金額四捨五入後乘以（本人＋眷屬人數），眷屬超過 3 人以 3 人計。
 *   分級表共 58 級。健保署網站擋自動抓取，沒辦法逐級讀原表，核對到的程度如下：
 *   第 1、27～30、33、45、58 級對到健保署頁面的搜尋摘錄；第 2～52 級其餘各級對到三份第三方整理的完整表；
 *   第 53～57 級是照分級表的組距（8,700、10,000 元）推出來的，前後的第 52 級（254,300）與第 58 級（313,000）相符。
 *   第 1 級的本人自付額 458 元與健保署負擔金額表相同。
 */

/** 畫面與文案共用的年度標示 */
export const INSURANCE_YEAR_LABEL = "115 年（2026）";

/** 勞保月投保薪資：部分工時勞工適用的等級（月薪低於基本工資 29,500 元時才用得到） */
const LABOR_PART_TIME_GRADES = [
  11100, 12540, 13500, 15840, 16500, 17280, 17880, 19047, 20008, 21009, 22000, 23100, 24000, 25250, 26400, 27600, 28590,
];
/** 勞保月投保薪資第 1～11 級；月薪超過 45,800 元一律用 45,800 元 */
const LABOR_GRADES = [29500, 30300, 31800, 33300, 34800, 36300, 38200, 40100, 42000, 43900, 45800];

/** 健保投保金額第 1～58 級；受僱者最低是第 1 級，月薪超過 313,000 元一律用 313,000 元 */
const HEALTH_GRADES = [
  29500, 30300, 31800, 33300, 34800, 36300, 38200, 40100, 42000, 43900,
  45800, 48200, 50600, 53000, 55400, 57800, 60800, 63800, 66800, 69800,
  72800, 76500, 80200, 83900, 87600, 92100, 96600, 101100, 105600, 110100,
  115500, 120900, 126300, 131700, 137100, 142500, 147900, 150000, 156400, 162800,
  169200, 175600, 182000, 189500, 197000, 204500, 212000, 219500, 228200, 236900,
  245600, 254300, 263000, 273000, 283000, 293000, 303000, 313000,
];

/** 健保眷屬最多計 3 人 */
export const MAX_COUNTED_DEPENDENTS = 3;

export interface InsuranceResult {
  /** 勞保普通事故＋就業保險，員工自付 */
  laborInsurance: number;
  /** 健保，員工自付（含眷屬） */
  healthInsurance: number;
  totalDeduction: number;
  netSalary: number;
  /** 實際用來計算的勞保月投保薪資 */
  laborGrade: number;
  /** 實際用來計算的健保投保金額 */
  healthGrade: number;
  /** 計入健保費的眷屬人數（最多 3） */
  countedDependents: number;
}

const ZERO: InsuranceResult = {
  laborInsurance: 0,
  healthInsurance: 0,
  totalDeduction: 0,
  netSalary: 0,
  laborGrade: 0,
  healthGrade: 0,
  countedDependents: 0,
};

/** 由小到大的等級表裡，第一個不低於月薪的等級；月薪超過最高一級就用最高一級 */
function gradeFor(salary: number, grades: number[]): number {
  return grades.find((g) => g >= salary) ?? grades[grades.length - 1];
}

/** 勞保月投保薪資 */
export function laborGradeFor(monthlySalary: number): number {
  return gradeFor(monthlySalary, [...LABOR_PART_TIME_GRADES, ...LABOR_GRADES]);
}

/** 健保投保金額 */
export function healthGradeFor(monthlySalary: number): number {
  return gradeFor(monthlySalary, HEALTH_GRADES);
}

/**
 * 勞保＋就保的員工自付額。用整數算：投保薪資 × 11.5% × 20% = × 23 ÷ 1000，× 1% × 20% = × 2 ÷ 1000。
 * 直接乘小數的話 13,500 × 0.115 × 0.2 會得到 310.49999…，四捨五入後少 1 元。
 */
export function laborPremium(grade: number): number {
  return Math.round((grade * 23) / 1000) + Math.round((grade * 2) / 1000);
}

/** 健保每人的員工自付額：投保金額 × 5.17% × 30% = × 1551 ÷ 100000 */
export function healthPremiumPerPerson(grade: number): number {
  return Math.round((grade * 1551) / 100000);
}

/**
 * @param monthlySalary 月薪（元）
 * @param dependents 隨本人加保的眷屬人數
 */
export function calculateInsurance(monthlySalary: number, dependents: number = 0): InsuranceResult {
  if (isNaN(monthlySalary) || monthlySalary <= 0) return { ...ZERO };

  const safeDeps = Math.max(0, Math.floor(isNaN(dependents) ? 0 : dependents));
  const countedDependents = Math.min(safeDeps, MAX_COUNTED_DEPENDENTS);

  const laborGrade = laborGradeFor(monthlySalary);
  const healthGrade = healthGradeFor(monthlySalary);

  const laborInsurance = laborPremium(laborGrade);
  const healthInsurance = healthPremiumPerPerson(healthGrade) * (1 + countedDependents);

  const totalDeduction = laborInsurance + healthInsurance;
  const netSalary = Math.round(monthlySalary - totalDeduction);

  return { laborInsurance, healthInsurance, totalDeduction, netSalary, laborGrade, healthGrade, countedDependents };
}
