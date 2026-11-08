"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, ExternalLink } from "lucide-react";

export interface FaqEntry {
  q: string;
  a: string;
  source_url: string | null;
  /** 分組用：一般問答用 tags；項目問答用項目名稱 */
  group: string;
  /** 來自哪個補助項目（有的話） */
  subsidyId?: string;
  subsidyName?: string;
}

export default function FaqBrowser({ entries, groups }: { entries: FaqEntry[]; groups: string[] }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("all");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (group !== "all" && e.group !== group) return false;
      if (!q) return true;
      return `${e.q}\n${e.a}\n${e.subsidyName ?? ""}`.toLowerCase().includes(q);
    });
  }, [entries, query, group]);

  return (
    <div className="space-y-4">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="輸入你的問題：房東不同意、戶籍、補件、撥款…"
          aria-label="搜尋問答"
          className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="清除" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2 pb-1">
          <GroupChip active={group === "all"} onClick={() => setGroup("all")}>全部 {entries.length}</GroupChip>
          {groups.map((g) => (
            <GroupChip key={g} active={group === g} onClick={() => setGroup(g)}>
              {g}
            </GroupChip>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{list.length} 則問答</p>

      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          找不到相關問答。試試更短的關鍵字，或直接到各補助項目頁看「常見問題」。
        </p>
      ) : (
        <div className="space-y-2">
          {list.map((e, i) => (
            <details key={`${e.group}-${i}`} className="group rounded-xl border border-border bg-card">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3">
                <span>
                  <span className="block text-sm font-medium leading-snug">{e.q}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">{e.subsidyName ?? e.group}</span>
                </span>
                <span className="shrink-0 text-lg leading-none text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                <p>{e.a}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  {e.source_url && (
                    <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline underline-offset-4">
                      官方來源 <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {e.subsidyId && (
                    <Link href={`/subsidy/${e.subsidyId}`} className="underline underline-offset-4">
                      看這項補助
                    </Link>
                  )}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}
