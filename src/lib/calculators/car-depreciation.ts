/**
 * 二手車殘值計算機
 * 依品牌 → 車款選擇年折舊率估算殘值
 * 折舊率參考台灣中古車市場行情（複利折舊法）
 */

export interface CarModel {
  id: string;
  name: string;
  rate: number;   // 年折舊率（小數）
  note?: string;  // 保值/特性說明
}

export interface CarBrandData {
  id: string;
  name: string;
  type: "japanese" | "german" | "american" | "electric" | "domestic";
  models: CarModel[];
}

// =============================================
// 台灣主要車款折舊率資料
// 依中古車市場行情估算，僅供參考
// =============================================
export const CAR_BRANDS: CarBrandData[] = [
  // ── 日系 ────────────────────────────────
  {
    id: "toyota", name: "Toyota", type: "japanese",
    models: [
      { id: "rav4",        name: "RAV4",              rate: 0.10, note: "台灣最保值 SUV" },
      { id: "alphard",     name: "Alphard / Vellfire", rate: 0.09, note: "高保值豪華 MPV" },
      { id: "land-cruiser",name: "Land Cruiser / Prado",rate: 0.09, note: "超高保值越野車" },
      { id: "camry",       name: "Camry",             rate: 0.13 },
      { id: "corolla",     name: "Corolla / Altis",   rate: 0.13, note: "保值穩定" },
      { id: "cross",       name: "Corolla Cross",     rate: 0.11, note: "熱銷保值車款" },
      { id: "yaris",       name: "Yaris / GR Yaris",  rate: 0.13 },
      { id: "chr",         name: "C-HR",              rate: 0.14 },
      { id: "hilux",       name: "Hilux",             rate: 0.11, note: "商用皮卡保值性佳" },
      { id: "sienna",      name: "Sienna",            rate: 0.12 },
      { id: "other-toyota",name: "其他 Toyota",        rate: 0.13 },
    ],
  },
  {
    id: "honda", name: "Honda", type: "japanese",
    models: [
      { id: "crv",        name: "CR-V",        rate: 0.13, note: "保值 SUV" },
      { id: "hrv",        name: "HR-V",        rate: 0.13 },
      { id: "civic",      name: "Civic",       rate: 0.14 },
      { id: "accord",     name: "Accord",      rate: 0.15 },
      { id: "fit",        name: "Fit",         rate: 0.15 },
      { id: "odyssey",    name: "Odyssey",     rate: 0.14 },
      { id: "zrv",        name: "ZR-V",        rate: 0.13 },
      { id: "other-honda",name: "其他 Honda",   rate: 0.14 },
    ],
  },
  {
    id: "mazda", name: "Mazda", type: "japanese",
    models: [
      { id: "cx5",        name: "CX-5",        rate: 0.13, note: "設計保值性佳" },
      { id: "cx30",       name: "CX-30",       rate: 0.13 },
      { id: "cx50",       name: "CX-50",       rate: 0.12 },
      { id: "cx90",       name: "CX-90",       rate: 0.13 },
      { id: "mazda3",     name: "Mazda3",      rate: 0.14 },
      { id: "mazda6",     name: "Mazda6",      rate: 0.15 },
      { id: "mx5",        name: "MX-5",        rate: 0.12, note: "敞篷保值性穩定" },
      { id: "other-mazda",name: "其他 Mazda",   rate: 0.14 },
    ],
  },
  {
    id: "nissan", name: "Nissan", type: "japanese",
    models: [
      { id: "kicks",        name: "Kicks",        rate: 0.15 },
      { id: "xtrail",       name: "X-Trail",      rate: 0.15 },
      { id: "sentra",       name: "Sentra",       rate: 0.16 },
      { id: "tiida",        name: "Tiida",        rate: 0.17 },
      { id: "other-nissan", name: "其他 Nissan",   rate: 0.16 },
    ],
  },
  {
    id: "subaru", name: "Subaru", type: "japanese",
    models: [
      { id: "forester",     name: "Forester",     rate: 0.14 },
      { id: "outback",      name: "Outback",      rate: 0.14 },
      { id: "brz",          name: "BRZ",          rate: 0.13, note: "跑車保值性尚可" },
      { id: "other-subaru", name: "其他 Subaru",   rate: 0.15 },
    ],
  },
  {
    id: "mitsubishi", name: "Mitsubishi", type: "japanese",
    models: [
      { id: "eclipse",        name: "Eclipse Cross",  rate: 0.16 },
      { id: "outlander",      name: "Outlander",      rate: 0.16 },
      { id: "other-mitsu",    name: "其他 Mitsubishi", rate: 0.17 },
    ],
  },
  // ── 德系 ────────────────────────────────
  {
    id: "bmw", name: "BMW", type: "german",
    models: [
      { id: "x5",      name: "X5",          rate: 0.15, note: "大型 SUV 保值較佳" },
      { id: "x3",      name: "X3",          rate: 0.16 },
      { id: "x1",      name: "X1",          rate: 0.17 },
      { id: "3series", name: "3系列",        rate: 0.17 },
      { id: "5series", name: "5系列",        rate: 0.18 },
      { id: "7series", name: "7系列",        rate: 0.20, note: "大型豪華轎車折舊較快" },
      { id: "m-series",name: "M 系列",       rate: 0.15, note: "性能車保值性較佳" },
      { id: "other-bmw",name: "其他 BMW",    rate: 0.18 },
    ],
  },
  {
    id: "benz", name: "Mercedes-Benz", type: "german",
    models: [
      { id: "gle",      name: "GLE / GLS",  rate: 0.15, note: "大型 SUV 保值較佳" },
      { id: "glc",      name: "GLC",        rate: 0.16 },
      { id: "gla",      name: "GLA / GLB",  rate: 0.17 },
      { id: "c-class",  name: "C-Class",    rate: 0.17 },
      { id: "e-class",  name: "E-Class",    rate: 0.19 },
      { id: "s-class",  name: "S-Class",    rate: 0.20, note: "大型豪華轎車折舊較快" },
      { id: "amg",      name: "AMG 系列",   rate: 0.16, note: "性能車保值性較佳" },
      { id: "other-benz",name: "其他 Benz", rate: 0.18 },
    ],
  },
  {
    id: "audi", name: "Audi", type: "german",
    models: [
      { id: "q7",       name: "Q7 / Q8",    rate: 0.16 },
      { id: "q5",       name: "Q5",         rate: 0.17 },
      { id: "q3",       name: "Q3",         rate: 0.17 },
      { id: "a4",       name: "A4",         rate: 0.18 },
      { id: "a3",       name: "A3",         rate: 0.18 },
      { id: "a6",       name: "A6",         rate: 0.19 },
      { id: "rs",       name: "RS / S 系列", rate: 0.16, note: "性能車保值性較佳" },
      { id: "other-audi",name: "其他 Audi", rate: 0.18 },
    ],
  },
  {
    id: "vw", name: "Volkswagen", type: "german",
    models: [
      { id: "tiguan",   name: "Tiguan / Touareg", rate: 0.16 },
      { id: "taigun",   name: "Taigun",           rate: 0.16 },
      { id: "golf",     name: "Golf / Golf R",    rate: 0.17 },
      { id: "tcross",   name: "T-Cross",          rate: 0.17 },
      { id: "passat",   name: "Passat / Arteon",  rate: 0.18 },
      { id: "other-vw", name: "其他 VW",           rate: 0.17 },
    ],
  },
  {
    id: "porsche", name: "Porsche", type: "german",
    models: [
      { id: "911",        name: "911",           rate: 0.10, note: "超高保值，部分車型增值" },
      { id: "cayenne",    name: "Cayenne",       rate: 0.14, note: "保值性佳的旗艦 SUV" },
      { id: "macan",      name: "Macan",         rate: 0.15 },
      { id: "panamera",   name: "Panamera",      rate: 0.18 },
      { id: "taycan",     name: "Taycan（電動）", rate: 0.20, note: "電動車折舊較快" },
      { id: "other-pors", name: "其他 Porsche",  rate: 0.15 },
    ],
  },
  // ── 美系 ────────────────────────────────
  {
    id: "ford", name: "Ford", type: "american",
    models: [
      { id: "kuga",      name: "Kuga",       rate: 0.16 },
      { id: "focus",     name: "Focus",      rate: 0.17 },
      { id: "mustang",   name: "Mustang",    rate: 0.16, note: "肌肉車保值性尚可" },
      { id: "bronco",    name: "Bronco",     rate: 0.14, note: "越野車保值性佳" },
      { id: "other-ford",name: "其他 Ford",  rate: 0.18 },
    ],
  },
  {
    id: "jeep", name: "Jeep", type: "american",
    models: [
      { id: "wrangler",   name: "Wrangler",      rate: 0.13, note: "越野車高保值" },
      { id: "cherokee",   name: "Grand Cherokee", rate: 0.17 },
      { id: "compass",    name: "Compass",        rate: 0.18 },
      { id: "other-jeep", name: "其他 Jeep",      rate: 0.18 },
    ],
  },
  // ── 電動車 ───────────────────────────────
  {
    id: "tesla", name: "Tesla", type: "electric",
    models: [
      { id: "model-y",  name: "Model Y",     rate: 0.17, note: "全球最熱銷電動車，相對保值" },
      { id: "model-3",  name: "Model 3",     rate: 0.18, note: "價格波動較大" },
      { id: "model-s",  name: "Model S",     rate: 0.20, note: "高端型號折舊較快" },
      { id: "model-x",  name: "Model X",     rate: 0.20 },
      { id: "cybertruck",name: "Cybertruck", rate: 0.18 },
    ],
  },
  {
    id: "byd", name: "BYD", type: "electric",
    models: [
      { id: "atto3",    name: "ATTO 3",     rate: 0.20, note: "電動車品牌效應尚在建立" },
      { id: "seal",     name: "Seal",       rate: 0.21 },
      { id: "dolphin",  name: "Dolphin",    rate: 0.21 },
      { id: "other-byd",name: "其他 BYD",   rate: 0.22 },
    ],
  },
  {
    id: "other-ev", name: "其他電動車", type: "electric",
    models: [
      { id: "hyundai-ev",name: "Hyundai IONIQ",  rate: 0.19 },
      { id: "kia-ev",    name: "Kia EV 系列",    rate: 0.19 },
      { id: "volvo-ev",  name: "Volvo 電動系列", rate: 0.18 },
      { id: "other-ev",  name: "其他電動車",      rate: 0.22 },
    ],
  },
  // ── 國產 ────────────────────────────────
  {
    id: "luxgen", name: "Luxgen 納智捷", type: "domestic",
    models: [
      { id: "n7",       name: "n7（電動）",    rate: 0.22 },
      { id: "urx",      name: "URX",          rate: 0.25 },
      { id: "u6",       name: "U6 / U7",      rate: 0.25 },
      { id: "other-lux",name: "其他納智捷",    rate: 0.25 },
    ],
  },
];

