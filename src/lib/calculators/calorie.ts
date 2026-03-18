/**
 * 熱量計算機邏輯
 * 依 Mifflin-St Jeor 公式計算 BMR，再乘以活動係數得每日所需熱量 TDEE
 */

export type Gender = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very-active";

export interface CalorieResult {
  bmr: number;
  tdee: number;
  activityLevel: ActivityLevel;
  weightLoss: number;   // TDEE - 500
  weightGain: number;   // TDEE + 500
}

export const activityLabels: Record<ActivityLevel, string> = {
  sedentary: "久坐（幾乎不運動）",
  light: "輕度（每週 1-3 天運動）",
  moderate: "中度（每週 3-5 天運動）",
  active: "高度（每週 6-7 天運動）",
  "very-active": "非常高（體力勞動或每日訓練）",
};

export const activityFactors: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  "very-active": 1.9,
};

/**
 * 計算每日所需熱量
 * @param gender 性別
 * @param weight 體重（公斤）
 * @param height 身高（公分）
 * @param age 年齡（歲）
 * @param activityLevel 活動強度
 */
export function calculateCalorie(
  gender: Gender,
  weight: number,
  height: number,
  age: number,
  activityLevel: ActivityLevel
): CalorieResult {
  // Mifflin-St Jeor 公式
  let bmr: number;
  if (gender === "male") {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  bmr = Math.round(bmr);

  const factor = activityFactors[activityLevel];
  const tdee = Math.round(bmr * factor);

  return {
    bmr,
    tdee,
    activityLevel,
    weightLoss: tdee - 500,
    weightGain: tdee + 500,
  };
}
