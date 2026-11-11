/**
 * 本機通知層：把提醒展開成 Capacitor LocalNotifications 的排程，
 * 以及網頁版拿不到推播時的替代出口（Google 日曆連結、.ics 下載）。
 *
 * 這一層不碰提醒資料的儲存，store.ts 每次異動後會呼叫 syncScheduledNotifications。
 */

import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import {
  LocalNotifications,
  type LocalNotificationSchema,
  type PendingLocalNotificationSchema,
} from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import type { Reminder } from './types';
import { MAX_DAYS_BEFORE_COUNT } from './types';
import { addDays, formatDate, splitDate, toCompactDate } from './dates';

/** 寫進每則通知的 extra.module，用來在 getPending 裡認出自己排的 */
export const NOTIFICATION_MODULE = 'reminders';

/** 推播時間：早上 9 點（本地時間） */
export const NOTIFY_HOUR = 9;

/**
 * 上一次排程的通知 id 清單。
 * 另外存一份是因為部分 Android 機型 getPending 回來的資料沒有 extra，
 * 只靠 extra.module 認人會漏掉；漏掉的通知會在提醒刪除後照樣響。
 */
const SCHEDULED_IDS_KEY = 'haoti.reminders.scheduledIds.v1';

export type NotificationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function toPermissionState(display: string): NotificationPermissionState {
  if (display === 'granted') return 'granted';
  if (display === 'denied') return 'denied';
  // 'prompt' 與 'prompt-with-rationale' 對使用者來說都是「還沒問過」
  return 'prompt';
}

export async function getPermissionState(): Promise<NotificationPermissionState> {
  if (!isNativePlatform()) return 'unsupported';
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return toPermissionState(display);
  } catch {
    return 'unsupported';
  }
}

export async function requestPermission(): Promise<NotificationPermissionState> {
  if (!isNativePlatform()) return 'unsupported';
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return toPermissionState(display);
  } catch {
    return 'unsupported';
  }
}

// ── 通知 id ──────────────────────────────────────────────────────────────

/** FNV-1a 32-bit。選它是因為實作短、對 UUID 字串分布夠平均。 */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const ID_BLOCK = MAX_DAYS_BEFORE_COUNT;
/** 2^28 − 1：hash 先壓到這個範圍，乘 8 加索引再加 1 之後最大值 2,147,483,640，仍在 Android 的 32-bit int 內 */
const ID_BLOCK_SPACE = 0x0fffffff;

/**
 * 通知 id = (hash(reminderId) mod 2^28−1) × 8 ＋ 索引 ＋ 1。
 * 同一筆提醒的不同提前天數落在同一個 8 格區塊內，重排時用同一組 id 蓋掉舊的。
 * ＋1 是避免 id 為 0：部分平台把 0 當「沒有 id」。
 */
export function notificationId(reminderId: string, index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= ID_BLOCK) {
    throw new RangeError(`daysBefore 索引要在 0 到 ${ID_BLOCK - 1} 之間，收到 ${index}`);
  }
  const block = fnv1a32(reminderId) % ID_BLOCK_SPACE;
  return block * ID_BLOCK + index + 1;
}

// ── 通知內容 ────────────────────────────────────────────────────────────

export function notificationTitle(title: string, daysBefore: number): string {
  if (daysBefore === 0) return `今天截止：${title}`;
  if (daysBefore === 1) return `明天截止：${title}`;
  return `${title} ${daysBefore} 天後截止`;
}

export function notificationBody(reminder: Pick<Reminder, 'note' | 'targetDate'>): string {
  const deadline = `期限 ${formatDate(reminder.targetDate)}`;
  return reminder.note ? `${reminder.note}・${deadline}` : deadline;
}

/** 提醒 × 提前天數 → 該則通知的本地觸發時間（09:00） */
export function notificationFireAt(targetDate: string, daysBefore: number): Date | null {
  const p = splitDate(targetDate);
  if (!p) return null;
  return new Date(p.y, p.m - 1, p.d - daysBefore, NOTIFY_HOUR, 0, 0, 0);
}

/**
 * 純函式：把未完成提醒展開成要排的通知。已過去的時間點不排。
 * 抽出來是為了測試不用碰 Capacitor。
 */
