import { describe, expect, it } from "vitest";
import { buildDigest, renderDigest, moneyText, taipeiToday } from "../deadline-digest.mjs";

const TODAY = { y: 2026, m: 11, d: 16 };

function item(id, deadline, extra = {}) {
  return {
    id,
    name: id,
    short_name: id,
    city: null,
    category: "family",
    status_2026: "active",
    confidence: "high",
    unverified_fields: [],
    amount: { text: "每人 5,000 元", min: 5000, max: 5000, unit: "元", formula: null },
    deadline: { type: "window", start_month: null, start_day: null, end_month: null, end_day: null, ...deadline },
    ...extra,
  };
}

const ITEMS = [
  item("urgent", { start_year: 2026, start_month: 1, start_day: 1, end_year: 2026, end_month: 11, end_day: 20 }),
  item("closing", { start_year: 2026, start_month: 1, start_day: 1, end_year: 2026, end_month: 12, end_day: 10 }),
  item("opening", { start_year: 2026, start_month: 11, start_day: 26, end_year: 2026, end_month: 12, end_day: 31 }),
  // 每年固定、這一期 11/28 才開始：資料版本 11/15 之後才開始的期間是照上一期推算的
  item("projected", { type: "fixed_annual", start_month: 11, start_day: 28, end_month: 12, end_day: 15 }),
  item("unverified", { start_year: 2026, start_month: 1, start_day: 1, end_year: 2026, end_month: 11, end_day: 30 }, {
    unverified_fields: ["deadline.end_day（未公告）"],
  }),
  item("low", { start_year: 2026, start_month: 1, start_day: 1, end_year: 2026, end_month: 11, end_day: 30 }, { confidence: "low" }),
  item("ended", { start_year: 2026, start_month: 1, start_day: 1, end_year: 2026, end_month: 11, end_day: 30 }, { status_2026: "ended" }),
  item("far", { start_year: 2026, start_month: 1, start_day: 1, end_year: 2027, end_month: 3, end_day: 31 }),
  item("past", { start_year: 2026, start_month: 1, start_day: 1, end_year: 2026, end_month: 11, end_day: 1 }),
  item("rolling", { type: "rolling" }),
  item("tax", { start_year: 2026, start_month: 11, start_day: 1, end_year: 2026, end_month: 11, end_day: 30 }, {
    category: "tax",
    amount: { text: "地價稅 = 課稅地價 × 稅率", min: null, max: null, unit: null, formula: null },
  }),
  item("fine", { start_year: 2026, start_month: 1, start_day: 1, end_year: 2026, end_month: 12, end_day: 1 }, {
    category: "energy_transport",
    amount: { text: "逾期罰鍰 900～1,800 元", min: 900, max: 1800, unit: "元（罰鍰）", formula: null },
  }),
];

describe("每週期限摘要", () => {
  const digest = buildDigest(ITEMS, TODAY, "2026-11-15");
  const ids = (rows) => rows.map((r) => r.item.id);

  it("依剩幾天分組，結束、太遠、已過、隨到隨辦的不列", () => {
    expect(ids(digest.urgent)).toEqual(["urgent"]);
    expect(ids(digest.closing)).toEqual(["tax", "fine", "closing"]);
    expect(ids(digest.opening)).toEqual(["opening"]);
  });

  it("推算的日期、期限未驗證、可信度低的不進貼文，列在先查證", () => {
    expect(ids(digest.needsCheck).sort()).toEqual(["low", "projected", "unverified"]);
    const post = renderDigest(digest).split("## 先查證再貼")[0];
    for (const id of ["projected", "unverified", "low"]) expect(post).not.toContain(`/subsidy/${id}`);
  });

  it("繳稅與罰鍰的金額不寫進貼文", () => {
    expect(moneyText(ITEMS.find((i) => i.id === "tax"))).toBeNull();
    expect(moneyText(ITEMS.find((i) => i.id === "fine"))).toBeNull();
    expect(moneyText(ITEMS.find((i) => i.id === "urgent"))).toBe("5,000 元");
    const text = renderDigest(digest);
    expect(text).not.toContain("課稅地價");
    expect(text).not.toContain("罰鍰 900");
  });

  it("貼文寫明不是政府網站，日期照台灣時間", () => {
    const text = renderDigest(digest, "https://example.test");
    expect(text).toContain("不是政府網站");
    expect(text).toContain("11/20 截止，剩 4 天");
    expect(text).toContain("https://example.test/subsidy/urgent");
    const post = text.split("### Threads／Facebook（一則）")[1].split("```")[1];
    expect(post).toContain("不是政府網站");
    expect(post).not.toContain("官方");
  });

  it("UTC 週日 16:00 已是台灣週一", () => {
    expect(taipeiToday(new Date(Date.UTC(2026, 10, 15, 16, 0)))).toEqual({ y: 2026, m: 11, d: 16 });
  });
});
