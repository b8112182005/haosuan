import dataset from "@/data/subsidies.json";
import type { GeneralFaq, Subsidy, SubsidyCategory, SubsidyDataset } from "./types";
import { CATEGORY_ORDER } from "./types";

// JSON 匯入時 TypeScript 會把 enum 欄位推成 string，這裡斷言成我們的型別；
// 資料檔由 scripts/subsidy/build-data.mjs 產生並做過 schema 檢查。
const DATA = dataset as unknown as SubsidyDataset;

export const DATA_VERSION = DATA.version;

export function getDataset(): SubsidyDataset {
  return DATA;
}

/** 全部項目（含已結束的，UI 自己決定要不要顯示） */
export function getAllSubsidies(): Subsidy[] {
  return DATA.items;
}

/** 2026 仍在進行中的項目（只排除確定已結束的；狀態未知的仍顯示，但卡片會標「資料待核對」） */
export function getActiveSubsidies(): Subsidy[] {
  return DATA.items.filter((s) => s.status_2026 !== "ended");
}

export function getSubsidyById(id: string): Subsidy | undefined {
  return DATA.items.find((s) => s.id === id);
}

export function getSubsidyIds(): string[] {
  return DATA.items.map((s) => s.id);
}

export function getSubsidiesByCategory(category: SubsidyCategory): Subsidy[] {
  return DATA.items.filter((s) => s.category === category);
}

/** 有資料的分類，依固定順序 */
export function getCategoriesInUse(): SubsidyCategory[] {
  const used = new Set(DATA.items.map((s) => s.category));
  return CATEGORY_ORDER.filter((c) => used.has(c));
}

export function getGeneralFaqs(): GeneralFaq[] {
  return DATA.general_faqs;
}

/** 同一主題底下的其他項目（相關補助） */
export function getRelatedSubsidies(subsidy: Subsidy, limit = 4): Subsidy[] {
  const sameTopic = DATA.items.filter((s) => s.id !== subsidy.id && s.topic && s.topic === subsidy.topic);
  const sameCategory = DATA.items.filter(
    (s) => s.id !== subsidy.id && s.category === subsidy.category && !sameTopic.includes(s)
  );
  return [...sameTopic, ...sameCategory].slice(0, limit);
}