export function planNotifications(reminders: Reminder[], now: Date = new Date()): LocalNotificationSchema[] {
  const out: LocalNotificationSchema[] = [];
  for (const reminder of reminders) {
    if (reminder.done) continue;
    reminder.daysBefore.slice(0, ID_BLOCK).forEach((days, index) => {
      const fireAt = notificationFireAt(reminder.targetDate, days);
      if (!fireAt || fireAt.getTime() <= now.getTime()) return;
      out.push({
        id: notificationId(reminder.id, index),
        title: notificationTitle(reminder.title, days),
        body: notificationBody(reminder),
        schedule: { at: fireAt, allowWhileIdle: true },
        // 不用精確鬧鐘：Play 政策對 SCHEDULE_EXACT_ALARM 有審查，提醒差幾分鐘沒差
        isExactNotification: false,
        autoCancel: true,
        extra: {
          module: NOTIFICATION_MODULE,
          reminderId: reminder.id,
          url: reminder.url,
          daysBefore: days,
        },
      });
    });
  }
  return out;
}

// ── 排程 ────────────────────────────────────────────────────────────────

async function readScheduledIds(): Promise<number[]> {
  try {
    const { value } = await Preferences.get({ key: SCHEDULED_IDS_KEY });
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

async function writeScheduledIds(ids: number[]): Promise<void> {
  try {
    await Preferences.set({ key: SCHEDULED_IDS_KEY, value: JSON.stringify(ids) });
  } catch {
    // 存不進去只會讓下次多取消幾個不存在的 id，不影響功能
  }
}

function isOurs(notification: PendingLocalNotificationSchema): boolean {
  const extra = notification.extra as { module?: unknown } | undefined;
  return extra?.module === NOTIFICATION_MODULE;
}

export interface SyncResult {
  scheduled: number;
  cancelled: number;
  /** 為什麼沒排：web 沒有本機通知；permission 是權限不是 granted */
  skipped: 'web' | 'permission' | null;
}

/**
 * 以目前所有提醒為準，重排本模組的全部通知：
 * 先取消上次排的（ledger ∪ getPending 裡 extra.module 是我們的），再整批 schedule。
 * 全部重排而不是比對差異，是因為差異比對的 bug 會變成「刪掉的提醒還在響」，重排不會。
 */
export async function syncScheduledNotifications(reminders: Reminder[]): Promise<SyncResult> {
  if (!isNativePlatform()) return { scheduled: 0, cancelled: 0, skipped: 'web' };
  try {
    const [pending, ledger] = await Promise.all([LocalNotifications.getPending(), readScheduledIds()]);
    const toCancel = new Set<number>(ledger);
    for (const n of pending.notifications) {
      if (isOurs(n)) toCancel.add(n.id);
    }
    if (toCancel.size > 0) {
      await LocalNotifications.cancel({ notifications: [...toCancel].map((id) => ({ id })) });
    }

    // 權限不是 granted 就不排：8.3 之後 schedule() 會自己跳權限視窗，
    // 在 app 一開啟就跳出來會嚇到人，要問應該由畫面上的按鈕來問。
    const permission = await getPermissionState();
    if (permission !== 'granted') {
      await writeScheduledIds([]);
      return { scheduled: 0, cancelled: toCancel.size, skipped: 'permission' };
    }

    const plan = planNotifications(reminders);
    if (plan.length > 0) {
      await LocalNotifications.schedule({ notifications: plan });
    }
    await writeScheduledIds(plan.map((n) => n.id));
    return { scheduled: plan.length, cancelled: toCancel.size, skipped: null };
  } catch (err) {
    console.warn('[reminders] 通知排程失敗', err);
    return { scheduled: 0, cancelled: 0, skipped: null };
  }
}

// ── 點擊通知 ─────────────────────────────────────────────────────────────

type Navigate = (url: string) => void;

/**
 * 可能同時有多個元件註冊（layout 一個、提醒頁一個），
 * 但 plugin 監聽器只掛一個，點擊時只叫最後註冊的那個，避免導頁兩次。
 */
const navigators: Navigate[] = [];
let listenerHandle: Promise<PluginListenerHandle> | null = null;

export function initNotificationTapHandler(navigate: Navigate): () => void {
  if (!isNativePlatform()) return () => {};
  navigators.push(navigate);

  if (!listenerHandle) {
    const handle = LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const extra = action.notification?.extra as { module?: unknown; url?: unknown } | undefined;
      if (extra?.module !== NOTIFICATION_MODULE) return;
      if (typeof extra.url !== 'string' || !extra.url) return;
      const current = navigators[navigators.length - 1];
      current?.(extra.url);
    });
    listenerHandle = handle;
    handle.catch(() => {
      if (listenerHandle === handle) listenerHandle = null;
    });
  }

  return () => {
    const index = navigators.lastIndexOf(navigate);
    if (index >= 0) navigators.splice(index, 1);
    if (navigators.length === 0 && listenerHandle) {
      const handle = listenerHandle;
      listenerHandle = null;
      handle.then((h) => h.remove()).catch(() => {});
    }
  };
}

