import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { checkVariant, extractPost, factTokens, renderReport, REVIEW_NOTE } from "../post-variants.mjs";

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL("../post-variants.mjs", import.meta.url));

const SOURCE = [
  "30 天內到期的補助申請與繳費期限（11/16 整理）",
  "",
  "1. 租金補貼：11/30 截止，剩 14 天；每月 2,000～8,000 元",
  "2. 育兒津貼：12/10 截止，剩 24 天；5,000 元",
  "",
  "資格、要帶的文件、申請網址：https://haosuan.vercel.app/subsidy",
  "這是我整理的免費工具，不是政府網站；每一項都附主管機關的來源網址，申請前以公告為準。",
].join("\n");

const FAITHFUL = [
  "提醒一下，30 天內到期的有這幾項（11/16 整理）：",
  "",
  "1. 租金補貼：11/30 截止，剩 14 天；每月 2,000～8,000 元",
  "2. 育兒津貼：12/10 截止，剩 24 天；5,000 元",
  "",
  "要帶什麼文件、去哪申請，看這裡：https://haosuan.vercel.app/subsidy",
  "這是我整理的免費工具，不是政府網站；申請前以主管機關公告為準。",
].join("\n");

describe("factTokens", () => {
  it("11/30 當一個記號，金額去掉千分位，範圍拆成兩個數字", () => {
    expect(factTokens("11/30 截止，每月 2,000～8,000 元")).toEqual(["11/30", "2000", "8000"]);
    expect(factTokens("900-1,800 元")).toEqual(["1800", "900"]);
  });

  it("全形數字先轉半形", () => {
    expect(factTokens("１１／３０ 截止，５,０００ 元")).toEqual(["11/30", "5000"]);
  });

  it("網址先取出且結尾標點不算，網址裡的數字不當成數字記號", () => {
    expect(factTokens("看 https://example.test/subsidy/rent-300b。")).toEqual(["https://example.test/subsidy/rent-300b"]);
    expect(factTokens("（https://example.test/a） 12 戶")).toEqual(["12", "https://example.test/a"].sort());
  });

  it("保留重複", () => {
    expect(factTokens("5,000 元，一共 5,000 元")).toEqual(["5000", "5000"]);
  });
});

describe("checkVariant", () => {
  it("忠實的改寫通過", () => {
    expect(checkVariant(SOURCE, FAITHFUL)).toEqual({ ok: true, reasons: [] });
  });

  it("數字被改：列出多了哪些、少了哪些", () => {
    const { ok, reasons } = checkVariant(SOURCE, FAITHFUL.replace("11/30", "12/30"));
    expect(ok).toBe(false);
    expect(reasons.join("\n")).toContain("多了 12/30");
    expect(reasons.join("\n")).toContain("少了 11/30");
  });

  it("少一個網址", () => {
    const { ok, reasons } = checkVariant(SOURCE, FAITHFUL.replace("https://haosuan.vercel.app/subsidy", ""));
    expect(ok).toBe(false);
    expect(reasons.some((r) => r.startsWith("網址") && r.includes("少了 https://haosuan.vercel.app/subsidy"))).toBe(true);
  });

  it("多一個金額", () => {
    const { ok, reasons } = checkVariant(SOURCE, FAITHFUL + "\n另外還有 3,000 元。");
    expect(ok).toBe(false);
    expect(reasons.join("\n")).toContain("多了 3000");
  });

  it("全形數字寫的同一個日期與金額視為相同", () => {
    const variant = FAITHFUL.replace("11/30", "１１／３０").replace("5,000", "５,０００");
    expect(checkVariant(SOURCE, variant).ok).toBe(true);
  });

  it("拿掉「不是政府網站」", () => {
    const { ok, reasons } = checkVariant(SOURCE, FAITHFUL.replace("不是政府網站", "個人整理"));
    expect(ok).toBe(false);
    expect(reasons.join("\n")).toContain("不是政府網站");
  });

  it("範圍金額少一端", () => {
    const { ok, reasons } = checkVariant(SOURCE, FAITHFUL.replace("2,000～8,000", "2,000"));
    expect(ok).toBe(false);
    expect(reasons.join("\n")).toContain("少了 8000");
  });

  it("不能用的詞", () => {
    for (const word of ["官方", "保證", "政府推出", "一定領得到"]) {
      const { ok, reasons } = checkVariant(SOURCE, FAITHFUL + `\n${word}`);
      expect(ok).toBe(false);
      expect(reasons.join("\n")).toContain(word);
    }
  });

  it("長度超過原文 1.5 倍", () => {
    const { ok, reasons } = checkVariant(SOURCE, FAITHFUL + "\n" + "提醒".repeat(SOURCE.length));
    expect(ok).toBe(false);
    expect(reasons.join("\n")).toContain("長度");
  });
});

