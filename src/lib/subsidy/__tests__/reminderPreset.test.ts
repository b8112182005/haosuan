import { describe, expect, it } from "vitest";
import { applyLinkLabel, reminderPreset, showApplyNow } from "../reminderPreset";
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
      planned: true,
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
    expect(p).toEqual({ applyNow: false, targetDate: "2026-12-31", daysBefore: [30, 14, 3], repeatYearly: true, planned: false, note: "晚送當月不補發" });
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
      planned: true,
      note: "晚送當月不補發",
    });
    expect(reminderPreset({ deadline: { type: "rolling" }, lateConsequence: null, state: none }).note).toBeUndefined();
  });

  it("planned：apply_now 與沒有固定截止日是使用者自己挑的辦理日；有主管機關截止日不是", () => {
    expect(reminderPreset({ deadline: { type: "rolling" }, lateConsequence: lateNow, state: none }).planned).toBe(true);
    expect(reminderPreset({ deadline: { type: "rolling" }, lateConsequence: late, state: none }).planned).toBe(true);
    expect(reminderPreset({ deadline: { type: "fixed_annual" }, lateConsequence: late, state: upcoming }).planned).toBe(false);
  });
});

describe("期限卡的「現在就能送件」", () => {
  const notOpen: DeadlineState = { ...upcoming, open: false, start: { y: 2027, m: 3, d: 1 } };
  const ended: DeadlineState = { kind: "ended", label: "已結束" };

  it("開放中或沒有固定期限才顯示", () => {
    expect(showApplyNow(true, upcoming)).toBe(true);
    expect(showApplyNow(true, none)).toBe(true);
  });

  it("期間還沒開始、已結束、不是 apply_now、狀態還沒算出來：不顯示", () => {
    expect(showApplyNow(true, notOpen)).toBe(false);
    expect(showApplyNow(true, ended)).toBe(false);
    expect(showApplyNow(false, upcoming)).toBe(false);
    expect(showApplyNow(true, null)).toBe(false);
  });
});

describe("詳情頁主按鈕文字", () => {
  it("apply_now 且還能申請：現在去申請", () => {
    expect(applyLinkLabel({ applyNow: true, status: "active", deadlineType: "rolling" })).toBe("現在去申請");
  });

  it("status_2026 或 deadline.type 是 ended：前往官方申請頁", () => {
    expect(applyLinkLabel({ applyNow: true, status: "ended", deadlineType: "rolling" })).toBe("前往官方申請頁");
    expect(applyLinkLabel({ applyNow: true, status: "active", deadlineType: "ended" })).toBe("前往官方申請頁");
  });

  it("不是 apply_now：前往官方申請頁", () => {
    expect(applyLinkLabel({ applyNow: false, status: "active", deadlineType: "rolling" })).toBe("前往官方申請頁");
    expect(applyLinkLabel({ applyNow: undefined, status: "active", deadlineType: "rolling" })).toBe("前往官方申請頁");
  });
});
