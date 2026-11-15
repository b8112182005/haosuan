"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Heart, Banknote, Hammer, ArrowLeftRight, Hash, ChevronRight, Search, X } from "lucide-react";
import { tools, categoryLabels, type ToolCategory } from "@/lib/tools-registry";

export const toolCategoryConfig: Record<
  ToolCategory,
  { icon: React.ElementType; color: string; bgColor: string; pillColor: string }
> = {
  life: {
    icon: Heart,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    pillColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  finance: {
    icon: Banknote,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    pillColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  renovation: {
    icon: Hammer,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    pillColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  convert: {
    icon: ArrowLeftRight,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    pillColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  math: {
    icon: Hash,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    pillColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
};

export const toolCategoryOrder: ToolCategory[] = ["life", "finance", "renovation", "convert", "math"];

function matches(query: string, haystack: string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack.some((h) => h.toLowerCase().includes(q));
}

export default function ToolsIndex({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);

  const grouped = useMemo(
    () =>
      toolCategoryOrder
        .map((cat) => ({
          category: cat,
          label: categoryLabels[cat],
          config: toolCategoryConfig[cat],
          tools: tools.filter(
            (t) =>
              t.category === cat &&
              t.enabled &&
              matches(query, [t.name, t.description, ...(t.keywords ?? [])])
          ),
        }))
        .filter((g) => g.tools.length > 0),
    [query]
  );

  const total = grouped.reduce((n, g) => n + g.tools.length, 0);

  return (
    <div className="space-y-8">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋工具：房貸、電費、坪數…"
          aria-label="搜尋計算工具"
          className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-9 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="清除搜尋"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      {total === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          找不到「{query}」。試試輸入用途，例如「貸款」「換算」「稅」。
        </p>
      )}

      {grouped.map(({ category, label, config, tools: catTools }) => {
        const Icon = config.icon;
        return (
          <section key={category}>
            <div className="mb-3 flex items-center gap-2">
              <div className={`rounded-lg p-1.5 ${config.bgColor}`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>
              <h2 className="text-base font-semibold">{label}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.pillColor}`}>
                {catTools.length} 個
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catTools.map((tool) => (
                <Link
                  key={tool.slug}
                  href={tool.href}
                  className="group block rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/30 hover:shadow-lg hover:shadow-primary/10"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{tool.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tool.description}</p>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
