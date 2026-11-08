"use client";

import { CalendarClock, Infinity as InfinityIcon, Ban, Hourglass } from "lucide-react";
import type { Subsidy } from "@/lib/subsidy/types";
import { resolveSubsidyDeadline, formatLocalDate, toDateString, describeWindow, urgency } from "@/lib/subsidy/deadline";
import { useToday } from "@/lib/subsidy/useToday";
import AddReminderButton from "@/components/reminders/AddReminderButton";

/**
 * 詳情頁的截止日卡片 + 一鍵加入提醒。
 * 「剩幾天」依裝置的今天計算（useToday），所以是 client component。
 */
export default function DeadlineCard({ subsidy }: { subsidy: Subsidy }) {
  const today = useToday();
  const state = today ? resolveSubsidyDeadline(subsidy, today) : null;

  const tone =
    state && state.kind === "upcoming"
      ? urgency(state) === "urgent"
        ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
        : urgency(state) === "soon"
          ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
          : "border-border bg-card"
      : "border-border bg-card";

  const reminderDate = state && state.kind === "upcoming" ? toDateString(state.date) : undefined;
  const yearly = subsidy.deadline.type === "fixed_annual";

  return (
    <section className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background/70">
          {state?.kind === "ended" ? (
            <Ban className="h-4 w-4 text-muted-foreground" />
          ) : state?.kind === "none" ? (
            <InfinityIcon className="h-4 w-4 text-muted-foreground" />
          ) : state?.kind === "budget" ? (
            <Hourglass className="h-4 w-4 text-amber-600" />
          ) : (
            <CalendarClock className="h-4 w-4 text-foreground/80" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">申請期限</p>
          {!state ? (
            <div className="mt-1 h-6 w-32 animate-pulse rounded bg-muted" aria-busy="true" />
          ) : state.kind === "upcoming" ? (
            <>
              <p className="mt-0.5 text-lg font-bold leading-tight">
                {formatLocalDate(state.date)} 截止
                <span className="ml-2 text-sm font-semibold">
                  {state.daysLeft === 0 ? "今天截止" : `剩 ${state.daysLeft} 天`}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {describeWindow(subsidy.deadline)}
                {!state.open && "，目前尚未開放受理"}
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-lg font-bold leading-tight">{state.label}</p>
          )}
          {subsidy.deadline.note && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{subsidy.deadline.note}</p>
          )}
        </div>
      </div>

      {state && state.kind !== "ended" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AddReminderButton
            title={`${subsidy.short_name || subsidy.name}截止`}
            targetDate={reminderDate}
            url={`/subsidy/${subsidy.id}`}
            note={subsidy.deadline.note || undefined}
            source={{ type: "subsidy", id: subsidy.id }}
            defaultDaysBefore={state.kind === "upcoming" ? [30, 14, 3] : [7]}
            repeatYearly={yearly}
          />
          {state.kind !== "upcoming" && (
            <span className="text-xs text-muted-foreground">沒有固定截止日，可以自己挑一天提醒</span>
          )}
        </div>
      )}
    </section>
  );
}
