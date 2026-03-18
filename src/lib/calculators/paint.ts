/**
 * 油漆用量計算機邏輯
 * 依房間尺寸估算油漆用量
 * 台灣在地化：坪、公尺混用，含瑀墨推薦
 */

export type PaintTarget = "walls" | "ceiling" | "all";
export type CoatCount = 1 | 2 | 3;

export interface PaintInput {
  roomWidthM: number;     // 房間寬度（公尺）
  roomLengthM: number;    // 房間長度（公尺）
  roomHeightM: number;    // 天花板高度（公尺）
  coatCount: CoatCount;   // 塗刷層數
  target: PaintTarget;    // 塗刷區域
  windowDoorArea?: number; // 門窗扣除面積（平方公尺，可選）
}

export interface PaintResult {
  wallArea: number;       // 牆面面積（m²）
  ceilingArea: number;    // 天花板面積（m²）
  targetArea: number;     // 施工面積（m²，已扣門窗）
  effectiveArea: number;  // 有效施工面積（含層數）
  litersNeeded: number;   // 需要公升數
  cansNeeded: {
    small: number;        // 1 升裝桶數
    medium: number;       // 5 升裝桶數
    large: number;        // 10 升裝桶數
  };
  costEstimate: {
    low: number;          // 低估（DIY）
    high: number;         // 高估（含工）
  };
}

/** 一般乳膠漆每公升覆蓋面積（平方公尺），含一層 */
const COVERAGE_PER_LITER = 10;

/** 台灣市場油漆參考單價（元/升） */
const PAINT_PRICE_PER_LITER = 150;

/** 師傅施工費用估算（元/平方公尺） */
const LABOR_COST_PER_SQM = 80;

/**
 * 計算油漆用量
 */
export function calculatePaint(input: PaintInput): PaintResult {
  const {
    roomWidthM,
    roomLengthM,
    roomHeightM,
    coatCount,
    target,
    windowDoorArea = 0,
  } = input;

  // 四面牆面積
  const wallArea =
    2 * (roomWidthM + roomLengthM) * roomHeightM;

  // 天花板面積
  const ceilingArea = roomWidthM * roomLengthM;

  // 施工面積
  const rawArea =
    target === "walls"
      ? wallArea
      : target === "ceiling"
      ? ceilingArea
      : wallArea + ceilingArea;

  const targetArea = Math.max(0, rawArea - windowDoorArea);

  // 有效面積（乘以層數）
  const effectiveArea = targetArea * coatCount;

  // 需要公升數（含 10% 損耗）
  const litersNeeded =
    Math.ceil((effectiveArea / COVERAGE_PER_LITER) * 1.1 * 10) / 10;

  // 建議桶數
  const cansNeeded = {
    small: Math.ceil(litersNeeded),
    medium: Math.ceil(litersNeeded / 5),
    large: Math.ceil(litersNeeded / 10),
  };

  // 費用估算
  const paintCost = litersNeeded * PAINT_PRICE_PER_LITER;
  const laborCost = targetArea * LABOR_COST_PER_SQM;
  const costEstimate = {
    low: Math.round(paintCost),
    high: Math.round(paintCost + laborCost),
  };

  return {
    wallArea: Math.round(wallArea * 10) / 10,
    ceilingArea: Math.round(ceilingArea * 10) / 10,
    targetArea: Math.round(targetArea * 10) / 10,
    effectiveArea: Math.round(effectiveArea * 10) / 10,
    litersNeeded,
    cansNeeded,
    costEstimate,
  };
}

/** 坪轉平方公尺 */
export function pingToSqm(ping: number): number {
  return Math.round(ping * 3.305785 * 100) / 100;
}
