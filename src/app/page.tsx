import Link from "next/link";
import type { Metadata } from "next";
import { Landmark, Bell, Calculator, ChevronRight, ArrowRight } from "lucide-react";
import { tools } from "@/lib/tools-registry";
import { CTA_URLS } from "@/lib/brand";
import { APP_NAME } from "@/lib/site";
import { getActiveSubsidies, getCategoriesInUse } from "@/lib/subsidy/data";
import { CATEGORY_LABELS } from "@/lib/subsidy/types";
import UpcomingDeadlines from "@/components/subsidy/UpcomingDeadlines";

export const metadata: Metadata = {
  title: `${APP_NAME} — 補助查詢、期限提醒、生活計算工具`,
  description:
    "回答幾個問題找出你可能符合的政府補助，截止前 30、14、3 天提醒你；內建房貸、所得稅、電費、BMI 等 30 種台灣常用計算機。免費、無廣告、不用註冊。",
};

const entries = [
  {
    href: "/subsidy/check",
    icon: Landmark,
    title: "我能領什麼補助？",
    desc: "回答 7 題：縣市、年齡、收入、住的狀況、家庭、身分、車輛。列出可能符合的項目與截止日。",
    accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-300",
    iconBg: "bg-emerald-500 text-white",
  },
  {
    href: "/reminders",
    icon: Bell,
    title: "期限提醒",
    desc: "報稅、牌照稅、補助申請、驗車。截止前 30、14、3 天收到通知。",
    accent: "from-amber-500/15 to-amber-500/5 text-amber-700 dark:text-amber-300",
    iconBg: "bg-amber-500 text-white",
  },
  {
    href: "/tools",
    icon: Calculator,
    title: "30 種計算機",
    desc: "房貸、所得稅、勞健保費、加班費、電費、坪數換算。輸入即算。",
    accent: "from-violet-500/15 to-violet-500/5 text-violet-700 dark:text-violet-300",
    iconBg: "bg-violet-500 text-white",
  },
];

const popularSlugs = ["mortgage", "income-tax", "insurance", "overtime", "electricity", "bmi", "area", "exchange-rate"];

export default function Home() {
  const subsidies = getActiveSubsidies();
  const categories = getCategoriesInUse();
  const popular = popularSlugs
    .map((slug) => tools.find((t) => t.slug === slug))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      {/* Hero */}
      <section className="mb-8 sm:mb-12">
        <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
          查補助、記期限、算數字
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
          {subsidies.length} 項政府補助的資格、金額與截止日，整理成一般人看得懂的版本；加上提醒與 30 種計算機。不用註冊，沒有廣告。
        </p>
      </section>

      {/* 三大入口 */}
      <section className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {entries.map((e) => {
          const Icon = e.icon;
          return (
            <Link
              key={e.href}
              href={e.href}
              className={`group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-border bg-gradient-to-br p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg sm:flex-col sm:gap-3 sm:p-5 ${e.accent}`}
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${e.iconBg}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-foreground">{e.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{e.desc}</span>
              </span>
              <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 sm:absolute sm:right-4 sm:top-5 sm:mt-0" />
            </Link>
          );
        })}
      </section>

      {/* 近期截止 */}
      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">近期截止</h2>
          <Link href="/subsidy/calendar" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            年度時程表 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <UpcomingDeadlines limit={5} />
      </section>

      {/* 補助分類 */}
      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">依分類看補助</h2>
          <Link href="/subsidy" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            全部 {subsidies.length} 項 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const count = subsidies.filter((s) => s.category === c).length;
            return (
              <Link
                key={c}
                href={`/subsidy?cat=${c}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm transition-colors hover:border-primary/50 hover:text-primary"
              >
                {CATEGORY_LABELS[c]}
                <span className="text-xs text-muted-foreground">{count}</span>
              </Link>
            );
          })}
          <Link
            href="/subsidy/faq"
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            疑難雜症 Q&amp;A
          </Link>
        </div>
      </section>

      {/* 常用工具 */}
      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">常用計算機</h2>
          <Link href="/tools" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            全部工具 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {popular.map((tool) => (
            <Link
              key={tool.slug}
              href={tool.href}
              className="group rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <p className="text-sm font-medium">{tool.name}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{tool.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* LINE / 模板 CTA */}
      <section className="rounded-2xl border border-border bg-card/50 p-6 text-center">
        <h2 className="text-lg font-semibold">想用 LINE 收提醒？</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          加入好提 LINE 官方帳號，補助截止前也會在 LINE 通知你；想加哪個計算機也可以留言。
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={CTA_URLS.lineHomeHero}
            className="inline-flex items-center justify-center rounded-full bg-[#06C755] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#05b14c]"
          >
            加入好提 LINE
          </a>
          <Link
            href="/free-template"
            className="web-only inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/60 hover:text-primary"
          >
            領免費接案 / 工程模板
          </Link>
        </div>
      </section>
    </div>
  );
}
