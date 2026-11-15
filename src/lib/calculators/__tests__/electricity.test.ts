import { describe, it, expect } from "vitest";
import { calculateElectricity } from "../electricity";

/**
 * 電費（累進電價）：台電 114 年 10 月 1 日起實施的住宅非時間電價。
 * 鎖住分段累進，避免整筆套單一費率；也鎖住「沒有基本電費、未滿 100 元以 100 元計收」。
 */
describe("calculateElectricity", () => {
  it("非夏月 120 度：全在第一段 1.78，沒有基本電費", () => {
    // 120 × 1.78 = 213.6
    const r = calculateElectricity(120, "non-summer");
    expect(r.energyCharge).toBeCloseTo(213.6, 2);
    expect(r.totalCharge).toBeCloseTo(213.6, 2);
    expect(r.breakdown).toHaveLength(1);
    expect(r.minimumApplied).toBe(false);
  });

  it("夏月 350 度：跨三段累進", () => {
    // 第一段 120 × 1.78 = 213.6
    // 第二段 210 × 2.55 = 535.5
    // 第三段 20 × 3.80 = 76
    const r = calculateElectricity(350, "summer");
    expect(r.energyCharge).toBeCloseTo(825.1, 2);
    expect(r.totalCharge).toBeCloseTo(825.1, 2);
    expect(r.breakdown).toHaveLength(3);
  });

  it("非夏月 300 度約 620 元、夏月約 673 元（頁面問答引用的數字）", () => {
    expect(calculateElectricity(300, "non-summer").totalCharge).toBeCloseTo(620.4, 2);
    expect(calculateElectricity(300, "summer").totalCharge).toBeCloseTo(672.6, 2);
  });

  it("1,200 度：最高一段夏月 8.86、非夏月 7.03", () => {
    const summer = calculateElectricity(1200, "summer");
    // 213.6 + 535.5 + 646 + 1028 + 1932 + 200 × 8.86
    expect(summer.totalCharge).toBeCloseTo(213.6 + 535.5 + 646 + 1028 + 1932 + 1772, 2);
    expect(summer.breakdown).toHaveLength(6);
    const nonSummer = calculateElectricity(1200, "non-summer");
    // 213.6 + 210×2.26 + 170×3.13 + 200×4.24 + 300×5.27 + 200×7.03
    expect(nonSummer.totalCharge).toBeCloseTo(213.6 + 474.6 + 532.1 + 848 + 1581 + 1406, 2);
  });

  it("夏月費率高於非夏月（同度數）", () => {
    const summer = calculateElectricity(500, "summer");
    const nonSummer = calculateElectricity(500, "non-summer");
    expect(summer.totalCharge).toBeGreaterThan(nonSummer.totalCharge);
  });

  it("電費未滿 100 元以 100 元計收（含 0 度）", () => {
    const zero = calculateElectricity(0, "summer");
    expect(zero.energyCharge).toBe(0);
    expect(zero.totalCharge).toBe(100);
    expect(zero.minimumApplied).toBe(true);
    expect(zero.avgPricePerUnit).toBe(0);

    const low = calculateElectricity(50, "non-summer"); // 50 × 1.78 = 89
    expect(low.energyCharge).toBeCloseTo(89, 2);
    expect(low.totalCharge).toBe(100);
    expect(low.minimumApplied).toBe(true);

    // 57 度 = 101.46 元，剛過門檻
    expect(calculateElectricity(57, "non-summer").minimumApplied).toBe(false);
  });

  it("平均單價 = 總費用 / 度數", () => {
    const r = calculateElectricity(300, "non-summer");
    expect(r.avgPricePerUnit).toBeCloseTo(
      Math.round((r.totalCharge / 300) * 100) / 100,
      2
    );
  });
});
