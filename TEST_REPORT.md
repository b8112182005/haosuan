# 好算 QA 測試報告
最後更新: 2026-03-18 (靜態程式碼分析，含 git log 監控，全部 20/20 工具完成)

> **2026-05-29 更新**：3 項高嚴重度 bug（加班費國定假日/休息日、所得稅扶養防禦）已全數修復，
> 並導入 Vitest 自動化測試鎖定（`npm test`，19 項全綠），基準對照台北市勞動局與財政部 114 年度公告。
> 加班費休息日超過 8 小時已更正為 ×8/3、移除 2018 已廢除的最低一日工資保障；國定假日改為「8 小時內加發一日工資」。
> 詳見 `BUGS.md` 與 `src/lib/calculators/__tests__/`。以下為原始 2026-03-18 靜態分析報告存查。

---

## 摘要
| 工具 | 狀態 | 問題數 |
|------|------|--------|
| BMI 計算機 | ✅ 通過 | 0 |
| 年齡計算機 | ⚠️ 有疑慮 | 1 |
| 日期天數計算機 | ⚠️ 有疑慮 | 1 |
| 電費計算機 | ⚠️ 有疑慮 | 2 |
| 睡眠時間計算機 | ✅ 通過 | 0 |
| 房貸試算機 | ⚠️ 有疑慮 | 2 |
| 匯率換算計算機 | ⚠️ 有疑慮 | 2 |
| 薪資所得稅試算 | ❌ 有 bug | 3 |
| 複利計算機 | ⚠️ 有疑慮 | 2 |
| 加班費計算機 | ❌ 有 bug | 3 |
| 發票營業稅計算機 | ✅ 通過 | 0 |
| 油漆用量計算機 | ⚠️ 有疑慮 | 1 |
| 冷氣噸數計算機 | ⚠️ 有疑慮 | 2 |
| 磁磚數量計算機 | ⚠️ 有疑慮 | 1 |
| 面積換算計算機 | ✅ 通過 | 1低 |
| 長度換算計算機 | ✅ 通過 | 0 |
| 重量換算計算機 | ✅ 通過 | 0 |
| 溫度換算計算機 | ✅ 通過 | 0 |
| 百分比計算機 | ⚠️ 有疑慮 | 1 |
| 字數計算機 | ⚠️ 有疑慮 | 1 |

**測試完成：20/20 工具**
**總計：高嚴重度 3 個、中嚴重度 10 個、低嚴重度 6 個**

---

## 詳細報告

---

### BMI 計算機
**檔案：** `src/lib/calculators/bmi.ts` + `src/app/life/bmi/BmiCalculator.tsx`

測試情境:
- 空白輸入 → `isValid` 條件 (`h > 50 && h < 300 && w > 1 && w < 500`) 阻擋，`result = null`，不渲染結果 → **通過**
- 負數身高 / 體重 → `h > 50` 與 `w > 1` 排除負數，不觸發計算 → **通過**
- 超大數字 (99999999) → UI 條件 `h < 300 && w < 500` 阻擋 → **通過**
- 零值 → `h > 50` 排除 0，`w > 1` 排除 0 → **通過**
- 小數點亂填 (`175.5.5`) → `parseFloat("175.5.5")` 回傳 `175.5`（截斷），行為合理 → **通過**
- 身高邊界 50cm / 300cm → 條件使用嚴格不等號 (`h > 50` 且 `h < 300`)，50 和 300 本身被排除。使用者若輸入 50.1 則可通過，合理 → **通過**
- NaN 傳播 → `isNaN(h)` 明確檢查，`result=null` → **通過**
- 除以零 → `heightM = 0` 不可能（受 `h > 50` 保護）→ **通過**
- 台灣標準正確性 → 使用衛福部標準（正常 18.5–24），正確 → **通過**

發現問題: 無

---

### 年齡計算機
**檔案：** `src/lib/calculators/age.ts` + `src/app/life/age/AgeCalculator.tsx`

測試情境:
- 空白不填 → `birth = null`，`isValid = false`，不計算 → **通過**
- 未來日期（生日 > 今天）→ UI 條件 `birth < new Date()` 阻擋 → **通過**
- 極遠古日期（如西元 1 年）→ `new Date("0001-01-01")` 在 JS 中有效，計算結果為超過 2000 歲。UI 無上限限制，會顯示奇怪的年齡（如「2025 歲」）→ **疑慮**
- 今天填今天 → `birth < new Date()` 以毫秒為單位，`date input` 的日期沒有時間部分，`new Date("2026-03-18")` 等於當天 00:00，而 `new Date()` 為今天當前時間，因此「今天」的生日可以通過驗證，計算結果為「0 歲 0 個月 0 天」。此為正常行為 → **通過**
- 負年齡（totalDays 負數）→ 受 UI 層 `birth < new Date()` 保護 → **通過**
- 生肖計算：已改用正規化 modulo（`((year - 4) % 12 + 12) % 12`），可避免極早年份因 JS `%` 負餘數造成 `animals[負數]` 回傳 `undefined` → **通過**

