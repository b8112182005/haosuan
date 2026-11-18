import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  decodeEntities,
  diffSentences,
  htmlToText,
  isImportant,
  isWatchedByDefault,
  parseArgs,
  selectItems,
  sortImportantFirst,
  splitSentences,
  taipeiNow,
} from "../watch-official-pages.mjs";

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL("../watch-official-pages.mjs", import.meta.url));

describe("HTML 轉文字", () => {
  it("拿掉 script、style、註解與標籤，區塊標籤換行", () => {
    const html = `<html><head><style>.a{color:red}</style><script>var x = "不要出現";</script></head>
      <body><!-- 註解 --><h1>租金補貼</h1><p>受理期間：<b>116/01/10</b>  至   116/12/31</p><ul><li>第一點</li><li>第二點</li></ul></body></html>`;
    expect(htmlToText(html)).toBe("租金補貼\n受理期間： 116/01/10 至 116/12/31\n第一點\n第二點");
  });

  it("實體轉回字元，連續空白收成一個", () => {
    expect(decodeEntities("A&amp;B &lt;C&gt; &#20803; &#x5143; &nbsp;&unknown;")).toBe("A&B <C> 元 元  &unknown;");
    expect(htmlToText("<p>每戶&nbsp;&nbsp;&nbsp;5,000　　元</p>")).toBe("每戶 5,000 元");
  });
});

describe("句子比對", () => {
  it("依句號與換行切句", () => {
    expect(splitSentences("第一句。第二句\n第三句。\n\n")).toEqual(["第一句", "第二句", "第三句"]);
  });

  it("含日期、金額或關鍵字的句子是重要的", () => {
    for (const s of ["116/01/10 開始受理", "1 月 10 日截止", "2027-01-10 前送件", "每戶 5,000 元", "本年度經費已額滿", "預算用罄", "受理延長", "停止受理"]) {
      expect(isImportant(s), s).toBe(true);
    }
    for (const s of ["請洽承辦人", "電話：02-1234"]) expect(isImportant(s), s).toBe(false);
  });

  it("重要的排前面，同組維持原順序", () => {
    expect(sortImportantFirst(["a 說明", "b 額滿", "c 說明", "d 12 月 1 日"])).toEqual(["b 額滿", "d 12 月 1 日", "a 說明", "c 說明"]);
  });

  it("列出新增與消失的句子，重要的排前面", () => {
    const before = "標題\n受理期間至 116/12/31\n請備齊文件\n舊公告";
    const after = "標題\n受理期間至 117/01/31\n新增說明\n請備齊文件\n本年度經費額滿";
    expect(diffSentences(before, after)).toEqual({
      added: ["受理期間至 117/01/31", "本年度經費額滿", "新增說明"],
      removed: ["受理期間至 116/12/31", "舊公告"],
    });
  });

  it("相同的文字沒有差異", () => {
    expect(diffSentences("a\nb", "a\nb")).toEqual({ added: [], removed: [] });
  });
});

describe("選項目", () => {
  const items = [
    { id: "limited", name: "甲", deadline: { budget_limited: true }, status_2026: "active" },
    { id: "pending", name: "乙", deadline: {}, status_2026: "pending" },
    { id: "yearend", name: "丙", deadline: {}, status_2026: "active", year_end_notice: { from: "11-01", to: "12-31" } },
    { id: "year115", name: "115年度丁", deadline: {}, status_2026: "active" },
    { id: "year116", name: "戊 116 年", deadline: {}, status_2026: "active" },
    { id: "plain", name: "己", deadline: { budget_limited: false }, status_2026: "active" },
  ];

  it("預設只看經費有限、尚未公告、有年底提醒、名稱含 115／116 的", () => {
    expect(items.filter(isWatchedByDefault).map((i) => i.id)).toEqual(["limited", "pending", "yearend", "year115", "year116"]);
  });

  it("--all 全部，--ids 指定且回報不存在的 id", () => {
    expect(selectItems(items, { all: true }).items).toHaveLength(6);
    expect(selectItems(items, { ids: ["plain", "nope"] })).toEqual({ items: [items[5]], unknown: ["nope"] });
  });

  it("解析參數", () => {
    expect(parseArgs(["--all", "--ids", "a,b", "--ollama", "--out", "r.md", "--snapshots", "s", "--data", "d.json"])).toEqual({
      all: true,
      ids: ["a", "b"],
      ollama: true,
      out: "r.md",
      snapshots: "s",
      data: "d.json",
    });
    expect(() => parseArgs(["--nope"])).toThrow("不認得");
  });
});

it("台灣時間", () => {
  expect(taipeiNow(new Date(Date.UTC(2026, 10, 22, 16, 5)))).toBe("2026-11-23 00:05");
});

