"use client";

import { CalendarClock, Infinity as InfinityIcon, Ban, Hourglass } from "lucide-react";
import type { LateConsequence, Subsidy } from "@/lib/subsidy/types";
import {
  FAR_DAYS,
  describeWindow,
  formatLocalDate,
  isProjected,
  parseDateString,
  resolveSubsidyDeadline,
  urgency,
} from "@/lib/subsidy/deadline";
import { DATA_VERSION } from "@/lib/subsidy/index-data";
import { reminderPreset, showApplyNow } from "@/lib/subsidy/reminderPreset";
import { useToday } from "@/lib/subsidy/useToday";
import AddReminderButton from "@/components/reminders/AddReminderButton";

/**
 * 只收用得到的欄位：整筆 Subsidy 當 props 會連問答、來源一起序列化進頁面。
 * late_consequence 的 sources 留在 server 端的來源清單，不傳進 client。
 */
export type DeadlineCardSubsidy = Pick<Subsidy, "id" | "name" | "short_name" | "deadline"> & {
  late_consequence?: Pick<LateConsequence, "text" | "short" | "apply_now"> | null;
};

/** "2026-11-15" → "2026/11/15"；格式不對就不顯示，不要把壞字串印在畫面上 */
function formatDateString(value: string | null | undefined): string | null {
  const date = value ? parseDateString(value) : null;
  return date ? formatLocalDate(date) : null;
}

/**
 * 詳情頁的截止日卡片 + 一鍵加入提醒。
 * 「剩幾天」依裝置的今天計算（useToday），所以是 client component。
 */
export default function DeadlineCard({ subsidy }: { subsidy: DeadlineCardSubsidy }) {
  const today = useToday();
  const state = today ? resolveSubsidyDeadline(subsidy, today) : null;

  const preset = state ? reminderPreset({ deadline: subsidy.deadline, lateConsequence: subsidy.late_consequence, state }) : null;
  // 結束、或期間還沒開始的項目現在送不了件，不管資料怎麼標都不顯示「現在就能送件」
  const applyNow = showApplyNow(!!preset?.applyNow, state);
  const extraLines = subsidy.deadline.extra_lines ?? [];
  const lastChecked = formatDateString(subsidy.deadline.last_checked);

  // 越早送越早開始領的項目沒有「越近越急」的問題，截止前變紅會把人推向最後一天才送
  const tone =
    !applyNow && state && state.kind === "upcoming"
      ? urgency(state) === "urgent"
        ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
        : urgency(state) === "soon"
          ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
          : "border-border bg-card"
      : "border-border bg-card";

  const dataDate = parseDateString(DATA_VERSION);
  const projected = !!state && !!dataDate && isProjected(subsidy.deadline, state, dataDate);

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
          ) : applyNow && state.kind === "upcoming" ? (
            <>
              <p className="mt-0.5 text-lg font-bold leading-tight">現在就能送件</p>
              {/* 這一期快結束時把剩幾天寫出來：過了這天要等下一期才能送，中間的補貼領不到 */}
              <p className="mt-0.5 text-xs text-muted-foreground">
                這一期最晚 {formatLocalDate(state.date)}
                {state.daysLeft <= 30 && (state.daysLeft === 0 ? "，今天截止" : `，剩 ${state.daysLeft} 天`)}
              </p>
              {projected && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  這一期的日期是照上一期推算的，實際日期以主管機關公告為準。
                </p>
              )}
            </>
          ) : applyNow ? (
            <p className="mt-0.5 text-lg font-bold leading-tight">現在就能送件</p>
          ) : state.kind === "upcoming" ? (
            <>
              <p className="mt-0.5 text-lg font-bold leading-tight">
                {formatLocalDate(state.date)} 截止
                {state.daysLeft <= FAR_DAYS && (
                  <span className="ml-2 text-sm font-semibold">
                    {state.daysLeft === 0 ? "今天截止" : `剩 ${state.daysLeft} 天`}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {describeWindow(subsidy.deadline)}
                {!state.open && "，目前尚未開放受理"}
              </p>
              {projected && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  這一期的日期是照上一期推算的，實際日期以主管機關公告為準。
                </p>
              )}
            </>
          ) : (
            <p className="mt-0.5 text-lg font-bold leading-tight">{state.label}</p>
          )}
          {subsidy.late_consequence && (
            <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">晚送會怎樣：{subsidy.late_consequence.text}</p>
          )}
          {extraLines.map((line, i) => (
            <p key={i} className="mt-1.5 text-xs leading-relaxed text-foreground/80">
              {line.label}：{line.text}
            </p>
          ))}
          {subsidy.deadline.budget_limited && (
            <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">
              經費用完會提前結束。{lastChecked && `最後核對 ${lastChecked}。`}
            </p>
          )}
          {/* 期限說明常有一整段（年度公告、戶數上限、明年展望），長的收起來，讓「加入提醒」留在第一屏 */}
          {subsidy.deadline.note &&
            (subsidy.deadline.note.length <= 60 ? (
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{subsidy.deadline.note}</p>
            ) : (
              <details className="mt-1.5">
                <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground underline underline-offset-4">
                  期限細節
                </summary>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{subsidy.deadline.note}</p>
              </details>
            ))}
        </div>
      </div>

      {state && preset && state.kind !== "ended" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AddReminderButton
            // 標題只放項目名稱：通知會自己接上「3 天後截止」，再加「截止」會變成「牌照稅截止 3 天後截止」。
            // 期限說明不帶進提醒：那是一整段某一年度的說明，會把通知第一行的期限日期擠掉，隔年也不適用
            title={subsidy.short_name || subsidy.name}
            targetDate={preset.targetDate}
            url={`/subsidy/${subsidy.id}`}
            source={{ type: "subsidy", id: subsidy.id }}
            note={preset.note}
            defaultDaysBefore={preset.daysBefore}
            repeatYearly={preset.repeatYearly}
            planned={preset.planned}
          />
          {applyNow ? (
            <span className="text-xs text-muted-foreground">越早送越早開始領。挑一天去辦，當天提醒你</span>
          ) : (
            state.kind !== "upcoming" && (
              <span className="text-xs text-muted-foreground">沒有固定截止日，可以自己挑一天提醒</span>
            )
          )}
        </div>
      )}
    </section>
  );
}
