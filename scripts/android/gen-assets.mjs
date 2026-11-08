#!/usr/bin/env node
/**
 * 好算好提 — 品牌圖片產生器
 *
 * 來源（手工維護的 SVG）：
 *   resources/icon.svg             完整圖示（含圓角漸層背景）1024×1024
 *   resources/icon-foreground.svg  adaptive icon 前景（透明底，內容縮在中央 66%）1024×1024
 *   resources/splash.svg           啟動畫面（白底置中 logo + 字樣）2732×2732
 *   resources/notification.svg     狀態列小圖示（白色單色剪影，透明底）24×24
 *
 * 輸出：Android mipmap/drawable、PWA public/icon-*、Play 商店 store/*。
 * 重跑：node scripts/android/gen-assets.mjs
 *
 * 為什麼每張都從 SVG 直接光柵化到目標尺寸、而不是先畫一張大的再縮：
 * 48px 的圖示若是從 1024 縮下來，筆畫邊緣會糊；讓 rsvg 直接在目標尺寸畫，線條才會貼像素。
 * 只有 splash 例外（先畫 2732 再 cover 裁切），因為它本來就是要被裁的。
 *
 * 字型：SVG 裡的文字靠系統 fontconfig 找字型（Noto Sans TC → Noto Sans CJK TC → WenQuanYi Zen Hei →
 * 微軟正黑 → PingFang）。機器上一個中文字型都沒有的話會畫成豆腐方塊，請先裝 Noto Sans TC 再重跑。
 */
import sharp from 'sharp';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'resources');
const RES = 'android/app/src/main/res';

const BRAND = {
  primary: '#6C5CE7',
  gradientEnd: '#A29BFE', // 商店圖用的淺紫端；圖示本身的漸層端 #8B7CF6 寫在 icon.svg 裡
};
const FONT =
  "'Noto Sans TC','Noto Sans CJK TC','WenQuanYi Zen Hei','Microsoft JhengHei','PingFang TC',sans-serif";

const DENSITY = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const LAUNCHER_DP = 48; // ic_launcher / ic_launcher_round
const FOREGROUND_DP = 108; // adaptive icon 前景（108dp 畫布）
const NOTIFY_DP = 24; // 狀態列小圖示
const SPLASH_MASTER = 2732;
// 沿用 Capacitor 範本的 splash 尺寸（直式；橫式就是寬高對調）
const SPLASH_PORTRAIT = {
  mdpi: [320, 480],
  hdpi: [480, 800],
  xhdpi: [720, 1280],
  xxhdpi: [960, 1600],
  xxxhdpi: [1280, 1920],
};
const SPLASH_DEFAULT = [480, 320]; // drawable/splash.png（無限定 density 的 fallback，範本就是這個尺寸）

const results = [];

function viewBoxWidth(svg) {
  const m = /viewBox="\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+[\d.]+\s*"/.exec(svg);
  if (!m) throw new Error('SVG 缺少 viewBox');
  return Number(m[1]);
}

/** 把 SVG 以「剛好 width px 寬」的解析度光柵化（density 控制 rsvg 的縮放比例）。 */
function rasterize(svg, width, height = width) {
  const density = (72 * width) / viewBoxWidth(svg);
  return sharp(Buffer.from(svg), { density }).resize(width, height, { fit: 'cover' });
}

function circleMask(size) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );
}

/** Play 商店圖示要滿版（Google 自己會套圓角遮罩），把 icon.svg 的圓角矩形改成直角。 */
function fullBleed(iconSvg) {
  const out = iconSvg.replace(/(<rect id="icon-bg"[^>]*?)\srx="\d+" ry="\d+"/, '$1 rx="0" ry="0"');
  if (out === iconSvg) throw new Error('resources/icon.svg 找不到 id="icon-bg" 的圓角矩形（gen-assets 靠它做滿版版本）');
  return out;
}