describe("整合：本機伺服器與假的 Ollama", () => {
  let web;
  let ollama;
  let base;
  let ollamaHost;
  let dir;
  let deadline = "116/01/10";
  let userAgent = "";
  const hits = [];

  const page = (extra = "") =>
    `<html><body><h1>租金補貼公告</h1><p>受理期間至 ${deadline}，逾期不受理。</p><p>洽詢電話：02-1234-5678${extra}</p></body></html>`;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "watch-pages-"));
    web = createServer((req, res) => {
      hits.push(req.url);
      userAgent = req.headers["user-agent"] ?? "";
      if (req.url === "/broken") {
        res.statusCode = 500;
        res.end("boom");
      } else if (req.url === "/moved") {
        res.statusCode = 302;
        res.setHeader("location", "/stable");
        res.end();
      } else if (req.url === "/stable") {
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end("<html><body><h1>固定頁面</h1><p>這一頁的內容不會變動，用來測試轉址後沒變。</p></body></html>");
      } else {
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end(page());
      }
    });
    ollama = createServer((req, res) => {
      res.setHeader("content-type", "application/json");
      if (req.url === "/api/tags") return res.end(JSON.stringify({ models: [{ name: "fake:1b" }] }));
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const { prompt } = JSON.parse(body);
        res.end(JSON.stringify({ response: prompt.includes("117/01/10") ? "有。受理期間的截止日從 116/01/10 改成 117/01/10。" : "沒有。" }));
      });
    });
    await Promise.all([web, ollama].map((s) => new Promise((resolve) => s.listen(0, "127.0.0.1", resolve))));
    base = `http://127.0.0.1:${web.address().port}`;
    ollamaHost = `http://127.0.0.1:${ollama.address().port}`;
    const item = (id, path, extra = {}) => ({ id, name: `115年度 ${id}`, short_name: id, city: null, official_url: `${base}${path}`, status_2026: "active", deadline: {}, ...extra });
    writeFileSync(
      join(dir, "data.json"),
      JSON.stringify({
        items: [
          item("changing", "/page"),
          item("broken", "/broken"),
          item("redirected", "/moved"),
          { ...item("ignored", "/page"), name: "不看的項目" },
        ],
      }),
    );
  });

  afterAll(async () => {
    await Promise.all([web, ollama].map((s) => new Promise((resolve) => s.close(resolve))));
    rmSync(dir, { recursive: true, force: true });
  });

  const watch = (args, env = {}) =>
    run(process.execPath, [SCRIPT, "--data", join(dir, "data.json"), "--snapshots", join(dir, "snap"), ...args], {
      env: { ...process.env, OLLAMA_HOST: ollamaHost, OLLAMA_MODEL: "", ...env },
    });

  it("第一次是新增快照，改掉一個日期後第二次列出變動的句子，500 的列在抓不到", async () => {
    const first = await watch(["--out", join(dir, "r1.md")]);
    expect(first.stdout).toContain("報告寫到");
    const r1 = readFileSync(join(dir, "r1.md"), "utf8");
    expect(r1).toContain("有變動 0、抓不到 1、新增快照 2、沒變 0");
    expect(r1).toContain("## 新增快照（2）");
    expect(r1).toContain("changing");
    expect(r1).toContain("redirected");
    expect(r1).toMatch(/## 抓不到（1）[\s\S]*broken[\s\S]*HTTP 500/);
    expect(r1).not.toContain("ignored");
    expect(userAgent).toBe("haoye-page-watch/1.0");

    const second = await watch([]);
    expect(second.stdout).toContain("有變動 0、抓不到 1、新增快照 0、沒變 2");
    expect(second.stdout).toContain("## 沒變：2 項");

    deadline = "117/01/10";
    const third = await watch([]);
    expect(third.stdout).toContain("有變動 1、抓不到 1、新增快照 0、沒變 1");
    const changed = third.stdout.split("## 抓不到")[0];
    expect(changed).toContain("受理期間至 117/01/10，逾期不受理");
    expect(changed).toContain("受理期間至 116/01/10，逾期不受理");
    expect(changed).not.toContain("本機模型");
    expect(third.stdout.trim().split("\n").pop()).toBe("這份報告只是線索。要改資料時，到網頁核對原文，改 research/ 之後跑 npm run data:build。");

    // 快照已更新成新內容，再跑一次就沒變
    const fourth = await watch([]);
    expect(fourth.stdout).toContain("有變動 0、抓不到 1、新增快照 0、沒變 2");
  });

  it("--ollama：有變動的項目附上本機模型的判讀", async () => {
    deadline = "118/01/10";
    await watch(["--ids", "changing"]); // 把快照更新成 118
    deadline = "117/01/10";
    const { stdout } = await watch(["--ids", "changing", "--ollama"]);
    expect(stdout).toContain("#### 本機模型的初步判讀（要對照網頁確認）");
    expect(stdout).toContain("有。受理期間的截止日從 116/01/10 改成 117/01/10。");
  });

  it("Ollama 連不上時印警告，報告照常輸出", async () => {
    deadline = "119/01/10";
    const { stdout, stderr } = await watch(["--ids", "changing", "--ollama"], { OLLAMA_HOST: "http://127.0.0.1:1" });
    expect(stderr).toContain("警告");
    expect(stderr).toContain("連不到 Ollama");
    expect(stdout).toContain("## 有變動（1）");
    expect(stdout).not.toContain("本機模型的初步判讀");
  });

  it("--all 連沒被預設選到的項目也看", async () => {
    const { stdout } = await watch(["--all"]);
    expect(stdout).toContain("共 4 項");
    expect(stdout).toContain("ignored");
  });
});
