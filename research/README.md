# research/

`npm run data:build` 的輸入。不要手改 `src/data/subsidies.json`，改這裡再重建。

| 路徑 | 內容 |
|---|---|
| `topics/<topic>.json` | 研究員輸出：`items`（補助項目）與 `general_faqs`（跨補助問答），每個數字附來源，以主管機關網頁為主 |
| `patches/<id>.json` | 核對員對單一項目的重點核對結果：逐欄比對紀錄 `checked` 與修正 `corrections`（path + 新值）。verdict 為 confirmed／corrected 的項目會標上 `verified_at` |
| `verified/<id>.json` | 核對員重寫後的完整項目（有的話整筆取代 topics 裡的版本） |
| `removed.json` | 要排除的項目 id。目前是跨主題重複的項目（同一方案被兩個主題各寫一次，留資料較完整的那筆） |
| `overrides.json` | 人工覆寫：`{ "<id>": { 欄位: 值 } }`，最後套用 |

合併順序：topics → verified 取代 → patches 修正 → overrides 覆寫 → removed 排除 → schema 檢查。

## 機器可讀條件（`conditions`）怎麼寫

資格試算只看 `conditions`。寫錯的後果是使用者能領的項目被列在「不符合」，所以原則是：**只有每個申請人都必須符合的條件才填**，加碼條件、其中一類對象的條件一律不填，寫進 `eligibility` 文字就好。

| 欄位 | 用途 |
|---|---|
| `min_age`／`max_age` 等 | 硬條件：不符就判「不符合」 |
| `special_identity` | 試算沒有問的身分（原住民、新住民、農民、純電動車車主）。有填就歸「可能符合」，請使用者自行確認 |
| `lower_age_for` | 特定身分有較低的年齡門檻，例如 `{ "age": 55, "who": "原住民" }`。年齡在這個門檻與 `min_age` 之間的人歸「可能符合」 |
| `exceptions` | 硬條件在條文裡有例外時用：`{ "has_labor_insurance": "退保後 1 年內生產也可以領" }`。使用者不符合那個條件時歸「可能符合」並顯示例外，不直接排除。鍵用條件名稱；年齡用 `age`、子女用 `children`、所得用 `income`、車輛用 `vehicle` |
| `other` | 無法比對的補充條件，只顯示、不影響結果 |

怎麼選：條文寫「A 才能申請，但 B 情形也可以」→ 留著條件、加 `exceptions`。方案其實有兩類主要對象（房東與房客、自提與請領）→ 把只適用其中一類的條件整個拿掉。

## 期限（`deadline`）怎麼寫

app 用 `deadline` 算「剩幾天」和預設的提醒日期，寫錯會讓人錯過或白等。

| 情況 | 寫法 |
|---|---|
| 每年同一段期間（報稅、牌照稅） | `fixed_annual` + 月日 |
| 只辦一次、跨到別的年度（免稅到 2030 年底、申辦到 2029 年 7 月） | `window` + 月日，**加 `end_year`**（知道開始年份就加 `start_year`）。沒填年份會被算成今年或明年的那一天 |
| 一年有兩段以上固定期間（就學貸款上、下學期） | `fixed_annual` 填第一段，其餘放 `extra_windows`：`[{ "start_month": 1, "start_day": 15, "end_month": 2, "end_day": 28 }]`。app 取開放中的那一段，都沒開放就取最快開始的 |
| 只辦某一年度、明年是否續辦未公告（年度購車補助） | 月日加 `end_year`，過了顯示已截止。填**送件的最後一天**；購買、發票、報廢的最後一天比它早時，寫在 `extra_lines`（填早的那一天會讓還能送件的人看到「已截止」） |
| 各縣市、各校自己公告，或每年日期不固定 | `varies`，月日全部留 `null`，日期寫在 `note`。不要填一個概估的日期 |
| 自動發放、不用申請的固定發放日 | `event_based`，發放日寫在 `note` |
| 預算用完為止 | `budget_until_exhausted`，有公告的最後一天才填月日 |

期限卡上的補充資訊（都是選填）：

| 欄位 | 用途 |
|---|---|
| `deadline.extra_lines` | 主期限下面的補充行，最多 3 行：`[{ "label": "購買期限", "text": "發票日期要在 2026/12/31 以前" }]`。只放全國一致、有來源的文字 |
| `deadline.budget_limited` | `true`＝經費用完就提前結束，期限卡多一行說明 |
| `deadline.last_checked` | 最後一次對照官網確認還在受理的日期（`YYYY-MM-DD`）。沒確認就不要更新 |

有 `end_year` 的期間過了之後顯示「已截止」，不會滾到下一年。沒有年份的期間，過了今年會自動算到明年，詳情頁會標示「這一期的日期是照上一期推算的」。

## 排除紀錄（`removed.json`）

| id | 與哪一筆重複 |
|---|---|
| `taipei-chongyang-gift-2026-schedule` | `taipei-senior-card-and-chongyang`。115 年各領取方式的日期已用 overrides 併過去。commit 272e6ff 的訊息把重複對象寫成高雄敬老卡，是筆誤 |

## 晚送會怎樣（`late_consequence`）與年底卡（`year_end_notice`）

這兩個欄位的文字會放在期限卡第一屏、補助首頁，也會跟著提醒進到手機通知，所以建置時會檢查來源，不合格就失敗。

```json
"late_consequence": {
  "text": "津貼自備齊文件當月起算（發給辦法第 7 條第 2 項）；越晚備齊，起算月越晚。",
  "short": "從文件備齊當月起算，晚送少領",
  "apply_now": true,
  "sources": [{ "url": "https://law.moj.gov.tw/...", "title": "...", "publisher": "全國法規資料庫", "accessed": "2026-11-18" }]
}
```

- `sources` 要有一筆 `law.moj.gov.tw` 的法條，或兩筆 `gov.tw` 來源。新聞不算。
- `short` 24 字以內，會接在通知的期限日期後面。
- `apply_now: true` 用在「從申請日或文件備齊當月起算」的補助。這類項目不會預設「截止前 30、14、3 天」的提醒（那會把人帶到最後才送），主按鈕是「現在去申請」。

```json
"year_end_notice": {
  "from": "11-01", "to": "12-31",
  "title": "今年出生的寶寶：12/31 前送育兒津貼",
  "lines": ["..."],
  "sources": [{ "url": "https://...gov.tw/...", "title": "...", "publisher": "...", "accessed": "2026-11-18" }]
}
```

- `from`、`to` 是每年的月日（含頭尾），用裝置的今天判斷，每年都會出現，所以標題不要寫死西元年。`from` 比 `to` 晚代表跨年。
- `sources` 至少一筆 `gov.tw`。
