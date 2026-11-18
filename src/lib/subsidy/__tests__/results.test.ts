import { describe, it, expect } from "vitest";
import { evaluate, evaluateAll } from "../eligibility";
import { EMPTY_PROFILE, type Profile } from "../profile";
import { ACTIVE_SUBSIDY_INDEX } from "../index-data";
import { buildResultsView, reasonLine, toRow, PICK_CLOSING_DAYS, PICK_LIMIT, type ResultRow, type ResultsView } from "../results";
import { CATEGORY_ORDER, type SubsidySummary } from "../types";

const today = { y: 2026, m: 11, d: 19 };

function makeSummary(partial: Partial<SubsidySummary>): SubsidySummary {
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
    deadline: { type: "rolling", start_month: null, start_day: null, end_month: null, end_day: null, note: "" },
    status_2026: "active",
    confidence: "high",
    ...partial,
  };
}

/** 新北、32 歲、租屋、已婚、小孩 1 歲、有勞保、有機車、月收 4.2 萬：回報結果頁不好用時拿來重現的那組條件 */
const youngFamily: Profile = {
  ...EMPTY_PROFILE,
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

const rowOf = (subsidy: SubsidySummary, profile: Profile) => toRow(evaluate(subsidy, profile, today), today);
const ids = (rows: ResultRow[]) => rows.map((r) => r.evaluation.subsidy.id);

function everyId(view: ResultsView): string[] {
  return [
    ...view.benefits.flatMap((g) => [...ids(g.rows), ...ids(g.unlikely)]),
    ...ids(view.obligations.rows),
    ...ids(view.obligations.unlikely),
    ...ids(view.info.rows),
    ...ids(view.info.unlikely),
    ...view.excluded.flatMap((g) => ids(g.rows)),
  ];
}

describe("toRow：一項補助在結果頁算哪一種", () => {
  const adult = { ...EMPTY_PROFILE, age: 30, isUnemployed: false };

  it("對上至少一條條件才算相符", () => {
    expect(rowOf(makeSummary({ conditions: { min_age: 18 } }), adult).status).toBe("match");
  });

  it("沒有可以比對的門檻：遇到才用得上，不算相符", () => {
    expect(rowOf(makeSummary({ conditions: { other: "購買一級能效家電" } }), adult).status).toBe("situational");
  });

  it("有條件沒填：要確認", () => {
    expect(rowOf(makeSummary({ conditions: { must_rent: true } }), adult).status).toBe("check");
  });

  it("卡在試算沒問的身分：少數情形", () => {
    expect(rowOf(makeSummary({ conditions: { min_age: 18, special_identity: "原住民" } }), adult).status).toBe("unlikely");
  });

  it("不符合、只有條文的例外才適用：少數情形，不和要核對所得的項目排在一起", () => {
    const subsidy = makeSummary({ conditions: { is_unemployed: true, exceptions: { is_unemployed: "打工月收入沒超過基本工資仍可以領" } } });
    const evaluation = evaluate(subsidy, adult, today);
    expect(evaluation.verdict).toBe("maybe");
    expect(evaluation.excepted).toBe(1);
    expect(toRow(evaluation, today).status).toBe("unlikely");
  });

  it("確定不符：不符合", () => {
    expect(rowOf(makeSummary({ conditions: { min_age: 65 } }), adult).status).toBe("no");
  });

  it("還在受理而且有截止日才有剩餘天數；還沒開始的期間沒有", () => {
    const base = { type: "window" as const, start_month: null, start_day: null, note: "" };
    const open = makeSummary({ deadline: { ...base, end_month: 12, end_day: 31, end_year: 2026 } });
    const notYet = makeSummary({ deadline: { ...base, type: "fixed_annual", start_month: 5, start_day: 1, end_month: 5, end_day: 31 } });
    expect(rowOf(open, adult).daysLeft).toBe(42);
    expect(rowOf(notYet, adult).daysLeft).toBeNull();
    expect(rowOf(makeSummary({}), adult).daysLeft).toBeNull();
  });
});

describe("buildResultsView：用內建資料跑一組條件", () => {
  const view = buildResultsView(evaluateAll(ACTIVE_SUBSIDY_INDEX, youngFamily, today), today);
  const group = (category: string) => view.benefits.find((g) => g.category === category);

  it("每個項目剛好出現一次", () => {
    const all = everyId(view);
    expect(all.length).toBe(ACTIVE_SUBSIDY_INDEX.length);
    expect(new Set(all).size).toBe(all.length);
  });

  it("標題用的數字和清單的筆數一致", () => {
    const count = (status: string) => view.benefits.reduce((n, g) => n + g.rows.filter((r) => r.status === status).length, 0);
    expect(view.counts.match).toBe(count("match"));
    expect(view.counts.check).toBe(count("check"));
    expect(view.counts.situational).toBe(count("situational"));
    expect(view.counts.unlikely).toBe(view.benefits.reduce((n, g) => n + g.unlikely.length, 0));
    expect(view.counts.obligations).toBe(view.obligations.rows.length);
    expect(view.counts.info).toBe(view.info.rows.length);
    expect(view.counts.excluded).toBe(view.excluded.reduce((n, g) => n + g.rows.length, 0));
    for (const g of view.benefits) expect(g.match + g.check + g.situational).toBe(g.rows.length);
  });

  it("分類照固定順序，每個分類裡相符在前、要確認居中、遇到才用得上在後", () => {
    const order = view.benefits.map((g) => CATEGORY_ORDER.indexOf(g.category));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    const rank = { match: 0, check: 1, situational: 2, unlikely: 3, no: 4 };
    for (const g of view.benefits) {
      const ranks = g.rows.map((r) => rank[r.status]);
      expect(ranks, g.category).toEqual([...ranks].sort((a, b) => a - b));
      expect(g.rows.every((r) => r.status !== "unlikely" && r.status !== "no")).toBe(true);
      expect(g.unlikely.every((r) => r.status === "unlikely")).toBe(true);
    }
  });

  it("可以領的清單只有補助：須知和繳費期限各自一區", () => {
    const benefitIds = view.benefits.flatMap((g) => ids(g.rows));
    expect(benefitIds).not.toContain("rental-standard-lease-tenant-protections");
    expect(benefitIds).not.toContain("vehicle-license-tax-april");
    expect(ids(view.info.rows)).toContain("rental-standard-lease-tenant-protections");
    expect(ids(view.obligations.rows)).toContain("vehicle-license-tax-april");
    for (const g of view.benefits) expect(g.rows.every((r) => r.evaluation.subsidy.kind === "benefit")).toBe(true);
  });

  it("租金補貼要看全家所得：列在居住分類的要確認，不會被擠到另一張清單", () => {
    const row = group("housing")?.rows.find((r) => r.evaluation.subsidy.id === "rent-subsidy-central-300b");
    expect(row?.status).toBe("check");
    expect(reasonLine(row as ResultRow).text).toContain("要確認：");
  });

  it("原住民住宅補助、在職者的失業給付收在分類最後那一行", () => {
    expect(ids(group("housing")?.unlikely ?? [])).toContain("indigenous-housing-subsidies");
    expect(ids(group("labor")?.unlikely ?? [])).toContain("unemployment-benefit");
  });

  it("有時間壓力的項目：越晚送領越少的排最前，相符的在要確認的前面", () => {
    expect(view.picks.length).toBeGreaterThan(0);
    expect(view.picks.length).toBeLessThanOrEqual(PICK_LIMIT);
    expect(view.picks.slice(0, 2).map((p) => [p.row.evaluation.subsidy.id, p.why])).toEqual([
      ["childcare-allowance-0-2", "apply_now"],
      ["rent-subsidy-central-300b", "apply_now"],
    ]);
    expect(new Set(view.picks.map((p) => p.row.evaluation.subsidy.id)).size).toBe(view.picks.length);
    // 新北市電動機車補助、環境部汰舊換新在 60 天內截止，但要先買車或報廢舊車，不催
    expect(view.picks.map((p) => p.row.evaluation.subsidy.id)).not.toContain("new-taipei-electric-scooter-subsidy-2026");
    expect(view.picks.map((p) => p.row.evaluation.subsidy.id)).not.toContain("old-vehicle-replacement-moenv");
    expect(ids(group("energy_transport")?.rows ?? [])).toContain("old-vehicle-replacement-moenv");
    for (const p of view.picks) {
      expect(["match", "check"]).toContain(p.row.status);
      if (p.why === "closing") expect(p.row.daysLeft).toBeLessThanOrEqual(PICK_CLOSING_DAYS);
    }
  });

  it("不符合的項目照分類收著，每一列有原因", () => {
    expect(view.counts.excluded).toBeGreaterThan(0);
    for (const g of view.excluded) for (const r of g.rows) expect(reasonLine(r).tone).toBe("no");
  });
});

describe("buildResultsView：邊界", () => {
  it("什麼都沒填：沒有相符，也不替他挑哪幾項急", () => {
    const view = buildResultsView(evaluateAll(ACTIVE_SUBSIDY_INDEX, EMPTY_PROFILE, today), today);
    expect(view.counts.match).toBe(0);
    expect(view.picks).toEqual([]);
    expect(everyId(view).length).toBe(ACTIVE_SUBSIDY_INDEX.length);
  });

  it("截止日在 60 天內才算有時間壓力；遇到才用得上的項目不挑", () => {
    const window = (end_month: number, end_day: number, end_year: number) =>
      ({ type: "window" as const, start_month: null, start_day: null, end_month, end_day, end_year, note: "" });
    const items = [
      makeSummary({ id: "in-59", conditions: { min_age: 18 }, deadline: window(1, 17, 2027) }),
      makeSummary({ id: "in-61", conditions: { min_age: 18 }, deadline: window(1, 19, 2027) }),
      makeSummary({ id: "anyone-soon", conditions: {}, deadline: window(11, 30, 2026) }),
      makeSummary({ id: "unanswered-soon", conditions: { must_rent: true }, deadline: window(11, 30, 2026) }),
    ];
    const view = buildResultsView(evaluateAll(items, { ...EMPTY_PROFILE, age: 30 }, today), today);
    expect(view.picks.map((p) => p.row.evaluation.subsidy.id)).toEqual(["in-59"]);
  });

  it("要先買東西才領得到的補助不放進「先處理」，照常列在分類裡", () => {
    const soon = { type: "window" as const, start_month: null, start_day: null, end_month: 12, end_day: 31, end_year: 2026, note: "" };
    const items = [
      makeSummary({ id: "buy-scooter", category: "energy_transport", conditions: { min_age: 18 }, deadline: soon, needs_purchase: true }),
      makeSummary({ id: "culture-coin", category: "youth", conditions: { min_age: 18 }, deadline: soon }),
    ];
    const view = buildResultsView(evaluateAll(items, { ...EMPTY_PROFILE, age: 30 }, today), today);
    expect(view.picks.map((p) => p.row.evaluation.subsidy.id)).toEqual(["culture-coin"]);
    expect(view.benefits.flatMap((g) => ids(g.rows))).toContain("buy-scooter");
  });

  it("要確認的項目只差一條才放進「先處理」；差兩條以上多半是題目沒答完", () => {
    const soon = { type: "window" as const, start_month: null, start_day: null, end_month: 12, end_day: 31, end_year: 2026, note: "" };
    const items = [
      makeSummary({ id: "one-left", conditions: { min_age: 18, income_limit_type: "household_monthly", income_limit_note: "全家每人每月平均所得" }, deadline: soon }),
      makeSummary({ id: "two-left", conditions: { min_age: 18, must_rent: true, has_children: true }, deadline: soon }),
    ];
    const view = buildResultsView(evaluateAll(items, { ...EMPTY_PROFILE, age: 30 }, today), today);
    expect(view.picks.map((p) => p.row.evaluation.subsidy.id)).toEqual(["one-left"]);
  });

  it("限特定縣市的項目，縣市對上才放進「先處理」：只填年齡的人不會被催別的縣市的敬老卡", () => {
    const soon = { type: "window" as const, start_month: null, start_day: null, end_month: 12, end_day: 31, end_year: 2026, note: "" };
    const card = makeSummary({ id: "senior-card", city: "台北市", level: "local", conditions: { min_age: 65 }, deadline: soon });
    const onlyAge = buildResultsView(evaluateAll([card], { ...EMPTY_PROFILE, age: 70 }, today), today);
    expect(onlyAge.picks).toEqual([]);
    const taipei = buildResultsView(evaluateAll([card], { ...EMPTY_PROFILE, age: 70, city: "台北市" }, today), today);
    expect(taipei.picks.map((p) => p.row.evaluation.subsidy.id)).toEqual(["senior-card"]);
  });

  it("須知與工具的數字等於展開後列出的列數；最近的繳費期限剩幾天", () => {
    const soon = { type: "window" as const, start_month: null, start_day: null, end_month: 11, end_day: 30, end_year: 2026, note: "" };
    const items = [
      makeSummary({ id: "guide", kind: "info" }),
      makeSummary({ id: "guide-identity", kind: "info", conditions: { special_identity: "原住民" } }),
      makeSummary({ id: "tax-soon", kind: "obligation", deadline: soon }),
      makeSummary({ id: "tax-anytime", kind: "obligation" }),
    ];
    const view = buildResultsView(evaluateAll(items, { ...EMPTY_PROFILE, age: 30 }, today), today);
    expect(view.counts.info).toBe(2);
    expect([...view.info.rows, ...view.info.unlikely].length).toBe(2);
    expect(view.obligationsNearestDays).toBe(11);
    const none = buildResultsView(evaluateAll([items[3]], { ...EMPTY_PROFILE, age: 30 }, today), today);
    expect(none.obligationsNearestDays).toBeNull();
  });

  it("最多挑 5 項，近的在前", () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      makeSummary({
        id: `d${i}`,
        conditions: { min_age: 18 },
        deadline: { type: "window", start_month: null, start_day: null, end_month: 12, end_day: 20 - i, end_year: 2026, note: "" },
      }),
    );
    const view = buildResultsView(evaluateAll(items, { ...EMPTY_PROFILE, age: 30 }, today), today);
    expect(view.picks.map((p) => p.row.evaluation.subsidy.id)).toEqual(["d7", "d6", "d5", "d4", "d3"]);
  });
});

