import { describe, it, expect, vi } from "vitest";
import { EMPTY_PROFILE, PROFILE_STEPS, answeredCount, unansweredSteps, type Profile } from "../profile";

const FULL: Profile = {
  city: "新北市",
  age: 32,
  monthlyIncome: 42000,
  isRenting: true,
  ownsHome: false,
  hasChildren: true,
  childrenAges: [1],
  isPregnantOrNewborn: false,
  isMarried: true,
  hasLaborInsurance: true,
  hasNationalPension: false,
  isDisabled: false,
  lowIncome: "none",
  isStudent: false,
  isUnemployed: false,
  ownsVehicle: "scooter",
};

describe("unansweredSteps", () => {
  it("空白條件回 7 題，順序同問答", () => {
    expect(unansweredSteps(EMPTY_PROFILE)).toEqual(PROFILE_STEPS);
    expect(unansweredSteps(EMPTY_PROFILE)).toHaveLength(7);
  });

  it("全填回空陣列", () => {
    expect(unansweredSteps(FULL)).toEqual([]);
  });

  it("只填縣市與車輛，回其餘 5 題", () => {
    const p = { ...EMPTY_PROFILE, city: "台北市", ownsVehicle: "none" as const };
    expect(unansweredSteps(p)).toEqual(["age", "income", "housing", "family", "status"]);
  });

  it("答「沒有」「0」「不是」也算回答", () => {
    const p = { ...EMPTY_PROFILE, monthlyIncome: 0, isStudent: false, ownsHome: false };
    expect(unansweredSteps(p)).toEqual(["city", "age", "family", "vehicle"]);
  });
});

describe("answeredCount", () => {
  it("等於題數減沒回答的題數", () => {
    expect(answeredCount(EMPTY_PROFILE)).toBe(0);
    expect(answeredCount(FULL)).toBe(7);
    expect(answeredCount({ ...EMPTY_PROFILE, city: "台北市" })).toBe(1);
  });
});

describe("peekProfile：不等 Preferences 就拿得到這次存過的條件", () => {
  it("還沒讀過是 undefined；存過之後馬上拿得到；清除後是 null", async () => {
    vi.resetModules();
    const fresh = await import("../profile");
    expect(fresh.peekProfile()).toBeUndefined();
    await fresh.saveProfile({ ...fresh.EMPTY_PROFILE, city: "新北市", age: 32 });
    expect(fresh.peekProfile()?.city).toBe("新北市");
    expect(await fresh.loadProfile()).toEqual(fresh.peekProfile());
    await fresh.clearProfile();
    expect(fresh.peekProfile()).toBeNull();
    expect(await fresh.loadProfile()).toBeNull();
  });
});
