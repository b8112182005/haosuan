# 好算 高嚴重度 Bug 清單
最後更新: 2026-03-18

---

## BUG-001 [高] 加班費：國定假日計算固定雙薪不依時數計算

**影響工具：** 加班費計算機
**檔案：** `src/lib/calculators/overtime.ts:93-96`
**法規依據：** 勞基法第 39 條

**問題描述：**
國定假日加班費固定計算為 `dailyWage * 2`（整日雙薪），不論使用者輸入幾小時。4 小時和 8 小時加班結果完全相同，明顯不正確。

**錯誤程式碼：**
```typescript
} else {
  // 國定假日：給付雙薪（加班部分按正常工資加倍）
  const pay = Math.round(dailyWage * 2 * 100) / 100;
  totalPay = pay;
  breakdown.push({ period: `國定假日 ${hours} 小時`, hours, rate: 2, pay });
}
```

**正確邏輯：**
`pay = hourlyWage * 2 * hours`（依實際加班時數按時薪雙倍計算）

---

## BUG-002 [高] 加班費：休息日計算邏輯混亂，不符勞基法

**影響工具：** 加班費計算機
**檔案：** `src/lib/calculators/overtime.ts:56-91`
**法規依據：** 勞基法第 24 條第 2 項

**問題描述：**
休息日計算混用「每日工資」和「時薪」兩種基準，且以「補差額」方式保證最低一日工資，但此差額直接疊加到 breakdown 最後一項而非獨立顯示，導致 UI 顯示的倍率和金額對使用者而言不透明。

另外，目前邏輯未正確實作「不足 2 小時以 2 小時計」的規定（即 1 小時也計 2 小時費用）。

**影響：**
休息日少於 2 小時的計算結果偏低；UI 顯示的費用明細加總與標示金額不符。

**建議修復：**
完整重寫休息日計算邏輯，明確依勞動部官方計算方式：
- 前 2 小時（不足 2 小時以 2 小時計）：時薪 × 1.34 × 2
- 第 3-8 小時：時薪 × 1.67 × 每小時
- 超過 8 小時：時薪 × 2.67 × 每小時

---

## BUG-003 [高] 薪資所得稅：70 歲以上親屬人數超過總親屬人數時計算邏輯異常

**影響工具：** 薪資所得稅試算
**檔案：** `src/lib/calculators/income-tax.ts:76-79`

**問題描述：**
若呼叫端傳入 `numElderlyDependents > numDependents`（UI 層雖有 `Math.min` 保護，但計算函數本身無防護），`regularDependents = Math.max(0, 0-5) = 0`，但 `numElderlyDependents = 5` 仍被使用於計算 `dependentExemption = 5 × 145500 = 727500`，超過實際申報人數可得的免稅額，導致稅額被嚴重低估。

**直接影響：**
當 UI 層的 `Math.min(elderlyDeps, deps)` 失效時（未來若有 API 呼叫或其他入口直接呼叫此函數），計算結果錯誤。函數應對輸入進行防禦性驗證。

**建議修復：**
在 `calculateIncomeTax` 函數開頭加入：
```typescript
const safeElderlyDependents = Math.min(numElderlyDependents, numDependents);
```
並在後續計算中使用 `safeElderlyDependents` 取代 `numElderlyDependents`。

---

## 中嚴重度問題（需排入下次迭代）

| # | 工具 | 問題 | 檔案 |
|---|------|------|------|
| M-001 | 加班費 | 無最低基本工資檢查（27470元），低薪輸入無警告 | `OvertimeCalculator.tsx:25` |
| M-002 | 房貸 | 30年以上明細被截斷但 totalInterest 以完整年限計算，顯示不一致 | `mortgage.ts:81` |
| M-003 | 複利 | 本金與月投入同時為 0 時仍計算顯示，無提示 | `CompoundInterestCalculator.tsx:28` |
| M-004 | 匯率 | 靜態匯率為 2024 年數據，2026 年已過時，需更新 | `exchange-rate.ts:14` |
| M-005 | 薪資稅 | 稅率級距標籤「498～以上 萬」格式異常 | `income-tax.ts:112` |
| M-006 | 磁磚 | 縫隙 0mm / 損耗率 0% 被 `\|\|` 運算覆蓋為預設值，使用者設定無效 | `TileCalculator.tsx:38-39` |
| M-007 | 冷氣噸數 | 超大坪數時所有規格不適合，UI 僅顯示「請查詢商用規格」，無多台建議 | `AcBtuCalculator.tsx:175` |
| M-008 | 百分比 | 負數增減幅度語意模糊（from=-100 to=-50 顯示「增加 50%」），需 UI 說明 | `percentage.ts:22` |
