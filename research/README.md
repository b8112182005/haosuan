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
