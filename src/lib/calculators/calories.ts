/**
 * 熱量計算機：BMR（基礎代謝率）與 TDEE（每日所需熱量）
 * 使用 Harris-Benedict 公式（修正版）
 */

export type Gender = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export interface CaloriesResult {
  bmr: number;
  tdee: number;
  weightLossCalories: number;
  weightGainCalories: number;
}

const activityMultiplier: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const activityLabels: Record<ActivityLevel, string> = {
  sedentary: "久坐（幾乎不運動）",
  light: "輕度（每週運動 1-3 天）",
  moderate: "中度（每週運動 3-5 天）",
  active: "高度（每週運動 6-7 天）",
  very_active: "非常高度（每天劇烈運動或體力工作）",
};

/**
 * 計算 BMR 與 TDEE
 * @param gender 性別
 * @param age 年齡（歲）
 * @param heightCm 身高（公分）
 * @param weightKg 體重（公斤）
 * @param activity 活動量等級
 */
export function calculateCalories(
  gender: Gender,
  age: number,
  heightCm: number,
  weightKg: number,
  activity: ActivityLevel
): CaloriesResult {
  if (
    isNaN(age) || age <= 0 || age > 120 ||
    isNaN(heightCm) || heightCm <= 50 || heightCm > 300 ||
    isNaN(weightKg) || weightKg <= 1 || weightKg > 500
  ) {
    return { bmr: 0, tdee: 0, weightLossCalories: 0, weightGainCalories: 0 };
  }

  // Harris-Benedict 修正公式
  let bmr: number;
  if (gender === "male") {
    bmr = 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age;
  } else {
    bmr = 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age;
  }

  const tdee = bmr * activityMultiplier[activity];

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    weightLossCalories: Math.round(tdee - 500), // 每日減少 500 kcal → 每週減 0.5 kg
    weightGainCalories: Math.round(tdee + 300), // 增肌緩慢增加
  };
}
