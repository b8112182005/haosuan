import { describe, it, expect } from "vitest";
import { calculateOvertime } from "../overtime";

// 基準範例取自台北市勞動局加班費 Q&A：月薪 36,000 → 時薪 150、日薪 1,200
const SALARY = 36000;

describe("calculateOvertime - 基準值", () => {
  it("時薪 = 月薪/240、日薪基準正確", () => {
    const r = calculateOvertime(SALARY, "weekday", 2);
    expect(r.hourlyWage).toBe(150);
  });
});

describe("calculateOvertime - 平日 (勞基法 §24 I)", () => {
  it("平日 2 小時 = 時薪×4/3×2", () => {
    const r = calculateOvertime(SALARY, "weekday", 2);
    expect(r.overtimePay).toBe(400); // 150 * 4/3 * 2
  });

  it("平日 3 小時 = 前2小時×4/3 + 第3小時×5/3", () => {
    const r = calculateOvertime(SALARY, "weekday", 3);
    expect(r.overtimePay).toBe(650); // 400 + 150*5/3*1=250
    expect(r.breakdown).toHaveLength(2);
  });
});

describe("calculateOvertime - 休息日 (勞基法 §24 II/III, 核實計算)", () => {
  it("休息日 6 小時 = 1,400（官方範例）", () => {
    // 150×4/3×2 + 150×5/3×4 = 400 + 1000
    const r = calculateOvertime(SALARY, "rest-day", 6);
    expect(r.overtimePay).toBe(1400);
  });

  it("休息日 10 小時 = 2,700（官方範例，含超過8小時×8/3）", () => {
    // 150×4/3×2 + 150×5/3×6 + 150×8/3×2 = 400 + 1500 + 800
    const r = calculateOvertime(SALARY, "rest-day", 10);
    expect(r.overtimePay).toBe(2700);
    const over8 = r.breakdown.find((b) => b.period.includes("超過 8"));
    expect(over8?.rate).toBeCloseTo(2 + 2 / 3, 5);
  });

  it("休息日不再保障最低一日工資（核實計算，2018 起）", () => {
    // 2 小時：150×4/3×2 = 400，不應被補到日薪 1,200
    const r = calculateOvertime(SALARY, "rest-day", 2);
    expect(r.overtimePay).toBe(400);
    expect(r.breakdown.some((b) => b.period.includes("補足"))).toBe(false);
  });
});

describe("calculateOvertime - 國定假日 (勞基法 §39)", () => {
  it("國定假日 8 小時內加發一日工資（不因時數而不同）", () => {
    const r4 = calculateOvertime(SALARY, "holiday", 4);
    const r8 = calculateOvertime(SALARY, "holiday", 8);
    expect(r4.overtimePay).toBe(1200); // 日薪
    expect(r8.overtimePay).toBe(1200); // 4 小時與 8 小時相同
  });

  it("國定假日超過 8 小時：加發一日 + 平日延長工時", () => {
    // 1200 + 150×4/3×2 = 1200 + 400
    const r = calculateOvertime(SALARY, "holiday", 10);
    expect(r.overtimePay).toBe(1600);
  });
});
