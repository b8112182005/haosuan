// 把 deadline-digest.mjs 產的貼文，請本機 Ollama 改寫成不同語氣，再用程式檢查有沒有改到事實。
//   node scripts/marketing/post-variants.mjs digest.md
//   cat digest.md | node scripts/marketing/post-variants.mjs --tones "口語，像朋友提醒|正式，適合社團公告"
//
// 為什麼要檢查：本機模型會把 11/30 寫成 12/30，也會順手加一句「官方公告」。
// 貼文會被轉傳，錯的日期收不回來，所以改寫後的數字、網址必須和原文完全相同，沒通過的不輸出內文。
// 只用 Node 內建模組，維護者的 Windows 電腦不用 npm install。
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { generate, pickModel, resolveHost } from "../local/ollama.mjs";

export const DEFAULT_TONES = ["口語，像朋友提醒", "正式，適合社團公告"];
export const DISCLAIMER = "不是政府網站";
export const BANNED_WORDS = ["官方", "保證", "政府推出", "一定領得到"];
export const MAX_LENGTH_RATIO = 1.5;
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

/** 改寫稿過不過關。reasons 空陣列才算 ok */
export function checkVariant(source, variant) {
  const reasons = [];
  const numbers = multisetDiff(extractNumbers(source), extractNumbers(variant));
  if (numbers.extra.length || numbers.missing.length) reasons.push(diffReason("數字", numbers));
  const urls = multisetDiff(extractUrls(source), extractUrls(variant));
  if (urls.extra.length || urls.missing.length) reasons.push(diffReason("網址", urls));
  if (!variant.includes(DISCLAIMER)) reasons.push(`沒有「${DISCLAIMER}」這句聲明`);
  const banned = BANNED_WORDS.filter((w) => variant.includes(w));
  if (banned.length) reasons.push(`出現不能用的詞：${banned.map((w) => `「${w}」`).join("、")}`);
  if (variant.length > source.length * MAX_LENGTH_RATIO) {
    reasons.push(`長度 ${variant.length} 字，超過原文 ${source.length} 字的 ${MAX_LENGTH_RATIO} 倍`);
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
    "4. 不加原文沒有的資訊，不推測資格，不補充申請方式。",
    "5. 不用抽象形容詞，用具體的名詞、動詞、數字。",
    "6. 只輸出改寫後的貼文本身，不要前言、不要說明、不要程式碼區塊。",
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
  out.push("改寫稿已用程式比對原文的數字、網址與聲明句。通過的仍要自己讀過一遍再貼；沒通過的不輸出內文。", "");
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
