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
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  life: {
    icon: Heart,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
  },
  finance: {
    icon: Banknote,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  renovation: {
    icon: Hammer,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  convert: {
    icon: ArrowLeftRight,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  math: {
    icon: Hash,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
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
          台灣最實用的<span className="text-primary">計算工具站</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          生活、財務、裝潢、單位換算 — 20+ 種計算機，即時計算，手機友善，完全免費。
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
                <span className="text-xs text-muted-foreground ml-1">
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
                      className="group block rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{tool.name}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {tool.description}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
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
        <h2 className="text-xl font-semibold mb-2">持續更新中</h2>
        <p className="text-sm text-muted-foreground">
          工具陸續上線，目標 30 個工具後推出 APP 版本。
        </p>
      </section>
    </div>
  );
}
