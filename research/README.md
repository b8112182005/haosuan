# research/

`npm run data:build` 的輸入。不要手改 `src/data/subsidies.json`，改這裡再重建。

| 路徑 | 內容 |
|---|---|
| `topics/<topic>.json` | 研究員輸出：`items`（補助項目）與 `general_faqs`（跨補助問答），每個數字附官方來源 |
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
| `other` | 無法比對的補充條件，只顯示、不影響結果 |

## 排除紀錄（`removed.json`）

| id | 與哪一筆重複 |
|---|---|
| `taipei-chongyang-gift-2026-schedule` | `taipei-senior-card-and-chongyang`。115 年各領取方式的日期已用 overrides 併過去。commit 272e6ff 的訊息把重複對象寫成高雄敬老卡，是筆誤 |
