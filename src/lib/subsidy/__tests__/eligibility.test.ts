import { describe, it, expect } from "vitest";
import { evaluate, evaluateAll } from "../eligibility";
import { EMPTY_PROFILE, type Profile } from "../profile";
import type { Subsidy } from "../types";
import { resolveDeadline, describeWindow, isProjected, parseDateString } from "../deadline";

function makeSubsidy(partial: Partial<Subsidy>): Subsidy {
  return {
    id: "test",
    name: "測試補助",
    short_name: "測試",
    category: "other",
    kind: "benefit",
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

describe("evaluate：精靈沒有問的身分", () => {
  it("also_requires：試算沒問的硬條件不列為條件相符，並把那一句寫出來", () => {
    const loan = makeSubsidy({ conditions: { has_labor_insurance: true, also_requires: "勞保年資合計滿 15 年" } });
    const r = evaluate(loan, { ...renter, hasLaborInsurance: true });
    expect(r.verdict).toBe("maybe");
    expect(r.matched).toContain("勞保被保險人");
    expect(r.unknown).toEqual(["勞保年資合計滿 15 年（試算沒問）"]);
    expect(r.excepted).toBe(0);
    // 試算問得到的條件不符時照樣判不符合，不會被這一句拉回來
    expect(evaluate(loan, { ...renter, hasLaborInsurance: false }).verdict).toBe("not_eligible");
  });

  it("還沒開辦的項目（status pending）不列為條件相符", () => {
    const upcoming = makeSubsidy({ status_2026: "pending", conditions: { has_children: true, child_age_max: 18 } });
    const r = evaluate(upcoming, { ...renter, hasChildren: true, childrenAges: [3] });
    expect(r.verdict).toBe("maybe");
    expect(r.unknown.join(" ")).toContain("還沒開辦");
    expect(evaluate(upcoming, { ...renter, hasChildren: false }).verdict).toBe("not_eligible");
  });

  it("限在職：有收入或有勞保才算；沒收入也沒勞保的人不算在職，列要確認", () => {
    const leave = makeSubsidy({ conditions: { is_employed: true } });
    const base = { ...renter, isUnemployed: false };
    expect(evaluate(leave, { ...base, monthlyIncome: 40000, hasLaborInsurance: false }).matched).toContain("在職");
    expect(evaluate(leave, { ...base, monthlyIncome: 0, hasLaborInsurance: true }).matched).toContain("在職");
    const homemaker = evaluate(leave, { ...base, monthlyIncome: 0, hasLaborInsurance: false });
    expect(homemaker.verdict).toBe("maybe");
    expect(homemaker.unknown.join(" ")).toContain("沒有收入也沒有勞保");
    expect(evaluate(leave, { ...base, isUnemployed: true }).verdict).toBe("not_eligible");
    const blank = evaluate(leave, { ...EMPTY_PROFILE });
    expect(blank.unknown).toEqual(["限在職者，你沒填"]);
  });

  it("列冊低收、中低收入戶免審所得：所得門檻那一條直接算對上", () => {
    const allowance = makeSubsidy({
      conditions: { is_disabled: true, income_limit_type: "monthly_per_capita", income_limit_value: 39960, income_limit_note: "每人每月未達最低生活費 2.5 倍", low_income_skips_income_test: true },
    });
    const listed = evaluate(allowance, { ...renter, isDisabled: true, lowIncome: "mid_low" });
    expect(listed.verdict).toBe("eligible");
    expect(listed.matched).toContain("列冊中低收入戶，免再審收入與財產");
    // 不是列冊戶的人仍然要自己核對全家所得
    const other = evaluate(allowance, { ...renter, isDisabled: true, lowIncome: "none" });
    expect(other.verdict).toBe("maybe");
    expect(other.unknown.join(" ")).toContain("要用全家資料核對");
  });

  it("任一身分即可（any_of）：對上的列為條件相符；都沒對上不判不符合", () => {
    const premium = makeSubsidy({ conditions: { any_of: ["low_income", "is_disabled"] } });
    expect(evaluate(premium, { ...renter, lowIncome: "low" }).matched).toEqual(["低收入戶"]);
    expect(evaluate(premium, { ...renter, lowIncome: "none", isDisabled: true }).matched).toEqual(["領有身心障礙證明"]);
    const neither = evaluate(premium, { ...renter, lowIncome: "none", isDisabled: false });
    expect(neither.verdict).toBe("eligible");
    expect(neither.matched).toEqual([]);
    expect(neither.failed).toEqual([]);
  });

  it("子女在學的提示：高中以上的項目，國小的孩子不提示", () => {
    const loan = makeSubsidy({ conditions: { is_student: true, student_child_min_age: 15 } });
    const parent = { ...renter, isStudent: false, hasChildren: true };
    expect(evaluate(loan, { ...parent, childrenAges: [7] }).verdict).toBe("not_eligible");
    const teen = evaluate(loan, { ...parent, childrenAges: [7, 16] });
    expect(teen.verdict).toBe("maybe");
    expect(teen.unknown[0]).toContain("16 歲");
    expect(teen.unknown[0]).not.toContain("7");
  });

  it("special_identity 一律歸可能符合，並說明要自行確認", () => {
    const r = evaluate(makeSubsidy({ conditions: { min_age: 65, special_identity: "農民（農保年資 15 年以上）" } }), { ...renter, age: 70 });
    expect(r.verdict).toBe("maybe");
    expect(r.unknown.some((u) => u.includes("農民") && u.includes("自行確認"))).toBe(true);
    // 其他條件確定不符時仍然是不符合
    expect(evaluate(makeSubsidy({ conditions: { min_age: 65, special_identity: "農民" } }), renter).verdict).toBe("not_eligible");
  });
});

describe("evaluate：特定身分的年齡放寬（lower_age_for）", () => {
  const card = makeSubsidy({ conditions: { min_age: 65, lower_age_for: { age: 55, who: "原住民" } } });

  it("年齡在放寬門檻與一般門檻之間 → maybe，並說明是哪個身分", () => {
    const r = evaluate(card, { ...renter, age: 58 });
    expect(r.verdict).toBe("maybe");
    expect(r.failed).toEqual([]);
    expect(r.unknown.some((u) => u.includes("原住民") && u.includes("55") && u.includes("65"))).toBe(true);
    // 剛好等於放寬門檻也算
    expect(evaluate(card, { ...renter, age: 55 }).verdict).toBe("maybe");
  });

  it("低於放寬門檻仍然不符合；達到一般門檻直接相符", () => {
    expect(evaluate(card, { ...renter, age: 54 }).verdict).toBe("not_eligible");
    const r = evaluate(card, { ...renter, age: 65 });
    expect(r.verdict).toBe("eligible");
    expect(r.unknown).toEqual([]);
  });

  it("其他條件確定不符時，年齡放寬不會把結果拉回可能符合", () => {
    const local = makeSubsidy({ city: "高雄市", conditions: { min_age: 65, lower_age_for: { age: 55, who: "原住民" } } });
    expect(evaluate(local, { ...renter, age: 58 }).verdict).toBe("not_eligible");
  });

  it("沒有設 lower_age_for 的項目維持原本行為", () => {
    expect(evaluate(makeSubsidy({ conditions: { min_age: 65 } }), { ...renter, age: 58 }).verdict).toBe("not_eligible");
  });
});

describe("evaluate：硬條件的例外（conditions.exceptions）", () => {
  const maternity = makeSubsidy({
    conditions: { has_labor_insurance: true, exceptions: { has_labor_insurance: "退保後 1 年內生產也可以領" } },
  });

  it("不符合有例外的條件 → 可能符合，並把例外講出來", () => {
    const r = evaluate(maternity, { ...renter, hasLaborInsurance: false });
    expect(r.verdict).toBe("maybe");
    expect(r.failed).toEqual([]);
    expect(r.unknown.some((u) => u.includes("你沒有勞保") && u.includes("例外：退保後 1 年內生產也可以領"))).toBe(true);
  });

  it("符合條件時照常列為相符，不會多出待確認", () => {
    const r = evaluate(maternity, { ...renter, hasLaborInsurance: true });
    expect(r.verdict).toBe("eligible");
    expect(r.unknown).toEqual([]);
  });

  it("別的條件沒有例外時，照樣判不符合", () => {
    const s = makeSubsidy({
      conditions: { has_labor_insurance: true, must_rent: true, exceptions: { has_labor_insurance: "退保後 1 年內生產也可以領" } },
    });
    const r = evaluate(s, { ...renter, hasLaborInsurance: false, isRenting: false });
    expect(r.verdict).toBe("not_eligible");
    expect(r.failed).toEqual(["限租屋者，你不是租屋"]);
  });

  it("年齡、名下有房、低收、失業的例外都會生效", () => {
    const cases: Array<[Parameters<typeof makeSubsidy>[0]["conditions"], Partial<Profile>]> = [
      [{ min_age: 18, exceptions: { age: "未成年已結婚也可以" } }, { age: 17 }],
      [{ no_home_ownership: true, exceptions: { no_home_ownership: "小面積共有房屋不算" } }, { ownsHome: true }],
      [{ low_income: "either", exceptions: { low_income: "領有指定津貼的人也算" } }, { lowIncome: "none" }],
      [{ is_unemployed: true, exceptions: { is_unemployed: "打工收入低於基本工資仍可領" } }, { isUnemployed: false }],
      [{ must_own_home: true, exceptions: { must_own_home: "只有土地也要繳" } }, { ownsHome: false }],
    ];
    for (const [conditions, patch] of cases) {
      const r = evaluate(makeSubsidy({ conditions }), { ...renter, ...patch });
      expect(r.verdict, JSON.stringify(conditions)).toBe("maybe");
      expect(r.unknown.join(" "), JSON.stringify(conditions)).toContain("例外：");
    }
  });

  it("地方項目的縣市與方案已結束沒有例外", () => {
    const local = makeSubsidy({ city: "高雄市", conditions: { exceptions: { age: "不相干" } } });
    expect(evaluate(local, renter).verdict).toBe("not_eligible");
    const ended = makeSubsidy({ status_2026: "ended", conditions: { exceptions: { age: "不相干" } } });
    expect(evaluate(ended, renter).verdict).toBe("not_eligible");
  });
});

describe("evaluate：資料寫 false 的條件是「不能有」", () => {
  it("限沒有勞保、國保的人（無保險生母補助）", () => {
    const s = makeSubsidy({ conditions: { is_pregnant_or_newborn: true, has_labor_insurance: false, has_national_pension: false } });
    const mom = { ...renter, isPregnantOrNewborn: true };
    const insured = evaluate(s, { ...mom, hasLaborInsurance: true, hasNationalPension: false });
    expect(insured.verdict).toBe("not_eligible");
    expect(insured.failed).toEqual(["限沒有勞保的人，你有勞保"]);
    expect(evaluate(s, { ...mom, hasLaborInsurance: false, hasNationalPension: true }).verdict).toBe("not_eligible");
    expect(evaluate(s, { ...mom, hasLaborInsurance: false, hasNationalPension: false }).verdict).toBe("eligible");
    expect(evaluate(s, { ...mom, hasLaborInsurance: null, hasNationalPension: null }).verdict).toBe("maybe");
  });

  it("限未在學的人", () => {
    const s = makeSubsidy({ conditions: { is_student: false } });
    expect(evaluate(s, { ...renter, isStudent: true }).verdict).toBe("not_eligible");
    expect(evaluate(s, { ...renter, isStudent: false }).verdict).toBe("eligible");
    expect(evaluate(s, { ...renter, isStudent: null }).verdict).toBe("maybe");
  });

  it("is_employed:false 等同限沒有工作的人", () => {
    const s = makeSubsidy({ conditions: { is_employed: false } });
    expect(evaluate(s, { ...renter, isUnemployed: false }).verdict).toBe("not_eligible");
    expect(evaluate(s, { ...renter, isUnemployed: true }).verdict).toBe("eligible");
  });

  it("must_own_home:false、is_elderly:false 沒有意義，不影響結果", () => {
    const s = makeSubsidy({ conditions: { must_own_home: false, is_elderly: false } });
    expect(evaluate(s, { ...renter, ownsHome: true, age: 80 }).verdict).toBe("eligible");
  });
});

describe("evaluate：所得門檻、懷孕、期限已過", () => {
  it("有所得門檻類型但沒有數字：歸可能符合並顯示門檻說明", () => {
    const s = makeSubsidy({ conditions: { must_rent: true, income_limit_type: "per_capita_monthly", income_limit_note: "每人每月平均所得低於最低生活費 3 倍" } });
    const r = evaluate(s, { ...renter, monthlyIncome: 300_000 });
    expect(r.verdict).toBe("maybe");
    expect(r.unknown.join(" ")).toContain("每人每月平均所得低於最低生活費 3 倍");
  });

  it("門檻類型是 none、列冊身分，或根本沒寫類型時不算條件", () => {
    for (const income_limit_type of ["none", "listed_household", null]) {
      const s = makeSubsidy({ conditions: { income_limit_type, income_limit_note: "不排富" } });
      expect(evaluate(s, renter).verdict, String(income_limit_type)).toBe("eligible");
    }
  });

  it("懷第二胎：現在的孩子超過年齡，0 歲起算的子女條件歸可能符合", () => {
    const s = makeSubsidy({ conditions: { has_children: true, child_age_min: 0, child_age_max: 2 } });
    const pregnantWithOlder = { ...renter, hasChildren: true, childrenAges: [5], isPregnantOrNewborn: true };
    const r = evaluate(s, pregnantWithOlder);
    expect(r.verdict).toBe("maybe");
    expect(r.unknown.join(" ")).toContain("出生後即符合");
    // 沒有懷孕就照常不符合；條件不是從 0 歲起算的也不適用
    expect(evaluate(s, { ...pregnantWithOlder, isPregnantOrNewborn: false }).verdict).toBe("not_eligible");
    const school = makeSubsidy({ conditions: { has_children: true, child_age_min: 6, child_age_max: 12 } });
    expect(evaluate(school, pregnantWithOlder).verdict).toBe("not_eligible");
  });

  it("給了今天的日期時，期限已過的項目判不符合", () => {
    const s = makeSubsidy({
      deadline: { type: "window", start_month: 1, start_day: 1, end_month: 12, end_day: 31, end_year: 2026, note: "" },
    });
    expect(evaluate(s, renter, { y: 2026, m: 12, d: 31 }).verdict).toBe("eligible");
    const after = evaluate(s, renter, { y: 2027, m: 1, d: 1 });
    expect(after.verdict).toBe("not_eligible");
    expect(after.failed[0]).toContain("申請期限已過");
    // 沒給日期（單筆判斷）不看期限
    expect(evaluate(s, renter).verdict).toBe("eligible");
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
    expect(describeWindow({ type: "window", start_month: 1, start_day: 1, end_month: 12, end_day: 31, end_year: 2030, note: "" })).toBe("到 2030/12/31 為止");
    expect(describeWindow({ type: "window", start_month: 8, start_day: 1, start_year: 2026, end_month: 7, end_day: 31, end_year: 2029, note: "" })).toBe("2026/8/1 ～ 2029/7/31");
    expect(describeWindow({ type: "varies", start_month: null, start_day: null, end_month: null, end_day: null, note: "" })).toContain("依公告");
  });

  it("還沒開始的期間，標籤講哪一天開始；每年固定的加「每年」", () => {
    const annual = resolveDeadline({ type: "fixed_annual", start_month: 5, start_day: 1, end_month: 5, end_day: 31, note: "" }, today);
    expect(annual.label).toBe("每年 5/1 開始");
    const once = resolveDeadline({ type: "window", start_month: 12, start_day: 15, end_month: 1, end_day: 2, note: "" }, today);
    expect(once.label).toBe("12/15 開始");
    expect(once.kind === "upcoming" && once.open).toBe(false);
  });

  it("有 end_year 的多年期方案：不會被算成今年底截止", () => {
    // 電動車免徵牌照稅到 2030/12/31
    const st = resolveDeadline({ type: "window", start_month: 1, start_day: 1, end_month: 12, end_day: 31, end_year: 2030, note: "" }, today);
    expect(st.kind).toBe("upcoming");
    if (st.kind === "upcoming") {
      expect(st.date).toEqual({ y: 2030, m: 12, d: 31 });
      expect(st.open).toBe(true);
      expect(st.daysLeft).toBeGreaterThan(1400);
      // 超過一年不顯示「剩 N 天」
      expect(st.label).toBe("2030/12/31 截止");
    }
    // 沒有年份的同一組月日會被算成今年底
    const naive = resolveDeadline({ type: "window", start_month: 1, start_day: 1, end_month: 12, end_day: 31, note: "" }, today);
    expect(naive.kind === "upcoming" && naive.date.y).toBe(2026);
  });

  it("有 start_year 與 end_year：期間內是開放、開始前不是、結束後不滾到下一年", () => {
    const loan = { type: "window" as const, start_month: 8, start_day: 1, start_year: 2026, end_month: 7, end_day: 31, end_year: 2029, note: "" };
    const during = resolveDeadline(loan, today);
    expect(during.kind === "upcoming" && during.open && during.date.y === 2029).toBe(true);
    const before = resolveDeadline(loan, { y: 2026, m: 7, d: 1 });
    expect(before.kind === "upcoming" && !before.open).toBe(true);
    expect(before.label).toBe("8/1 開始");
    const after = resolveDeadline(loan, { y: 2029, m: 8, d: 1 });
    expect(after.kind).toBe("ended");
    expect(after.label).toContain("2029/7/31");
    // 一年內到期時照常顯示剩幾天
    const near = resolveDeadline(loan, { y: 2029, m: 7, d: 1 });
    expect(near.label).toBe("剩 30 天");
  });

  it("一年有兩段期間：開放中的優先，都沒開放就取最快開始的那一段", () => {
    // 就學貸款：上學期 8/1～9/30、下學期 1/15～2 月底
    const loan = {
      type: "fixed_annual" as const,
      start_month: 8,
      start_day: 1,
      end_month: 9,
      end_day: 30,
      extra_windows: [{ start_month: 1, start_day: 15, end_month: 2, end_day: 28 }],
      note: "",
    };
    const november = resolveDeadline(loan, { y: 2026, m: 11, d: 15 });
    expect(november.kind === "upcoming" && !november.open).toBe(true);
    expect(november.label).toBe("每年 1/15 開始");
    if (november.kind === "upcoming") expect(november.date).toEqual({ y: 2027, m: 2, d: 28 });

    const february = resolveDeadline(loan, { y: 2027, m: 2, d: 1 });
    expect(february.kind === "upcoming" && february.open).toBe(true);
    expect(february.label).toBe("剩 27 天");

    const august = resolveDeadline(loan, { y: 2027, m: 8, d: 20 });
    expect(august.kind === "upcoming" && august.open && august.date.m === 9).toBe(true);

    const march = resolveDeadline(loan, { y: 2027, m: 3, d: 10 });
    expect(march.label).toBe("每年 8/1 開始");
    expect(describeWindow(loan)).toBe("每年 8/1 ～ 9/30、1/15 ～ 2/28");
  });

  it("varies 不給日期", () => {
    const st = resolveDeadline({ type: "varies", start_month: null, start_day: null, end_month: null, end_day: null, note: "" }, today);
    expect(st).toEqual({ kind: "none", label: "依公告為準" });
  });

  it("isProjected：資料整理完之後才開始的期間是照上一期推算的", () => {
    const dataDate = parseDateString("2026-11-14")!;
    const tax = { type: "fixed_annual" as const, start_month: 5, start_day: 1, end_month: 5, end_day: 31, note: "" };
    expect(isProjected(tax, resolveDeadline(tax, today), dataDate)).toBe(true);
    // 資料整理時已經開始的期間（台北幸福租 4/8 ～ 隔年 3/31）是公告過的日期
    const topup = { type: "window" as const, start_month: 4, start_day: 8, end_month: 3, end_day: 31, note: "" };
    expect(isProjected(topup, resolveDeadline(topup, today), dataDate)).toBe(false);
    // 12/15 才開始的下一期：開放後仍然是推算的
    const loan = { type: "fixed_annual" as const, start_month: 12, start_day: 15, end_month: 1, end_day: 2, note: "" };
    expect(isProjected(loan, resolveDeadline(loan, { y: 2026, m: 12, d: 20 }), dataDate)).toBe(true);
    // 寫明年份的一次性期間不是推算
    const ev = { type: "window" as const, start_month: 1, start_day: 1, end_month: 12, end_day: 31, end_year: 2030, note: "" };
    expect(isProjected(ev, resolveDeadline(ev, today), dataDate)).toBe(false);
    expect(parseDateString("2026/11/14")).toBeNull();
  });
});