發現問題:
- **[低]** 年齡計算機無最早生日限制，西元極早年份（如 0001 年）可正常計算並顯示「2025 歲」，缺乏合理上限提示
  位置: `src/app/life/age/AgeCalculator.tsx:13`
  建議修復: 在 `isValid` 加入 `birth.getFullYear() >= 1900`（或合理下限）

---

### 日期天數計算機
**檔案：** `src/lib/calculators/date-diff.ts` + `src/app/life/date-diff/DateDiffCalculator.tsx`

測試情境:
- 兩日期相同 → UI 條件 `startDate !== endDate` 阻擋，顯示提示文字 → **通過**
- 結束日期早於開始日期 → `calculateDateDiff` 內部自動交換 (`[d1, d2]`)，永遠 d1 <= d2 → **通過**
- 空白不填 → `type="date"` 的 input，空白時 `new Date("")` 回傳 `Invalid Date`，`isNaN(start.getTime())` 為 `true`，`isValid=false` → **通過**
- 超遠日期（西元 9999 年）→ JS 可正確處理，計算結果正常 → **通過**
- 工作天數計算 → 使用逐日迴圈，對極大日期差（如 100 年 = 36500 天）可能稍慢，但不影響正確性 → **低疑慮**

發現問題:
- **[低]** 工作天數計算使用逐日迴圈，若使用者輸入相差數十年的日期（如 1900 年 vs 2100 年 = 73000+ 次迴圈），在低效裝置上可能短暫卡頓。無嚴重 bug，但可改用數學公式優化
  位置: `src/lib/calculators/date-diff.ts:54-60`
  建議修復: 可改用 Zeller's 公式或分段計算工作日，但非緊急

---

### 電費計算機
**檔案：** `src/lib/calculators/electricity.ts` + `src/app/life/electricity/ElectricityCalculator.tsx`

測試情境:
- 空白不填 → `isNaN(u)` 為 true，`isValid=false`，不計算 → **通過**
- 0 度 → `isValid` 條件允許 `u >= 0`，進入計算。`remaining=0`，迴圈立刻 `break`，`energyCharge=0`，`totalCharge=75`（只有基本費）。`avgPricePerUnit` 在 `units > 0` 時才計算，0 度時回傳 0 → **通過**
- 負數 → `u >= 0` 阻擋 → **通過**
- 10000 度超高用電 → 正確進入第六段費率計算，無 Infinity → **通過**
- 台電費率正確性驗證：
  - 非夏月費率：120 度以下 1.63、121-330 度 2.10、331-500 度 2.89、501-700 度 3.94、701-1000 度 4.60、1001 度以上 5.03
  - 與台電官網 2024 費率比對：**費率數值正確**
  - 基本費 75 元：**正確**
- **問題：** 電費計算在用量 0 度時，結果顯示總費用 NT$75（基本費），但實際上台電的基本費是含在最低月租費中，0 度用電實務上應仍需支付基本費，此為合理計算。然而 UI 未說明「0 度仍須支付基本費」，可能讓使用者困惑 → **低疑慮**
- **問題：** `getCurrentSeason()` 判斷夏月為「6 月～9 月」，與台電官方定義「夏月：6月1日至9月30日」一致，正確。但目前日期 2026-03-18（非夏月）預設為 non-summer，合理 → **通過**

發現問題:
- **[低]** 0 度用電時總費 NT$75（基本費），UI 無說明，使用者可能誤解
  位置: `src/app/life/electricity/ElectricityCalculator.tsx:54`
  建議修復: 在結果區補充說明「含基本費 NT$75」或零度時顯示提示

- **[低]** `avgPricePerUnit` 計算包含基本費（totalCharge / units），這使「平均每度價格」比純電費費率偏高，對低用量戶更明顯。例如 120 度：(75+195.6)/120 = 2.25 元/度，而非純費率 1.63。此計算方式應在 UI 說明
  位置: `src/lib/calculators/electricity.ts:97`
  建議修復: UI 加注「含基本費攤提」

---

### 睡眠時間計算機
**檔案：** `src/lib/calculators/sleep.ts` + `src/app/life/sleep/SleepCalculator.tsx`

測試情境:
- 空白 / 格式錯誤 → UI 使用 regex `^\d{1,2}:\d{2}$` 驗證，不符合則 `results=[]`，不渲染 → **通過**
- `type="time"` 的 input → 瀏覽器原生限制只能輸入合法時間格式（00:00–23:59），使用者無法輸入非法值 → **通過**
- 跨午夜計算 → `getSleepTimes`/`getWakeTimes` 均使用模運算處理跨午夜，結果正確 → **通過**
- 0 週期 / 負週期 → `cyclesCount` 固定為 6，使用者無法修改，無此問題 → **通過**
- `wakeTimeStr` 格式如 `"7:00"` (一位數小時) → regex 允許 `\d{1,2}`，且 `split(":")` 後 `map(Number)` 正確解析 → **通過**

