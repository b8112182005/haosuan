// 把 deadline-digest.mjs 產的貼文，請本機 Ollama 改寫成不同語氣，再用程式檢查有沒有改到事實。
//   node scripts/marketing/post-variants.mjs digest.md
//   cat digest.md | node scripts/marketing/post-variants.mjs --tones "口語，像朋友提醒|正式，適合社團公告"
//
// 為什麼要檢查：本機模型會把 11/30 寫成 12/30，也會順手加一句「官方公告」。
// 貼文會被轉傳，錯的日期收不回來，所以沒通過的不輸出內文。
// 只用 Node 內建模組，維護者的 Windows 電腦不用 npm install。
//
// 這道檢查擋得到的（逐行綁定，不是只比整篇的數字集合）：
//   - 原文每個含日期、金額或網址的行，改寫裡要有一行數字與網址完全相同（重複次數也相同）。
//     兩項的日期或金額互換，整篇的數字集合沒變，但每一行的數字對不上，會被擋。
//   - 有「：」的行，冒號前的項目名稱要出現在同一行（含網址的行不查，那一行冒號前是「申請網址」這類說明，不是項目名）。
//     項目名稱互換會被擋。
//   - 同一行裡「截止」「開始」各出現幾次，要和原文那一行相同。把「截止」改成「開始」會被擋。
//   - 改寫裡不能多出含數字或網址的行；不能出現原文沒有的國字數字加單位（「三千元」「十二月」）。
//   - 長度不到原文的 0.6 倍：多半是把沒有數字的條件句整句刪掉了。
//   - 沒有「不是政府網站」、出現「官方」等禁用詞、長度超過原文 1.5 倍。
// 擋不到的：
//   - 沒有數字的句子被改了意思（「要先申請」改成「不用申請」、「可以」改成「不可以」）。
//   - 沒有數字的條件句只刪一小句，整體長度仍在 0.6 倍以上。
//   - 項目名稱以外的名詞被換掉、同義詞造成的語氣問題。
//   - 把兩行合成一行、或把一行拆成兩行：數字對不上，會被擋，但那是誤擋，不是看得懂意思。
// 所以通過檢查之後，貼之前仍然要自己讀一遍。
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { generate, pickModel, resolveHost } from "../local/ollama.mjs";

export const DEFAULT_TONES = ["口語，像朋友提醒", "正式，適合社團公告"];
export const DISCLAIMER = "不是政府網站";
export const BANNED_WORDS = ["官方", "保證", "政府推出", "一定領得到"];
export const MAX_LENGTH_RATIO = 1.5;
// 刪掉沒有數字的條件句，逐行綁定看不出來，只能看整體變短多少
export const MIN_LENGTH_RATIO = 0.6;
export const REVIEW_NOTE = "通過檢查只代表日期、金額、網址、項目名稱沒被改動，貼之前仍要讀一遍。";
// 國字數字加單位：「三千元」「十二月底」是新事實，阿拉伯數字的檢查抓不到
const CJK_NUMBER_WITH_UNIT = /[一二三四五六七八九十百千萬兩〇零]+(?:元|日|月|年|天|號|名|戶|倍|成)/g;
const POST_HEADING = "### Threads／Facebook（一則）";

/** 取出「### Threads／Facebook（一則）」底下第一個 ```text 區塊；找不到回傳 null */
export function extractPost(markdown) {
  const at = markdown.indexOf(POST_HEADING);
  if (at < 0) return null;
  const rest = markdown.slice(at + POST_HEADING.length);
  const match = rest.match(/```text[^\S\r\n]*\r?\n([\s\S]*?)\r?\n```/);
  return match ? match[1].trim() : null;
}

const TRAILING_PUNCT = /[。，、；：！？,.;:!?）)\]」』”’"'>》】]+$/;

function toHalfWidth(text) {
  return text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/／/g, "/");
}

/** 網址：貼文裡網址後面常緊接「。」或「）」，不去掉的話同一個網址會被當成兩種 */
export function extractUrls(text) {
  return [...toHalfWidth(text).matchAll(/https?:\/\/[^\s]+/g)].map((m) => m[0].replace(TRAILING_PUNCT, ""));
}

/**
 * 數字記號：11/30 當一個記號、5,000 去掉逗號、900～1,800 與 900-1,800 拆成兩個。
 * 網址先拿掉，因為 /subsidy/rent-300b 裡的數字不是貼文要保留的事實。
 */
export function extractNumbers(text) {
  const withoutUrls = toHalfWidth(text).replace(/https?:\/\/[^\s]+/g, " ");
  return [...withoutUrls.matchAll(/\d+(?:,\d{3})*(?:\.\d+)?(?:\/\d+)*/g)].map((m) => m[0].replace(/,/g, ""));
}

/** 網址加數字記號，排序後回傳（保留重複，所以「5,000 元」寫成兩次也看得出來） */
export function factTokens(text) {
  return [...extractUrls(text), ...extractNumbers(text)].sort();
}

