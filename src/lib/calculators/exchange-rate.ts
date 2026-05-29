/**
 * 匯率換算計算機邏輯
 * 使用靜態參考匯率（台銀即期匯率，定期更新）
 * 實際應用中可接接 API 取得即時匯率
 */

export interface Currency {
  code: string;
  name: string;
  flag: string;
  rateToTWD: number; // 1 單位外幣 = ? 台幣（買入/賣出中間價）
}

/**
 * 常見幣別對台幣參考匯率（靜態概算值，非即時報價）
 * UI 已標示「參考匯率」並提供台灣銀行牌告匯率連結供精算
 * 維護建議：每季校對一次，或日後改接台銀/央行匯率 API
 */
export const CURRENCIES: Currency[] = [
  { code: "TWD", name: "新台幣", flag: "🇹🇼", rateToTWD: 1 },
  { code: "USD", name: "美元", flag: "🇺🇸", rateToTWD: 32.5 },
  { code: "EUR", name: "歐元", flag: "🇪🇺", rateToTWD: 35.2 },
  { code: "JPY", name: "日圓", flag: "🇯🇵", rateToTWD: 0.217 },
  { code: "GBP", name: "英鎊", flag: "🇬🇧", rateToTWD: 41.5 },
  { code: "HKD", name: "港幣", flag: "🇭🇰", rateToTWD: 4.17 },
  { code: "CNY", name: "人民幣", flag: "🇨🇳", rateToTWD: 4.49 },
  { code: "KRW", name: "韓元", flag: "🇰🇷", rateToTWD: 0.0238 },
  { code: "AUD", name: "澳幣", flag: "🇦🇺", rateToTWD: 21.0 },
  { code: "CAD", name: "加幣", flag: "🇨🇦", rateToTWD: 23.8 },
  { code: "CHF", name: "瑞士法郎", flag: "🇨🇭", rateToTWD: 37.0 },
  { code: "SGD", name: "新加坡元", flag: "🇸🇬", rateToTWD: 24.2 },
  { code: "MYR", name: "馬來西亞令吉", flag: "🇲🇾", rateToTWD: 7.1 },
  { code: "THB", name: "泰銖", flag: "🇹🇭", rateToTWD: 0.91 },
];

export interface ExchangeResult {
  fromAmount: number;
  fromCurrency: Currency;
  toAmount: number;
  toCurrency: Currency;
  rate: number;
}

/**
 * 換算匯率
 * @param amount 金額
 * @param fromCode 來源幣別代碼
 * @param toCode 目標幣別代碼
 */
export function convertCurrency(
  amount: number,
  fromCode: string,
  toCode: string
): ExchangeResult | null {
  const from = CURRENCIES.find((c) => c.code === fromCode);
  const to = CURRENCIES.find((c) => c.code === toCode);
  if (!from || !to) return null;

  // 先換成台幣，再換成目標幣別
  const twdAmount = amount * from.rateToTWD;
  const toAmount = twdAmount / to.rateToTWD;
  const rate = from.rateToTWD / to.rateToTWD;

  return {
    fromAmount: amount,
    fromCurrency: from,
    toAmount: Math.round(toAmount * 10000) / 10000,
    toCurrency: to,
    rate: Math.round(rate * 10000) / 10000,
  };
}
