/**
 * 溫度換算計算機邏輯
 * 支援攝氏、華氏、克耳文互換
 */

export type TempUnit = "celsius" | "fahrenheit" | "kelvin";

export interface TempConvertResult {
  celsius: number;
  fahrenheit: number;
  kelvin: number;
}

/**
 * 溫度換算
 * @param value 輸入值
 * @param fromUnit 來源單位
 */
export function convertTemperature(value: number, fromUnit: TempUnit): TempConvertResult | null {
  if (isNaN(value)) return null;

  let celsius: number;

  switch (fromUnit) {
    case "celsius":
      celsius = value;
      break;
    case "fahrenheit":
      celsius = (value - 32) * (5 / 9);
      break;
    case "kelvin":
      if (value < 0) return null; // 克耳文不能為負
      celsius = value - 273.15;
      break;
    default:
      return null;
  }

  const fahrenheit = celsius * (9 / 5) + 32;
  const kelvin = celsius + 273.15;

  if (kelvin < 0) return null; // 結果不能低於絕對零度

  return {
    celsius: round(celsius, 4),
    fahrenheit: round(fahrenheit, 4),
    kelvin: round(kelvin, 4),
  };
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export const tempUnitLabels: Record<TempUnit, string> = {
  celsius: "攝氏（°C）",
  fahrenheit: "華氏（°F）",
  kelvin: "克耳文（K）",
};

export const tempUnits: TempUnit[] = ["celsius", "fahrenheit", "kelvin"];
