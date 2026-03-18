/**
 * 百分比計算機邏輯
 * 三種計算模式
 */

export type PercentageMode = "what-percent" | "percent-of" | "percent-change";

/** 模式1：X 是 Y 的幾%？ */
export function whatPercent(x: number, y: number): number | null {
  if (isNaN(x) || isNaN(y) || y === 0) return null;
  return round((x / y) * 100, 4);
}

/** 模式2：X 的 Y% 是多少？ */
export function percentOf(x: number, y: number): number | null {
  if (isNaN(x) || isNaN(y)) return null;
  return round((x * y) / 100, 4);
}

/** 模式3：從 X 到 Y 增減了幾%？ */
export function percentChange(from: number, to: number): { change: number; direction: "increase" | "decrease" | "same" } | null {
  if (isNaN(from) || isNaN(to) || from === 0) return null;
  const change = ((to - from) / Math.abs(from)) * 100;
  const direction = change > 0 ? "increase" : change < 0 ? "decrease" : "same";
  return { change: round(Math.abs(change), 4), direction };
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