發現問題: 無

---

### 房貸試算機
**檔案：** `src/lib/calculators/mortgage.ts` + `src/app/finance/mortgage/MortgageCalculator.tsx`

測試情境:
- 空白不填 → `isNaN` 檢查阻擋，`result=null` → **通過**
- 利率 0% → 計算機有特殊處理：`monthlyRate === 0 ? loanAmount / months : ...`，正確避免除以零 → **通過**
- 借款 0 → UI 條件 `loan > 0` 阻擋 → **通過**
- 負借款 → `loan > 0` 阻擋 → **通過**
- 年限 0 → UI 條件 `y >= 1` 阻擋 → **通過**
- 利率 > 30 → UI 條件 `r <= 30` 阻擋 → **通過**
- 超大借款（9999999999）→ 計算結果為大數字，JS `number` 最大安全整數約 9 兆，房貸金額不會溢出 → **通過**
- 等額本金 + 年限 1 年 → `schedule[0]` 和 `schedule[schedule.length-1]` 正確存取 → **通過**
- **頭期款 > 房屋總價問題**：計算機只計算「貸款金額」，不計算「房屋總價 - 頭期款」，所以無此問題結構 → **通過（設計合理）**

發現問題:
- **[中]** 等額本息計算中，`schedule` 最多截斷到 360 筆（`schedule.slice(0, 360)`），但 UI `years` 最大允許 40 年 = 480 個月。若使用者輸入 40 年，schedule 只有前 30 年（360個月），但 `totalPayment` 是以 480 個月計算（迴圈跑到 480），兩者不一致，若使用者查看明細會誤以為只有 30 年資料，但總利息是 40 年的值，造成顯示混淆
  位置: `src/lib/calculators/mortgage.ts:81`
  建議修復: 將 `schedule.slice(0, 360)` 改為返回全部，或 UI 說明「明細僅顯示前 30 年」

- **[低]** `totalInterest = Math.round(totalPayment - loanAmount)` 在等額本息中，由於每月付款有 `Math.round`，累積誤差可能使 totalInterest 偏差幾十元。這是浮點累積問題，可接受但值得注意
  位置: `src/lib/calculators/mortgage.ts:79-80`
  建議修復: 低優先級，可記錄為「試算誤差±數十元」

---

### 匯率換算計算機
**檔案：** `src/lib/calculators/exchange-rate.ts` + `src/app/finance/exchange-rate/ExchangeRateCalculator.tsx`

測試情境:
- 空白金額 → `isNaN(a)` 為 true（`parseFloat("")=NaN`），`isValid=false`，不計算 → **通過**
- 金額 0 → `a >= 0` 允許，`twdAmount=0`，`toAmount=0`，顯示 0 → **通過**
- 負數 → `a >= 0` 阻擋 → **通過**
- 來源幣別 = 目標幣別（同幣換算）→ `rate = from.rateToTWD / to.rateToTWD = 1`，`toAmount = amount`，結果正確顯示 1:1 → **通過**
- 超大金額 → JS number 精度足夠 → **通過**
- 幣別代碼不存在 → `convertCurrency` 回傳 `null`，UI `result && ...` 阻擋渲染 → **通過**

發現問題:
- **[中]** 匯率為 2024 年靜態參考值，未即時更新。2026 年的實際匯率可能有顯著差異（如日圓匯率波動大）。雖有免責聲明，但數值如已過時，使用者可能拿去做錯誤決策。此為設計問題
  位置: `src/lib/calculators/exchange-rate.ts:14-30`
  建議修復: 定期更新費率表，或串接免費 API（如 exchangerate-api.com）

- **[低]** 常用換算對照表（`fromCode === "TWD"` 時顯示）在 `amount=0` 時全部顯示 0，但 table 仍渲染，不影響功能但視覺上空洞
  位置: `src/app/finance/exchange-rate/ExchangeRateCalculator.tsx:105`
  建議修復: 對照表在 `amount > 0` 時才顯示

---

### 薪資所得稅試算
**檔案：** `src/lib/calculators/income-tax.ts` + `src/app/finance/income-tax/IncomeTaxCalculator.tsx`

測試情境:
- 空白月薪 → `parseFloat("") = NaN`，`isValid = !isNaN(monthly) && monthly >= 0` 為 `false`，`result=null` → **通過**
- 月薪 0 → `isValid` 允許（`monthly >= 0`），進入計算。年薪=0，所有扣除額加總 > 0，`netIncome = Math.max(0, 0 - 總扣除) = 0`，`taxAmount=0` → **通過**
- 負月薪 → `monthly >= 0` 阻擋 → **通過**
- 月薪 100 萬（年薪 1200 萬）→ 進入第五稅率級距（40%），正確計算 → **通過**

