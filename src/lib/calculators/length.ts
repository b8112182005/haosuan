/**
 * 長度換算計算機邏輯
 * 支援公里、公尺、公分、公厘、英里、英尺、英吋互換
 * 以公尺為基準
 */

export type LengthUnit = "km" | "m" | "cm" | "mm" | "mile" | "ft" | "inch";

export interface LengthUnitInfo {
  key: LengthUnit;
  label: string;
  labelShort: string;
  toM: number; // 1 此單位 = ? 公尺
}

export const LENGTH_UNITS: LengthUnitInfo[] = [
  { key: "km",   label: "公里（km）",  labelShort: "km",   toM: 1000 },
  { key: "m",    label: "公尺（m）",   labelShort: "m",    toM: 1 },
  { key: "cm",   label: "公分（cm）",  labelShort: "cm",   toM: 0.01 },
  { key: "mm",   label: "公厘（mm）",  labelShort: "mm",   toM: 0.001 },
  { key: "mile", label: "英里（mi）",  labelShort: "mi",   toM: 1609.344 },
  { key: "ft",   label: "英尺（ft）",  labelShort: "ft",   toM: 0.3048 },
  { key: "inch", label: "英吋（in）",  labelShort: "in",   toM: 0.0254 },
];

export interface LengthConvertResult {
  fromValue: number;
  fromUnit: LengthUnit;
  results: { unit: LengthUnitInfo; value: number }[];
}

/**
 * 將任意長度單位換算成所有其他單位
 */
export function convertLength(value: number, fromUnit: LengthUnit): LengthConvertResult | null {
  if (isNaN(value) || value < 0) return null;
  const from = LENGTH_UNITS.find((u) => u.key === fromUnit)!;
  const mValue = value * from.toM;

  const results = LENGTH_UNITS.map((unit) => ({
    unit,
    value: mValue / unit.toM,
  }));

  return { fromValue: value, fromUnit, results };
}

/** 格式化長度值 */
export function formatLengthValue(value: number): string {
  if (value === 0) return "0";
  if (Math.abs(value) >= 1000000) return value.toExponential(4);
  if (Math.abs(value) >= 0.0001) return parseFloat(value.toPrecision(8)).toString();
  return value.toExponential(4);
}
