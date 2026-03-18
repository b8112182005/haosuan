/**
 * 容量單位換算
 * 公升、毫升、加侖（美制）、品脫（美制）、杯（台灣量米杯 180ml）
 */

export type VolumeUnit = "liter" | "milliliter" | "gallon_us" | "pint_us" | "cup_tw";

export const volumeUnitLabels: Record<VolumeUnit, string> = {
  liter: "公升 (L)",
  milliliter: "毫升 (mL)",
  gallon_us: "加侖（美制 gal）",
  pint_us: "品脫（美制 pt）",
  cup_tw: "量米杯（台灣 180mL）",
};

// 以公升為基準的換算係數
const toLifers: Record<VolumeUnit, number> = {
  liter: 1,
  milliliter: 0.001,
  gallon_us: 3.785411784,
  pint_us: 0.473176473,
  cup_tw: 0.18,
};

export type VolumeConversionResult = Record<VolumeUnit, number>;

/**
 * @param value 輸入數值
 * @param fromUnit 來源單位
 */
export function convertVolume(
  value: number,
  fromUnit: VolumeUnit
): VolumeConversionResult {
  const zero = {
    liter: 0,
    milliliter: 0,
    gallon_us: 0,
    pint_us: 0,
    cup_tw: 0,
  };

  if (isNaN(value) || value < 0) return zero;

  const liters = value * toLifers[fromUnit];

  const result = {} as VolumeConversionResult;
  for (const unit of Object.keys(toLifers) as VolumeUnit[]) {
    const converted = liters / toLifers[unit];
    // 依照數值大小決定小數位數
    if (converted >= 1000) {
      result[unit] = Math.round(converted * 10) / 10;
    } else if (converted >= 1) {
      result[unit] = Math.round(converted * 1000) / 1000;
    } else {
      result[unit] = Math.round(converted * 100000) / 100000;
    }
  }

  return result;
}
