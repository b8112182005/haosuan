import { describe, it, expect } from "vitest";
import { calculateOvertime } from "../overtime";

/**
 * 加班費 — 台灣勞基法第 24 / 39 條
 * 時薪 = 月薪 / 240。鎖住平日 / 休息日 / 國定假日三種倍率。
 */
describe("calculateOvertime", () => {
  it("平日加班 3 小時：前 2h ×4/3 + 第 3h ×5/3", () => {
    // hourly = 36000 / 240 = 150
    // 前 2h：150 × 4/3 × 2 = 400
    // 第 3h：150 × 5/3 × 1 = 250
    // 合計 650
    const r = calculateOvertime(36000, "weekday", 3);
    expect(r.hourlyWage).toBe(150);
    expect(r.overtimePay).toBe(650);
    expect(r.breakdown).toHaveLength(2);
  });

  it("國定假日：工作時數按時薪加倍發給（勞基法第 39 條）", () => {
    // 150 × 2 × 8 = 2400
    const r = calculateOvertime(36000, "holiday", 8);
    expect(r.overtimePay).toBe(2400);
    expect(r.breakdown[0].rate).toBe(2);
  });

  it("休息日不足 2 小時以 2 小時計，且保證至少一日工資", () => {
    // 加班 1h：計費 2h → 150 × 4/3 × 2 = 400
    // 一日工資 = 36000 / 30 = 1200，400 < 1200 → 補足到 1200
    const r = calculateOvertime(36000, "rest-day", 1);
    expect(r.overtimePay).toBe(1200);
    // 應含補足差額列
    const diffRow = r.breakdown.find((b) => b.period.includes("補足"));
    expect(diffRow).toBeDefined();
  });

  it("休息日加班 8 小時：前2h ×4/3 + 第3~8h(6h) ×5/3", () => {
    // 前 2h：150 × 4/3 × 2 = 400
    // 3~8h：150 × 5/3 × 6 = 1500
    // 合計 1900（> 一日工資 1200，不補足）
    const r = calculateOvertime(36000, "rest-day", 8);
    expect(r.overtimePay).toBe(1900);
  });
});
