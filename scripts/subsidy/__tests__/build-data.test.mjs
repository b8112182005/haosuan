import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL("../build-data.mjs", import.meta.url));
const TAIPEI_TODAY = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
const addDays = (dateStr, n) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

const gov = (path) => ({ url: `https://www.example.gov.tw/${path}`, title: path, publisher: "某部會", accessed: "2026-11-18" });

function baseItem(extra = {}) {
  return {
    id: "t-item",
    name: "測試補助",
    short_name: "測試",
    category: "family",
    level: "central",
    city: null,
    agency: "某部會",
    summary: "測試用",
    eligibility: ["測試"],
    amount: { text: "每人 5,000 元", min: 5000, max: 5000, unit: "元", formula: null },
    conditions: {},
    documents: [],
    how_to_apply: [],
    channels: [],
    deadline: { type: "rolling" },
    faqs: [],
    pitfalls: [],
    related_calculator: null,
    official_url: "https://www.example.gov.tw/",
    sources: [gov("a")],
    status_2026: "active",
    last_known_update: null,
    confidence: "high",
    unverified_fields: [],
    ...extra,
  };
}

let root;
let counter = 0;

/** 每個案例用獨立的資料夾：腳本以自己的位置決定 ROOT，所以複製一份進去就不會碰到真的 src/data */
async function build({ item, dead = null }) {
  const dir = join(root, `case-${counter++}`);
  mkdirSync(join(dir, "scripts", "subsidy"), { recursive: true });
  mkdirSync(join(dir, "research", "topics"), { recursive: true });
  copyFileSync(SCRIPT, join(dir, "scripts", "subsidy", "build-data.mjs"));
  writeFileSync(join(dir, "research", "topics", "t.json"), JSON.stringify({ topic: "t", items: [item], general_faqs: [] }));
  if (dead) writeFileSync(join(dir, "research", "dead-urls.json"), JSON.stringify(dead));
  try {
    const { stdout, stderr } = await run(process.execPath, [join(dir, "scripts", "subsidy", "build-data.mjs")], { cwd: dir });
    const data = JSON.parse(readFileSync(join(dir, "src", "data", "subsidies.json"), "utf8"));
    return { ok: true, stdout, stderr, data };
  } catch (err) {
    return { ok: false, stderr: String(err.stderr ?? ""), stdout: String(err.stdout ?? "") };
  }
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "build-data-"));
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("late_consequence 與 year_end_notice 的失效連結", () => {
  const lc = (sources) => ({ text: "晚送少領", short: "晚送少領", apply_now: true, sources });
  const yn = (sources) => ({ from: "11-01", to: "12-31", title: "年底前", lines: ["要辦"], sources });

  it("失效的來源從 late_consequence、year_end_notice 拿掉，其餘來源留著", async () => {
    const dead = gov("dead").url;
    const r = await build({
      item: baseItem({ late_consequence: lc([gov("l1"), gov("dead"), gov("l2")]), year_end_notice: yn([gov("dead"), gov("y1")]) }),
      dead: [dead],
    });
    expect(r.stderr).toBe("");
    expect(r.ok).toBe(true);
    const [item] = r.data.items;
    expect(item.late_consequence.sources.map((s) => s.url)).toEqual([gov("l1").url, gov("l2").url]);
    expect(item.year_end_notice.sources.map((s) => s.url)).toEqual([gov("y1").url]);
  });

  it("過濾之後才數來源：兩筆 gov.tw 其中一筆失效，late_consequence 不再過關", async () => {
    const r = await build({ item: baseItem({ late_consequence: lc([gov("l1"), gov("dead")]) }), dead: [gov("dead").url] });
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain("late_consequence 要有一筆 law.moj.gov.tw 的法條，或兩筆 gov.tw 來源");
  });

  it("year_end_notice 唯一的來源失效：擋下", async () => {
    const r = await build({ item: baseItem({ year_end_notice: yn([gov("dead")]) }), dead: [gov("dead").url] });
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain("year_end_notice 至少要一筆 gov.tw 來源");
  });

  it("沒有 dead-urls 時照舊", async () => {
    const r = await build({ item: baseItem({ late_consequence: lc([gov("l1"), gov("l2")]) }) });
    expect(r.ok).toBe(true);
  });
});

