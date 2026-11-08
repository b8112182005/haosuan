"use client";

import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import type { Subsidy } from "@/lib/subsidy/types";
import { CATEGORY_LABELS } from "@/lib/subsidy/types";
import { resolveSubsidyDeadline, urgency, type LocalDate } from "@/lib/subsidy/deadline";

export function StatusBadge({ subsidy }: { subsidy: Subsidy }) {
  if (subsidy.status_2026 === "ended")
    return <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">已結束</span>;
  if (subsidy.status_2026 === "pending")
    return <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">待公告</span>;
  if (subsidy.status_2026 === "unknown" || subsidy.confidence === "low")
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">資料待核對</span>;
  return null;
}

export function DeadlineBadge({ subsidy, today }: { subsidy: Subsidy; today: LocalDate | null }) {
  if (!today) return <span className="inline-block h-4 w-16 animate-pulse rounded bg-muted" />;
  const state = resolveSubsidyDeadline(subsidy, today);
  if (state.kind === "upcoming") {
    const u = urgency(state);
    const cls =
      u === "urgent"
        ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
        : u === "soon"
          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
    return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{state.label}</span>;
  }
  return <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{state.label}</span>;
}

/** 列表用的補助卡片（瀏覽頁、試算結果共用） */
export default function SubsidyCard({
  subsidy,
  today,
  footer,
  highlight,
}: {
  subsidy: Subsidy;
  today: LocalDate | null;
  /** 卡片底部額外內容（例如試算結果的原因） */
  footer?: React.ReactNode;
  highlight?: "eligible" | "maybe" | "not_eligible";
}) {
  const border =
    highlight === "eligible"
      ? "border-emerald-300 dark:border-emerald-800"
      : highlight === "not_eligible"
        ? "border-border opacity-70"
        : "border-border";
  return (
    <article className={`rounded-2xl border bg-card p-4 transition-shadow hover:shadow-md ${border}`}>
      <Link href={`/subsidy/${subsidy.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5">{CATEGORY_LABELS[subsidy.category]}</span>
              {subsidy.city && (
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />
                  {subsidy.city}
                </span>
              )}
              <StatusBadge subsidy={subsidy} />
            </div>
            <h3 className="text-sm font-semibold leading-snug">{subsidy.name}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{subsidy.summary}</p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{subsidy.amount.text}</span>
          <DeadlineBadge subsidy={subsidy} today={today} />
        </div>
      </Link>
      {footer}
    </article>
  );
}
