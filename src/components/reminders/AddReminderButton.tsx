'use client';

import { useEffect, useId, useState } from 'react';
import { Bell, BellRing, CalendarPlus, Check, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useReminders } from '@/lib/reminders/useReminders';
import { useIsNativePlatform } from '@/lib/reminders/useIsNativePlatform';
import { daysUntil, formatDate, todayLocal } from '@/lib/reminders/dates';
import { DEFAULT_DAYS_BEFORE, type Reminder, type ReminderSource } from '@/lib/reminders/types';
import { downloadIcs, googleCalendarUrl, isNativePlatform } from '@/lib/reminders/notifications';

/** 面板上的提前天數選項；0 = 當天 */
const DAY_OPTIONS = [30, 14, 7, 3, 1, 0] as const;

export interface AddReminderButtonProps {
  title: string;
  /** YYYY-MM-DD；沒給就讓使用者在面板上選 */
  targetDate?: string;
  url?: string;
  note?: string;
  source: ReminderSource;
  defaultDaysBefore?: number[];
  repeatYearly?: boolean;
  className?: string;
  variant?: 'primary' | 'ghost';
}

function dayOptionLabel(days: number): string {
  if (days === 0) return '當天';
  return `前 ${days} 天`;
}

async function vibrateSuccess(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    // 動態載入：網頁版不需要這個 plugin 的程式碼
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // 沒有震動馬達或 plugin 沒裝，不影響加入提醒
  }
}

