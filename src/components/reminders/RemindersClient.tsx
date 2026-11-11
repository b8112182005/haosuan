'use client';

import Link from 'next/link';
import { BellOff, BellRing, CalendarClock } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useReminders } from '@/lib/reminders/useReminders';
import { useIsNativePlatform } from '@/lib/reminders/useIsNativePlatform';
import AddReminderButton from './AddReminderButton';
import ReminderCard from './ReminderCard';
import NotificationTapListener from './NotificationTapListener';

export default function RemindersClient() {
  const { reminders, loading, permission, markDone, remove, requestPermission, refresh } = useReminders();
  const native = useIsNativePlatform();

  const active = reminders.filter((r) => !r.done);
  const finished = reminders.filter((r) => r.done);

  return (
    <div>
      <NotificationTapListener />

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">我的提醒</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            只存在這台裝置，不會上傳。
          </p>
        </div>
        {reminders.length > 0 && <AddReminderButton title="" source={{ type: 'custom' }} />}
      </div>

      {native && permission === 'denied' && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <BellOff className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-amber-900 dark:text-amber-100">通知權限已關閉</p>
            <p className="mt-1 leading-relaxed text-amber-800 dark:text-amber-200">
              提醒會存著，但不會推播。到「設定 → 應用程式 → 好算 → 通知」打開，回到這裡會自動補排。
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => void refresh()}
            >
              我已開啟，重新檢查
            </Button>
          </div>
        </div>
      )}

      {native && permission === 'prompt' && reminders.length > 0 && (
        <div className="mb-6 flex gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <BellRing className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">開啟通知，截止前才會收到提醒</p>
            <Button type="button" size="sm" className="mt-3" onClick={() => void requestPermission()}>
              開啟通知
            </Button>
          </div>
        </div>
      )}

      {!native && !loading && reminders.length > 0 && (
        <p className="mb-6 text-xs leading-relaxed text-muted-foreground">
          網頁版不會推播。每筆提醒都可以加入 Google 日曆或下載 .ics，由行事曆提醒你；
          裝好算 App 才會在截止前推播。
        </p>
      )}

      {loading ? (
        <ul className="space-y-3" aria-busy="true" aria-label="載入中">
          {[0, 1].map((i) => (
            <li key={i} className="h-28 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </ul>
      ) : reminders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <CalendarClock className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">還沒有提醒</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            在補助詳情頁按「加入提醒」，截止前 30、14、3 天和當天早上 9 點會通知你。
            也可以自己加：繳牌照稅、機車驗車、換濾心。
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/subsidy" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
              去看補助
            </Link>
            <AddReminderButton title="" source={{ type: 'custom' }} variant="primary" className="h-9" />
          </div>
        </div>
      ) : (
        <>
          <section aria-labelledby="reminders-active">
            <h2 id="reminders-active" className="sr-only">
              進行中
            </h2>
            {active.length > 0 ? (
              <ul className="space-y-3">
                {active.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    onToggleDone={markDone}
                    onRemove={remove}
                    showCalendarLinks={!native}
                  />
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                進行中的提醒都完成了
              </p>
            )}
          </section>

          {finished.length > 0 && (
            <section aria-labelledby="reminders-done" className="mt-8">
              <h2 id="reminders-done" className="mb-3 text-sm font-medium text-muted-foreground">
                已完成（{finished.length}）
              </h2>
              <ul className="space-y-3">
                {finished.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    onToggleDone={markDone}
                    onRemove={remove}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