發現問題:
- **[高]** 薪資所得稅年份標示錯誤/數值不一致：
  - 程式碼標榜「2024 年（民國 113 年）」
  - 但 `DEDUCTIONS.personal = 97000`（個人免稅額）：2024年實際為 **97,000 元**（正確）
  - `DEDUCTIONS.salarySpecial = 218000`（薪資所得特別扣除額）：2024年實際為 **218,000 元**（正確）
  - `DEDUCTIONS.standardSingle = 131,000`（標準扣除額單身）：2024年實際為 **131,000 元**（正確）
  - 稅率級距第一段上限 `590,000`：2024年實際為 **590,000 元**（正確）
  - **但注意：** 標題文案（FAQ、metadata）說「2024年免稅額 92,000、標準扣除額 124,000」是舊年度資料（113年前）已與程式碼實際值不符，FAQ說明文字有誤
  位置: `src/app/finance/income-tax/page.tsx:35`（FAQ 說明）
  建議修復: FAQ 說明文字「薪資所得特別扣除額為 218,000 元」已正確，但 FAQ 第三題「每人免稅額為 97,000 元」正確。整體 FAQ 文字與程式邏輯一致，**重新確認後此為誤報，見下方更正**

- **[高]** IncomeTaxCalculator.tsx 中 `monthly >= 0` 允許月薪為 0，當月薪為 0 時程式正常運作（稅額=0）。但 `annual = isNaN(monthly) ? 0 : monthly * 12`，如果使用者清空輸入框（`monthlySalary=""`），`parseFloat("") = NaN`，`annual = 0`，這時 `isValid = !isNaN(NaN) = false`，`result=null`。**邏輯正確**
  → 此為誤報，移除

- **[高] 確認 bug：** `numElderlyDependents` 輸入框無下限對應 `numDependents` 的即時驗證。使用者可在 UI 中輸入「撫養人數=0，其中 70 歲以上=5」。UI 層雖有 `Math.min(elderlyDeps, deps)` 保護（強制老年親屬數 ≤ 總親屬數），但顯示的輸入框值不會自動更正，使用者看到自己填了 5 但實際計算用 0，造成困惑
  位置: `src/app/finance/income-tax/IncomeTaxCalculator.tsx:30`
  建議修復: 在 `numElderlyDependents` 的 `max` 屬性動態綁定為 `deps`，並在值超出時即時顯示警告

- **[中]** `income-tax.ts` 的 `regularDependents = Math.max(0, numDependents - numElderlyDependents)`：如果 `numElderlyDependents > numDependents`（不合理輸入），`regularDependents=0` 但 `numElderlyDependents` 原值仍被使用於 `dependentExemption`，導致 70 歲以上親屬免稅額超過總親屬數 × 97000，計算邏輯異常
  位置: `src/lib/calculators/income-tax.ts:76-79`
  建議修復: 在計算函數入口加 `const safeElderly = Math.min(numElderlyDependents, numDependents)` 並使用 `safeElderly`（UI 層雖已用 `Math.min`，但計算層自身無防護）

- **[中]** 所得稅稅率標籤顯示邏輯：`bracket.max === Infinity` 時顯示「以上」，但 `prevMax` 此時為 4,980,000，label 會是「498～以上 萬」，格式奇怪（缺少正確的「498萬以上」格式）
  位置: `src/lib/calculators/income-tax.ts:112`
  建議修復: 改為 `bracket.max === Infinity ? \`${(prevMax/10000).toFixed(0)} 萬以上\` : \`...\``

---

### 複利計算機
**檔案：** `src/lib/calculators/compound-interest.ts` + `src/app/finance/compound-interest/CompoundInterestCalculator.tsx`

測試情境:
- 空白本金 → UI 中 `p = parseFloat("") = NaN`，`isValid=false` → **通過**
- 本金 0 + 年利率 7% → `isValid` 允許 `p >= 0`，進入計算。`balance=0`，每期加 `periodicContribution`（月投入），正確累積 → **通過**
- 年利率 0% → `ratePerPeriod=0`，每期 `interest=0`，最終值等於本金+全部投入，正確 → **通過**
- 年利率 100% → UI 條件 `r <= 100` 允許，計算結果為本金加倍（月複利時每月 8.33%），數值正確無 Infinity → **通過**
- 投資期 0 年 → UI 條件 `y >= 1` 阻擋 → **通過**
- 負利率 → `r >= 0` 阻擋 → **通過**
- 每月投入空白 → `const m = parseFloat(monthly) || 0`，`parseFloat("")=NaN`，`NaN || 0 = 0`，自動當作 0 → **通過**
- 超大本金（9999999999）→ 複利後可能超出安全整數，但 `toLocaleString` 仍能顯示（JS 大數精度問題可能在極端值出現），一般使用情境不影響 → **低疑慮**