// ── 網頁版替代出口 ────────────────────────────────────────────────────────

/** 站內路徑補上目前網域，放進行事曆的連結才點得開 */
export function absoluteUrl(url: string | undefined, origin?: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  const base = origin ?? (typeof window !== 'undefined' ? window.location?.origin : undefined);
  return base ? `${base}${url}` : url;
}

export function googleCalendarUrl(reminder: Reminder, origin?: string): string {
  const start = toCompactDate(reminder.targetDate);
  // 全天事件的結束日不含當天，所以要 +1
  const end = toCompactDate(addDays(reminder.targetDate, 1));
  const details = [reminder.note, absoluteUrl(reminder.url, origin)].filter(Boolean).join('\n');
  const params = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(reminder.title)}`,
    `dates=${start}/${end}`,
  ];
  if (details) params.push(`details=${encodeURIComponent(details)}`);
  if (reminder.repeatYearly) params.push(`recur=${encodeURIComponent('RRULE:FREQ=YEARLY')}`);
  return `https://calendar.google.com/calendar/render?${params.join('&')}`;
}

function icsEscape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function utf8Length(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  if (code < 0x80) return 1;
  if (code < 0x800) return 2;
  if (code < 0x10000) return 3;
  return 4;
}

/**
 * RFC 5545 每行最多 75 個 byte，續行開頭放一個空白。
 * 用 byte 數而不是字數切，因為中文一個字佔 3 byte，照字數切會超過。
 */
export function foldIcsLine(line: string): string {
  const MAX = 75;
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  let limit = MAX;
  for (const ch of line) {
    const len = utf8Length(ch);
    if (bytes + len > limit) {
      parts.push(current);
      current = ' ';
      bytes = 1;
      limit = MAX;
    }
    current += ch;
    bytes += len;
  }
  parts.push(current);
  return parts.join('\r\n');
}

function icsTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * 產生單一全天事件的 .ics，每個提前天數各一個 VALARM（TRIGGER:-P{n}D）。
 * 第一個 VALARM 對應 daysBefore 的第一個值。
 */
export function buildIcs(reminder: Reminder, now: Date = new Date(), origin?: string): string {
  const start = toCompactDate(reminder.targetDate);
  const end = toCompactDate(addDays(reminder.targetDate, 1));
  const url = absoluteUrl(reminder.url, origin);
  const description = [reminder.note, url].filter(Boolean).join('\n');

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HaoSuan//Reminders//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${reminder.id}@haosuan.reminders`,
    `DTSTAMP:${icsTimestamp(now)}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${icsEscape(reminder.title)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`);
  if (url && /^https?:\/\//i.test(url)) lines.push(`URL:${url}`);
  if (reminder.repeatYearly) lines.push('RRULE:FREQ=YEARLY');

  for (const days of reminder.daysBefore) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsEscape(notificationTitle(reminder.title, days))}`,
      `TRIGGER:-P${days}D`,
      'END:VALARM',
    );
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

function safeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim().slice(0, 60);
}

/** 瀏覽器端觸發 .ics 下載；SSR 或沒有 Blob 的環境什麼都不做。 */
export function downloadIcs(reminder: Reminder): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    const blob = new Blob([buildIcs(reminder)], { type: 'text/calendar;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `${safeFilename(reminder.title) || 'reminder'}.ics`;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Safari 在 click 回傳後才開始讀 blob，馬上 revoke 會下載到空檔
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  } catch (err) {
    console.warn('[reminders] .ics 下載失敗', err);
  }
}
