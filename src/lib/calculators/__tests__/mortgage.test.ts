import { describe, it, expect } from "vitest";
import { calculateMortgage } from "../mortgage";

/**
 * 房貸（本息平均 / 本金平均）
 * 用金融公式的獨立重算比對，鎖住還款金額與利息總額。
 */
describe("calculateMortgage", () => {
  it("等額本息、零利率邊界：月付 = 本金 / 期數，總利息為 0", () => {
    const r = calculateMortgage(1_000_000, 0, 10, "equal-payment");
    expect(r.months).toBe(120);
    // 1,000,000 / 120 = 8333.33 → round 8333
    expect(r.firstMonthPayment).toBe(8333);
    expect(r.lastMonthPayment).toBe(8333);
    // 零利率下利息應為零（用 closeTo 避免 JS 浮點的 -0 差異）
    expect(r.totalInterest).toBeCloseTo(0, 2);
  });

  it("等額本息、有利率：月付符合年金公式，各期固定", () => {
    const P = 5_000_000;
    const annualPct = 2.4;
    const years = 30;
    const n = years * 12;
    const r = annualPct / 100 / 12;
    const expectedPayment =
      (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    const res = calculateMortgage(P, annualPct, years, "equal-payment");
    expect(res.months).toBe(n);
    // 本息平均：首期與末期月付相同
    expect(res.firstMonthPayment).toBe(res.lastMonthPayment);
    expect(res.firstMonthPayment).toBe(Math.round(expectedPayment));
    // 總還款必大於本金（有付利息）
    expect(res.totalPayment).toBeGreaterThan(P);
    expect(res.totalInterest).toBe(res.totalPayment - P);
  });

  it("等額本金：首期還款高於末期（利息遞減），本金部分固定", () => {
    const P = 3_000_000;
    const res = calculateMortgage(P, 3, 20, "equal-principal");
    const n = 20 * 12;
    expect(res.schedule).toHaveLength(n);
    // 每月固定本金
    expect(res.schedule[0].principal).toBe(Math.round(P / n));
    // 本金平均：首期月付 > 末期月付
    expect(res.firstMonthPayment).toBeGreaterThan(res.lastMonthPayment);
    // 末期餘額歸零
    expect(res.schedule[n - 1].balance).toBe(0);
  });

  it("首期利息 = 本金 × 月利率（本息平均）", () => {
    const P = 1_000_000;
    const annualPct = 2.4;
    const res = calculateMortgage(P, annualPct, 30, "equal-payment");
    const monthlyRate = annualPct / 100 / 12;
    expect(res.schedule[0].interest).toBeCloseTo(P * monthlyRate, 2);
  });
});
