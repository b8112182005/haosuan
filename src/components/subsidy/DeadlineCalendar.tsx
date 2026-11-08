"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Subsidy } from "@/lib/subsidy/types";
import { CATEGORY_LABELS } from "@/lib/subsidy/types";
import { resolveSubsidyDeadline, formatLocalDate, toDateString, describeWindow, type LocalDate } from "@/lib/subsidy/deadline";
import { useToday } from "@/lib/subsidy/useToday";
import AddReminderButton from "@/components/reminders/AddReminderButton";

interface Entry {
  subsidy: Subsidy;
  end: LocalDate;
  daysLeft: number;
  open: boolean;
}

/**
 * 未來 12 個月的固定期限清單，依月份分組。
 * 只列有明確截止日的項目（fixed_annual / window / 有日期的 budget）；隨到隨辦的不在這裡。
 */
export default function DeadlineCalendar({ subsidies }: { subsidies: Subsidy[] }) {
  const today = useToday();

  const groups = useMemo(() => {
    if (!today) return null;
    const entries: Entry[] = [];
    for (const s of subsidies) {
      if (s.status_2026 === "ended") continue;
      const st = resolveSubsidyDeadline(s, today);
      if (st.kind !== "upcoming" || st.daysLeft > 366) continue;
      entries.push({ subsidy: s, end: st.date, daysLeft: st.daysLeft, open: st.open });
    }
    entries.sort((a, b) => a.daysLeft - b.daysLeft);
    const byMonth = new Map<string, Entry[]>();
    for (const e of entries) {
      const key = `${e.end.y} 年 ${e.end.m} 月`;
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(e);
    }
    return Array.from(byMonth.entries());
  }, [subsidies, today]);

  if (groups === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/40" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">目前沒有固定截止日的項目。</p>;
  }

  return (
    <div className="space-y-8">
      {groups.map(([month, entries]) => (
        <section key={month}>
          <h2 className="sticky top-14 z-10 -mx-4 mb-3 bg-background/95 px-4 py-2 text-base font-semibold backdrop-blur" style={{ top: "calc(3.5rem + var(--safe-top))" }}>
            {month}
            <span className="ml-2 text-xs font-normal text-muted-foreground">{entries.length} 項</span>
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {entries.map(({ subsidy, end, daysLeft, open }) => (
              <li key={subsidy.id} className="flex items-start gap-3 px-4 py-3">
                <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-muted py-1.5 text-center leading-none">
                  <span className="text-[10px] text-muted-foreground">{end.m}月</span>
                  <span className="mt-0.5 text-lg font-bold">{end.d}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/subsidy/${subsidy.id}`} className="group flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium group-hover:text-primary">{subsidy.short_name || subsidy.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {CATEGORY_LABELS[subsidy.category]} · {describeWindow(subsidy.deadline)}
                        {!open && " · 尚未開放"}
                      </span>
                    </span>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-medium ${daysLeft <= 7 ? "text-red-600" : daysLeft <= 30 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {daysLeft === 0 ? "今天截止" : `剩 ${daysLeft} 天（${formatLocalDate(end)}）`}
                    </span>
                    <AddReminderButton
                      title={`${subsidy.short_name || subsidy.name}截止`}
                      targetDate={toDateString(end)}
                      url={`/subsidy/${subsidy.id}`}
                      source={{ type: "subsidy", id: subsidy.id }}
                      defaultDaysBefore={[14, 3]}
                      repeatYearly={subsidy.deadline.type === "fixed_annual"}
                      variant="ghost"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
