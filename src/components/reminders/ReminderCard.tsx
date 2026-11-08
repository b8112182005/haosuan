'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, CalendarPlus, Check, Download, ExternalLink, Repeat, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { daysUntil, formatDate } from '@/lib/reminders/dates';
import { downloadIcs, googleCalendarUrl } from '@/lib/reminders/notifications';
import type { Reminder } from '@/lib/reminders/types';

export interface ReminderCardProps {
  reminder: Reminder;
  onToggleDone: (id: string, done: boolean) => void | Promise<unknown>;
  onRemove: (id: string) => void | Promise<unknown>;
  /** 網頁版沒有推播，開這個會多顯示「Google 日曆 / .ics」兩個出口 */
  showCalendarLinks?: boolean;
}

export function countdownLabel(days: number): string {
  if (days < 0) return `已過期 ${-days} 天`;
  if (days === 0) return '今天截止';
  return `剩 ${days} 天`;
}

export function countdownClass(days: number): string {
  if (days <= 3) return 'text-red-600 dark:text-red-400';
  if (days <= 14) return 'text-orange-600 dark:text-orange-400';
  return 'text-muted-foreground';
}

/** [30, 14, 3, 0] → 「提前 30、14、3 天＋當天」 */
export function daysBeforeLabel(daysBefore: number[]): string {
  const ahead = daysBefore.filter((n) => n > 0);
  const parts: string[] = [];
  if (ahead.length > 0) parts.push(`提前 ${ahead.join('、')} 天`);
  if (daysBefore.includes(0)) parts.push('當天');
  return parts.join('＋');
}

export default function ReminderCard({ reminder, onToggleDone, onRemove, showCalendarLinks = false }: ReminderCardProps) {
  const [confirming, setConfirming] = useState(false);
  const days = daysUntil(reminder.targetDate);
  const isInternalUrl = reminder.url?.startsWith('/') ?? false;

  // 刪除確認沒按就 4 秒後收回，避免列表上留著一排「確定刪除？」
  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  return (
    <li
      className={cn(
        'flex gap-3 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10',
        reminder.done && 'opacity-70',
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={reminder.done}
        aria-label={reminder.done ? `把「${reminder.title}」標回未完成` : `把「${reminder.title}」標為完成`}
        onClick={() => void onToggleDone(reminder.id, !reminder.done)}
        className={cn(
          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors',
          reminder.done
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border hover:border-foreground',
        )}
      >
        {reminder.done && <Check className="size-4" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3
            className={cn(
              'font-medium leading-snug',
              reminder.done && 'text-muted-foreground line-through',
            )}
          >
            {reminder.title}
          </h3>
          <span
            className={cn(
              'shrink-0 font-mono text-sm font-semibold',
              reminder.done ? 'text-muted-foreground' : countdownClass(days),
            )}
          >
            {reminder.done ? '已完成' : countdownLabel(days)}
          </span>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(reminder.targetDate)}
          {reminder.note && <span>・{reminder.note}</span>}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="rounded-full border border-border px-2 py-0.5">
            {reminder.source.type === 'subsidy' ? '補助' : '自訂'}
          </span>
          {reminder.repeatYearly && (
            <span className="inline-flex items-center gap-1">
              <Repeat className="size-3" />
              每年
            </span>
          )}
          <span>{daysBeforeLabel(reminder.daysBefore)}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {reminder.url &&
            (isInternalUrl ? (
              <Link
                href={reminder.url}
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                前往
                <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <a
                href={reminder.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                前往
                <ExternalLink className="size-3.5" />
              </a>
            ))}

          {showCalendarLinks && !reminder.done && (
            <>
              <a
                href={googleCalendarUrl(reminder)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <CalendarPlus className="size-3.5" />
                Google 日曆
              </a>
              <button
                type="button"
                onClick={() => downloadIcs(reminder)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Download className="size-3.5" />
                .ics
              </button>
            </>
          )}

          <div className="ml-auto">
            {confirming ? (
              <span className="inline-flex items-center gap-2">
                <span className="text-xs text-muted-foreground">確定刪除？</span>
                <Button
                  type="button"
                  size="xs"
                  variant="destructive"
                  onClick={() => void onRemove(reminder.id)}
                >
                  刪除
                </Button>
                <Button type="button" size="xs" variant="ghost" onClick={() => setConfirming(false)}>
                  取消
                </Button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
                刪除
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
