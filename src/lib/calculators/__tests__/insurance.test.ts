import { describe, it, expect } from "vitest";
import { calculateInsurance, healthGradeFor, healthPremiumPerPerson, laborGradeFor, laborPremium } from "../insurance";

/**
 * 勞健保費（員工自付）：115 年（2026）。
 * 勞保的期望值逐格抄自勞保局「普通事故保險費及就業保險保險費合計分擔金額表（自 115 年 1 月 1 日起適用）」全月那一列的「勞工」欄。
 */
const OFFICIAL_LABOR: Array<[grade: number, employee: number]> = [
  // 部分工時勞工適用
  [11100, 277], [12540, 313], [13500, 338], [15840, 396], [16500, 413], [17280, 432], [17880, 447],
  [19047, 476], [20008, 500], [21009, 525], [22000, 550], [23100, 577], [24000, 600], [25250, 632],
  [26400, 660], [27600, 690], [28590, 715],
  // 第 1～11 級
  [29500, 738], [30300, 758], [31800, 795], [33300, 833], [34800, 870], [36300, 908],
  [38200, 955], [40100, 1002], [42000, 1050], [43900, 1098], [45800, 1145],
];

describe("勞保＋就保自付額", () => {
  it("28 個等級都和勞保局的分擔金額表相同", () => {
    for (const [grade, employee] of OFFICIAL_LABOR) {
      expect([grade, laborPremium(grade)]).toEqual([grade, employee]);
    }
  });

  it("月薪對到不低於它的那一級；超過 45,800 用 45,800", () => {
    expect(laborGradeFor(29500)).toBe(29500);
    expect(laborGradeFor(29501)).toBe(30300);
    expect(laborGradeFor(40000)).toBe(40100);
    expect(laborGradeFor(45800)).toBe(45800);
    expect(laborGradeFor(45801)).toBe(45800);
    expect(laborGradeFor(120000)).toBe(45800);
    // 部分工時：月薪低於基本工資時用較低的等級
    expect(laborGradeFor(9000)).toBe(11100);
    expect(laborGradeFor(18000)).toBe(19047);
    expect(laborGradeFor(28591)).toBe(29500);
  });
});

describe("健保自付額", () => {
  it("第 1 級 29,500 元本人 458 元（健保署負擔金額表）", () => {
    expect(healthPremiumPerPerson(29500)).toBe(458);
  });

  it("受僱者最低用第 1 級，最高 313,000", () => {
    expect(healthGradeFor(12000)).toBe(29500);
    expect(healthGradeFor(45000)).toBe(45800);
    expect(healthGradeFor(45801)).toBe(48200);
    expect(healthGradeFor(150000)).toBe(150000);
    expect(healthGradeFor(150001)).toBe(156400);
    expect(healthGradeFor(400000)).toBe(313000);
  });

  it("眷屬每多 1 人加一份，超過 3 人以 3 人計", () => {
    const one = calculateInsurance(45000, 0).healthInsurance;
    expect(one).toBe(710); // 45,800 × 5.17% × 30% = 710.358
    expect(calculateInsurance(45000, 1).healthInsurance).toBe(one * 2);
    expect(calculateInsurance(45000, 3).healthInsurance).toBe(one * 4);
    expect(calculateInsurance(45000, 5).healthInsurance).toBe(one * 4);
    expect(calculateInsurance(45000, 5).countedDependents).toBe(3);
  });
});

describe("calculateInsurance", () => {
  it("月薪 40,000、無眷屬：投保 40,100，勞保 1,002、健保 622、實領 38,376", () => {
    const r = calculateInsurance(40000, 0);
    expect(r.laborGrade).toBe(40100);
    expect(r.healthGrade).toBe(40100);
    expect(r.laborInsurance).toBe(1002);
    expect(r.healthInsurance).toBe(622); // 40,100 × 5.17% × 30% = 621.95
    expect(r.totalDeduction).toBe(1624);
    expect(r.netSalary).toBe(38376);
  });

  it("月薪 80,000：勞保停在 45,800 這一級，健保用 80,200", () => {
    const r = calculateInsurance(80000, 0);
    expect(r.laborGrade).toBe(45800);
    expect(r.laborInsurance).toBe(1145);
    expect(r.healthGrade).toBe(80200);
    expect(r.healthInsurance).toBe(1244); // 80,200 × 5.17% × 30% = 1,243.9
  });

  it("實領 = 月薪 − 勞保 − 健保", () => {
    const r = calculateInsurance(50000, 1);
    expect(r.netSalary).toBe(50000 - r.laborInsurance - r.healthInsurance);
  });

  it("非法輸入（0 或 NaN）安全歸零，不回傳 NaN", () => {
    const zero = calculateInsurance(0, 0);
    expect(zero.totalDeduction).toBe(0);
    expect(zero.netSalary).toBe(0);

    const nan = calculateInsurance(NaN, NaN);
    expect(Number.isNaN(nan.netSalary)).toBe(false);
    expect(nan.netSalary).toBe(0);
  });
});
