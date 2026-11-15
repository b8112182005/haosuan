"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, X, ListChecks } from "lucide-react";
import type { SubsidyCategory, SubsidySummary } from "@/lib/subsidy/types";
import { SUBSIDY_INDEX } from "@/lib/subsidy/index-data";
import { CATEGORY_LABELS, CATEGORY_ORDER, TAIWAN_CITIES } from "@/lib/subsidy/types";
import { useToday } from "@/lib/subsidy/useToday";
import { resolveSubsidyDeadline } from "@/lib/subsidy/deadline";
import { refreshRemoteDataset } from "@/lib/subsidy/remote";
import { matchesTerms, normalizeSearchText, searchTerms } from "@/lib/subsidy/search";
import SubsidyCard from "./SubsidyCard";

const PAGE_SIZE = 30;

// 資料直接 import 精簡索引，不走 props（避免整份資料被序列化進頁面 HTML）
const subsidies = SUBSIDY_INDEX;

// 每筆的搜尋文字只正規化一次；打字時每按一個鍵都重算 119 筆會頓
const searchText = new Map<string, string>(
  subsidies.map((s) => [s.id, normalizeSearchText([s.name, s.short_name, s.summary, s.agency, s.city ?? "", ...s.eligibility].join("\n"))])
);

/**
 * 上一次的篩選狀態。點進項目再按返回時元件會重新掛載，state 全部重設，
 * 使用者得把分類、縣市、關鍵字重選一次。放在模組層：同一次開啟期間留著，整頁重新載入就清掉。
 */
interface SavedFilters {
  category: SubsidyCategory | "all";
  city: string;
  query: string;
  activeOnly: boolean;
  limit: number;
}
let savedFilters: SavedFilters | null = null;

export default function SubsidyBrowser() {
  const params = useSearchParams();
  const initialCat = params.get("cat") as SubsidyCategory | null;
  // 網址帶 ?cat= 是從首頁的分類入口進來的，以它為準；否則還原上一次的篩選
  const fromUrl = initialCat && CATEGORY_ORDER.includes(initialCat) ? initialCat : null;
  const restored = fromUrl ? null : savedFilters;
  const [category, setCategory] = useState<SubsidyCategory | "all">(fromUrl ?? restored?.category ?? "all");
  const [city, setCity] = useState<string>(restored?.city ?? "");
  const [query, setQuery] = useState(restored?.query ?? "");
  const [activeOnly, setActiveOnly] = useState(restored?.activeOnly ?? true);
  // 一次畫 99 張卡片，低階手機捲動會頓；先畫 30 張
  const [limit, setLimit] = useState(restored?.limit ?? PAGE_SIZE);
  const today = useToday();

  useEffect(() => {
    savedFilters = { category, city, query, activeOnly, limit };
  }, [category, city, query, activeOnly, limit]);

  // 進站時順手檢查一次遠端資料（6 小時內只抓一次）
  useEffect(() => {
    refreshRemoteDataset().catch(() => {});
  }, []);

  const categories = useMemo(() => {
    const used = new Set(subsidies.map((s) => s.category));
    return CATEGORY_ORDER.filter((c) => used.has(c));
  }, []);

  const list = useMemo(() => {
    const terms = searchTerms(query);
    let rows = subsidies.filter((s) => {
      if (activeOnly && s.status_2026 === "ended") return false;
      // 期限已過的（有截止年份而且過了）也不算進行中；內建資料要等發新版才會更新狀態
      if (activeOnly && today && resolveSubsidyDeadline(s, today).kind === "ended") return false;
      if (category !== "all" && s.category !== category) return false;
      // 選了縣市：顯示全國性 + 該縣市；沒選：全部
      if (city && s.city && s.city !== city) return false;
      return matchesTerms(searchText.get(s.id) ?? "", terms);
    });
    if (today) {
      const days = (s: SubsidySummary) => {
        const st = resolveSubsidyDeadline(s, today);
        return st.kind === "upcoming" && st.open ? st.daysLeft : st.kind === "upcoming" ? 5000 + st.daysLeft : 9000;
      };
      rows = [...rows].sort((a, b) => days(a) - days(b));
    }
    return rows;
  }, [activeOnly, category, city, query, today]);

  return (
    <div className="space-y-4">
      {/* 試算入口 */}
      <Link
        href="/subsidy/check"
        className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 transition-colors hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-950/50"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
          <ListChecks className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">不想一個個看？回答 7 題</span>
          <span className="block text-xs opacity-80">依你的縣市、年齡、收入、家庭狀況篩出可能符合的項目</span>
        </span>
      </Link>

      {/* 搜尋 */}
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋：租金、育兒、牌照稅、房東…"
          aria-label="搜尋補助"
          className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="清除" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      {/* 分類 chips */}
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2 pb-1">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>
            全部
          </Chip>
          {categories.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {CATEGORY_LABELS[c]}
            </Chip>
          ))}
        </div>
      </div>

      {/* 縣市 + 進行中 */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          aria-label="縣市"
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">全部縣市（含全國性）</option>
          {TAIWAN_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} className="h-4 w-4 accent-primary" />
          只看進行中
        </label>
        <span className="ml-auto text-xs text-muted-foreground">{list.length} 項</span>
      </div>

      {/* 清單 */}
      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          找不到符合的項目。換個關鍵字，或到「疑難雜症」看看相關問答。
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {list.slice(0, limit).map((s) => (
              <SubsidyCard key={s.id} subsidy={s} today={today} />
            ))}
          </div>
          {list.length > limit && (
            <button
              type="button"
              onClick={() => setLimit((n) => n + PAGE_SIZE)}
              className="h-11 w-full rounded-xl border border-border text-sm font-medium hover:bg-accent/40"
            >
              再顯示 {Math.min(PAGE_SIZE, list.length - limit)} 項（還有 {list.length - limit} 項）
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}
