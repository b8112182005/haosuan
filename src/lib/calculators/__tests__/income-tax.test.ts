import { describe, it, expect } from "vitest";
import { calculateIncomeTax } from "../income-tax";

/**
 * 所得稅（累進級距）— 台灣 2024 年稅制
 * 用手算已知值鎖住累進計算與扣除額邏輯，算錯會直接毀信任。
 */
describe("calculateIncomeTax", () => {
  it("年薪 48 萬單身無扶養：落第一級距 5%，應納稅 1,700", () => {
    // salaryDeduction = min(480000, 218000) = 218000
    // + 個人 97000 + 標準(單身) 131000 = 446000
    // netIncome = 480000 - 446000 = 34000
    // 34000 × 5% = 1700
    const r = calculateIncomeTax({
      annualSalary: 480000,
      numDependents: 0,
      hasSpouse: false,
      numElderlyDependents: 0,
    });
    expect(r.netIncome).toBe(34000);
    expect(r.taxAmount).toBe(1700);
    expect(r.taxRate).toBe(5);
    expect(r.monthlyTax).toBe(Math.round(1700 / 12));
  });

  it("薪資特別扣除額不得超過薪資本身（低薪邊界）", () => {
    // 年薪 20 萬 < 21.8 萬，salaryDeduction 只能扣 20 萬
    const r = calculateIncomeTax({
      annualSalary: 200000,
      numDependents: 0,
      hasSpouse: false,
      numElderlyDependents: 0,
    });
    expect(r.salaryDeduction).toBe(200000);
    // 扣除額已超過薪資，淨額歸零、免稅
    expect(r.netIncome).toBe(0);
    expect(r.taxAmount).toBe(0);
  });

  it("跨級距累進：驗證分段課稅而非整筆同一稅率", () => {
    // 年薪 300 萬單身無扶養
    // 扣除：218000 + 97000 + 131000 = 446000
    // netIncome = 3000000 - 446000 = 2554000
    // 分段：0~590000 ×5% = 29500
    //      590000~1330000 (740000) ×12% = 88800
    //      1330000~2554000 (1224000) ×20% = 244800
    // 合計 = 363100
    const r = calculateIncomeTax({
      annualSalary: 3000000,
      numDependents: 0,
      hasSpouse: false,
      numElderlyDependents: 0,
    });
    expect(r.netIncome).toBe(2554000);
    expect(r.taxAmount).toBe(363100);
    expect(r.taxRate).toBe(20); // 適用最高級距為 20%
    expect(r.breakdown).toHaveLength(3);
  });

  it("已婚含扶養：配偶免稅額 + 標準扣除額(已婚)一併生效", () => {
    // 年薪 100 萬，已婚，1 名一般扶養
    // salaryDeduction 218000
    // 個人 97000 + 配偶 97000 + 扶養 97000 + 標準(已婚) 262000 = 771000
    // netIncome = 1000000 - 771000 = 229000
    // 229000 × 5% = 11450
    const r = calculateIncomeTax({
      annualSalary: 1000000,
      numDependents: 1,
      hasSpouse: true,
      numElderlyDependents: 0,
    });
    expect(r.spouseExemption).toBe(97000);
    expect(r.standardDeduction).toBe(262000);
    expect(r.dependentExemption).toBe(97000);
    expect(r.netIncome).toBe(229000);
    expect(r.taxAmount).toBe(11450);
  });

  it("70 歲以上扶養親屬享 1.5 倍免稅額，且不得超過總扶養人數", () => {
    // 2 名扶養，其中宣稱 3 名長者 → 應被夾到 2
    // 免稅額 = 2 × 145500 = 291000
    const r = calculateIncomeTax({
      annualSalary: 2000000,
      numDependents: 2,
      hasSpouse: false,
      numElderlyDependents: 3,
    });
    expect(r.dependentExemption).toBe(2 * 145500);
  });
});
