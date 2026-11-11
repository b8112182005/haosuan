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
    expect(r.unknown[0]).toContain("全家資料");
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

describe("evaluate：真實資料的寫法", () => {
  it("conditions.other 只進 notes，不把 eligible 降成 maybe", () => {
    const r = evaluate(makeSubsidy({ conditions: { must_rent: true, other: "須有租賃契約且租期涵蓋申請月份" } }), renter);
    expect(r.verdict).toBe("eligible");
    expect(r.notes).toEqual(["須有租賃契約且租期涵蓋申請月份"]);
  });

  it("owns_vehicle 中文描述：汽車或機車任一即可", () => {
    const s = makeSubsidy({ conditions: { owns_vehicle: "汽車或機車（電動車免徵）" } });
    expect(evaluate(s, renter).verdict).toBe("eligible");
    expect(evaluate(s, { ...renter, ownsVehicle: "car" }).verdict).toBe("eligible");
    expect(evaluate(s, { ...renter, ownsVehicle: "none" }).verdict).toBe("not_eligible");
  });

  it("owns_vehicle 寫 optional 或在講動產計算時不是持有條件", () => {
    const noCar = { ...renter, ownsVehicle: "none" as const };
    expect(evaluate(makeSubsidy({ conditions: { owns_vehicle: "optional" } }), noCar).verdict).toBe("eligible");
    expect(evaluate(makeSubsidy({ conditions: { owns_vehicle: "汽車列入動產計算（高雄市把車輛列入動產）" } }), noCar).verdict).toBe("eligible");
  });

  it("owns_vehicle：只寫機車的項目，只有汽車的人不符合", () => {
    const s = makeSubsidy({ conditions: { owns_vehicle: "持有出廠滿 10 年以上的燃油機車" } });
    expect(evaluate(s, { ...renter, ownsVehicle: "car" }).verdict).toBe("not_eligible");
    expect(evaluate(s, renter).verdict).toBe("eligible");
  });

  it("所得門檻類型是中文「借款人本人年所得總額」時，用月收入 × 12 比", () => {
    const s = makeSubsidy({ conditions: { income_limit_type: "借款人本人年所得總額", income_limit_value: 2_000_000 } });
    expect(evaluate(s, renter).verdict).toBe("eligible");
    expect(evaluate(s, { ...renter, monthlyIncome: 200_000 }).verdict).toBe("not_eligible");
  });

  it("annual_personal 也是個人年所得", () => {
    const s = makeSubsidy({ conditions: { income_limit_type: "annual_personal", income_limit_value: 500_000 } });
    expect(evaluate(s, renter).verdict).toBe("eligible"); // 40,000 × 12 = 480,000
    expect(evaluate(s, { ...renter, monthlyIncome: 45_000 }).verdict).toBe("not_eligible");
  });

  it("每人每月平均（per_capita）與家庭年所得不能用個人收入判斷 → maybe", () => {
    for (const type of ["per_capita_monthly", "monthly_per_capita", "household_annual_and_per_capita_monthly", "家庭年所得（依戶籍地縣市標準）", "家庭年所得與每人每月平均所得"]) {
      const r = evaluate(makeSubsidy({ conditions: { income_limit_type: type, income_limit_value: 39_960 } }), { ...renter, monthlyIncome: 500_000 });
      expect(r.verdict, type).toBe("maybe");
    }
  });

  it("tax_rate 門檻顯示為稅率說明，不當成金額比", () => {
    const r = evaluate(makeSubsidy({ conditions: { income_limit_type: "tax_rate", income_limit_value: 20, income_limit_note: "適用稅率20%以上不能扣" } }), renter);
    expect(r.verdict).toBe("maybe");
    expect(r.unknown[0]).toContain("稅率");
    expect(r.failed).toEqual([]);
  });

  it("is_elderly 附了 min_age 就照 min_age（勞保老年給付 60 歲）", () => {
    const s = makeSubsidy({ conditions: { is_elderly: true, min_age: 60 } });
    expect(evaluate(s, { ...renter, age: 62 }).verdict).toBe("eligible");
    expect(evaluate(s, { ...renter, age: 59 }).verdict).toBe("not_eligible");
  });

  it("全國項目附的 cities 是代表縣市：不在清單內歸 maybe，不是不符合", () => {
    const s = makeSubsidy({ city: null, conditions: { cities: ["台北市", "高雄市"] } });
    expect(evaluate(s, renter).verdict).toBe("eligible");
    const r = evaluate(s, { ...renter, city: "花蓮縣" });
    expect(r.verdict).toBe("maybe");
    expect(r.unknown[0]).toContain("花蓮縣");
  });

  it("給兒少的項目：家長本人超齡，但子女在範圍內 → maybe", () => {
    const hpv = makeSubsidy({ conditions: { min_age: 12, max_age: 15 } });
    const parent = { ...renter, age: 40, hasChildren: true, childrenAges: [13] };
    expect(evaluate(hpv, parent).verdict).toBe("maybe");
    expect(evaluate(hpv, { ...renter, age: 40 }).verdict).toBe("not_eligible");
    // 成人項目不套用這條：子女 30 歲不會讓 65 歲以上的項目變 maybe
    const senior = makeSubsidy({ conditions: { min_age: 65 } });
    expect(evaluate(senior, { ...renter, age: 40, hasChildren: true, childrenAges: [12] }).verdict).toBe("not_eligible");
  });
});

describe("evaluate：家長替子女查", () => {
  it("學生項目：本人不是學生但有學齡子女 → maybe", () => {
    const loan = makeSubsidy({ conditions: { is_student: true } });
    const parent = { ...renter, hasChildren: true, childrenAges: [17] };
    expect(evaluate(loan, parent).verdict).toBe("maybe");
    expect(evaluate(loan, renter).verdict).toBe("not_eligible");
    expect(evaluate(loan, { ...renter, isStudent: true }).verdict).toBe("eligible");
    // 3 歲還沒上學，不算
    expect(evaluate(loan, { ...renter, hasChildren: true, childrenAges: [3] }).verdict).toBe("not_eligible");
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
