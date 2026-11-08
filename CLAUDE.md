# CLAUDE.md

給在這個 repo 工作的 coding agent。

## 這是什麼

好算好提：Next.js 16 App Router 網站 + Capacitor 8 Android app（同一份程式碼）。
三個模組：補助查詢（`src/lib/subsidy`、`src/app/subsidy`）、提醒（`src/lib/reminders`、`src/app/reminders`）、30 種計算機（`src/lib/calculators`、各分類路徑）。

## 指令

```bash
npm run lint && npm run typecheck && npm test && npm run build:app
```

改 Android 原生或 Capacitor 設定後另外跑：

```bash
npx cap sync android && cd android && ./gradlew assembleDebug
```

需要 `ANDROID_HOME`（或 `android/local.properties` 的 `sdk.dir`）、JDK 17+。

## 規則

- 補助資料的數字、日期、門檻一律要有 `sources`；查不到就放進 `unverified_fields` 並降 `confidence`，不要用猜的。
- 補助資料改 `research/` 再跑 `npm run data:build`；不要手改 `src/data/subsidies.json`。
- 所有「今天」相關計算在 client 做（`useToday`），不要在 server component 用 `new Date()` 算剩幾天，靜態輸出會把 build 日期烤進 HTML。
- `YYYY-MM-DD` 一律手動 split 成本地日期，不要 `new Date('YYYY-MM-DD')`（那是 UTC）。
- 不申請 `SCHEDULE_EXACT_ALARM`（manifest 用 `tools:node="remove"` 拿掉），提醒用 inexact alarm。
- `capacitor.config.ts` 的 `appId` 上架後不能改。
- 金鑰（`android/*.jks`、`android/keystore.properties`）不進 git；CI 用 Secrets。
- 文案繁體中文、白話；禁用抽象形容詞與副詞（非常、極致、完美、輕鬆、優雅等），用具體名詞、動詞、數字、場景。註解寫「為什麼」。
- 網頁版 CSP 在 `next.config.ts`；新增外部請求時同步更新 `connect-src`。

## 已知事項

- `src/lib/reminders` 內部用相對路徑 import（vitest 沒設 alias）。
- ESLint 忽略 `android/**`（裡面是複製進去的 build 產物）。
- Next/PostCSS 的 moderate audit advisory 已知，等上游修。
