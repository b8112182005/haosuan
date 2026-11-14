import { describe, expect, it } from "vitest";
import { isNewerDataset } from "../version";

const local = { version: "2026-11-15", generatedAt: "2026-11-14T22:00:00.000Z", hash: "aaaa" };

describe("遠端資料是否比內建的新", () => {
  it("版本日期較新就是新，較舊就不是", () => {
    expect(isNewerDataset({ version: "2026-11-16", generated_at: "x", hash: "bbbb" }, local)).toBe(true);
    expect(isNewerDataset({ version: "2026-11-14", generated_at: "2099-01-01T00:00:00.000Z", hash: "bbbb" }, local)).toBe(false);
  });

  it("同一天重建：內容不同而且比較晚產生才算新", () => {
    expect(isNewerDataset({ version: "2026-11-15", generated_at: "2026-11-15T03:00:00.000Z", hash: "bbbb" }, local)).toBe(true);
    // 內容一樣：重跑建置不算更新
    expect(isNewerDataset({ version: "2026-11-15", generated_at: "2026-11-15T03:00:00.000Z", hash: "aaaa" }, local)).toBe(false);
    // 內容不同但比內建的早產生：網站還沒部署到 app 打包時的那一版
    expect(isNewerDataset({ version: "2026-11-15", generated_at: "2026-11-14T20:00:00.000Z", hash: "bbbb" }, local)).toBe(false);
  });

  it("舊格式的資料沒有雜湊：同一天視為沒有更新", () => {
    expect(isNewerDataset({ version: "2026-11-15", generated_at: "2026-11-15T03:00:00.000Z" }, local)).toBe(false);
  });
});