describe("deadline.last_checked", () => {
  const withChecked = (v) => baseItem({ deadline: { type: "rolling", budget_limited: true, last_checked: v } });

  it("不存在的日期不通過", async () => {
    for (const v of ["2026-13-45", "2026-11-31", "2026-02-29", "2026-00-10"]) {
      const r = await build({ item: withChecked(v) });
      expect(r.ok, v).toBe(false);
      expect(r.stderr, v).toContain("deadline.last_checked");
      expect(r.stderr, v).toContain("存在的日期");
    }
  });

  it("晚於建置當天的台灣日期不通過；當天與更早的通過", async () => {
    const today = TAIPEI_TODAY();
    const future = await build({ item: withChecked(addDays(today, 1)) });
    expect(future.ok).toBe(false);
    expect(future.stderr).toContain("晚於建置當天");
    expect((await build({ item: withChecked(today) })).ok).toBe(true);
    expect((await build({ item: withChecked("2026-02-28") })).ok).toBe(true);
    expect((await build({ item: withChecked("2024-02-29") })).ok).toBe(true); // 閏日
  });
});

describe("year_end_notice.from／to", () => {
  const notice = (from, to) => ({ from, to, title: "年底前", lines: ["要辦"], sources: [gov("y")] });

  it("存在的月日通過（含 02-29、跨年）", async () => {
    for (const [from, to] of [["02-29", "03-31"], ["12-01", "01-31"], ["04-30", "06-30"]]) {
      expect((await build({ item: baseItem({ year_end_notice: notice(from, to) }) })).ok, `${from}~${to}`).toBe(true);
    }
  });

  it("02-30、04-31、06-31、09-31、11-31 不通過", async () => {
    for (const bad of ["02-30", "04-31", "06-31", "09-31", "11-31"]) {
      const asFrom = await build({ item: baseItem({ year_end_notice: notice(bad, "12-31") }) });
      expect(asFrom.ok, `from ${bad}`).toBe(false);
      expect(asFrom.stderr).toContain("year_end_notice.from／to");
      expect((await build({ item: baseItem({ year_end_notice: notice("01-01", bad) }) })).ok, `to ${bad}`).toBe(false);
    }
  });
});

describe("officialSourcesOk 先用網址去重", () => {
  it("同一個 gov.tw 網址貼兩次只算一筆，late_consequence 不過關", async () => {
    const a = gov("same");
    const r = await build({ item: baseItem({ late_consequence: { text: "x", short: "x", apply_now: false, sources: [a, { ...a, title: "另一個標題" }] } }) });
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain("late_consequence");
  });

  it("結尾斜線與 #片段不同的同一頁也只算一筆", async () => {
    const a = gov("same");
    const sources = [a, { ...a, url: `${a.url}/` }, { ...a, url: `${a.url}#top` }];
    const r = await build({ item: baseItem({ late_consequence: { text: "x", short: "x", apply_now: false, sources } }) });
    expect(r.ok).toBe(false);
  });

  it("兩個不同網址照舊通過；一筆法條原文也通過", async () => {
    const two = await build({ item: baseItem({ late_consequence: { text: "x", short: "x", apply_now: false, sources: [gov("a"), gov("b")] } }) });
    expect(two.ok).toBe(true);
    const law = { url: "https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=A", title: "法條" };
    const one = await build({ item: baseItem({ late_consequence: { text: "x", short: "x", apply_now: false, sources: [law] } }) });
    expect(one.ok).toBe(true);
  });
});
