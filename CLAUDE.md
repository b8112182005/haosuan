# CLAUDE.md

給在這個 repo 工作的 coding agent。

## 這是什麼

好耶：Next.js 16 App Router 網站 + Capacitor 8 Android app（同一份程式碼）。
三個模組：補助查詢（`src/lib/subsidy`、`src/app/subsidy`）、提醒（`src/lib/reminders`、`src/app/reminders`）、30 種計算機（`src/lib/calculators`、各分類路徑）。

## 指令

```bash
npm run lint && npm run typecheck && npm test && npm run build:app
```

改到返回鍵、提醒、通知、`NativeBridge` 之後另外跑。需要 playwright：`npm install --no-save playwright@1.63.0 && npx playwright install chromium`；雲端 session 已預裝在 `/opt/node-tools` 時改成在指令前加 `NODE_PATH=/opt/node-tools/node_modules`：

```bash
npm run build:app && npm run qa:native
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
- 新增會蓋住畫面的面板或多步驟流程時，用 `useBackHandler` 接 Android 返回鍵；不要讓返回鍵直接換頁。
- `android:allowBackup` 維持 `false`；隱私權政策寫的是資料不離開裝置、解除安裝即刪除。
- 特定身分有較低年齡門檻（原住民 55 歲）時用 `conditions.lower_age_for`，不要把 `min_age` 寫死成一般門檻就算了。
- 硬條件在條文裡有例外（退保後 1 年內仍可領、小面積共有房屋不算有房）時用 `conditions.exceptions`；條件只適用方案其中一類對象時整個拿掉。寫法見 `research/README.md`。
- 期限：跨年度的一次性期間要填 `deadline.end_year`；各縣市、各校自訂或每年不固定的用 `type: "varies"`，不要填概估的月日（寫法見 `research/README.md`）。
- 期限填送件的最後一天；購買、發票、報廢的最後一天寫在 `deadline.extra_lines`。經費用完就停的項目設 `deadline.budget_limited`，確認還在受理才更新 `last_checked`。
- 從申請日或文件備齊當月起算的補助用 `late_consequence.apply_now`：不要給它「截止前 30、14、3 天」的預設提醒（`reminderPreset`），那會把人帶到最後才送。`late_consequence` 與 `year_end_notice` 要有法條或 gov.tw 來源，`data:build` 會擋。
- 新增補助項目時在 `research/kinds.json` 標 `benefit`／`obligation`／`info`（寫法見 `research/README.md`）。試算結果頁的分組在 `src/lib/subsidy/results.ts`，畫面上的數字一律從 `counts` 拿，不要在元件裡另外算。
- `capacitor.config.ts` 的 `appId` 上架後不能改。
- 金鑰（`android/*.jks`、`android/keystore.properties`）不進 git；CI 用 Secrets。
- 文案繁體中文、白話；禁用抽象形容詞與副詞（非常、極致、完美、輕鬆、優雅等），用具體名詞、動詞、數字、場景。註解寫「為什麼」。
- 網頁版 CSP 在 `next.config.ts`；新增外部請求時同步更新 `connect-src`。
- 計算機裡的法定數字每年會變（勞健保投保級距與費率、住宅電價、所得稅免稅額與級距）。改數字時同步改畫面用的年度標示（`INSURANCE_YEAR_LABEL`、`RATE_EFFECTIVE_LABEL`、`TAX_YEAR_LABEL`）、頁面問答裡的金額與測試；來源網址寫在各檔案開頭的註解，查不到官方原表的部分照實寫出核對到哪裡。
- 畫面底部的短訊息用 `showToast`（`src/lib/toast.ts`），不要把訊息的 state 放在觸發它的元件裡：元件被卸載時訊息會跟著消失。
- 通知 id 由（提醒 id、期限年份、提前天數）決定（`notificationId`）；重排通知的取消與排程由 `planSync` 決定，帳本同時記 id 與觸發時間。改這兩處要跑 `npm run qa:native`。

## 分工

- 查主管機關原文、改補助資料：`haoye-data-check` subagent（`.claude/agents/`，Sonnet）。寫貼文與回覆草稿：`haoye-marketing` subagent。主對話留給規則與取捨。
- 不需要雲端模型的工作留在維護者的電腦上跑（官方頁面監看、用 Ollama 改寫貼文語氣）：`docs/LOCAL_JOBS.md`。本機模型的輸出不直接進資料、不直接發文。
- 推廣計畫與貼文範本：`docs/MARKETING.md`。

## 已知事項

- `src/lib/reminders` 內部用相對路徑 import（vitest 沒設 alias）。
- ESLint 忽略 `android/**`（裡面是複製進去的 build 產物）。
- Next/PostCSS 的 moderate audit advisory 已知，等上游修。
