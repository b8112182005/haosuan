/**
 * BMI 計算機邏輯
 * 依據 WHO 標準，並附加台灣衛生福利部亞洲人體重建議
 */

export type BmiCategory =
  | "underweight"
  | "normal"
  | "overweight"
  | "obese_1"
  | "obese_2"
  | "obese_3";

export interface BmiResult {
  bmi: number;
  category: BmiCategory;
  label: string;
  labelColor: string;
  idealWeightMin: number;
  idealWeightMax: number;
}

/**
 * 計算 BMI 值
 * @param weightKg 體重（公斤）
 * @param heightCm 身高（公分）
 */
export function calculateBmi(weightKg: number, heightCm: number): BmiResult {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const rounded = Math.round(bmi * 10) / 10;

  const category = getBmiCategory(rounded);
  const { label, labelColor } = getCategoryMeta(category);

  // 台灣衛福部建議正常範圍 BMI 18.5–24
  const idealWeightMin = Math.round(18.5 * heightM * heightM * 10) / 10;
  const idealWeightMax = Math.round(24 * heightM * heightM * 10) / 10;

  return {
    bmi: rounded,
    category,
    label,
    labelColor,
    idealWeightMin,
    idealWeightMax,
  };
}

/** 依 BMI 值取得分類（台灣衛福部標準：正常 18.5–24） */
function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 24) return "normal";
  if (bmi < 27) return "overweight";
  if (bmi < 30) return "obese_1";
  if (bmi < 35) return "obese_2";
  return "obese_3";
}

function getCategoryMeta(
  category: BmiCategory
): { label: string; labelColor: string } {
  const map: Record<BmiCategory, { label: string; labelColor: string }> = {
    underweight: { label: "體重過輕", labelColor: "text-blue-400" },
    normal: { label: "正常體重", labelColor: "text-green-400" },
    overweight: { label: "體重過重", labelColor: "text-yellow-400" },
    obese_1: { label: "輕度肥胖", labelColor: "text-orange-400" },
    obese_2: { label: "中度肥胖", labelColor: "text-red-400" },
    obese_3: { label: "重度肥胖", labelColor: "text-red-600" },
  };
  return map[category];
}
