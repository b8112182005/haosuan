import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * 完整補助資料約 1 MB。只要有一個 client component（或它 import 的模組）碰到 lib/subsidy/data，
 * 整包資料就會進 client bundle，或被當成 props 序列化進每個頁面的 HTML。
 * 這個測試掃過 src/，確保只有 server component 與測試會 import 它。
 */

const SRC = path.resolve(__dirname, "../../..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(SRC).map((file) => ({ file, rel: path.relative(SRC, file), source: fs.readFileSync(file, "utf8") }));
const importsFullData = (source: string) =>
  /from\s+["'](@\/lib\/subsidy\/data|\.\/data|\.\.\/data|@\/data\/subsidies\.json)["']/.test(source);

describe("完整補助資料不進 client bundle", () => {
  it("\"use client\" 的檔案不 import lib/subsidy/data 或 subsidies.json", () => {
    const offenders = files
      .filter((f) => /^\s*["']use client["']/.test(f.source) && importsFullData(f.source))
      .map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it("lib/subsidy 裡會被 client 用到的模組（index-data、remote、eligibility、deadline、format、profile、useToday）也不 import 它", () => {
    const shared = ["index-data.ts", "remote.ts", "eligibility.ts", "deadline.ts", "format.ts", "profile.ts", "useToday.ts"];
    const offenders = files
      .filter((f) => f.rel.startsWith(path.join("lib", "subsidy")) && shared.includes(path.basename(f.file)) && importsFullData(f.source))
      .map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it("精簡索引與完整資料是同一版、同一批項目", () => {
    const full = JSON.parse(fs.readFileSync(path.join(SRC, "data/subsidies.json"), "utf8"));
    const index = JSON.parse(fs.readFileSync(path.join(SRC, "data/subsidies-index.json"), "utf8"));
    expect(index.version).toBe(full.version);
    expect(index.items.map((i: { id: string }) => i.id)).toEqual(full.items.map((i: { id: string }) => i.id));
    // 索引不該帶問答與來源，那些只在詳情頁用
    expect(Object.keys(index.items[0])).not.toContain("faqs");
    expect(Object.keys(index.items[0])).not.toContain("sources");
  });
});
