import { describe, it, expect } from "vitest";
import { evaluate, evaluateAll } from "../eligibility";
import { EMPTY_PROFILE, type Profile } from "../profile";
import type { Subsidy } from "../types";
import { resolveDeadline, describeWindow } from "../deadline";

function makeSubsidy(partial: Partial<Subsidy>): Subsidy {
  return {
    id: "test",
    name: "測試補助",
    short_name: "測試",
    category: "other",
    level: "central",
    city: null,
    agency: "測試機關",
    summary: "",
    eligibility: [],
    amount: { text: "", min: null, max: null, unit: null, formula: null },
    conditions: {},
    documents: [],
    how_to_apply: [],
    channels: [],
    deadline: { type: "rolling", start_month: null, start_day: null, end_month: null, end_day: null, note: "" },
    faqs: [],
    pitfalls: [],
    related_calculator: null,
    official_url: "https://example.gov.tw",
    sources: [],
    status_2026: "active",
    last_known_update: null,
    confidence: "high",
    unverified_fields: [],
    ...partial,
  };
}

const renter: Profile = {
  ...EMPTY_PROFILE,
  city: "台北市",
  age: 30,
  monthlyIncome: 40000,
  isRenting: true,
  ownsHome: false,
  hasChildren: false,
  isMarried: false,
  hasLaborInsurance: true,
  isDisabled: false,
  lowIncome: "none",
  isStudent: false,
  isUnemployed: false,
  ownsVehicle: "scooter",
};

describe("evaluate", () => {
  it("無條件的補助對任何人都 eligible", () => {
    const r = evaluate(makeSubsidy({}), EMPTY_PROFILE);
    expect(r.verdict).toBe("eligible");
  });

  it("沒回答的條件歸 maybe，不是 not_eligible", () => {
    const r = evaluate(makeSubsidy({ conditions: { must_rent: true, min_age: 18 } }), EMPTY_PROFILE);
    expect(r.verdict).toBe("maybe");
    expect(r.unknown.length).toBe(2);
    expect(r.failed.length).toBe(0);
  });

  it("租屋 + 年齡 + 個人月收入門檻都符合 → eligible", () => {
    const s = makeSubsidy({
      conditions: { must_rent: true, min_age: 18, income_limit_type: "monthly_personal", income_limit_value: 50000 },
    });
    const r = evaluate(s, renter);
    expect(r.verdict).toBe("eligible");
    expect(r.matched).toContain("租屋中");
  });

  it("收入超過個人月收入門檻 → not_eligible，並說明數字", () => {
    const s = makeSubsidy({ conditions: { income_limit_type: "monthly_personal", income_limit_value: 30000 } });
    const r = evaluate(s, renter);
    expect(r.verdict).toBe("not_eligible");
    expect(r.failed[0]).toContain("40,000");
  });

  it("家庭所得門檻無法用個人收入判斷 → maybe", () => {
    const s = makeSubsidy({
      conditions: { income_limit_type: "household_avg_monthly_per_person", income_limit_value: 45000, income_limit_note: "每人每月平均所得低於最低生活費 3 倍" },
    });
    const r = evaluate(s, renter);
    expect(r.verdict).toBe("maybe");
    expect(r.unknown[0]).toContain("全家所得");
  });

  it("縣市不符 → not_eligible；縣市未填 → maybe", () => {
    const s = makeSubsidy({ city: "新北市", level: "local" });
    expect(evaluate(s, renter).verdict).toBe("not_eligible");
    expect(evaluate(s, { ...renter, city: null }).verdict).toBe("maybe");
    expect(evaluate(s, { ...renter, city: "新北市" }).verdict).toBe("eligible");
  });

  it("子女年齡範圍：有 1 歲小孩符合 0～2 歲，不符合 2～6 歲", () => {
    const parent: Profile = { ...renter, hasChildren: true, childrenAges: [1] };
    expect(evaluate(makeSubsidy({ conditions: { has_children: true, child_age_max: 2 } }), parent).verdict).toBe("eligible");
    expect(evaluate(makeSubsidy({ conditions: { has_children: true, child_age_min: 2, child_age_max: 6 } }), parent).verdict).toBe("not_eligible");
  });

  it("懷孕中但還沒有小孩：0 歲起算的育兒補助歸 maybe，不直接排除", () => {
    const pregnant: Profile = { ...renter, hasChildren: false, isPregnantOrNewborn: true };
    const r = evaluate(makeSubsidy({ conditions: { has_children: true, child_age_max: 2 } }), pregnant);
    expect(r.verdict).toBe("maybe");
  });

  it("低收入戶條件：中低收不能領限低收的補助，但能領 mid_low 的", () => {
    const midLow: Profile = { ...renter, lowIncome: "mid_low" };
    expect(evaluate(makeSubsidy({ conditions: { low_income: "low" } }), midLow).verdict).toBe("not_eligible");
    expect(evaluate(makeSubsidy({ conditions: { low_income: "mid_low" } }), midLow).verdict).toBe("eligible");
    expect(evaluate(makeSubsidy({ conditions: { low_income: "either" } }), midLow).verdict).toBe("eligible");
  });

  it("名下有房不能領限無自有住宅的補助", () => {
    const owner: Profile = { ...renter, ownsHome: true, isRenting: false };
    const r = evaluate(makeSubsidy({ conditions: { no_home_ownership: true } }), owner);
    expect(r.verdict).toBe("not_eligible");
  });

  it("機車補助：只有汽車的人不符合", () => {
    const carOnly: Profile = { ...renter, ownsVehicle: "car" };
    expect(evaluate(makeSubsidy({ conditions: { owns_vehicle: "scooter" } }), carOnly).verdict).toBe("not_eligible");
    expect(evaluate(makeSubsidy({ conditions: { owns_vehicle: "scooter" } }), renter).verdict).toBe("eligible");
  });

  it("已結束的方案一律 not_eligible", () => {
    const r = evaluate(makeSubsidy({ status_2026: "ended" }), renter);
    expect(r.verdict).toBe("not_eligible");
    expect(r.failed).toContain("方案已結束");
  });

  it("is_elderly 代表 65 歲以上", () => {
    expect(evaluate(makeSubsidy({ conditions: { is_elderly: true } }), { ...renter, age: 70 }).verdict).toBe("eligible");
    expect(evaluate(makeSubsidy({ conditions: { is_elderly: true } }), { ...renter, age: 40 }).verdict).toBe("not_eligible");
  });
});