describe("checkVariant：數字集合沒變但事實變了", () => {
  const reasonsOf = (variant) => checkVariant(SOURCE, variant).reasons.join("\n");

  it("(a) 兩項的日期與金額互換：整篇數字集合相同，逐行對不上", () => {
    const swapped = [
      "30 天內到期的補助申請與繳費期限（11/16 整理）",
      "",
      "1. 租金補貼：12/10 截止，剩 24 天；5,000 元",
      "2. 育兒津貼：11/30 截止，剩 14 天；每月 2,000～8,000 元",
      "",
      "資格、要帶的文件、申請網址：https://haosuan.vercel.app/subsidy",
      "這是我整理的免費工具，不是政府網站；每一項都附主管機關的來源網址，申請前以公告為準。",
    ].join("\n");
    // 前提：舊的檢查（整篇比對）看不出來
    expect(factTokens(swapped)).toEqual(factTokens(SOURCE));
    const { ok, reasons } = checkVariant(SOURCE, swapped);
    expect(ok).toBe(false);
    expect(reasons.join("\n")).toContain("互換");
    expect(reasons.join("\n")).toContain("租金補貼");
  });

  it("(a) 只互換金額、日期留在原處也擋", () => {
    const v = FAITHFUL.replace("每月 2,000～8,000 元", "@@").replace("5,000 元", "每月 2,000～8,000 元").replace("@@", "5,000 元");
    expect(checkVariant(SOURCE, v).ok).toBe(false);
  });

  it("(b) 項目名稱互換，數字留在原行", () => {
    const v = FAITHFUL.replace("租金補貼", "@@").replace("育兒津貼", "租金補貼").replace("@@", "育兒津貼");
    const { ok, reasons } = checkVariant(SOURCE, v);
    expect(ok).toBe(false);
    expect(reasons.join("\n")).toContain("項目名稱「租金補貼」沒出現在同一行");
  });

  it("(c)「截止」改成「開始」", () => {
    const v = FAITHFUL.replace("12/10 截止", "12/10 開始");
    const { ok, reasons } = checkVariant(SOURCE, v);
    expect(ok).toBe(false);
    expect(reasons.join("\n")).toContain("「截止」在這一行出現 0 次，原文是 1 次");
    expect(reasons.join("\n")).toContain("「開始」在這一行出現 1 次，原文是 0 次");
  });

  it("(d) 加入國字數字的新事實", () => {
    for (const extra of ["另加碼三千元", "十二月底前都能辦", "最多兩天內審核"]) {
      const { ok, reasons } = checkVariant(SOURCE, FAITHFUL + "\n" + extra);
      expect(ok, extra).toBe(false);
      expect(reasons.join("\n"), extra).toContain("國字數字");
    }
  });

  it("(d) 原文本來就有的國字數字加單位不算新增", () => {
    const source = SOURCE.replace("剩 14 天", "剩 14 天（約兩週，每人一戶）") + "";
    const variant = FAITHFUL.replace("剩 14 天", "剩 14 天（約兩週，每人一戶）");
    expect(checkVariant(source, variant).ok).toBe(true);
  });

  it("(e) 刪掉沒有數字的條件句，貼文變短很多", () => {
    const conditions =
      "符合資格才能領，要先確認自己的戶籍縣市、家庭收入與有沒有領過同類補助，不符合的人送件也會被退回。" +
      "已經在領其他縣市同類補助的人，要先向原縣市辦理停領，才能改領現居縣市的補助。" +
      "收到審核結果的通知之前，不要先搬家或更換戶籍地址，否則要重新送件。";
    const source = SOURCE.replace("資格、要帶的文件", `${conditions}\n資格、要帶的文件`);
    const full = FAITHFUL.replace("要帶什麼文件", `${conditions}\n要帶什麼文件`);
    expect(checkVariant(source, full).ok).toBe(true);
    const { ok, reasons } = checkVariant(source, FAITHFUL);
    // 前提：沒有這個長度檢查時，逐行綁定看不出來（FAITHFUL 的每個數字行都對得上）
    expect(ok).toBe(false);
    expect(reasons.join("\n")).toContain("不到原文");
    expect(reasons.join("\n")).toContain("0.6 倍");
  });

  it("改寫裡多出一行含數字的行", () => {
    const v = FAITHFUL.replace("\n\n要帶什麼文件", "\n3. 其他\n\n要帶什麼文件");
    expect(checkVariant(SOURCE, v).ok).toBe(false);
  });

  it("網址行冒號前的說明可以換句話說（網址本身仍要一致）", () => {
    expect(checkVariant(SOURCE, FAITHFUL).ok).toBe(true);
  });

  it("重複次數也綁定：同一個金額寫了兩行的原文，少一行會被擋", () => {
    const source = ["1. 甲：11/30 截止；5,000 元", "2. 乙：11/30 截止；5,000 元", "這是我整理的免費工具，不是政府網站。"].join("\n");
    expect(checkVariant(source, source).ok).toBe(true);
    const missing = ["1. 甲：11/30 截止；5,000 元", "這是我整理的免費工具，不是政府網站。"].join("\n");
    expect(checkVariant(source, missing).ok).toBe(false);
  });

  it("原本的檢查還在：聲明句、禁用詞、長度上限", () => {
    expect(reasonsOf(FAITHFUL.replace("不是政府網站", "個人整理"))).toContain("不是政府網站");
    expect(reasonsOf(FAITHFUL + "\n官方")).toContain("官方");
    expect(reasonsOf(FAITHFUL + "\n" + "提醒".repeat(SOURCE.length))).toContain("超過原文");
  });
});

