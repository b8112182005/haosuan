import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { HelpCircle, CalendarDays } from "lucide-react";
import SubsidyBrowser from "@/components/subsidy/SubsidyBrowser";
import { getAllSubsidies, DATA_VERSION } from "@/lib/subsidy/data";

export const metadata: Metadata = {
  title: "政府補助查詢",
  description:
    "租金補貼、育兒津貼、新青安、所得稅扣除、勞保給付、長者與身障補助：資格、金額、截止日與申請方式，整理成一般人看得懂的版本。",
  alternates: { canonical: "/subsidy" },
};

export default function SubsidyIndexPage() {
  const subsidies = getAllSubsidies();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">政府補助</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {subsidies.length} 個項目 · 資料版本 {DATA_VERSION}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/subsidy/calendar"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium hover:border-primary/50 hover:text-primary"
          >
            <CalendarDays className="h-3.5 w-3.5" /> 時程表
          </Link>
          <Link
            href="/subsidy/faq"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium hover:border-primary/50 hover:text-primary"
          >
            <HelpCircle className="h-3.5 w-3.5" /> 疑難雜症
          </Link>
        </div>
      </div>
      {/* useSearchParams 在靜態輸出需要 Suspense 邊界 */}
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-muted/40" />}>
        <SubsidyBrowser />
      </Suspense>
      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        ⓘ 金額、資格與截止日依各年度政策調整，部分採「額滿即止」。每個項目頁底部列有來源與核對日期；申請前以主管機關最新公告為準。
      </p>
    </div>
  );
}
