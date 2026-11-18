import { describe, expect, it } from "vitest";
import { reminderPreset } from "../reminderPreset";
import type { DeadlineState } from "../deadline";

const upcoming: DeadlineState = {
  kind: "upcoming",
  label: "剩 30 天",
  date: { y: 2026, m: 12, d: 31 },
  daysLeft: 30,
  open: true,
  start: null,
};
const none: DeadlineState = { kind: "none", label: "隨到隨辦" };
const late = { apply_now: false, short: "晚送當月不補發" };
const lateNow = { apply_now: true, short: "從送件當月起算" };

describe("加入提醒的預設值", () => {
  it("apply_now：不帶日期，提前 1 天與當天，不每年重複，備註帶短句", () => {
    expect(reminderPreset({ deadline: { type: "rolling" }, lateConsequence: lateNow, state: none })).toEqual({
      applyNow: true,
      targetDate: undefined,
      daysBefore: [1, 0],
      repeatYearly: false,
      note: "從送件當月起算",
    });
  });

  it("apply_now 而且有截止日：仍然不帶日期，也不每年重複", () => {
    const p = reminderPreset({ deadline: { type: "fixed_annual" }, lateConsequence: lateNow, state: upcoming });
    expect(p.applyNow).toBe(true);
    expect(p.targetDate).toBeUndefined();
    expect(p.daysBefore).toEqual([1, 0]);
    expect(p.repeatYearly).toBe(false);
  });

  it("有截止日：帶截止日，截止前 30、14、3 天，fixed_annual 每年重複", () => {
    const p = reminderPreset({ deadline: { type: "fixed_annual" }, lateConsequence: late, state: upcoming });
    expect(p).toEqual({ applyNow: false, targetDate: "2026-12-31", daysBefore: [30, 14, 3], repeatYearly: true, note: "晚送當月不補發" });
  });

  it("有截止日但不是 fixed_annual：不每年重複；沒有 late_consequence 就沒有備註", () => {
    const p = reminderPreset({ deadline: { type: "window" }, state: upcoming });
    expect(p.repeatYearly).toBe(false);
    expect(p.note).toBeUndefined();
    expect(p.targetDate).toBe("2026-12-31");
  });

  it("沒有截止日：不帶日期，提前 7 天，備註照帶", () => {
    expect(reminderPreset({ deadline: { type: "rolling" }, lateConsequence: late, state: none })).toEqual({
      applyNow: false,
      targetDate: undefined,
      daysBefore: [7],
      repeatYearly: false,
      note: "晚送當月不補發",
    });
    expect(reminderPreset({ deadline: { type: "rolling" }, lateConsequence: null, state: none }).note).toBeUndefined();
  });
});
