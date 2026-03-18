/**
 * 冷氣噸數計算機邏輯
 * 依台灣一般住宅估算適合的冷氣噸數（冷凍噸）
 * 1 冷凍噸 = 3,517W = 約 1.5 坪的基準
 */

export type FloorLevel = "low" | "high";    // 低樓層（1～5F）/ 高樓層（6F以上）
export type SunExposure = "shaded" | "partial" | "sunny"; // 遮蔭/半日照/日照強
export type RoomUsage = "bedroom" | "living" | "office";

export interface AcBtuInput {
  areaPing: number;           // 房間坪數
  floorLevel: FloorLevel;
  sunExposure: SunExposure;
  roomUsage: RoomUsage;
  hasInsulation: boolean;     // 是否有良好隔熱（鋁窗、隔熱膜等）
}

export interface AcBtuResult {
  areaPing: number;
  areaM2: number;
  requiredBtu: number;
  requiredTons: number;
  recommendedModels: AcModel[];
  tips: string[];
}

export interface AcModel {
  tons: number;
  label: string;
  btu: number;
  suitable: boolean;
}

/** BTU 基準：台灣一般住宅每坪約需 500～700 BTU */
const BTU_PER_PING_BASE = 600;

/** 修正係數 */
const FACTORS = {
  floorLevel: { low: 1.0, high: 1.1 },
  sunExposure: { shaded: 0.9, partial: 1.0, sunny: 1.15 },
  roomUsage: { bedroom: 0.95, living: 1.1, office: 1.1 },
  insulation: { good: 0.9, poor: 1.0 },
};

/** 常見冷氣規格 */
const AC_MODELS: AcModel[] = [
  { tons: 1.0, label: "1 噸（適合 3～5 坪）", btu: 10000, suitable: false },
  { tons: 1.5, label: "1.5 噸（適合 5～8 坪）", btu: 18000, suitable: false },
  { tons: 2.0, label: "2 噸（適合 8～12 坪）", btu: 24000, suitable: false },
  { tons: 2.5, label: "2.5 噸（適合 12～15 坪）", btu: 30000, suitable: false },
  { tons: 3.0, label: "3 噸（適合 15～20 坪）", btu: 36000, suitable: false },
  { tons: 3.5, label: "3.5 噸（適合 20～25 坪）", btu: 42000, suitable: false },
  { tons: 4.0, label: "4 噸（適合 25坪以上）", btu: 48000, suitable: false },
];

/** 1 坪 = 3.305785 m² */
const PING_TO_SQM = 3.305785;

/**
 * 計算建議冷氣噸數
 */
export function calculateAcBtu(input: AcBtuInput): AcBtuResult {
  const { areaPing, floorLevel, sunExposure, roomUsage, hasInsulation } = input;

  const areaM2 = Math.round(areaPing * PING_TO_SQM * 10) / 10;

  // 計算需要的 BTU
  const baseBtu = areaPing * BTU_PER_PING_BASE;
  const factor =
    FACTORS.floorLevel[floorLevel] *
    FACTORS.sunExposure[sunExposure] *
    FACTORS.roomUsage[roomUsage] *
    (hasInsulation ? FACTORS.insulation.good : FACTORS.insulation.poor);

  const requiredBtu = Math.round(baseBtu * factor);
  const requiredTons = Math.round((requiredBtu / 12000) * 10) / 10;

  // 找出合適的規格（建議選略高於需求的規格）
  const recommendedModels = AC_MODELS.map((model) => ({
    ...model,
    suitable:
      model.btu >= requiredBtu * 0.9 && model.btu <= requiredBtu * 1.3,
  }));

  // 建議事項
  const tips: string[] = [];
  if (sunExposure === "sunny")
    tips.push("西曬或頂樓日照強烈，建議加裝隔熱膜或選大一個規格");
  if (floorLevel === "high")
    tips.push("高樓層熱輻射較強，建議選略大規格確保制冷效果");
  if (!hasInsulation)
    tips.push("加裝隔熱膜或改用氣密窗，可降低 10～20% 的冷氣負荷");
  if (roomUsage === "living")
    tips.push("客廳人多、熱源多，建議選大 0.5 噸的規格");
  tips.push("能源標章 1 級效率最高，雖然售價貴，但長期電費更划算");

  return {
    areaPing,
    areaM2,
    requiredBtu,
    requiredTons,
    recommendedModels,
    tips,
  };
}
