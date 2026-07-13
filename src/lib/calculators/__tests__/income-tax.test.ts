import { describe, it, expect } from "vitest";
import { calculateIncomeTax } from "../income-tax";

describe("calculateIncomeTax - 114 年度", () => {
  it("單身、年薪 60 萬、無扶養：淨額 15.4 萬、稅額 7,700", () => {
    const r = calculateIncomeTax({
      annualSalary: 600000,
      numDependents: 0,
      hasSpouse: false,
      numElderlyDependents: 0,
    });
    // 60萬 - 薪資特扣21.8萬 - 免稅額9.7萬 - 標扣13.1萬 = 15.4萬
    expect(r.netIncome).toBe(154000);
    expect(r.taxAmount).toBe(7700); // 15.4萬 × 5%
    expect(r.taxRate).toBe(5);
  });

  it("BUG-003 防禦：70歲以上人數 > 總扶養人數時，不得灌水免稅額", () => {
    const r = calculateIncomeTax({
      annualSalary: 1000000,
      numDependents: 0,
      hasSpouse: false,
      numElderlyDependents: 5, // 故意超過總人數
    });
    expect(r.dependentExemption).toBe(0); // 不應變成 5×145,500
  });

  it("已婚 + 2 扶養(其中1名70歲以上)：免稅額正確分層", () => {
    const r = calculateIncomeTax({
      annualSalary: 1500000,
      numDependents: 2,
      hasSpouse: true,
      numElderlyDependents: 1,
    });
    // 1×97,000(一般) + 1×145,500(70歲以上) = 242,500
    expect(r.dependentExemption).toBe(242500);
  });

  it("低於免稅額門檻：稅額為 0", () => {
    const r = calculateIncomeTax({
      annualSalary: 300000,
      numDependents: 0,
      hasSpouse: false,
      numElderlyDependents: 0,
    });
    expect(r.taxAmount).toBe(0);
  });
});
