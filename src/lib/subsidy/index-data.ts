import index from "@/data/subsidies-index.json";
import type { SubsidyCategory, SubsidySummary } from "./types";
import { CATEGORY_ORDER } from "./types";

/**
 * 精簡索引：client component 可以直接 import（會進 client bundle，約完整資料的四分之一）。
 * 完整資料（文件、步驟、問答、來源）在 ./data.ts，只給 server component 用。
 */
const INDEX = index as unknown as { version: string; items: SubsidySummary[] };

export const DATA_VERSION = INDEX.version;

export const SUBSIDY_INDEX: SubsidySummary[] = INDEX.items;

/** 只排除確定已結束的；狀態未知的仍顯示，卡片會標「資料待核對」 */
export const ACTIVE_SUBSIDY_INDEX: SubsidySummary[] = INDEX.items.filter((s) => s.status_2026 !== "ended");

export function categoriesInUse(list: SubsidySummary[] = SUBSIDY_INDEX): SubsidyCategory[] {
  const used = new Set(list.map((s) => s.category));
  return CATEGORY_ORDER.filter((c) => used.has(c));
}
