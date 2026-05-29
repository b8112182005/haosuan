import { describe, it, expect } from "vitest";
import { calculateMortgage } from "../mortgage";
import { calculateBmi } from "../bmi";
import { calculateCompoundInterest } from "../compound-interest";

describe("calculateMortgage - 等額本息", () => {
  it("1000 萬、2.1%、30 年：月付約 37,464、總利息 > 0", () => {
    const r = calculateMortgage(10000000, 2.1, 30, "equal-payment");
    expect(r.months).toBe(360);
    expect(r.firstMonthPayment).toBeGreaterThan(37000);
    expect(r.firstMonthPayment).toBeLessThan(38000);
    expect(r.totalInterest).toBeGreaterThan(0);
    expect(r.lastMonthPayment).toBe(r.firstMonthPayment); // 本息均攤每月相同
  });

  it("零利率：總還款 = 本金", () => {
    const r = calculateMortgage(1200000, 0, 10, "equal-payment");
    expect(r.totalInterest).toBe(0);
  });
});

describe("calculateMortgage - 等額本金", () => {
  it("首月還款 > 末月還款（利息遞減）", () => {
    const r = calculateMortgage(10000000, 2.1, 30, "equal-principal");
    expect(r.firstMonthPayment).toBeGreaterThan(r.lastMonthPayment);
  });
});

describe("calculateBmi", () => {
  it("170cm / 65kg → BMI 22.5 正常", () => {
    const r = calculateBmi(65, 170);
    expect(r.bmi).toBe(22.5);
    expect(r.category).toBe("normal");
  });

  it("理想體重區間以台灣標準 18.5–24 計", () => {
    const r = calculateBmi(65, 170);
    expect(r.idealWeightMin).toBeCloseTo(53.5, 0);
    expect(r.idealWeightMax).toBeCloseTo(69.4, 0);
  });
});

describe("calculateCompoundInterest", () => {
  it("本金 10 萬、年 5%、1 年、無月投入：終值 105,000", () => {
    const r = calculateCompoundInterest({
      principal: 100000,
      annualRate: 5,
      years: 1,
      monthlyContribution: 0,
      compoundFrequency: "annually",
    });
    expect(r.finalAmount).toBe(105000);
    expect(r.totalInterest).toBe(5000);
  });

  it("有定期投入：總投入 = 本金 + 累計月投入", () => {
    const r = calculateCompoundInterest({
      principal: 100000,
      annualRate: 6,
      years: 2,
      monthlyContribution: 5000,
      compoundFrequency: "monthly",
    });
    // 本金 100,000 + 24 個月 × 5,000 = 220,000
    expect(r.totalContributions).toBe(220000);
    expect(r.finalAmount).toBeGreaterThan(r.totalContributions);
  });
});
