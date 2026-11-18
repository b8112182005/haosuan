import { describe, expect, it } from "vitest";
import { buildDigest, buildYearEnd, renderDigest, moneyText, taipeiToday } from "../deadline-digest.mjs";

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

describe("經費有限的標註", () => {
  it("budget_limited 為 true 的項目，那一行後面加「經費用完會提前結束」，其他不加", () => {
    const items = [
      item("limited", { start_year: 2026, start_month: 1, start_day: 1, end_year: 2026, end_month: 11, end_day: 20, budget_limited: true }),
      item("flagged-false", { start_year: 2026, start_month: 1, start_day: 1, end_year: 2026, end_month: 11, end_day: 21, budget_limited: false }),
      item("plain", { start_year: 2026, start_month: 1, start_day: 1, end_year: 2026, end_month: 11, end_day: 22 }),
    ];
    const text = renderDigest(buildDigest(items, TODAY, "2026-11-15"), "https://example.test");
    expect(text).toContain("limited：11/20 截止，剩 4 天；5,000 元（經費用完會提前結束）　https://example.test/subsidy/limited");
    expect(text.match(/經費用完會提前結束/g)).toHaveLength(3); // 清單、Threads 貼文、LINE 訊息各一次
    expect(text).toContain("flagged-false：11/21 截止，剩 5 天；5,000 元　");
    expect(text).toContain("plain：11/22 截止，剩 6 天；5,000 元　");
  });
});

describe("年底提醒", () => {
  const notice = (from, to, extra = {}) => ({
    from,
    to,
    title: "年底前要辦的事",
    lines: ["11/1～12/31 受理", "逾期不補發"],
    sources: [],
    ...extra,
  });
  const withNotice = (id, n, extra = {}) => item(id, { type: "rolling" }, { year_end_notice: n, ...extra });

  it("區間含頭尾；跨年區間（from 比 to 晚）涵蓋年底與年初", () => {
    const items = [withNotice("a", notice("11-01", "12-31"))];
    expect(buildYearEnd(items, { y: 2026, m: 11, d: 1 })).toHaveLength(1);
    expect(buildYearEnd(items, { y: 2026, m: 12, d: 31 })).toHaveLength(1);
    expect(buildYearEnd(items, { y: 2026, m: 10, d: 31 })).toHaveLength(0);
    expect(buildYearEnd(items, { y: 2027, m: 1, d: 1 })).toHaveLength(0);

    const crossYear = [withNotice("b", notice("12-01", "01-31"))];
    for (const [m, d] of [[12, 1], [12, 31], [1, 1], [1, 31]]) expect(buildYearEnd(crossYear, { y: 2026, m, d }), `${m}/${d}`).toHaveLength(1);
    for (const [m, d] of [[11, 30], [2, 1], [6, 15]]) expect(buildYearEnd(crossYear, { y: 2026, m, d }), `${m}/${d}`).toHaveLength(0);
  });

  it("只收 status_2026 是 active 的，格式錯的區間略過", () => {
    const items = [
      withNotice("ended", notice("11-01", "12-31"), { status_2026: "ended" }),
      withNotice("pending", notice("11-01", "12-31"), { status_2026: "pending" }),
      withNotice("bad", notice("11/01", "12-31")),
      withNotice("ok", notice("11-01", "12-31")),
    ];
    expect(buildYearEnd(items, TODAY).map((r) => r.item.id)).toEqual(["ok"]);
  });

  it("放在「14 天內開始受理」之後，每項一個 text 區塊：標題、逐行內文、資格與文件連結、聲明", () => {
    const digest = buildDigest([withNotice("rent", notice("11-01", "12-31"))], TODAY, "2026-11-15");
    const text = renderDigest(digest, "https://example.test");
    expect(text).toContain("## 年底提醒（1）");
    expect(text.indexOf("## 14 天內開始受理")).toBeLessThan(text.indexOf("## 年底提醒"));
    expect(text.indexOf("## 年底提醒")).toBeLessThan(text.indexOf("## 貼文草稿"));
    const block = text.split("## 年底提醒（1）")[1].split("```text\n")[1].split("\n```")[0];
    expect(block).toBe(
      [
        "年底前要辦的事",
        "11/1～12/31 受理",
        "逾期不補發",
        "資格與文件：https://example.test/subsidy/rent",
        "這是我整理的免費工具，不是政府網站；申請前以主管機關公告為準。",
      ].join("\n"),
    );
  });

  it("今天不在區間內就寫「無」，不影響貼文草稿", () => {
    const digest = buildDigest([withNotice("rent", notice("12-01", "12-31"))], TODAY, "2026-11-15");
    expect(renderDigest(digest)).toContain("## 年底提醒（0）\n\n無\n");
  });
});
