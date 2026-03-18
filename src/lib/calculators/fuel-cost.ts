/**
 * 油耗費用計算機
 */

export interface FuelCostResult {
  fuelUsed: number;    // 耗油量（公升）
  totalCost: number;   // 油資費用（元）
  costPerKm: number;   // 每公里費用（元）
}

/**
 * @param distanceKm 行駛距離（公里）
 * @param fuelEfficiency 油耗（km/L）
 * @param fuelPrice 油價（元/公升）
 */
export function calculateFuelCost(
  distanceKm: number,
  fuelEfficiency: number,
  fuelPrice: number
): FuelCostResult {
  if (
    isNaN(distanceKm) || distanceKm <= 0 ||
    isNaN(fuelEfficiency) || fuelEfficiency <= 0 ||
    isNaN(fuelPrice) || fuelPrice <= 0
  ) {
    return { fuelUsed: 0, totalCost: 0, costPerKm: 0 };
  }

  const fuelUsed = distanceKm / fuelEfficiency;
  const totalCost = fuelUsed * fuelPrice;
  const costPerKm = totalCost / distanceKm;

  return {
    fuelUsed: Math.round(fuelUsed * 100) / 100,
    totalCost: Math.round(totalCost * 10) / 10,
    costPerKm: Math.round(costPerKm * 100) / 100,
  };
}

/** 常用情境預設 */
export const presetScenarios = [
  { label: "台北 → 高雄（約 350 km）", distanceKm: 350 },
  { label: "台北 → 台中（約 170 km）", distanceKm: 170 },
  { label: "環島一圈（約 1,050 km）", distanceKm: 1050 },
];
