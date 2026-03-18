/**
 * 二手車殘值計算機
 * 依品牌類型年折舊率估算殘值
 */

export type CarBrand = "japanese" | "german" | "american" | "domestic";

export const carBrandLabels: Record<CarBrand, string> = {
  japanese: "日系（Toyota、Honda、Mazda 等）",
  german: "德系（BMW、Benz、Audi 等）",
  american: "美系（Ford、Tesla 等）",
  domestic: "國產（納智捷等）",
};

// 年折舊率
const depreciationRates: Record<CarBrand, number> = {
  japanese: 0.15,
  german: 0.18,
  american: 0.20,
  domestic: 0.22,
};

export interface CarDepreciationResult {
  residualValue: number;       // 估計殘值（元）
  depreciatedAmount: number;   // 已折舊金額（元）
  annualDepreciation: number;  // 每年折舊金額（元）
  residualRate: number;        // 殘值率（%）
  annualRate: number;          // 年折舊率（%）
}

/**
 * @param purchasePrice 購車價格（元）
 * @param ageYears 車齡（年）
 * @param brand 品牌類型
 */
export function calculateCarDepreciation(
  purchasePrice: number,
  ageYears: number,
  brand: CarBrand
): CarDepreciationResult {
  if (
    isNaN(purchasePrice) || purchasePrice <= 0 ||
    isNaN(ageYears) || ageYears < 0
  ) {
    return {
      residualValue: 0,
      depreciatedAmount: 0,
      annualDepreciation: 0,
      residualRate: 0,
      annualRate: 0,
    };
  }

  const rate = depreciationRates[brand];
  // 複利折舊法
  const residualValue = purchasePrice * Math.pow(1 - rate, ageYears);
  const depreciatedAmount = purchasePrice - residualValue;
  const annualDepreciation = ageYears > 0 ? depreciatedAmount / ageYears : 0;
  const residualRate = (residualValue / purchasePrice) * 100;

  return {
    residualValue: Math.round(residualValue),
    depreciatedAmount: Math.round(depreciatedAmount),
    annualDepreciation: Math.round(annualDepreciation),
    residualRate: Math.round(residualRate * 10) / 10,
    annualRate: rate * 100,
  };
}
