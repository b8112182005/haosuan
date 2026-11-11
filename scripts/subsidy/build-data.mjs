#!/usr/bin/env node
/**
 * 把研究流程的輸出合併成 app 使用的資料檔。
 *
 *   node scripts/subsidy/build-data.mjs [--research research] [--version YYYY-MM-DD]
 *
 * 讀取順序：
 *   <research>/topics/<topic>.json  研究員原始輸出（items + general_faqs）
 *   <research>/verified/<id>.json   核對員重寫後的完整 item（有的話整筆取代）
 *   <research>/patches/<id>.json    核對員的重點核對結果：corrections（path + 新值）與 verified_at
 *   <research>/overrides.json       人工覆寫（{ "<id>": { ...欄位 } }），最後套用
 *   <research>/removed.json         要排除的 id 清單（跨主題重複、已失效的項目）
 *
 * 輸出 src/data/subsidies.json 與 public/data/subsidies.json（兩份相同）。
 * 這支腳本會做 schema 檢查：缺必要欄位、enum 值不對、id 重複都會直接失敗，不讓壞資料進 app。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const researchDir = path.resolve(ROOT, argValue("--research", "research"));
const today = new Date().toISOString().slice(0, 10);
const version = argValue("--version", today);

const CATEGORIES = ["housing", "family", "tax", "labor", "senior_disability", "energy_transport", "youth", "health", "low_income", "other"];
const CATEGORY_ORDER = ["housing", "family", "tax", "labor", "youth", "health", "senior_disability", "low_income", "energy_transport", "other"];
const LEVELS = ["central", "local"];
const STATUSES = ["active", "ended", "pending", "unknown"];
const CONFIDENCES = ["high", "medium", "low"];
const DEADLINE_TYPES = ["fixed_annual", "rolling", "window", "budget_until_exhausted", "event_based", "ended", "unknown"];
const CHANNEL_TYPES = ["online", "office", "mail", "phone", "app", "bank", "other"];
const REQUIRED = [
  "id", "name", "short_name", "category", "level", "city", "agency", "summary", "eligibility", "amount", "conditions",
  "documents", "how_to_apply", "channels", "deadline", "faqs", "pitfalls", "related_calculator", "official_url",
  "sources", "status_2026", "last_known_update", "confidence", "unverified_fields",
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function listJson(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => path.join(dir, f));
}

const problems = [];
function check(cond, msg) {
  if (!cond) problems.push(msg);
}

function validateItem(item, origin) {
  const where = `${origin} → ${item?.id ?? "(no id)"}`;
  for (const key of REQUIRED) check(key in item, `${where}: 缺欄位 ${key}`);
  check(/^[a-z0-9-]+$/.test(item.id ?? ""), `${where}: id 格式錯誤`);
  check(CATEGORIES.includes(item.category), `${where}: category「${item.category}」不在清單`);
  check(LEVELS.includes(item.level), `${where}: level 錯誤`);
  check(STATUSES.includes(item.status_2026), `${where}: status_2026 錯誤`);
  check(CONFIDENCES.includes(item.confidence), `${where}: confidence 錯誤`);
  check(item.deadline && DEADLINE_TYPES.includes(item.deadline.type), `${where}: deadline.type 錯誤`);
  check(typeof item.official_url === "string" && /^https?:\/\//.test(item.official_url), `${where}: official_url 不是網址`);
  check(Array.isArray(item.sources) && item.sources.length > 0, `${where}: sources 為空`);
  check(typeof item.amount?.text === "string", `${where}: amount.text 缺`);
  for (const c of item.channels ?? []) check(CHANNEL_TYPES.includes(c.type), `${where}: channel type「${c.type}」錯誤`);
  for (const f of item.faqs ?? []) check(typeof f.q === "string" && typeof f.a === "string", `${where}: faq 格式錯誤`);
  // 常見的「忘了標未驗證」：confidence low 但 unverified_fields 空
  if (item.confidence === "low") check((item.unverified_fields ?? []).length > 0, `${where}: confidence=low 但沒列 unverified_fields`);
}

function normalizeItem(item) {
  // 把研究員可能漏掉的選填欄位補成 null/空陣列，避免前端 undefined
  const d = item.deadline ?? {};
  return {
    ...item,
    short_name: item.short_name || item.name,
    city: item.city ?? null,
    eligibility: item.eligibility ?? [],
    amount: { text: "", min: null, max: null, unit: null, formula: null, ...(item.amount ?? {}) },
    conditions: item.conditions ?? {},
    documents: item.documents ?? [],
    how_to_apply: item.how_to_apply ?? [],
    channels: (item.channels ?? []).map((c) => ({ type: c.type, label: c.label, url: c.url ?? null })),
    deadline: {
      type: d.type ?? "unknown",
      start_month: d.start_month ?? null,
      start_day: d.start_day ?? null,
      end_month: d.end_month ?? null,
      end_day: d.end_day ?? null,
      note: d.note ?? "",
    },
    faqs: (item.faqs ?? []).map((f) => ({ q: f.q, a: f.a, source_url: f.source_url ?? null })),
    pitfalls: item.pitfalls ?? [],
    related_calculator: item.related_calculator ?? null,
    sources: (item.sources ?? []).map((s) => ({ url: s.url, title: s.title, publisher: s.publisher ?? null, accessed: s.accessed ?? null })),
    last_known_update: item.last_known_update ?? null,
    unverified_fields: item.unverified_fields ?? [],
    verified_at: item.verified_at ?? null,
    verification_summary: item.verification_summary ?? null,
  };
}

// 1. 讀 topics
const topics = listJson(path.join(researchDir, "topics")).map((f) => ({ file: f, data: readJson(f) }));
if (topics.length === 0) {
  console.error(`找不到研究輸出：${path.join(researchDir, "topics")} 沒有 JSON`);
  process.exit(1);
}

// 2. 讀 verified / removed / overrides
const verified = new Map();
for (const f of listJson(path.join(researchDir, "verified"))) {
  const v = readJson(f);
  if (v && typeof v === "object" && v.id) verified.set(v.id, v);
}
// 重點核對補丁：只允許改這些欄位，型別不對的修正直接略過（印警告），不讓核對員的筆誤弄壞資料
const patches = new Map();
for (const f of listJson(path.join(researchDir, "patches"))) {
  const v = readJson(f);
  if (v && typeof v === "object" && v.id) patches.set(v.id, v);
}
const warnings = [];
const isNumOrNull = (v) => v === null || (typeof v === "number" && Number.isFinite(v));
const PATCH_RULES = {
  "amount.text": (v) => typeof v === "string" && v.length > 0,
  "amount.min": isNumOrNull,
  "amount.max": isNumOrNull,
  "amount.unit": (v) => v === null || typeof v === "string",
  "amount.formula": (v) => v === null || typeof v === "string",
  "deadline.type": (v) => DEADLINE_TYPES.includes(v),
  "deadline.start_month": (v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 12),
  "deadline.end_month": (v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 12),
  "deadline.start_day": (v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 31),
  "deadline.end_day": (v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 31),
  "deadline.note": (v) => typeof v === "string",
  status_2026: (v) => STATUSES.includes(v),
  official_url: (v) => typeof v === "string" && /^https?:\/\//.test(v),
  summary: (v) => typeof v === "string" && v.length > 0,
};

function applyPatch(item, patch) {
  const out = structuredClone(item);
  let applied = 0;
  for (const c of patch.corrections ?? []) {
    const rule = PATCH_RULES[c.path];
    let value;
    try {
      value = JSON.parse(c.new_value_json);
    } catch {
      value = c.new_value_json; // 核對員忘了加引號的字串
    }
    if (!rule || !rule(value)) {
      warnings.push(`${item.id}: 略過修正 ${c.path} = ${String(c.new_value_json).slice(0, 60)}（欄位不允許或型別不符）`);
      continue;
    }
    const [head, tail] = c.path.split(".");
    if (tail) out[head] = { ...out[head], [tail]: value };
    else out[head] = value;
    applied++;
  }
  if (patch.verdict === "confirmed" || patch.verdict === "corrected") {
    out.verified_at = patch.verified_at ?? null;
    out.verification_summary = patch.summary ?? null;
  }
  return { item: out, applied };
}

const removedFile = path.join(researchDir, "removed.json");
const removed = new Set(fs.existsSync(removedFile) ? readJson(removedFile) : []);
const overridesFile = path.join(researchDir, "overrides.json");
const overrides = fs.existsSync(overridesFile) ? readJson(overridesFile) : {};

// 3. 合併
const items = [];
const generalFaqs = [];
const seen = new Map();
let verifiedCount = 0;
let patchedCount = 0;
let correctionCount = 0;
let overrideCount = 0;
const seenFaq = new Set();
for (const { file, data } of topics) {
  const topic = data.topic ?? path.basename(file, ".json");
  for (const raw of data.items ?? []) {
    if (removed.has(raw.id)) continue;
    let item = raw;
    if (verified.has(raw.id)) {
      item = verified.get(raw.id);
      verifiedCount++;
    }
    item = normalizeItem({ ...item, topic });
    if (patches.has(raw.id)) {
      const r = applyPatch(item, patches.get(raw.id));
      item = r.item;
      correctionCount += r.applied;
      if (item.verified_at) patchedCount++;
    }
    if (overrides[raw.id]) {
      // _why 只是給人看的理由，不進資料；conditions／amount／deadline 逐欄合併，其餘欄位整個取代
      const { _why, ...ov } = overrides[raw.id];
      void _why;
      for (const [key, value] of Object.entries(ov)) {
        const nested = ["conditions", "amount", "deadline"].includes(key) && value && typeof value === "object";
        item = { ...item, [key]: nested ? { ...item[key], ...value } : value };
      }
      overrideCount++;
    }
    validateItem(item, path.basename(file));
    if (seen.has(item.id)) {
      problems.push(`id 重複：${item.id}（${seen.get(item.id)} 與 ${path.basename(file)}）`);
      continue;
    }
    seen.set(item.id, path.basename(file));
    items.push(item);
  }
  for (const f of data.general_faqs ?? []) {
    if (!f?.q || !f?.a) continue;
    // 不同主題的研究員會寫到同一題（例如「房東不同意可以申請嗎」），留先出現的那則
    const key = f.q.replace(/[\s？?。，,！!]/g, "");
    if (seenFaq.has(key)) continue;
    seenFaq.add(key);
    generalFaqs.push({ q: f.q, a: f.a, source_url: f.source_url ?? null, tags: Array.isArray(f.tags) ? f.tags : [], topic });
  }
}

for (const id of Object.keys(overrides)) check(seen.has(id) || removed.has(id), `overrides.json 的 ${id} 不存在於任何主題檔`);

if (problems.length > 0) {
  console.error(`資料檢查失敗（${problems.length} 個問題）：`);
  for (const p of problems) console.error(" -", p);
  process.exit(1);
}

// 4. 排序：分類順序 → 全國在前 → 名稱
items.sort((a, b) => {
  const c = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
  if (c !== 0) return c;
  const l = (a.level === "central" ? 0 : 1) - (b.level === "central" ? 0 : 1);
  if (l !== 0) return l;
  return a.name.localeCompare(b.name, "zh-Hant");
});

const dataset = { version, generated_at: new Date().toISOString(), items, general_faqs: generalFaqs };
const json = JSON.stringify(dataset, null, 2) + "\n";
for (const out of ["src/data/subsidies.json", "public/data/subsidies.json"]) {
  const target = path.join(ROOT, out);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, json);
}

const byCat = {};
for (const i of items) byCat[i.category] = (byCat[i.category] ?? 0) + 1;
console.log(`版本 ${version}：${items.length} 個項目、${generalFaqs.length} 則一般問答、${topics.length} 個主題檔`);
console.log(`二次核對：${patchedCount + verifiedCount} 個項目（補丁修正 ${correctionCount} 個欄位）；人工覆寫 ${overrideCount} 個項目；排除 ${removed.size} 個重複項目`);
for (const w of warnings) console.warn("警告：", w);
console.log("分類：", Object.entries(byCat).map(([k, v]) => `${k} ${v}`).join("，"));
console.log(`信心：high ${items.filter((i) => i.confidence === "high").length}／medium ${items.filter((i) => i.confidence === "medium").length}／low ${items.filter((i) => i.confidence === "low").length}`);
