import { describe, expect, it } from "vitest";
import sitemap from "../sitemap";
import { DATA_VERSION, SUBSIDY_INDEX } from "../../lib/subsidy/index-data";

const entries = sitemap();
const paths = entries.map((e) => new URL(e.url).pathname);
const SUBSIDY_STATIC = new Set(["/subsidy/check", "/subsidy/faq", "/subsidy/calendar"]);

describe("sitemap", () => {
  it("每個補助項目一個網址", () => {
    const detail = paths.filter((p) => p.startsWith("/subsidy/") && !SUBSIDY_STATIC.has(p));
    expect(detail.length).toBe(SUBSIDY_INDEX.length);
    for (const s of SUBSIDY_INDEX) expect(paths).toContain(`/subsidy/${s.id}`);
  });

  it("補助列表、試算、問答、時程表、關於、隱私權頁都在", () => {
    for (const p of ["/subsidy", "/subsidy/check", "/subsidy/faq", "/subsidy/calendar", "/about", "/privacy"]) {
      expect(paths).toContain(p);
    }
  });

  it("網址沒有重複", () => {
    expect(new Set(entries.map((e) => e.url)).size).toBe(entries.length);
  });

  it("補助相關頁面的 lastModified 是資料版本，不是 build 當天", () => {
    const subsidyEntries = entries.filter((e) => /\/(subsidy|about|privacy)(\/|$)/.test(new URL(e.url).pathname));
    expect(subsidyEntries.length).toBeGreaterThan(SUBSIDY_INDEX.length);
    for (const e of subsidyEntries) expect(e.lastModified).toBe(DATA_VERSION);
  });
});