發現問題:
- **[中]** `yearlyData` 在年利率 0%、本金 0、月投入 0 時：`totalContrib=0`，`returnRate` 計算中 `totalContrib > 0` 條件為 `false`，回傳 0%，正確。但若本金=0 且月投入=0 且利率>0，`balance` 永遠為 0，結果顯示 NT$0，無錯誤提示。使用者可能不知道輸入有問題
  位置: `src/app/finance/compound-interest/CompoundInterestCalculator.tsx:28-31`
  建議修復: 加入「本金與每月投入不能同時為 0」的驗證提示

- **[低]** 季複利（quarterly）+ 月投入的計算方式：每個「計息週期」（3個月）加入 `monthlyContribution * 3`。這假設月投入在季末一次性存入，而非月初或月底分次存入。計算結果與「每月存入再季複利」有微小差異，應在 UI 說明計算假設
  位置: `src/lib/calculators/compound-interest.ts:61`
  建議修復: UI 加注說明複利計算假設（期末計息）

---

### 加班費計算機
**檔案：** `src/lib/calculators/overtime.ts` + `src/app/finance/overtime/OvertimeCalculator.tsx`

測試情境:
- 空白月薪 → `isNaN(s)` 阻擋 → **通過**
- 月薪 0 → `s > 0` 阻擋 → **通過**
- 加班 0 小時 → `h > 0` 阻擋 → **通過**
- 時薪低於基本工資（月薪 < 27470 × 240/30... 實際基本工資 183 元/時）→ 計算機允許輸入低於基本工資的月薪，無警示。月薪 18000 時時薪 = 75 元，低於法定 183 元，但計算機仍以此計算加班費，結果不合法
  → **疑慮（無錯誤提示）**

發現問題:
- **[高] 勞基法加班費倍率錯誤：**
  - 勞基法第 24 條：平日加班前 2 小時應加給 **1/3**（即時薪 × 1.333），第 3 小時起加給 **2/3**（即時薪 × 1.667）
  - 程式碼：`rate: 1 + 1/3`（= 1.333），`rate: 1 + 2/3`（= 1.667）→ **此部分正確**
  - **但休息日（rest-day）計算邏輯有誤：**
    - 使用 `dailyWage / 8 * (1 + 1/3)` 和 `dailyWage / 8 * (1 + 2/3)` 計算，然後再補「一日工資差額」
    - 勞基法休息日規定：雇主若要求休息日出勤，「工作時間每2小時，或不足2小時部分，以2小時計算」，休息日出勤前8小時，每小時工資加給 1/3，第 9 小時起加給 2/3
    - 程式碼混用了「每日工資」和「時薪」兩種計算基準，且補差額邏輯不透明
    - 更重要的是：休息日出勤「至少給付一日工資，且需以時計算加給」，程式碼的「補差額」邏輯加在 breakdown 最後一項，不符合法規的分項顯示
    位置: `src/lib/calculators/overtime.ts:56-91`
    建議修復: 休息日計算應完全重寫，依勞動部官方說明：以時薪計，前 2 小時 × 1.34，第 3-8 小時 × 1.67，第 9-12 小時 × 2.67

- **[高] 國定假日計算方式錯誤：**
  - 程式碼：`pay = dailyWage * 2`（整日雙薪，不管加班幾小時）
  - 勞基法第 39 條：國定假日出勤應加倍給付「工資」，意指當天出勤的每小時工資 × 2
  - 程式碼固定回傳 `dailyWage * 2`（一整天的雙薪），不管使用者輸入幾小時，4 小時和 8 小時都得到相同結果，這是錯的
  位置: `src/lib/calculators/overtime.ts:93-96`
  建議修復: 改為 `pay = hourlyWage * 2 * hours`

- **[中]** 無最低基本工資檢查。使用者輸入月薪 18000（低於基本工資 27470 元），時薪計算為 75 元，低於法定最低時薪 183 元，應提示警告
  位置: `src/app/finance/overtime/OvertimeCalculator.tsx:25-28`
  建議修復: 加入 `s < 27470` 時顯示警告「月薪低於基本工資（27,470 元），請確認」

---

### 發票營業稅計算機
**檔案：** `src/lib/calculators/invoice-tax.ts` + `src/app/finance/invoice-tax/InvoiceTaxCalculator.tsx`

測試情境:
- 空白金額 → `parseFloat("") = NaN`，`isValid=false`，不計算 → **通過**
- 金額 0 → `a >= 0` 允許，計算結果：含稅 0，未稅 0，稅額 0，顯示正常 → **通過**
- 負數 → `a >= 0` 阻擋 → **通過**
- 超大金額（9999999）→ `Math.round(9999999 / 1.05 * 100)/100 = 9523808.57`，正確 → **通過**
- 含稅拆算未稅精度：`calcFromInclusive(1050)` → 未稅 = round(1050/1.05 × 100)/100 = 1000.00，稅額 = 1050 - 1000 = 50，正確 → **通過**
- 未稅加算含稅：`calcFromExclusive(1000)` → 稅額 = round(1000×0.05×100)/100 = 50，含稅 = round(1050×100)/100 = 1050，正確 → **通過**
- 台灣營業稅率 5%：正確 → **通過**