describe("evaluateAll", () => {
  it("排序：符合 → 可能 → 不符", () => {
    const list = [
      makeSubsidy({ id: "no", conditions: { min_age: 65 } }),
      makeSubsidy({ id: "maybe", conditions: { has_national_pension: true } }),
      makeSubsidy({ id: "yes" }),
    ];
    const r = evaluateAll(list, renter, { y: 2026, m: 11, d: 8 });
    expect(r.map((e) => e.subsidy.id)).toEqual(["yes", "maybe", "no"]);
  });
});

describe("deadline", () => {
  const today = { y: 2026, m: 11, d: 8 };

  it("每年 5/31 截止，在 11 月看是明年的 5/31", () => {
    const st = resolveDeadline({ type: "fixed_annual", start_month: 5, start_day: 1, end_month: 5, end_day: 31, note: "" }, today);
    expect(st.kind).toBe("upcoming");
    if (st.kind === "upcoming") {
      expect(st.date).toEqual({ y: 2027, m: 5, d: 31 });
      expect(st.open).toBe(false);
      expect(st.daysLeft).toBe(204);
    }
  });

  it("今天截止 → daysLeft 0", () => {
    const st = resolveDeadline({ type: "fixed_annual", start_month: null, start_day: null, end_month: 11, end_day: 8, note: "" }, today);
    expect(st.kind === "upcoming" && st.daysLeft === 0).toBe(true);
  });

  it("跨年的開放期間（12/1 ～ 1/31）在 12 月中視為開放", () => {
    const st = resolveDeadline({ type: "window", start_month: 12, start_day: 1, end_month: 1, end_day: 31, note: "" }, { y: 2026, m: 12, d: 15 });
    expect(st.kind === "upcoming" && st.open).toBe(true);
  });

  it("rolling 與 ended 沒有日期", () => {
    expect(resolveDeadline({ type: "rolling", start_month: null, start_day: null, end_month: null, end_day: null, note: "" }, today).kind).toBe("none");
    expect(resolveDeadline({ type: "ended", start_month: null, start_day: null, end_month: null, end_day: null, note: "" }, today).kind).toBe("ended");
  });

  it("2/30 會修正成當年 2 月最後一天", () => {
    const st = resolveDeadline({ type: "fixed_annual", start_month: null, start_day: null, end_month: 2, end_day: 30, note: "" }, { y: 2028, m: 1, d: 1 });
    expect(st.kind === "upcoming" && st.date.d).toBe(29);
  });

  it("describeWindow 文字", () => {
    expect(describeWindow({ type: "fixed_annual", start_month: 5, start_day: 1, end_month: 5, end_day: 31, note: "" })).toBe("每年 5/1 ～ 5/31");
    expect(describeWindow({ type: "budget_until_exhausted", start_month: null, start_day: null, end_month: null, end_day: null, note: "" })).toBe("額滿即止");
  });
});