// 品牌類型標籤
export const BRAND_TYPE_LABELS: Record<CarBrandData["type"], string> = {
  japanese: "日系",
  german:   "德系",
  american: "美系",
  electric: "電動車",
  domestic: "國產",
};

// =============================================
export interface CarDepreciationResult {
  residualValue: number;
  depreciatedAmount: number;
  annualDepreciation: number;
  residualRate: number;
  annualRate: number;
}

export function calculateCarDepreciation(
  purchasePrice: number,
  ageYears: number,
  rate: number
): CarDepreciationResult {
  if (isNaN(purchasePrice) || purchasePrice <= 0 || isNaN(ageYears) || ageYears < 0) {
    return { residualValue: 0, depreciatedAmount: 0, annualDepreciation: 0, residualRate: 0, annualRate: 0 };
  }

  const residualValue      = purchasePrice * Math.pow(1 - rate, ageYears);
  const depreciatedAmount  = purchasePrice - residualValue;
  const annualDepreciation = ageYears > 0 ? depreciatedAmount / ageYears : 0;
  const residualRate       = (residualValue / purchasePrice) * 100;

  return {
    residualValue:      Math.round(residualValue),
    depreciatedAmount:  Math.round(depreciatedAmount),
    annualDepreciation: Math.round(annualDepreciation),
    residualRate:       Math.round(residualRate * 10) / 10,
    annualRate:         rate * 100,
  };
}

// 相容舊介面（type-based，保留給潛在舊呼叫）
export type CarBrand = "japanese" | "german" | "american" | "domestic";
export const carBrandLabels: Record<CarBrand, string> = {
  japanese: "日系（Toyota、Honda、Mazda 等）",
  german:   "德系（BMW、Benz、Audi 等）",
  american: "美系（Ford、Tesla 等）",
  domestic: "國產（納智捷等）",
};
