/**
 * 面積換算計算機邏輯
 * 支援坪、平方公尺、平方公分、平方英尺、坪互換
 */

export type AreaUnit = "ping" | "sqm" | "sqcm" | "sqft" | "sqkm" | "hectare";

export interface AreaUnitInfo {
  key: AreaUnit;
  label: string;
  labelShort: string;
  toSqm: number;   // 1 此單位 = ? 平方公尺
}

export const AREA_UNITS: AreaUnitInfo[] = [
  { key: "ping", label: "坪（台灣）", labelShort: "坪", toSqm: 3.30578512 },
  { key: "sqm", label: "平方公尺（m²）", labelShort: "m²", toSqm: 1 },
  { key: "sqcm", label: "平方公分（cm²）", labelShort: "cm²", toSqm: 0.0001 },
  { key: "sqft", label: "平方英尺（ft²）", labelShort: "ft²", toSqm: 0.09290304 },
  { key: "sqkm", label: "平方公里（km²）", labelShort: "km²", toSqm: 1000000 },
  { key: "hectare", label: "公頃（ha）", labelShort: "ha", toSqm: 10000 },
];

export interface AreaConvertResult {
  fromValue: number;
  fromUnit: AreaUnit;
  results: { unit: AreaUnitInfo; value: number }[];
}

/**
 * 將任意面積單位換算成所有其他單位
 */
export function convertArea(value: number, fromUnit: AreaUnit): AreaConvertResult {
  const from = AREA_UNITS.find((u) => u.key === fromUnit)!;
  const sqmValue = value * from.toSqm;

  const results = AREA_UNITS.map((unit) => ({
    unit,
    value: sqmValue / unit.toSqm,
  }));

  return { fromValue: value, fromUnit, results };
}

/** 格式化面積值 */
export function formatAreaValue(value: number): string {
  if (value === 0) return "0";
  if (Math.abs(value) >= 1000000) return value.toExponential(4);
  if (Math.abs(value) >= 1) return (Math.round(value * 10000) / 10000).toString();
  if (Math.abs(value) >= 0.0001) return (Math.round(value * 10000000) / 10000000).toString();
  return value.toExponential(4);
}