/** 兩個陣列各自多出來的項目（保留重複次數） */
function multisetDiff(source, variant) {
  const counts = new Map();
  for (const t of source) counts.set(t, (counts.get(t) ?? 0) + 1);
  const extra = [];
  for (const t of variant) {
    const n = counts.get(t) ?? 0;
    if (n > 0) counts.set(t, n - 1);
    else extra.push(t);
  }
  const missing = [];
  for (const [t, n] of counts) for (let i = 0; i < n; i++) missing.push(t);
  return { extra: extra.sort(), missing: missing.sort() };
}

function diffReason(label, { extra, missing }) {
  const parts = [];
  if (extra.length) parts.push(`多了 ${extra.join("、")}`);
  if (missing.length) parts.push(`少了 ${missing.join("、")}`);
  return `${label}和原文不同：${parts.join("；")}`;
}

const LIST_MARK = /^\s*(?:\d+\s*[.、)）]\s*|[・•\-*]\s*)/;

/** 行首的編號或項目符號拿掉，冒號（全形）前面的字當項目名稱；沒有冒號或含網址的行回傳 null */
function itemName(line) {
  if (extractUrls(line).length > 0) return null;
  const body = line.replace(LIST_MARK, "");
  const at = body.indexOf("：");
  if (at <= 0) return null;
  const name = body.slice(0, at).trim();
  return name || null;
}

function countOf(text, word) {
  return text.split(word).length - 1;
}