describe("renderReport", () => {
  it("最後一行提醒通過檢查只代表什麼", () => {
    const text = renderReport([{ tone: "口語", ok: true, text: FAITHFUL, reasons: [] }], "fake");
    expect(text.trim().split("\n").pop()).toBe("通過檢查只代表日期、金額、網址、項目名稱沒被改動，貼之前仍要讀一遍。");
    expect(REVIEW_NOTE).toBe(text.trim().split("\n").pop());
    const none = renderReport([{ tone: "口語", ok: false, text: "", reasons: ["x"] }], "fake");
    expect(none.trim().split("\n").pop()).toBe(REVIEW_NOTE);
  });
});

describe("extractPost", () => {
  it("取「Threads／Facebook（一則）」底下第一個 text 區塊", () => {
    const md = ["## 年底提醒（1）", "", "```text", "年底", "```", "", "### Threads／Facebook（一則）", "", "```text", SOURCE, "```", "", "### LINE 群組", "```text", "別的", "```"].join("\n");
    expect(extractPost(md)).toBe(SOURCE);
  });

  it("沒有就回 null", () => {
    expect(extractPost("## 貼文草稿\n\n這週沒有可貼的項目")).toBeNull();
  });
});

describe("整合：假的 Ollama 伺服器", () => {
  let server;
  let host;
  let dir;
  const prompts = [];

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "post-variants-"));
    server = createServer((req, res) => {
      if (req.url === "/api/tags") {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ models: [{ name: "fake-model:1b" }] }));
        return;
      }
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const { prompt, model, stream } = JSON.parse(body);
        prompts.push({ prompt, model, stream });
        const response = prompt.includes("語氣：口語") ? FAITHFUL : FAITHFUL.replace("11/30", "12/30");
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ response }));
      });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    host = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  });

  const env = () => ({ ...process.env, OLLAMA_HOST: host, OLLAMA_MODEL: "" });

  it("忠實的改寫輸出，11/30 改成 12/30 的被擋下並列出原因", async () => {
    const file = join(dir, "digest.md");
    writeFileSync(file, ["## 貼文草稿", "", "### Threads／Facebook（一則）", "", "```text", SOURCE, "```", ""].join("\n"));
    const { stdout } = await run(process.execPath, [SCRIPT, file], { env: env() });

    expect(stdout).toContain("## 語氣：口語，像朋友提醒");
    expect(stdout).toContain(FAITHFUL);
    const formal = stdout.split("## 語氣：正式，適合社團公告")[1];
    expect(formal).toContain("沒通過");
    expect(formal).toContain("多了 12/30");
    expect(formal).toContain("少了 11/30");
    expect(formal).not.toContain("```text");
    const lines = stdout.trim().split("\n");
    expect(lines.at(-2)).toContain("1 則通過");
    expect(lines.at(-1)).toBe("通過檢查只代表日期、金額、網址、項目名稱沒被改動，貼之前仍要讀一遍。");
    expect(prompts.every((p) => p.model === "fake-model:1b" && p.stream === false)).toBe(true);
  });

  it("全部沒通過時照常結束，最後一行叫人用原文", async () => {
    const file = join(dir, "digest2.md");
    writeFileSync(file, ["### Threads／Facebook（一則）", "", "```text", SOURCE, "```"].join("\n"));
    const { stdout } = await run(process.execPath, [SCRIPT, file, "--tones", "正式一|正式二"], { env: env() });
    expect(stdout.trim().split("\n").at(-2)).toBe("0 則通過，請直接用原文");
  });

  it("找不到貼文區塊時結束並說明", async () => {
    const file = join(dir, "empty.md");
    writeFileSync(file, "## 貼文草稿\n\n這週沒有 30 天內截止的項目");
    await expect(run(process.execPath, [SCRIPT, file], { env: env() })).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining("找不到"),
    });
  });
});
