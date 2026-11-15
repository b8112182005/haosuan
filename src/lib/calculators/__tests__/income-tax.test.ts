import { describe, it, expect } from "vitest";
import { calculateIncomeTax } from "../income-tax";

describe("calculateIncomeTax - 115 年度", () => {
  it("單身、年薪 60 萬、無扶養：淨額 13.6 萬、稅額 6,800", () => {
    const r = calculateIncomeTax({
      annualSalary: 600000,
      numDependents: 0,
      hasSpouse: false,
      numElderlyDependents: 0,
    });
    // 60萬 - 薪資特扣22.7萬 - 免稅額10.1萬 - 標扣13.6萬 = 13.6萬
    expect(r.netIncome).toBe(136000);
    expect(r.taxAmount).toBe(6800); // 13.6萬 × 5%
    expect(r.taxRate).toBe(5);
  });

  it("月薪 4 萬（年薪 48 萬）、單身：淨額 16,000、稅額 800（頁面問答引用的數字）", () => {
    const r = calculateIncomeTax({ annualSalary: 480000, numDependents: 0, hasSpouse: false, numElderlyDependents: 0 });
    expect(r.netIncome).toBe(16000);
    expect(r.taxAmount).toBe(800);
  });

  it("級距：淨額 61 萬以內 5%，超過的部分 12%；138 萬、277 萬、519 萬各是下一級的起點", () => {
    const base = 227000 + 101000 + 136000; // 單身的扣除與免稅合計
    const at = (net: number) => calculateIncomeTax({ annualSalary: base + net, numDependents: 0, hasSpouse: false, numElderlyDependents: 0 });
    expect(at(610000).taxAmount).toBe(30500);
    expect(at(610000).taxRate).toBe(5);
    expect(at(620000).taxAmount).toBe(30500 + 1200);
    expect(at(620000).taxRate).toBe(12);
    // 138 萬：30,500 + 77 萬 × 12% = 122,900
    expect(at(1380000).taxAmount).toBe(122900);
    expect(at(1390000).taxRate).toBe(20);
    // 277 萬：122,900 + 139 萬 × 20% = 400,900
    expect(at(2770000).taxAmount).toBe(400900);
    expect(at(2780000).taxRate).toBe(30);
    // 519 萬：400,900 + 242 萬 × 30% = 1,126,900
    expect(at(5190000).taxAmount).toBe(1126900);
    expect(at(5200000).taxRate).toBe(40);
  });

  it("BUG-003 防禦：70歲以上人數 > 總扶養人數時，不得灌水免稅額", () => {
    const r = calculateIncomeTax({
      annualSalary: 1000000,
      numDependents: 0,
      hasSpouse: false,
      numElderlyDependents: 5, // 故意超過總人數
    });
    expect(r.dependentExemption).toBe(0); // 不應變成 5×151,500
  });

  it("已婚 + 2 扶養(其中1名70歲以上)：免稅額正確分層", () => {
    const r = calculateIncomeTax({
      annualSalary: 1500000,
      numDependents: 2,
      hasSpouse: true,
      numElderlyDependents: 1,
    });
    // 1×101,000(一般) + 1×151,500(70歲以上) = 252,500
    expect(r.dependentExemption).toBe(252500);
    expect(r.standardDeduction).toBe(272000);
    expect(r.spouseExemption).toBe(101000);
  });

  it("人數打成負數時當成 0，免稅額不會變成負的", () => {
    const base = { annualSalary: 480000, hasSpouse: false };
    const normal = calculateIncomeTax({ ...base, numDependents: 0, numElderlyDependents: 0 });
    const negative = calculateIncomeTax({ ...base, numDependents: -1, numElderlyDependents: -1 });
    expect(negative.dependentExemption).toBe(0);
    expect(negative.taxAmount).toBe(normal.taxAmount);
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
