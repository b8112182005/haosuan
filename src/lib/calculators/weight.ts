/**
 * 重量換算計算機邏輯
 * 支援公噸、公斤、公克、毫克、磅、盎司、台斤互換
 * 以公克為基準，1台斤 = 600g
 */

export type WeightUnit = "tonne" | "kg" | "g" | "mg" | "lb" | "oz" | "taijin";

export interface WeightUnitInfo {
  key: WeightUnit;
  label: string;
  labelShort: string;
  toG: number; // 1 此單位 = ? 公克
}

export const WEIGHT_UNITS: WeightUnitInfo[] = [
  { key: "tonne",  label: "公噸（t）",   labelShort: "t",   toG: 1000000 },
  { key: "kg",     label: "公斤（kg）",  labelShort: "kg",  toG: 1000 },
  { key: "g",      label: "公克（g）",   labelShort: "g",   toG: 1 },
  { key: "mg",     label: "毫克（mg）",  labelShort: "mg",  toG: 0.001 },
  { key: "lb",     label: "磅（lb）",    labelShort: "lb",  toG: 453.59237 },
  { key: "oz",     label: "盎司（oz）",  labelShort: "oz",  toG: 28.3495231 },
  { key: "taijin", label: "台斤",        labelShort: "台斤", toG: 600 },
];

export interface WeightConvertResult {
  fromValue: number;
  fromUnit: WeightUnit;
  results: { unit: WeightUnitInfo; value: number }[];
}

/**
 * 將任意重量單位換算成所有其他單位
 */
export function convertWeight(value: number, fromUnit: WeightUnit): WeightConvertResult | null {
  if (isNaN(value) || value < 0) return null;
  const from = WEIGHT_UNITS.find((u) => u.key === fromUnit)!;
  const gValue = value * from.toG;

  const results = WEIGHT_UNITS.map((unit) => ({
    unit,
    value: gValue / unit.toG,
  }));

  return { fromValue: value, fromUnit, results };
}

/** 格式化重量值 */
export function formatWeightValue(value: number): string {
  if (value === 0) return "0";
  if (Math.abs(value) >= 1000000) return value.toExponential(4);
  if (Math.abs(value) >= 0.000001) return parseFloat(value.toPrecision(8)).toString();
  return value.toExponential(4);
}
