# 好算好提 HaoSuan × HaoTi

查補助、記期限、算數字。一份 Next.js 程式碼同時輸出：

- 網站：https://haosuan.vercel.app（Vercel，`npm run build`）
- Android app：Capacitor 8 包裝的靜態輸出（`npm run build:app` → `android/`），套件名 `com.haosuan.haoti`

## 功能

| 區塊 | 路徑 | 說明 |
|---|---|---|
| 補助查詢 | `/subsidy` | 依分類、縣市、關鍵字瀏覽；每項有資格、金額、文件、步驟、管道、期限、FAQ、來源 |
| 資格試算 | `/subsidy/check` | 7 題，逐條比對後分「符合／可能符合／不符合」並附原因；答案只存裝置 |
| 疑難雜症 | `/subsidy/faq` | 跨補助問答 + 各項目 FAQ，可搜尋 |
| 年度時程表 | `/subsidy/calendar` | 未來 12 個月固定期限，一鍵加入提醒 |
| 提醒 | `/reminders` | 本機通知（D-30／14／3），每年固定期限自動續期；網頁版給 Google 日曆與 .ics |
| 計算工具 | `/tools` 與各分類路徑 | 30 種台灣常用計算機 |

## 指令

```bash
npm run dev          # 開發
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # vitest（計算機、資格引擎、提醒模組）
npm run build        # 網站 build（Vercel）
npm run build:app    # 靜態輸出到 out/（給 Capacitor）
npm run data:build   # 由 research/ 合併產生 src/data/subsidies.json 與 public/data/subsidies.json
npx cap sync android # 把 out/ 複製進 android/ 並同步外掛
```

Android 打包與上架步驟見 `docs/PLAY_RELEASE.md`；商店文案與圖片在 `store/`。

## 目錄

```
src/app/                 頁面（App Router）
src/app/subsidy/         補助模組頁面
src/app/reminders/       提醒頁
src/components/app/      平台膠水：PlatformScript、NativeBridge、ShareAppButton
src/components/layout/   Header、Footer、BottomTabs、Breadcrumb、CalculatorLayout
src/components/subsidy/  補助 UI
src/components/reminders/提醒 UI
src/lib/subsidy/         型別、資料存取、資格引擎、截止日計算、遠端更新
src/lib/reminders/       提醒儲存、通知排程
src/lib/calculators/     30 種計算機的純函式
src/data/subsidies.json  補助資料（app 內建）
public/data/             同一份資料，網站部署後供 app 檢查更新
research/                研究流程原始輸出（topics/、verified/），data:build 的輸入
android/                 Capacitor Android 專案（含 release 簽章設定）
resources/               圖示、啟動畫面 SVG 來源；scripts/android/gen-assets.mjs 產生各尺寸
scripts/                 資料合併、Android 資產與簽章、商店截圖
```

## 補助資料怎麼維護

1. 資料的單一來源是 `research/topics/*.json`（研究員輸出）與 `research/verified/<id>.json`（核對員修正版）。
2. 人工修正寫在 `research/overrides.json`（`{ "<id>": { 欄位: 值 } }`），要下架的 id 放 `research/removed.json`。
3. `npm run data:build --version YYYY-MM-DD` 會做 schema 檢查後寫出兩份資料檔。
4. push 到 main → Vercel 部署 → app 啟動時抓 `/data/subsidies.json`，版本較新就在詳情頁提示差異。不用發新版 app。

每個項目都要有 `sources`；查不到官方依據的欄位放進 `unverified_fields` 並把 `confidence` 降為 medium／low，頁面會顯示「未驗證」。

## 平台差異

- `src/components/app/PlatformScript.tsx` 在首次繪製前把 `data-platform` 寫到 `<html>`；CSS 用 `.web-only` / `.app-only` 切換。
- `BUILD_TARGET=app` 時：靜態輸出、不載 GA、不註冊 service worker。
- Android 15 edge-to-edge：`viewport-fit=cover` + Capacitor SystemBars 注入的 `--safe-area-inset-*`，Header 與底部分頁列用 `--safe-top` / `--safe-bottom`。
- 提醒用 inexact alarm（`SCHEDULE_EXACT_ALARM` 已在 manifest 移除），日期等級的提醒不需要精確到秒。
