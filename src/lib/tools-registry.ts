export type ToolCategory = "life" | "finance" | "renovation" | "convert" | "math";

export interface Tool {
  /** URL slug，例如 "bmi" */
  slug: string;
  /** 顯示名稱 */
  name: string;
  /** 一行說明 */
  description: string;
  /** 所屬分類 */
  category: ToolCategory;
  /** 完整路徑，例如 "/life/bmi" */
  href: string;
  /** 是否已上線（false 表示尚未開發） */
  enabled: boolean;
  /** 關鍵字（SEO 用） */
  keywords?: string[];
}

export const tools: Tool[] = [
  // ── 生活計算 ──────────────────────────────────────────────
  {
    slug: "bmi",
    name: "BMI 計算機",
    description: "輸入身高體重，即時計算 BMI 值與健康狀態",
    category: "life",
    href: "/life/bmi",
    enabled: true,
    keywords: ["BMI", "身體質量指數", "體重", "健康"],
  },
  {
    slug: "age",
    name: "年齡計算機",
    description: "輸入生日，計算精確年齡（歲、月、日）",
    category: "life",
    href: "/life/age",
    enabled: true,
    keywords: ["年齡", "生日", "幾歲"],
  },
  {
    slug: "date-diff",
    name: "日期天數計算",
    description: "計算兩個日期之間相差的天數",
    category: "life",
    href: "/life/date-diff",
    enabled: true,
    keywords: ["日期", "天數", "幾天"],
  },
  {
    slug: "electricity",
    name: "電費計算機",
    description: "依台電累進費率，估算每月電費",
    category: "life",
    href: "/life/electricity",
    enabled: true,
    keywords: ["電費", "台電", "度數", "累進"],
  },
  {
    slug: "sleep",
    name: "睡眠時間計算",
    description: "根據起床時間反推最佳入睡時間（90 分鐘週期）",
    category: "life",
    href: "/life/sleep",
    enabled: true,
    keywords: ["睡眠", "幾點睡", "睡眠週期"],
  },
  {
    slug: "calories",
    name: "熱量計算機",
    description: "計算基礎代謝率 BMR 與每日所需熱量 TDEE",
    category: "life",
    href: "/life/calories",
    enabled: true,
    keywords: ["熱量", "BMR", "TDEE", "卡路里", "減重"],
  },
  {
    slug: "pregnancy",
    name: "懷孕週數計算",
    description: "依最後月經日計算目前週數與預產期",
    category: "life",
    href: "/life/pregnancy",
    enabled: true,
    keywords: ["懷孕", "預產期", "週數", "孕期"],
  },
  {
    slug: "fuel-cost",
    name: "油耗費用計算",
    description: "依油耗、油價與距離計算行駛油資",
    category: "life",
    href: "/life/fuel-cost",
    enabled: true,
    keywords: ["油耗", "油費", "加油", "油價"],
  },

  // ── 財務計算 ──────────────────────────────────────────────
  {
    slug: "mortgage",
    name: "房貸試算",
    description: "本息均攤/本金均攤，計算每月還款金額",
    category: "finance",
    href: "/finance/mortgage",
    enabled: true,
    keywords: ["房貸", "貸款", "利率", "月付"],
  },
  {
    slug: "exchange-rate",
    name: "匯率換算",
    description: "台幣與各幣別即時換算",
    category: "finance",
    href: "/finance/exchange-rate",
    enabled: true,
    keywords: ["匯率", "換算", "外幣", "台幣"],
  },
  {
    slug: "income-tax",
    name: "薪資所得稅試算",
    description: "依台灣 2024 年稅制試算年度所得稅",
    category: "finance",
    href: "/finance/income-tax",
    enabled: true,
    keywords: ["所得稅", "薪資", "報稅", "扣除額"],
  },
  {
    slug: "compound-interest",
    name: "複利計算機",
    description: "計算複利終值、現值與年化報酬率",
    category: "finance",
    href: "/finance/compound-interest",
    enabled: true,
    keywords: ["複利", "投資", "報酬率", "終值"],
  },
  {
    slug: "overtime",
    name: "加班費計算機",
    description: "依勞基法計算平日、假日加班費",
    category: "finance",
    href: "/finance/overtime",
    enabled: true,
    keywords: ["加班費", "勞基法", "時薪", "假日"],
  },
  {
    slug: "invoice-tax",
    name: "發票營業稅計算",
    description: "含稅 / 未稅金額換算（5% 營業稅）",
    category: "finance",
    href: "/finance/invoice-tax",
    enabled: true,
    keywords: ["發票", "營業稅", "含稅", "未稅", "5%"],
  },
  {
    slug: "deposit-interest",
    name: "存款利息計算",
    description: "定存/活存利息試算，支援單利與複利",
    category: "finance",
    href: "/finance/deposit-interest",
    enabled: true,
    keywords: ["定存", "利息", "存款", "複利"],
  },
  {
    slug: "retirement",
    name: "退休金試算",
    description: "計算退休時總資產與每月可動用金額",
    category: "finance",
    href: "/finance/retirement",
    enabled: true,
    keywords: ["退休金", "退休", "儲蓄", "財務規劃"],
  },
  {
    slug: "insurance",
    name: "勞健保費計算",
    description: "試算勞保、健保費用與每月實領薪資",
    category: "finance",
    href: "/finance/insurance",
    enabled: true,
    keywords: ["勞保", "健保", "保費", "薪資"],
  },
  {
    slug: "stamp-duty",
    name: "印花稅計算",
    description: "不動產買賣、贈與契約印花稅試算",
    category: "finance",
    href: "/finance/stamp-duty",
    enabled: true,
    keywords: ["印花稅", "契約", "買賣", "贈與"],
  },
  {
    slug: "car-depreciation",
    name: "二手車殘值估算",
    description: "依車齡與品牌估算二手車市場殘值",
    category: "finance",
    href: "/finance/car-depreciation",
    enabled: true,
    keywords: ["二手車", "折舊", "殘值", "車價"],
  },

  // ── 裝潢工程 ──────────────────────────────────────────────
  {
    slug: "paint",
    name: "油漆用量計算機",
    description: "依房間尺寸估算油漆桶數與費用（含瑀墨推薦）",
    category: "renovation",
    href: "/renovation/paint",
    enabled: true,
    keywords: ["油漆", "塗料", "用量", "裝潢"],
  },
  {
    slug: "tile",
    name: "磁磚數量計算",
    description: "依坪數與磁磚尺寸計算所需片數與耗料",
    category: "renovation",
    href: "/renovation/tile",
    enabled: true,
    keywords: ["磁磚", "數量", "地磚", "壁磚"],
  },
  {
    slug: "ac-btu",
    name: "冷氣噸數計算",
    description: "依坪數、樓層、朝向推薦適合的冷氣噸數",
    category: "renovation",
    href: "/renovation/ac-btu",
    enabled: true,
    keywords: ["冷氣", "噸數", "BTU", "坪數"],
  },

  // ── 單位換算 ──────────────────────────────────────────────
  {
    slug: "area",
    name: "面積換算",
    description: "坪、平方公尺、平方公分、坪互換",
    category: "convert",
    href: "/convert/area",
    enabled: true,
    keywords: ["面積", "坪", "平方公尺", "換算"],
  },
  {
    slug: "length",
    name: "長度換算",
    description: "公里、公尺、公分、英吋、英尺、英里互換",
    category: "convert",
    href: "/convert/length",
    enabled: true,
    keywords: ["長度", "距離", "公尺", "英吋", "換算"],
  },
  {
    slug: "weight",
    name: "重量換算",
    description: "公斤、公克、磅、盎司互換",
    category: "convert",
    href: "/convert/weight",
    enabled: true,
    keywords: ["重量", "公斤", "磅", "換算"],
  },
  {
    slug: "temperature",
    name: "溫度換算",
    description: "攝氏、華氏、克耳文互換",
    category: "convert",
    href: "/convert/temperature",
    enabled: true,
    keywords: ["溫度", "攝氏", "華氏", "換算"],
  },
  {
    slug: "volume",
    name: "容量換算",
    description: "公升、毫升、加侖、品脫、量米杯互換",
    category: "convert",
    href: "/convert/volume",
    enabled: true,
    keywords: ["容量", "公升", "毫升", "加侖", "換算"],
  },
  {
    slug: "data-speed",
    name: "網速換算",
    description: "Mbps、MB/s、Gbps 互換，含使用情境建議",
    category: "convert",
    href: "/convert/data-speed",
    enabled: true,
    keywords: ["網速", "Mbps", "頻寬", "下載速度"],
  },

  // ── 數學/文字 ─────────────────────────────────────────────
  {
    slug: "percentage",
    name: "百分比計算",
    description: "計算百分比、增減幅度、折扣金額",
    category: "math",
    href: "/math/percentage",
    enabled: true,
    keywords: ["百分比", "折扣", "比例"],
  },
  {
    slug: "word-count",
    name: "字數計算",
    description: "計算中英文字數、字元數、段落數",
    category: "math",
    href: "/math/word-count",
    enabled: true,
    keywords: ["字數", "字元", "計算"],
  },
];

/** 依分類取得工具列表 */
export function getToolsByCategory(category: ToolCategory): Tool[] {
  return tools.filter((t) => t.category === category);
}

/** 依 slug 取得工具 */
export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}

/** 取得已上線工具 */
export function getEnabledTools(): Tool[] {
  return tools.filter((t) => t.enabled);
}

/** 取得 sitemap 用的路徑列表（已上線工具） */
export function getSitemapPaths(): string[] {
  return getEnabledTools().map((t) => t.href);
}

export const categoryLabels: Record<ToolCategory, string> = {
  life: "生活計算",
  finance: "財務計算",
  renovation: "裝潢工程",
  convert: "單位換算",
  math: "數學文字",
};
