import { describe, it, expect } from "vitest";
import { calculateInsurance } from "../insurance";

/**
 * 勞健保費（員工負擔）— 台灣 2024 費率
 * 勞保 10.5% × 員工 20%；健保 5.17% × 員工 30%（眷屬加成）
 */
describe("calculateInsurance", () => {
  it("月薪 40,000、無眷屬：勞保 840、健保 620、實領 38,540", () => {
    // 勞保 = 40000 × 0.105 × 0.20 = 840
    // 健保 = 40000 × 0.0517 × 0.30 × 1 = 620.4 → 620
    const r = calculateInsurance(40000, 0);
    expect(r.laborInsurance).toBe(840);
    expect(r.healthInsurance).toBe(620);
    expect(r.totalDeduction).toBe(1460);
    expect(r.netSalary).toBe(38540);
  });

  it("眷屬加成：健保費按 (1 + 眷屬人數) 倍計", () => {
    // 2 名眷屬 → 健保 = 40000 × 0.0517 × 0.30 × 3 = 1861.2 → 1861
    const r = calculateInsurance(40000, 2);
    expect(r.healthInsurance).toBe(1861);
    // 勞保不受眷屬影響
    expect(r.laborInsurance).toBe(840);
  });

  it("實領 = 月薪 - 勞保 - 健保", () => {
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
