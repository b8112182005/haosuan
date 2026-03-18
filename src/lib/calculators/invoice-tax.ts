/**
 * 發票營業稅計算機邏輯
 * 台灣營業稅率 5%（加值型及非加值型營業稅法）
 */

export interface InvoiceTaxResult {
  taxRate: number;         // 稅率（%）
  taxExclusive: number;   // 未稅金額
  taxAmount: number;      // 稅額
  taxInclusive: number;   // 含稅金額
}

const TAX_RATE = 0.05;

/**
 * 由含稅金額反推未稅金額與稅額
 * @param inclusiveAmount 含稅金額
 */
export function calcFromInclusive(inclusiveAmount: number): InvoiceTaxResult {
  const taxExclusive = Math.round((inclusiveAmount / (1 + TAX_RATE)) * 100) / 100;
  const taxAmount = Math.round((inclusiveAmount - taxExclusive) * 100) / 100;

  return {
    taxRate: TAX_RATE * 100,
    taxExclusive,
    taxAmount,
    taxInclusive: inclusiveAmount,
  };
}

/**
 * 由未稅金額計算稅額與含稅金額
 * @param exclusiveAmount 未稅金額
 */
export function calcFromExclusive(exclusiveAmount: number): InvoiceTaxResult {
  const taxAmount = Math.round(exclusiveAmount * TAX_RATE * 100) / 100;
  const taxInclusive = Math.round((exclusiveAmount + taxAmount) * 100) / 100;

  return {
    taxRate: TAX_RATE * 100,
    taxExclusive: exclusiveAmount,
    taxAmount,
    taxInclusive,
  };
}
