"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { SUBSIDY_INDEX } from "@/lib/subsidy/index-data";
import { activeYearEndNotices } from "@/lib/subsidy/notice";
import { useToday } from "@/lib/subsidy/useToday";

/**
 * 每年固定期間才出現的提醒卡（例如 11/1～12/31 要送件的項目）。
 * 「今天」只有 client 知道，所以 server 輸出與 hydration 前一律不畫，
 * 沒有卡片時回 null，不留空白間距。
 * only 給補助 id：詳情頁只顯示那一項，而且不放連結（人已經在那一頁）。
 */
export default function YearEndNotices({ only }: { only?: string }) {
  const today = useToday();
  const cards = useMemo(() => {
    if (!today) return [];
    const all = activeYearEndNotices(SUBSIDY_INDEX, today);
    return only ? all.filter((c) => c.id === only) : all;
  }, [today, only]);

  if (cards.length === 0) return null;

  return (
    <div className="mb-4 space-y-3">
      {cards.map((c) => (
        <section
          key={c.id}
          className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <h2 className="flex items-start gap-2 text-sm font-bold leading-snug">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {c.notice.title}
          </h2>
          <ul className="mt-2 space-y-1 pl-6 text-[13px] leading-relaxed list-disc">
            {/* 列表頁只放前兩行：六行全放會把搜尋框和試算入口擠出第一屏，完整內容在項目頁 */}
            {(only ? c.notice.lines : c.notice.lines.slice(0, 2)).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          {!only && (
            <Link
              href={`/subsidy/${c.id}`}
              className="mt-2.5 inline-block pl-6 text-xs font-medium underline underline-offset-4"
            >
              看申請方式與文件
            </Link>
          )}
        </section>
      ))}
    </div>
  );
}
