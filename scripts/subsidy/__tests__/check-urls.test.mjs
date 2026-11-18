import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../check-urls.mjs", import.meta.url));

describe("check-urls 也檢查 late_consequence 與 year_end_notice 的來源", () => {
  let server;
  let base;
  let dir;
  const hits = [];

  beforeAll(async () => {
    server = createServer((req, res) => {
      hits.push(req.url);
      res.statusCode = req.url.startsWith("/dead") ? 404 : 200;
      res.end("x");
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    dir = mkdtempSync(join(tmpdir(), "check-urls-"));
    mkdirSync(join(dir, "scripts", "subsidy"), { recursive: true });
    mkdirSync(join(dir, "src", "data"), { recursive: true });
    copyFileSync(SCRIPT, join(dir, "scripts", "subsidy", "check-urls.mjs"));
    const src = (path) => ({ url: `${base}/${path}`, title: path });
    writeFileSync(
      join(dir, "src", "data", "subsidies.json"),
      JSON.stringify({
        items: [
          {
            id: "x",
            official_url: `${base}/ok-official`,
            channels: [],
            sources: [src("ok-source")],
            faqs: [],
            late_consequence: { sources: [src("ok-lc"), src("dead-lc")] },
            year_end_notice: { sources: [src("dead-yen")] },
          },
          { id: "y", official_url: `${base}/ok-y`, channels: [], sources: [], faqs: [] }, // 沒有這兩個欄位也不能壞
        ],
        general_faqs: [],
      }),
    );
  });
  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  });

  it("打 late_consequence、year_end_notice 的網址，失效的列出是哪一個欄位", async () => {
    const env = { ...process.env, NO_PROXY: "127.0.0.1", no_proxy: "127.0.0.1" };
    for (const k of ["HTTP_PROXY", "http_proxy", "HTTPS_PROXY", "https_proxy", "ALL_PROXY", "all_proxy"]) delete env[k];
    const out = await new Promise((resolve) =>
      execFile(process.execPath, [join(dir, "scripts", "subsidy", "check-urls.mjs")], { env, cwd: dir }, (err, stdout, stderr) => resolve({ code: err?.code ?? 0, stdout, stderr })),
    );
    expect(hits).toContain("/ok-lc");
    expect(hits).toContain("/dead-lc");
    expect(hits).toContain("/dead-yen");
    expect(out.stdout).toContain("失效 2");
    expect(out.stdout).toMatch(/dead-lc[\s\S]*x:late_consequence/);
    expect(out.stdout).toMatch(/dead-yen[\s\S]*x:year_end_notice/);
    expect(out.code).toBe(0); // 失效的不是 official_url，結束碼維持 0
  });
});
