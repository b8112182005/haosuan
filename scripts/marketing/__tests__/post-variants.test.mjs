import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { checkVariant, extractPost, factTokens } from "../post-variants.mjs";

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
    expect(stdout.trim().split("\n").pop()).toContain("1 則通過");
    expect(prompts.every((p) => p.model === "fake-model:1b" && p.stream === false)).toBe(true);
  });

  it("全部沒通過時照常結束，最後一行叫人用原文", async () => {
    const file = join(dir, "digest2.md");
    writeFileSync(file, ["### Threads／Facebook（一則）", "", "```text", SOURCE, "```"].join("\n"));
    const { stdout } = await run(process.execPath, [SCRIPT, file, "--tones", "正式一|正式二"], { env: env() });
    expect(stdout.trim().split("\n").pop()).toBe("0 則通過，請直接用原文");
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
