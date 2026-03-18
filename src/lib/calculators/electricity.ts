/**
 * 電費計算機邏輯
 * 依台電 2024 年住宅用電累進費率計算
 * 資料來源：台灣電力公司 https://www.taipower.com.tw
 */

export type Season = "summer" | "non-summer";

export interface ElectricityResult {
  units: number;
  season: Season;
  baseCharge: number;
  energyCharge: number;
  totalCharge: number;
  avgPricePerUnit: number;
  breakdown: TierBreakdown[];
}

export interface TierBreakdown {
  tier: string;
  units: number;
  rate: number;
  charge: number;
}

/**
 * 台電住宅用電累進費率（2024 年）
 * 夏月：6/1～9/30；非夏月：其餘月份
 */
const TIERS = {
  summer: [
    { max: 120, rate: 1.63 },
    { max: 330, rate: 2.38 },
    { max: 500, rate: 3.52 },
    { max: 700, rate: 4.80 },
    { max: 1000, rate: 5.66 },
    { max: Infinity, rate: 6.41 },
  ],
  "non-summer": [
    { max: 120, rate: 1.63 },
    { max: 330, rate: 2.10 },
    { max: 500, rate: 2.89 },
    { max: 700, rate: 3.94 },
    { max: 1000, rate: 4.60 },
    { max: Infinity, rate: 5.03 },
  ],
};

/** 基本電費（不分季節） */
const BASE_CHARGE = 75;

/**
 * 計算電費
 * @param units 用電度數（度/月）
 * @param season 夏月 or 非夏月
 */
export function calculateElectricity(
  units: number,
  season: Season
): ElectricityResult {
  const tiers = TIERS[season];
  const breakdown: TierBreakdown[] = [];
  let remaining = units;
  let energyCharge = 0;
  let prevMax = 0;

  const tierLabels = ["第一段", "第二段", "第三段", "第四段", "第五段", "第六段"];

  for (let i = 0; i < tiers.length; i++) {
    const { max, rate } = tiers[i];
    const tierSize = max === Infinity ? remaining : Math.min(remaining, max - prevMax);
    if (tierSize <= 0) break;

    const charge = Math.round(tierSize * rate * 100) / 100;
    energyCharge += charge;

    breakdown.push({
      tier: tierLabels[i],
      units: tierSize,
      rate,
      charge,
    });

    remaining -= tierSize;
    prevMax = max;
    if (remaining <= 0) break;
  }

  const totalCharge = Math.round((BASE_CHARGE + energyCharge) * 100) / 100;

  return {
    units,
    season,
    baseCharge: BASE_CHARGE,
    energyCharge: Math.round(energyCharge * 100) / 100,
    totalCharge,
    avgPricePerUnit: units > 0 ? Math.round((totalCharge / units) * 100) / 100 : 0,
    breakdown,
  };
}

/** 判斷當前月份是否為夏月 */
export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1;
  return month >= 6 && month <= 9 ? "summer" : "non-summer";
}