export default function AddReminderButton({
  title,
  targetDate,
  url,
  note,
  source,
  defaultDaysBefore,
  repeatYearly = false,
  className,
  variant = 'primary',
}: AddReminderButtonProps) {
  const { reminders, add, permission, requestPermission } = useReminders();
  const native = useIsNativePlatform();
  const headingId = useId();
  const titleInputId = useId();
  const dateInputId = useId();
  const noteInputId = useId();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [titleValue, setTitleValue] = useState(title);
  const [noteValue, setNoteValue] = useState(note ?? '');
  const [dateValue, setDateValue] = useState(targetDate ?? '');
  const [selectedDays, setSelectedDays] = useState<number[]>(defaultDaysBefore ?? [...DEFAULT_DAYS_BEFORE]);
  const [yearly, setYearly] = useState(repeatYearly);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Reminder | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const isCustom = source.type === 'custom';
  // 同一個補助已經在清單裡（且還沒完成）：按鈕改顯示狀態，再按會更新那一筆而不是新增
  const existing =
    source.type === 'subsidy'
      ? reminders.find((r) => r.source.type === 'subsidy' && r.source.id === source.id && !r.done)
      : undefined;

  // 面板開著時鎖住背景捲動、Esc 關閉
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openSheet = () => {
    // 每次打開都從 props 重設，避免上次沒送出的輸入殘留
    setTitleValue(title);
    setNoteValue(note ?? '');
    setDateValue(targetDate ?? '');
    setSelectedDays(existing?.daysBefore ?? defaultDaysBefore ?? [...DEFAULT_DAYS_BEFORE]);
    setYearly(existing?.repeatYearly ?? repeatYearly);
    setError(null);
    setSaved(null);
    setStep('form');
    setOpen(true);
  };

  const toggleDay = (days: number) => {
    setSelectedDays((current) =>
      current.includes(days) ? current.filter((d) => d !== days) : [...current, days],
    );
  };

  const handleConfirm = async () => {
    const trimmedTitle = titleValue.trim();
    if (!trimmedTitle) {
      setError('請輸入要提醒的事');
      return;
    }
    if (!dateValue) {
      setError('請選擇截止日期');
      return;
    }
    if (!yearly && daysUntil(dateValue) < 0) {
      setError('這個日期已經過了，請選今天或之後');
      return;
    }
    if (selectedDays.length === 0) {
      setError('至少選一個提醒時間');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      let permissionNow = permission;
      if (native && permissionNow === 'prompt') {
        permissionNow = await requestPermission();
      }
      const reminder = await add({
        title: trimmedTitle,
        note: noteValue,
        targetDate: dateValue,
        daysBefore: selectedDays,
        url,
        source,
        repeatYearly: yearly,
      });
      await vibrateSuccess();

      if (native) {
        setOpen(false);
        setToast(
          permissionNow === 'granted' ? '已加入提醒' : '已加入提醒，但通知權限沒開，不會推播',
        );
      } else {
        // 網頁版沒有推播，留在面板上給行事曆連結，關掉就看不到了
        setSaved(reminder);
        setStep('done');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗，請再試一次');
    } finally {
      setSaving(false);
    }
  };

  const previewDays = dateValue ? daysUntil(dateValue) : null;

  return (
    <>
      <Button
        type="button"
        variant={variant === 'ghost' ? 'ghost' : 'default'}
        className={className}
        onClick={openSheet}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {existing ? <BellRing /> : <Bell />}
        {existing ? '已加入提醒' : '加入提醒'}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="關閉"
            className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl ring-1 ring-foreground/10 animate-in slide-in-from-bottom duration-200 sm:rounded-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id={headingId} className="text-lg font-semibold">
                {step === 'done' ? '已加入提醒' : existing ? '更新提醒' : '加入提醒'}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="關閉"
                className="-m-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {step === 'form' ? (
              <div className="space-y-5">
                {isCustom ? (
                  <div className="space-y-2">
                    <Label htmlFor={titleInputId}>提醒什麼</Label>
                    <Input
                      id={titleInputId}
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      placeholder="例如：繳牌照稅、機車驗車、換濾心"
                      maxLength={80}
                      autoFocus
                    />
                  </div>
                ) : (
                  <p className="text-base font-medium leading-snug">{title}</p>
                )}

                <div className="space-y-2">
                  <Label htmlFor={dateInputId}>截止日期</Label>
                  <Input
                    id={dateInputId}
                    type="date"
                    value={dateValue}
                    onChange={(e) => setDateValue(e.target.value)}
                    min={yearly ? undefined : todayLocal()}
                    required
                  />
                  {previewDays !== null && dateValue && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(dateValue)}・
                      {previewDays < 0
                        ? yearly
                          ? '今年已過，會排到明年'
                          : '已經過了'
                        : previewDays === 0
                          ? '就是今天'
                          : `距今 ${previewDays} 天`}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>什麼時候提醒（早上 9 點）</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAY_OPTIONS.map((days) => {
                      const active = selectedDays.includes(days);
                      return (
                        <button
                          key={days}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleDay(days)}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-sm transition-colors',
                            active
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground',
                          )}
                        >
                          {dayOptionLabel(days)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={yearly}
                    onChange={(e) => setYearly(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                  <span>
                    每年重複
                    <span className="block text-xs text-muted-foreground">
                      報稅、牌照稅這類固定日期：過期後自動排到明年
                    </span>
                  </span>
                </label>

                {isCustom && (
                  <div className="space-y-2">
                    <Label htmlFor={noteInputId}>備註（選填）</Label>
                    <Input
                      id={noteInputId}
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                      placeholder="例如：帶行照、要先上網預約"
                      maxLength={120}
                    />
                  </div>
                )}

                {!native && (
                  <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    網頁版不會推播。加入後可以放進 Google 日曆或下載 .ics，由行事曆提醒你。
                  </p>
                )}
                {native && permission === 'denied' && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    通知權限已關閉，加入後不會推播。到系統設定打開通知，回到 app 會自動補排。
                  </p>
                )}

                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="button" size="lg" className="w-full" onClick={handleConfirm} disabled={saving}>
                  {saving ? '儲存中…' : existing ? '更新提醒' : '確認加入'}
                </Button>
              </div>
            ) : (
              saved && (
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{saved.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        期限 {formatDate(saved.targetDate)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    網頁版不會推播，放進行事曆才會提醒你：
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <a
                      href={googleCalendarUrl(saved)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      <CalendarPlus className="size-4" />
                      加入 Google 日曆
                    </a>
                    <button
                      type="button"
                      onClick={() => downloadIcs(saved)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      <Download className="size-4" />
                      下載 .ics
                    </button>
                  </div>
                  <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(false)}>
                    完成
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4"
        >
          <div className="rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