發現問題: 無

---

### 油漆用量計算機
**檔案：** `src/lib/calculators/paint.ts` + `src/app/renovation/paint/PaintCalculator.tsx`

測試情境:
- 空白 / 0 尺寸 → `isValid` 條件要求 `w > 0 && l > 0 && h > 0`，阻擋 → **通過**
- 負數 → `> 0` 條件阻擋 → **通過**
- 門窗扣除面積 > 總牆面積 → `targetArea = Math.max(0, rawArea - windowDoorArea)` 保護，結果為 0，不負數 → **通過**
- 0 升（極小房間）→ `litersNeeded = Math.ceil(0 * 1.1 * 10) / 10 = 0`，`cansNeeded` 全為 0（`Math.ceil(0)=0`），`costEstimate` 全為 0，顯示正常 → **通過**
- 超大房間（100m × 100m × 10m）→ 牆面 4000 m²，liters = ceil(4000×3×1.1/10) = ceil(1320) = 1320，正常 → **通過**
- `pingToSqm(0)` → `0 × 3.305785 = 0`，正常 → **通過**
- 門窗面積空白 → `const wd = parseFloat(windowDoor) || 0`，空白時 NaN → 0，正確 → **通過**

發現問題:
- **[低]** `litersNeeded` 使用 `Math.ceil((effectiveArea / COVERAGE_PER_LITER) * 1.1 * 10) / 10`：此公式先乘以 10 再 ceil 再除以 10，等效於「無條件進位至小數點後一位」。但對 0 有效面積（如門窗扣除完全覆蓋牆面），`litersNeeded=0`，`cansNeeded.small = Math.ceil(0) = 0`，UI 顯示「建議用量 0 升」，無任何說明，可能讓使用者困惑（明明有房間但需要 0 升油漆）
  位置: `src/lib/calculators/paint.ts:79-80`
  建議修復: 當 `targetArea=0` 或 `litersNeeded=0` 時顯示提示「門窗扣除面積已等於或超過施工面積」

---

---

### 冷氣噸數計算機（新工具，commit: 8e348c0）
**檔案：** `src/lib/calculators/ac-btu.ts` + `src/app/renovation/ac-btu/AcBtuCalculator.tsx`

測試情境:
- 空白坪數 → `isNaN(ping)` 阻擋，`result=null` → **通過**
- 坪數 0 → `ping > 0` 阻擋 → **通過**
- 負數 → `ping > 0` 阻擋 → **通過**
- 超大坪數（9999）→ UI 條件 `ping <= 100` 阻擋 → **通過**
- 極小坪數（0.1）→ `isValid` 允許（`ping > 0`），計算結果：`baseBtu = 0.1 * 600 = 60`，`requiredBtu` 可能 < AC_MODELS 最小規格（10000 BTU），`recommendedModels.filter(m => m.suitable)` 全為 false，顯示「需要 57 BTU，請查詢商用規格」，行為合理 → **通過**
- 所有選項組合（factor 計算）→ 所有因子為常數乘積，無除以零風險 → **通過**
- `requiredBtu / 12000` 為 `0` 坪時 → 受 `ping > 0` 保護 → **通過**

發現問題:
- **[中]** `recommendedModels` 的判定條件為 `model.btu >= requiredBtu * 0.9 && model.btu <= requiredBtu * 1.3`：當坪數超過約 45 坪（requiredBtu > 37000 BTU），最大規格 4 噸（48000 BTU）的上限 48000 * 1.3 = 62400，仍在範圍內，但當坪數更大時，可能所有 `suitable=false` 並只顯示「請查詢商用規格」。然而 UI 並沒有明確提示「所有常見規格均不足夠，建議用多台冷氣」，可優化顯示
  位置: `src/app/renovation/ac-btu/AcBtuCalculator.tsx:175`
  建議修復: 當所有規格不合適時，判斷是因為「需求太小」還是「需求太大」，顯示不同提示

- **[低]** 修正係數 `BTU_PER_PING_BASE = 600` 為台灣常用估算值（500～700 BTU/坪），合理。但計算機未說明此為估算值，建議在 UI 加注
  位置: `src/lib/calculators/ac-btu.ts:36`
  建議修復: 在 UI 說明「依室內環境不同，實際需求可能有 ±20% 差異」

---

### 磁磚數量計算機（新工具，commit: 156096e）
**檔案：** `src/lib/calculators/tile.ts` + `src/app/renovation/tile/TileCalculator.tsx`

