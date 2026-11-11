#!/usr/bin/env node
/**
 * 檢查補助資料裡的網址還活著嗎。
 *
 *   node scripts/subsidy/check-urls.mjs [--only official] [--out report.json]
 *
 * 會打：每個項目的 official_url、channels[].url、sources[].url、faqs[].source_url，以及一般問答的 source_url。
 * 用 curl（會吃 HTTPS_PROXY 與系統憑證），同時 8 條連線。
 *
 * 分類：
 *   ok           2xx／3xx
 *   blocked      401／403／405／406／429／5xx —— 多半是政府網站擋自動化請求，人用瀏覽器開得了，列出來但不算壞
 *   unreachable  連線逾時或被重設 —— 不少 .gov.tw 只收台灣 IP，從國外機房（CI、雲端容器）打不到；在台灣的電腦上重跑才準
 *   broken       404／410，或網域不存在（DNS 查不到）
 *
 * 結束碼：official_url 有 broken 時為 1（那是「前往官方申請頁」按鈕，壞掉最傷）。
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const only = argValue("--only", "all");
const outFile = argValue("--out", null);

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/subsidies.json"), "utf8"));

/** url → [{ id, field }] */
const refs = new Map();
const add = (url, id, field) => {
  if (typeof url !== "string" || !/^https?:\/\//.test(url)) return;
  if (!refs.has(url)) refs.set(url, []);
  refs.get(url).push({ id, field });
};
for (const item of data.items) {
  add(item.official_url, item.id, "official_url");
  if (only === "official") continue;
  for (const c of item.channels) add(c.url, item.id, "channel");
  for (const s of item.sources) add(s.url, item.id, "source");
  for (const f of item.faqs) add(f.source_url, item.id, "faq");
}
if (only !== "official") for (const f of data.general_faqs) add(f.source_url, "(general faq)", "faq");

function curl(url) {
  return new Promise((resolve) => {
    execFile(
      "curl",
      ["-sS", "-L", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "25", "--connect-timeout", "10",
        "-A", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36", url],
      { timeout: 40_000 },
      (err, stdout, stderr) => {
        const code = Number(String(stdout).trim().slice(-3)) || 0;
        resolve({ code, error: code === 0 ? String(stderr || err?.message || "").trim().slice(0, 120) : null });
      }
    );
  });
}

function classify(code, error) {
  if (code >= 200 && code < 400) return "ok";
  if (code === 404 || code === 410) return "broken";
  if (code === 0) return /Could not resolve host/i.test(error ?? "") ? "broken" : "unreachable";
  return "blocked";
}

const urls = [...refs.keys()];
const results = [];
let cursor = 0;
async function worker() {
  while (cursor < urls.length) {
    const url = urls[cursor++];
    let r = await curl(url);
    if (r.code === 0) r = await curl(url); // 連不上再試一次，排除一次性的網路抖動
    results.push({ url, ...r, status: classify(r.code, r.error), refs: refs.get(url) });
    if (results.length % 50 === 0) console.error(`  ${results.length}/${urls.length}`);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));

const by = (status) => results.filter((r) => r.status === status);
const broken = by("broken");
const blocked = by("blocked");
const unreachable = by("unreachable");
console.log(`共 ${urls.length} 個網址：正常 ${by("ok").length}、被擋 ${blocked.length}、從這台機器連不到 ${unreachable.length}、失效 ${broken.length}`);

const describe = (r) => {
  const where = [...new Set(r.refs.map((x) => `${x.id}:${x.field}`))].slice(0, 4).join(", ");
  return `  [${r.code || "ERR"}] ${r.url}\n        ← ${where}${r.error ? `\n        ${r.error}` : ""}`;
};
if (broken.length) {
  console.log("\n失效：");
  for (const r of broken) console.log(describe(r));
}
if (unreachable.length) {
  console.log("\n從這台機器連不到（逾時或連線被重設；在台灣的網路重跑確認）：");
  for (const r of unreachable) console.log(`  ${r.url}`);
}
if (blocked.length) {
  console.log("\n被擋（人工可開，僅供參考）：");
  for (const r of blocked) console.log(`  [${r.code}] ${r.url}`);
}

if (outFile) fs.writeFileSync(outFile, JSON.stringify({ checked_at: new Date().toISOString(), results }, null, 2));

const brokenOfficial = broken.filter((r) => r.refs.some((x) => x.field === "official_url"));
process.exit(brokenOfficial.length > 0 ? 1 : 0);