function clip(line) {
  const text = line.trim();
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

/**
 * 逐行綁定：原文每個含數字或網址的行，改寫裡要有一行的數字與網址完全相同；
 * 項目名稱、「截止」「開始」的次數也要在同一行對得上。回傳不通過的原因。
 */
function checkLines(source, variant) {
  const reasons = [];
  const factLines = (text) =>
    text
      .split(/\r?\n/)
      .map((line) => ({ line, key: factTokens(line).join("\u0001") }))
      .filter((l) => l.key !== "");
  const used = new Set();
  const variantLines = factLines(variant);
  for (const src of factLines(source)) {
    const candidates = variantLines.filter((v) => !used.has(v) && v.key === src.key);
    if (candidates.length === 0) {
      reasons.push(`原文這一行的日期、金額、網址，改寫裡沒有同一組數字在同一行（可能和別的項目互換了）：「${clip(src.line)}」`);
      continue;
    }
    const name = itemName(src.line);
    const problemsOf = (v) => {
      const found = [];
      if (name && !v.line.includes(name)) found.push(`項目名稱「${name}」沒出現在同一行（可能和別的項目互換了）：「${clip(v.line)}」`);
      for (const word of ["截止", "開始"]) {
        const want = countOf(src.line, word);
        const got = countOf(v.line, word);
        if (want !== got) found.push(`「${word}」在這一行出現 ${got} 次，原文是 ${want} 次：「${clip(v.line)}」`);
      }
      return found;
    };
    // 同一組數字有多行時，挑問題最少的那一行配對，避免順序不同就誤判
    const best = candidates.map((v) => ({ v, found: problemsOf(v) })).sort((a, b) => a.found.length - b.found.length)[0];
    used.add(best.v);
    reasons.push(...best.found);
  }
  for (const v of variantLines) {
    if (!used.has(v)) reasons.push(`改寫裡多了一行含數字或網址、原文沒有對應的行：「${clip(v.line)}」`);
  }
  return reasons;
}

/** 改寫稿過不過關。reasons 空陣列才算 ok */
export function checkVariant(source, variant) {
  const reasons = [];
  const numbers = multisetDiff(extractNumbers(source), extractNumbers(variant));
  if (numbers.extra.length || numbers.missing.length) reasons.push(diffReason("數字", numbers));
  const urls = multisetDiff(extractUrls(source), extractUrls(variant));
  // 整篇的數字網址不同時，原因已經寫在上面；沒有不同才逐行查，抓「集合沒變、位置變了」的改寫
  if (urls.extra.length || urls.missing.length) reasons.push(diffReason("網址", urls));
  else if (!numbers.extra.length && !numbers.missing.length) reasons.push(...checkLines(source, variant));
  const sourceCjk = new Set(source.match(CJK_NUMBER_WITH_UNIT) ?? []);
  const newCjk = [...new Set(variant.match(CJK_NUMBER_WITH_UNIT) ?? [])].filter((t) => !sourceCjk.has(t));
  if (newCjk.length) reasons.push(`出現原文沒有的國字數字：${newCjk.map((t) => `「${t}」`).join("、")}（新增的日期或金額不能靠模型自己加）`);
  if (!variant.includes(DISCLAIMER)) reasons.push(`沒有「${DISCLAIMER}」這句聲明`);
  const banned = BANNED_WORDS.filter((w) => variant.includes(w));
  if (banned.length) reasons.push(`出現不能用的詞：${banned.map((w) => `「${w}」`).join("、")}`);
  if (variant.length > source.length * MAX_LENGTH_RATIO) {
    reasons.push(`長度 ${variant.length} 字，超過原文 ${source.length} 字的 ${MAX_LENGTH_RATIO} 倍`);
  }
  if (variant.length < source.length * MIN_LENGTH_RATIO) {
    reasons.push(`長度 ${variant.length} 字，不到原文 ${source.length} 字的 ${MIN_LENGTH_RATIO} 倍，可能刪掉了沒有數字的條件句`);
  }
  return { ok: reasons.length === 0, reasons };
}

export function buildPrompt(source, tone) {
  return [
    "你是台灣補助資訊網站的貼文編輯。下面是一則要貼到 Threads 與 Facebook 的貼文原文，請改寫成指定的語氣。",
    "",
    `語氣：${tone}`,
    "",
    "規則：",
    "1. 日期、金額、網址原樣保留。不新增、不刪除任何數字，月日照原文寫成 11/30 這種格式。",
    "2. 條列的編號（1. 2. 3.）照原文保留。",
    `3. 保留「${DISCLAIMER}」那一句，意思不能變。`,
    "4. 不加原文沒有的資訊，不推測資格，不補充申請方式。不用「三千元」「十二月」這種國字數字。",
    "5. 每個項目的名稱、「截止」「開始」照原文寫在同一行，不換成同義詞；沒有數字的條件句也要保留。",
    "6. 不用抽象形容詞，用具體的名詞、動詞、數字。",
    "7. 只輸出改寫後的貼文本身，不要前言、不要說明、不要程式碼區塊。",
    "",
    "原文：",
    source,
  ].join("\n");
}

/** 模型常把整篇包在 ``` 裡；只剝掉最外層，內文裡還有 ``` 的話交給 checkVariant 之外的檢查擋 */
export function cleanVariant(raw) {
  let text = String(raw ?? "").trim();
  const fenced = text.match(/^```[^\n]*\n([\s\S]*?)\n?```$/);
  if (fenced) text = fenced[1].trim();
  return text;
}

/** 對每個語氣改寫一次並檢查。單一語氣失敗（逾時等）記成沒通過，不中斷其他語氣 */
export async function makeVariants({ source, tones = DEFAULT_TONES, host, model, generateFn = generate }) {
  const results = [];
  for (const tone of tones) {
    try {
      const text = cleanVariant(await generateFn({ host, model, prompt: buildPrompt(source, tone) }));
      const { reasons } = checkVariant(source, text);
      if (text.includes("```")) reasons.push("內文含 ``` 標記，貼進 Markdown 會破版");
      results.push({ tone, text, ok: reasons.length === 0, reasons });
    } catch (err) {
      results.push({ tone, text: "", ok: false, reasons: [`本機模型沒有產出：${err.message}`] });
    }
  }
  return results;
}

export function renderReport(results, model) {
  const passed = results.filter((r) => r.ok).length;
  const out = [`# 貼文改寫（本機模型：${model}）`, ""];
  out.push("改寫稿已用程式逐行比對原文的日期、金額、網址、項目名稱與聲明句。通過的仍要自己讀過一遍再貼；沒通過的不輸出內文。", "");
  for (const r of results) {
    out.push(`## 語氣：${r.tone}`, "");
    if (r.ok) out.push("通過檢查。", "", "```text", r.text, "```", "");
    else {
      out.push("沒通過：", "");
      r.reasons.forEach((reason) => out.push(`- ${reason}`));
      out.push("");
    }
  }
  out.push("---");
  out.push(passed === 0 ? "0 則通過，請直接用原文" : `${passed} 則通過（共 ${results.length} 則）。貼出前對照原文的日期與金額再看一次。`);
  out.push(REVIEW_NOTE);
  return out.join("\n");
}

function parseArgs(argv) {
  const opts = { file: null, tones: DEFAULT_TONES };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tones") {
      const list = (argv[++i] ?? "").split("|").map((s) => s.trim()).filter(Boolean);
      if (list.length === 0) throw new Error('--tones 後面要接用 | 分開的語氣，例如 --tones "口語|正式"');
      opts.tones = list;
    } else if (a.startsWith("--")) throw new Error(`不認得的參數：${a}`);
    else opts.file = a;
  }
  return opts;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.file && process.stdin.isTTY) {
    console.error("用法：node scripts/marketing/post-variants.mjs <digest.md>\n沒給檔名時讀 stdin。digest.md 是 deadline-digest.mjs 的輸出。");
    process.exit(1);
  }
  const markdown = opts.file ? readFileSync(opts.file, "utf8") : await readStdin();
  const source = extractPost(markdown);
  if (!source) {
    console.error(`找不到「${POST_HEADING}」底下的 text 區塊。這週可能沒有可貼的項目（digest 會寫「這週沒有…」），或檔案不是 deadline-digest.mjs 的輸出。`);
    process.exit(1);
  }
  const host = resolveHost();
  const model = await pickModel({ host });
  console.error(`用本機模型 ${model} 改寫 ${opts.tones.length} 種語氣，每種最多等 2 分鐘…`);
  const results = await makeVariants({ source, tones: opts.tones, host, model });
  process.stdout.write(renderReport(results, model) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