describe("reasonLine：每一列底下那一行", () => {
  const adult = { ...EMPTY_PROFILE, age: 30, city: "新北市" };

  it("相符：列出對上的條件", () => {
    const line = reasonLine(rowOf(makeSummary({ city: "新北市", conditions: { min_age: 18 } }), adult));
    expect(line).toEqual({ tone: "ok", text: "相符：設籍或居住新北市、18 歲以上" });
  });

  it("要確認：第一條，其餘只講還有幾條", () => {
    const line = reasonLine(rowOf(makeSummary({ conditions: { must_rent: true, has_labor_insurance: true } }), adult));
    expect(line.tone).toBe("ask");
    expect(line.text).toBe("要確認：限租屋者，你沒填住的狀況（另有 1 條）");
  });

  it("遇到才用得上：講對象是誰", () => {
    expect(reasonLine(rowOf(makeSummary({ eligibility: ["65 歲以上失能長者"] }), adult)).text).toBe("對象：65 歲以上失能長者");
    expect(reasonLine(rowOf(makeSummary({}), adult)).text).toBe("沒有年齡、縣市、身分門檻");
  });

  it("不符合：第一條不符的原因", () => {
    expect(reasonLine(rowOf(makeSummary({ conditions: { min_age: 65 } }), adult))).toEqual({ tone: "no", text: "限65 歲以上，你 30 歲" });
  });
});
