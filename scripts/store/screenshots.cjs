#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS 才能 require 到全域安裝的 playwright */
/**
 * 產生 Google Play 手機截圖（1080×2340，直式）。
 *
 *   npm run build:app
 *   node scripts/store/screenshots.cjs [--port 4173]
 *
 * 作法：用 Python 內建 http.server 架起 out/，Playwright 以 360×780、3 倍縮放截圖，
 * 並在截圖前把 <html data-platform="android"> 設好，讓畫面與 app 內一致（沒有 Footer、有底部分頁列）。
 * 需要已安裝的 playwright（repo 沒列為依賴；本機可 `npx playwright install chromium` 後再跑）。
 */
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "out");
const DEST = path.join(ROOT, "store", "screenshots");
const args = process.argv.slice(2);
const port = Number(args[args.indexOf("--port") + 1] || 4173);

const SHOTS = [
  { file: "phone-01-home.png", url: "/" },
  { file: "phone-02-check.png", url: "/subsidy/check/" },
  { file: "phone-03-subsidy.png", url: "/subsidy/" },
  { file: "phone-04-detail.png", url: "/subsidy/__FIRST__/" },
  { file: "phone-05-calendar.png", url: "/subsidy/calendar/" },
  { file: "phone-06-faq.png", url: "/subsidy/faq/" },
  { file: "phone-07-tools.png", url: "/tools/" },
  { file: "phone-08-mortgage.png", url: "/finance/mortgage/" },
];

async function main() {
  if (!fs.existsSync(path.join(OUT, "index.html"))) {
    console.error("找不到 out/index.html，先執行 npm run build:app");
    process.exit(1);
  }
  const { chromium } = require("playwright");
  fs.mkdirSync(DEST, { recursive: true });

  const server = spawn("python3", ["-m", "http.server", String(port), "-d", OUT], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 800));

  // 第一個補助項目當詳情頁範例
  const dataset = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/subsidies.json"), "utf8"));
  const firstId = (dataset.items.find((i) => i.confidence === "high") || dataset.items[0]).id;

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, locale: "zh-TW" });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    document.documentElement.setAttribute("data-platform", "android");
  });

  try {
    for (const shot of SHOTS) {
      const url = `http://127.0.0.1:${port}${shot.url.replace("__FIRST__", firstId)}`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      const file = path.join(DEST, shot.file);
      await page.screenshot({ path: file, fullPage: false });
      console.log(`${shot.file} ← ${shot.url}`);
    }
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
