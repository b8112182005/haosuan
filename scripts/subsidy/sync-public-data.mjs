#!/usr/bin/env node
/**
 * build 前把 src/data/subsidies.json 複製到 public/data/subsidies.json。
 * 網站部署後 app 會從 /data/subsidies.json 檢查更新，所以兩份必須一致。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = path.join(ROOT, "src/data/subsidies.json");
const dest = path.join(ROOT, "public/data/subsidies.json");

if (!fs.existsSync(src)) {
  console.error(`缺少 ${src}，先執行 npm run data:build`);
  process.exit(1);
}
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
const { version, items } = JSON.parse(fs.readFileSync(src, "utf8"));
console.log(`public/data/subsidies.json ← 版本 ${version}，${items.length} 個項目`);
