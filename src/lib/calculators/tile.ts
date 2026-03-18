/**
 * 磁磚數量計算機邏輯
 * 依施工面積與磁磚尺寸計算所需片數
 */

export interface TileInput {
  areaM2: number;           // 施工面積（平方公尺）
  tileLengthCm: number;     // 磁磚長度（公分）
  tileWidthCm: number;      // 磁磚寬度（公分）
  wastagePercent: number;   // 損耗率（%），建議 5～15%
  jointWidthMm: number;     // 縫隙寬度（mm），預設 3mm
}

export interface TileResult {
  areaM2: number;
  tileSizeCm: string;
  tilesPerSqm: number;
  baseQuantity: number;
  wastageQuantity: number;
  totalQuantity: number;
  boxesNeeded: number;      // 假設每箱 10 片
  costEstimate: {
    low: number;
    high: number;
  };
}

/** 磁磚每片面積（含縫隙） */
function tileSqmWithJoint(
  lengthCm: number,
  widthCm: number,
  jointMm: number
): number {
  const jointCm = jointMm / 10;
  return ((lengthCm + jointCm) / 100) * ((widthCm + jointCm) / 100);
}

/**
 * 計算磁磚數量
 */
export function calculateTile(input: TileInput): TileResult {
  const { areaM2, tileLengthCm, tileWidthCm, wastagePercent, jointWidthMm } = input;

  const tileArea = tileSqmWithJoint(tileLengthCm, tileWidthCm, jointWidthMm);
  const tilesPerSqm = Math.round((1 / tileArea) * 100) / 100;

  const baseQuantity = Math.ceil(areaM2 / tileArea);
  const wastageQuantity = Math.ceil(baseQuantity * wastagePercent / 100);
  const totalQuantity = baseQuantity + wastageQuantity;

  // 每箱 10 片（常見規格）
  const boxesNeeded = Math.ceil(totalQuantity / 10);

  // 費用估算（含工料）：NT$1,500～2,500/坪
  // 施工坪數
  const pingArea = areaM2 / 3.305785;
  const costEstimate = {
    low: Math.round(pingArea * 1500),
    high: Math.round(pingArea * 2500),
  };

  return {
    areaM2,
    tileSizeCm: `${tileLengthCm}×${tileWidthCm}`,
    tilesPerSqm,
    baseQuantity,
    wastageQuantity,
    totalQuantity,
    boxesNeeded,
    costEstimate,
  };
}
