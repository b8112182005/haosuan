import Link from "next/link";
import type { Metadata } from "next";
import {
  Heart,
  Banknote,
  Hammer,
  ArrowLeftRight,
  Hash,
  ChevronRight,
} from "lucide-react";
import { tools, categoryLabels, type ToolCategory } from "@/lib/tools-registry";

export const metadata: Metadata = {
  title: "好算 HaoSuan — 台灣生活計算工具",
  description:
    "免費線上計算工具，涵蓋 BMI、房貸試算、電費計算、面積換算等 20+ 實用計算機，專為台灣用戶設計，無廣告、手機友善。",
};

const categoryConfig: Record<
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

const categoryOrder: ToolCategory[] = [
  "life",
  "finance",
  "renovation",
  "convert",
  "math",
];

export default function Home() {
  const grouped = categoryOrder.map((cat) => ({
    category: cat,
    label: categoryLabels[cat],
    config: categoryConfig[cat],
    tools: tools.filter((t) => t.category === cat),
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* Hero */}
      <section className="mb-14 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          台灣人的<span className="text-primary">免費計算工具</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          20 種工具，即時計算，無廣告，手機友善
        </p>
        <p className="text-sm text-muted-foreground mt-3">
          20 個工具 · 5 大分類 · 完全免費
        </p>
      </section>

      {/* Category sections */}
      <div className="space-y-12">
        {grouped.map(({ category, label, config, tools: catTools }) => {
          const Icon = config.icon;
          return (
            <section key={category}>
              {/* Category header */}
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
                <h2 className="text-base font-semibold">{label}</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.pillColor}`}>
                  {catTools.length} 個工具
                </span>
              </div>

              {/* Tool cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {catTools.map((tool) =>
                  tool.enabled ? (
                    <Link
                      key={tool.slug}
                      href={tool.href}
                      className="group block rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/30 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{tool.name}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {tool.description}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
                      </div>
                    </Link>
                  ) : (
                    <div
                      key={tool.slug}
                      className="rounded-2xl border border-border bg-card/50 p-4 opacity-60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{tool.name}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {tool.description}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                          即將上線
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <section className="mt-16 text-center border border-border rounded-2xl p-8 bg-card/50">
        <h2 className="text-xl font-semibold mb-2">📱 APP 版本即將上線</h2>
        <p className="text-sm text-muted-foreground">
          工具陸續上線，目標 30 個工具後推出 APP 版本，讓你隨時隨地好算 🎉
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          ✅ 完全免費 · 🚫 無廣告 · 📱 手機友善
        </p>
      </section>
    </div>
  );
}
