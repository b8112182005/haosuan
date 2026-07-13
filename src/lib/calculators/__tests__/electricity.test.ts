import { describe, it, expect } from "vitest";
import { calculateElectricity } from "../electricity";

/**
 * 電費（累進費率）— 台電 2024 住宅用電
 * 鎖住分段累進與基本電費，避免整筆套單一費率的錯誤。
 */
describe("calculateElectricity", () => {
  it("非夏月 120 度：全在第一段 1.63 + 基本費 75", () => {
    // 120 × 1.63 = 195.6；total = 75 + 195.6 = 270.6
    const r = calculateElectricity(120, "non-summer");
    expect(r.energyCharge).toBeCloseTo(195.6, 2);
    expect(r.totalCharge).toBeCloseTo(270.6, 2);
    expect(r.breakdown).toHaveLength(1);
    expect(r.baseCharge).toBe(75);
  });

  it("夏月 350 度：跨三段累進正確", () => {
    // 第一段 120 × 1.63 = 195.6
    // 第二段 210 × 2.38 = 499.8
    // 第三段 20 × 3.52 = 70.4
    // energy = 765.8；total = 75 + 765.8 = 840.8
    const r = calculateElectricity(350, "summer");
    expect(r.energyCharge).toBeCloseTo(765.8, 2);
    expect(r.totalCharge).toBeCloseTo(840.8, 2);
    expect(r.breakdown).toHaveLength(3);
  });

  it("夏月費率高於非夏月（同度數）", () => {
    const summer = calculateElectricity(500, "summer");
    const nonSummer = calculateElectricity(500, "non-summer");
    expect(summer.totalCharge).toBeGreaterThan(nonSummer.totalCharge);
  });

  it("0 度：只收基本電費，平均單價為 0", () => {
    const r = calculateElectricity(0, "summer");
    expect(r.energyCharge).toBe(0);
    expect(r.totalCharge).toBe(75);
    expect(r.avgPricePerUnit).toBe(0);
  });

  it("平均單價 = 總費用 / 度數", () => {
    const r = calculateElectricity(300, "non-summer");
    expect(r.avgPricePerUnit).toBeCloseTo(
      Math.round((r.totalCharge / 300) * 100) / 100,
      2
    );
  });
});
