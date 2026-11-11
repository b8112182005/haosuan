"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import type { SubsidySummary } from "@/lib/subsidy/types";
import { ACTIVE_SUBSIDY_INDEX } from "@/lib/subsidy/index-data";
import { resolveSubsidyDeadline, formatLocalDate, urgency } from "@/lib/subsidy/deadline";
import { useToday } from "@/lib/subsidy/useToday";

interface Row {
  subsidy: SubsidySummary;
  daysLeft: number;
  dateLabel: string;
  tone: "urgent" | "soon" | "later";
}

const toneClass: Record<Row["tone"], string> = {
  urgent: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  soon: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  later: "bg-muted text-muted-foreground",
};

/**
 * 近期截止清單。「剩幾天」要用使用者裝置的今天算（useToday 在 server 回 null），
 * 靜態輸出時先渲染骨架，避免 build 當天的數字被烤進 HTML。
 */
// 資料直接 import 精簡索引，不走 props：整份資料當 props 會被序列化進首頁 HTML（曾經撐到 944 KB）
const subsidies = ACTIVE_SUBSIDY_INDEX;

/** 卡片用的簡短機關名：agency 常帶括號說明（受理單位、承辦銀行…），列表只留主辦機關那一段 */
function shortAgency(agency: string): string {
  return agency.split(/[（(／/、，,]/)[0].trim() || agency;
}

export default function UpcomingDeadlines({ limit = 5, withinDays = 120 }: { limit?: number; withinDays?: number }) {
  const today = useToday();

  const rows = useMemo<Row[] | null>(() => {
    if (!today) return null;
    const next: Row[] = [];
    for (const s of subsidies) {
      if (s.status_2026 === "ended") continue;
      const state = resolveSubsidyDeadline(s, today);
      if (state.kind !== "upcoming" || !state.open) continue;
      if (state.daysLeft > withinDays) continue;
      const u = urgency(state);
      next.push({
        subsidy: s,
        daysLeft: state.daysLeft,
        dateLabel: formatLocalDate(state.date, false),
        tone: u === "none" ? "later" : u,
      });
    }
    next.sort((a, b) => a.daysLeft - b.daysLeft);
    return next.slice(0, limit);
  }, [limit, withinDays, today]);

  if (rows === null) {
    return (
      <ul className="space-y-2" aria-busy="true">
        {Array.from({ length: Math.min(limit, 3) }).map((_, i) => (
          <li key={i} className="h-14 animate-pulse rounded-xl border border-border bg-muted/40" />
        ))}
      </ul>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        {withinDays} 天內沒有固定截止日的項目。隨到隨辦的補助可以直接到「補助」查看。
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {rows.map(({ subsidy, daysLeft, dateLabel, tone }) => (
        <li key={subsidy.id}>
          <Link
            href={`/subsidy/${subsidy.id}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40 active:bg-accent/60"
          >
            <span className={`flex h-10 w-14 shrink-0 flex-col items-center justify-center rounded-lg text-center leading-none ${toneClass[tone]}`}>
              <span className="text-base font-bold">{daysLeft === 0 ? "今天" : daysLeft}</span>
              {daysLeft !== 0 && <span className="mt-0.5 text-[10px]">天</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{subsidy.short_name || subsidy.name}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarClock className="h-3 w-3" /> {dateLabel} 截止 · {shortAgency(subsidy.agency)}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