測試情境:
- 空白面積 → `isNaN(a)` 阻擋 → **通過**
- 面積 0 → `a > 0` 阻擋 → **通過**
- 磁磚尺寸 0 → `l > 0 && w > 0` 阻擋 → **通過**
- 縫隙 0mm → `j = parseFloat("") || 3`，但若使用者輸入「0」，`parseFloat("0") = 0`，`0 || 3 = 3`（因為 0 為 falsy！），使用者設定的 0mm 縫隙會被覆蓋為 3mm → **BUG**
- 損耗率 0% → `wast = parseFloat("0") || 10 = 10`（因為 0 為 falsy！），使用者設定的 0% 損耗被覆蓋為 10% → **BUG**
- 損耗率 30%（上限）→ UI 允許輸入到 30，計算結果合理 → **通過**
- 縫隙 20mm（上限）→ 計算公式 `(length + 0.2) / 100 * (width + 0.2) / 100`，正確 → **通過**
- 每箱 10 片固定假設 → 不同品牌磁磚每箱片數可能不同（60×60 常見 4片/箱），此假設可能錯誤，但屬設計限制 → **低疑慮**
- 費用估算 1500～2500 元/坪 → 為台灣一般行情，合理

發現問題:
- **[中]** 縫隙 0mm 和損耗率 0% 使用 `|| fallback` 語法，導致使用者輸入 0 時被替換為預設值（3mm / 10%），行為與使用者預期不符
  位置: `src/app/renovation/tile/TileCalculator.tsx:38-39`
  建議修復: 改為 `const wast = wastage === "" ? 10 : parseFloat(wastage)` 以及縫隙同樣處理

---

---

### 面積換算計算機（新工具，commit: 272e298）
**檔案：** `src/lib/calculators/area.ts` + `src/app/convert/area/AreaConverter.tsx`

測試情境:
- 空白數值 → `isNaN(v)` 阻擋，`result=null` → **通過**
- 數值 0 → `v >= 0` 允許，`sqmValue=0`，所有結果為 0，`formatAreaValue(0) = "0"`，正確顯示 → **通過**
- 負數 → `v >= 0` 阻擋 → **通過**
- 超大數字（9999999999 坪）→ `sqmValue = 9999999999 * 3.3` ≈ 3.3e10，`formatAreaValue` 用 `toExponential(4)` 處理，顯示 `3.3058e+10 m²`，正常 → **通過**
- 極小數字（0.0001 坪）→ `sqmValue = 0.00033`，`formatAreaValue` 用 `toExponential(4)` 處理，正常 → **通過**
- 相同單位換算（坪 → 坪）→ `sqmValue / toSqm = value`，結果等於輸入，正確 → **通過**
- `convertArea` 中 `fromUnit` 不在 `AREA_UNITS` 時 → `AREA_UNITS.find(...)!` 使用非空斷言，若傳入不存在的單位會拋出 TypeError。但 UI 使用 select 且 value 只能是合法 `AreaUnit`，無此風險 → **通過**
- 坪換算精度：`3.30578512` vs 台灣官方「1坪 = 400/121 m² ≈ 3.305785...」，精度足夠 → **通過**
- 常用換算表靜態文字「1 坪 = 3.3058 m²」與程式碼使用 `3.30578512` 略有出入（第 5 位小數），對使用者顯示 3.3058 vs 程式計算用更精確值，不影響計算但說明文字可更精確 → **低疑慮**

發現問題:
- **[低]** 靜態常用換算表文字顯示「1 坪 = 3.3058 m²」，而程式碼實際換算係數為 `3.30578512`，兩者第 4 位小數後略有差異（3.3058 vs 3.3058），此差異微小，但若用於法律或不動產計算可能有意義
  位置: `src/app/convert/area/AreaConverter.tsx:91`
  建議修復: 將靜態說明文字改為「1 坪 ≈ 3.3058 m²」加上約略符號，或改為更精確的 `3.3058 m²`（已為四捨五入後值）

---

---

### 長度換算計算機（新工具，commit: 5f4349c）
**檔案：** `src/lib/calculators/length.ts` + `src/app/convert/length/LengthCalculator.tsx`

測試情境:
- 空白 / NaN → 計算層 `isNaN(value) || value < 0` 阻擋回傳 null；UI 也有 `!isNaN(numValue) && numValue >= 0` → **通過**
- 負數 → 兩層都阻擋 → **通過**
- 0 → 允許，所有結果為 0 → **通過**
- 超大數字 → `formatLengthValue` 使用 `toExponential(4)` 處理 → **通過**
- 換算精度：英里 `1609.344`、英尺 `0.3048`、英吋 `0.0254` 均為國際標準值 → **通過**

發現問題: 無

---

### 重量換算計算機（新工具，commit: 5f4349c）
**檔案：** `src/lib/calculators/weight.ts` + `src/app/convert/weight/WeightCalculator.tsx`

測試情境:
- 空白 / 負數 → `convertWeight` 內建 `isNaN || value < 0` 保護 → **通過**
- 台斤 = 600g → 台灣官方定義 1 台斤 = 600g，正確 → **通過**
- 盎司精度：`28.3495231`（國際標準 28.349523125g），正確 → **通過**
- 超大數字 → `formatWeightValue` 處理 → **通過**

發現問題: 無

