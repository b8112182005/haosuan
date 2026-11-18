import { describe, it, expect } from "vitest";
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