function featureGraphicSvg() {
  const W = 1024;
  const H = 500;
  const tile = 300;
  const tileX = 96;
  const tileY = (H - tile) / 2;
  const textX = 436;
  // 字的 baseline 是用實測的字框算的：118px 粗體字框約 121px 高、34px 約 34px 高，整組文字垂直置中在 250
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="${H}">
      <stop offset="0" stop-color="${BRAND.primary}"/>
      <stop offset="1" stop-color="${BRAND.gradientEnd}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="${tileX}" y="${tileY + 14}" width="${tile}" height="${tile}" rx="68" fill="#2A1F7A" opacity="0.28" filter="url(#shadow)"/>
  <rect x="${tileX}" y="${tileY}" width="${tile}" height="${tile}" rx="68" fill="#FFFFFF"/>
  <text x="${textX}" y="257" font-family="${FONT}" font-size="118" font-weight="700" letter-spacing="6" fill="#FFFFFF">好算好提</text>
  <text x="${textX}" y="341" font-family="${FONT}" font-size="34" font-weight="500" fill="#FFFFFF" fill-opacity="0.92">補助查詢 · 期限提醒 · 30 種計算機</text>
</svg>`;
}

/** 寫出 PNG 後立刻讀回 metadata 驗證尺寸／通道／透明度，錯了直接丟例外，不讓壞圖進 repo。 */
async function writePng(relPath, pipeline, expect) {
  const abs = path.join(ROOT, relPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await pipeline.png({ compressionLevel: 9 }).toFile(abs);

  const meta = await sharp(abs).metadata();
  const problems = [];
  if (meta.width !== expect.width || meta.height !== expect.height) {
    problems.push(`尺寸 ${meta.width}x${meta.height}，預期 ${expect.width}x${expect.height}`);
  }
  if (expect.channels && meta.channels !== expect.channels) {
    problems.push(`channels=${meta.channels}，預期 ${expect.channels}`);
  }
  if (expect.opaque) {
    const stats = await sharp(abs).stats();
    const alpha = stats.channels[3];
    if (!alpha || alpha.min < 255) problems.push('有透明像素，Play 圖示必須完全不透明');
  }
  if (problems.length) throw new Error(`${relPath}: ${problems.join('；')}`);
  results.push({ file: relPath, size: `${meta.width}x${meta.height}`, ch: meta.channels });
}

async function main() {
  const [iconSvg, fgSvg, splashSvg, notifySvg] = await Promise.all(
    ['icon.svg', 'icon-foreground.svg', 'splash.svg', 'notification.svg'].map((f) =>
      readFile(path.join(SRC, f), 'utf8'),
    ),
  );

  // ---- Android launcher icons ----
  for (const [d, scale] of Object.entries(DENSITY)) {
    const s = LAUNCHER_DP * scale;
    await writePng(`${RES}/mipmap-${d}/ic_launcher.png`, rasterize(iconSvg, s), { width: s, height: s });
    await writePng(
      `${RES}/mipmap-${d}/ic_launcher_round.png`,
      rasterize(iconSvg, s).composite([{ input: circleMask(s), blend: 'dest-in' }]),
      { width: s, height: s },
    );
    const f = FOREGROUND_DP * scale;
    await writePng(`${RES}/mipmap-${d}/ic_launcher_foreground.png`, rasterize(fgSvg, f), { width: f, height: f });
  }

  // ---- 狀態列小圖示 ----
  for (const [d, scale] of Object.entries(DENSITY)) {
    const s = NOTIFY_DP * scale;
    await writePng(`${RES}/drawable-${d}/ic_stat_notify.png`, rasterize(notifySvg, s), { width: s, height: s });
  }

  // ---- Splash：畫一張 2732 的母圖，再 cover 裁成各尺寸（白底，不需要 alpha） ----
  const splashMaster = await rasterize(splashSvg, SPLASH_MASTER).png().toBuffer();
  const splash = (w, h) => sharp(splashMaster).resize(w, h, { fit: 'cover' }).flatten({ background: '#FFFFFF' });
  for (const [d, [w, h]] of Object.entries(SPLASH_PORTRAIT)) {
    await writePng(`${RES}/drawable-port-${d}/splash.png`, splash(w, h), { width: w, height: h });
    await writePng(`${RES}/drawable-land-${d}/splash.png`, splash(h, w), { width: h, height: w });
  }
  await writePng(`${RES}/drawable/splash.png`, splash(...SPLASH_DEFAULT), {
    width: SPLASH_DEFAULT[0],
    height: SPLASH_DEFAULT[1],
  });

  // ---- PWA ----
  await writePng('public/icon-192.png', rasterize(iconSvg, 192), { width: 192, height: 192 });
  await writePng('public/icon-512.png', rasterize(iconSvg, 512), { width: 512, height: 512 });
  await copyFile(path.join(SRC, 'icon.svg'), path.join(ROOT, 'public/icon.svg'));
  results.push({ file: 'public/icon.svg', size: '(copy of resources/icon.svg)', ch: '-' });

  // ---- Play 商店 ----
  // 512×512、32-bit（RGBA）、完全不透明：先把圓角改直角做滿版，flatten 保險把任何殘餘透明補成主色，再補回 alpha 通道
  await writePng(
    'store/icon-512.png',
    rasterize(fullBleed(iconSvg), 512).flatten({ background: BRAND.primary }).ensureAlpha(),
    { width: 512, height: 512, channels: 4, opaque: true },
  );
  const tileIcon = await rasterize(iconSvg, 232).png().toBuffer();
  await writePng(
    'store/feature-graphic-1024x500.png',
    rasterize(featureGraphicSvg(), 1024, 500).composite([{ input: tileIcon, left: 130, top: 134 }]),
    { width: 1024, height: 500 },
  );

  // ---- 報告 ----
  const w = Math.max(...results.map((r) => r.file.length));
  for (const r of results) console.log(`${r.file.padEnd(w)}  ${String(r.size).padEnd(12)} ${r.ch}ch`);
  console.log(`\n${results.length} 個檔案，尺寸全部驗證通過。`);
}

main().catch((err) => {
  console.error(`gen-assets 失敗：${err.message}`);
  process.exit(1);
});