---

### 溫度換算計算機（新工具，commit: 5f4349c）
**檔案：** `src/lib/calculators/temperature.ts` + `src/app/convert/temperature/TemperatureCalculator.tsx`

測試情境:
- 空白 → `isNaN(numValue)` 阻擋 → **通過**
- 攝氏負數（-40）→ 允許，`kelvin = -40 + 273.15 = 233.15`，正數 → **通過**
- 絕對零度以下：攝氏 -274 → `kelvin = -0.85`，`if (kelvin < 0) return null`，UI 顯示提示 → **通過**
- 克耳文負數 → `if (value < 0) return null`，UI 顯示提示 → **通過**
- 超大數字（9999°C）→ 計算正常，`fahrenheit = 18030.2` → **通過**
- 華氏 32 → 攝氏 0，正確 → **通過**
- 公式正確性：F = C × 9/5 + 32，K = C + 273.15 → **正確**

發現問題: 無

---

### 百分比計算機（新工具，commit: 5f4349c）
**檔案：** `src/lib/calculators/percentage.ts` + `src/app/math/percentage/PercentageCalculator.tsx`

測試情境:
- 空白 → `parseFloat("") = NaN`，各函數內建 `isNaN` 檢查，回傳 null → **通過**
- 除以零（模式1：Y=0）→ `whatPercent` 有 `y === 0` 檢查，回傳 null，UI `result1 !== null` 阻擋 → **通過**
- 百分比變化 from=0（模式3）→ `percentChange(0, 100)` 有 `from === 0` 檢查，回傳 null → **通過**
- 負數 → 允許負數輸入，計算結果正確（如 -100 是 200 的 -50%）→ **通過**
- 模式2百分比為負（如折扣 -10）→ `percentOf(1000, -10) = -100`，顯示 -100，正確 → **通過**
- 超大數字 → 正常計算 → **通過**

發現問題:
- **[中]** 模式3（增減幅度）：當 from < 0 時（如 from=-100, to=-50），`percentChange(-100, -50)` → `change = ((-50 - (-100)) / |-100|) * 100 = 50%`，方向為 `increase`（增加），但負數從 -100 到 -50 在語意上是「絕對值減少」，雖然數學上增加了（更接近 0），顯示「增加了 50%」可能使使用者困惑。此為設計取捨，應在 UI 加注說明
  位置: `src/lib/calculators/percentage.ts:22-26`
  建議修復: 在模式3 UI 加注「方向依數學定義：目標值 > 原始值 = 增加」

---

### 字數計算機（新工具，commit: 5f4349c）
**檔案：** `src/lib/calculators/word-count.ts` + `src/app/math/word-count/WordCountCalculator.tsx`

測試情境:
- 空白文字 → `if (!text)` 阻擋，回傳全零 → **通過**
- 純中文 → regex `[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]` 正確計數 → **通過**
- 純英文 → regex `[a-zA-Z]+` 計算單詞數，正確 → **通過**
- 中英混合 → 各計各的，正確 → **通過**
- 超長文字（10 萬字）→ `text.length` 直接取得，O(1)；regex 為 O(n)，對 10 萬字可能有微秒延遲但不影響 UX → **通過**
- 單一換行 → `paragraphs` 以 `\n\s*\n` 分割（雙換行），單一換行不算新段落，`lines` 以 `\n` 計，兩者不同，符合一般文書習慣 → **通過**
- 全空白文字（多個空格）→ `if (!text)` 為 `false`（因為非空字串），繼續計算。`chineseChars=0, englishWords=0, totalCharsWithSpace=N, totalCharsWithoutSpace=0`，顯示空格數量 → **低疑慮（不影響功能）**

發現問題:
- **[低]** 中文字數統計使用 Unicode 範圍 `[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]`，涵蓋基本漢字、擴展 A 區、相容表意字。但不包含表情符號（如部分 emoji）、注音符號（\u3100-\u312f）等。對一般中文文章夠用，但若文章含注音或特殊字元，計數會略低
  位置: `src/lib/calculators/word-count.ts:30`
  建議修復: 低優先，若有需求可補充注音符號範圍

---

## 法規正確性總結

| 工具 | 法規 | 狀態 |
|------|------|------|
| 電費 | 台電 2024 住宅累進費率 | ✅ 正確 |
| 薪資稅 | 2024 免稅額/扣除額/稅率 | ✅ 正確（數值）/ ⚠️ FAQ 文字待確認 |
| 房貸 | 本息均攤/本金均攤公式 | ✅ 正確（有浮點小誤差） |
| 加班費（平日）| 勞基法第 24 條 1/3、2/3 | ✅ 正確 |
| 加班費（休息日）| 勞基法休息日規定 | ❌ 邏輯混亂，需重寫 |
| 加班費（國定假日）| 勞基法第 39 條 | ❌ 固定雙薪不依時數計算 |
| 發票稅 | 營業稅 5% | ✅ 正確 |
