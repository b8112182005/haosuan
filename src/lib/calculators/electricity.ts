/**
 * 電費計算機邏輯：住宅用電（表燈非營業用、非時間電價）的累進電價。
 *
 * 單價是台電 114 年 10 月 1 日起實施的電價表（經濟部 114 年 9 月 26 日核定）：
 *   台電「電價知識專區 Q&A」 https://www.taipower.com.tw/2289/2363/2388/2389/10735/normalPost
 * 115 年 3 月 27 日與 9 月 18 日兩次電價費率審議會都決議不調整（新聞報導，12 月還有一次審議），
 * 所以這張表到 2026 年 11 月仍然適用。之後調整時要改 TIERS 與 RATE_EFFECTIVE_LABEL。
 *
 * 這種計費方式沒有基本電費。舊版把「簡易型時間電價」每戶每月 75 元的基本電費加了進來，每個月多算 75 元。
 * 台電的規定是：當月電費未滿 100 元，以 100 元計收。
 */

/** 畫面與文案共用的費率版本標示 */
export const RATE_EFFECTIVE_LABEL = "114 年 10 月 1 日起實施";

export type Season = "summer" | "non-summer";

export interface ElectricityResult {
  units: number;
  season: Season;
  /** 分段累進算出來的電費 */
  energyCharge: number;
  /** 是否因為未滿 100 元而以 100 元計收 */
  minimumApplied: boolean;
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
 * 每月用電度數分段的單價（元/度）。
 * 夏月：6/1～9/30；非夏月：其餘月份
 */
const TIERS = {
  summer: [
    { max: 120, rate: 1.78 },
    { max: 330, rate: 2.55 },
    { max: 500, rate: 3.80 },
    { max: 700, rate: 5.14 },
    { max: 1000, rate: 6.44 },
    { max: Infinity, rate: 8.86 },
  ],
  "non-summer": [
    { max: 120, rate: 1.78 },
    { max: 330, rate: 2.26 },
    { max: 500, rate: 3.13 },
    { max: 700, rate: 4.24 },
    { max: 1000, rate: 5.27 },
    { max: Infinity, rate: 7.03 },
  ],
};

/** 當月電費未滿這個金額時，以這個金額計收 */
export const MIN_CHARGE = 100;

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

  const roundedEnergy = Math.round(energyCharge * 100) / 100;
  const minimumApplied = roundedEnergy < MIN_CHARGE;
  const totalCharge = minimumApplied ? MIN_CHARGE : roundedEnergy;

  return {
    units,
    season,
    energyCharge: roundedEnergy,
    minimumApplied,
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
