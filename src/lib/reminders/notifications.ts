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
import { addDays, addYears, formatDate, nextYearlyOccurrence, splitDate, toCompactDate, todayLocal } from './dates';
import { resolveSubsidyPath } from '../subsidy/paths';

/** 寫進每則通知的 extra.module，用來在 getPending 裡認出自己排的 */
export const NOTIFICATION_MODULE = 'reminders';

/** 推播時間：早上 9 點（本地時間） */
export const NOTIFY_HOUR = 9;

/**
 * 一次最多排幾則。Android 的 AlarmManager 對每個 app 有 500 個鬧鐘的上限，超過會丟例外。
 * 超過這個數字時只排最早要響的那些；之後每次開 app 重排，後面的會遞補上來。
 */
export const MAX_SCHEDULED = 400;

/**
 * 上一次排程的通知 id 清單。
 * 另外存一份是因為部分 Android 機型 getPending 回來的資料沒有 extra，
 * 只靠 extra.module 認人會漏掉；漏掉的通知會在提醒刪除後照樣響。
 */
const SCHEDULED_KEY = 'haoti.reminders.scheduled.v2';
/** 舊版帳本只有 id 清單。讀進來是為了把舊版排的通知取消乾淨，寫過新帳本之後就刪掉 */
const LEGACY_SCHEDULED_IDS_KEY = 'haoti.reminders.scheduledIds.v1';

/**
 * 最近處理過的通知點擊（id@觸發時間），用來擋掉系統重送的同一則。
 * 要記好幾筆：重送的是「當初用來冷啟動 app 的那一則」，中間使用者可能又點過別的通知，只記最後一筆擋不住。
 */
const RECENT_TAPS_KEY = 'haoti.reminders.recentTaps.v1';
const TAP_HISTORY_SIZE = 50;

/**
 * 剛到觸發時間的通知，重排時保留多久不取消（毫秒）。
 * 鬧鐘是非精確的，09:00 的通知系統可能晚幾分鐘才送。使用者剛好在這段時間開 app 的話，
 * 「全部取消、只排未來的」會把還沒送出的那一則取消掉，而它的時間已過、不會再排，這則通知就不見了。
 */
export const DELIVERY_GRACE_MS = 2 * 60 * 60 * 1000;

/** 沒有連結的提醒（自訂提醒）點通知後去哪裡：提醒清單，至少看得到是哪一筆 */
const FALLBACK_TAP_URL = '/reminders';

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

/** 一筆提醒一輪最多幾則通知 */
const MAX_PER_CYCLE = MAX_DAYS_BEFORE_COUNT;
/** 2^31 − 2：id 落在 1 到 2,147,483,646。Android 的通知 id 是 32-bit 有號整數；不用 0，部分平台把 0 當「沒有 id」 */
const ID_SPACE = 0x7ffffffe;

/**
 * 通知 id 由（提醒 id、那一輪期限的年份、提前天數）決定。
 *
 * - 帶年份：原生端 schedule() 會先把通知欄裡同 id 的通知收掉。每年提醒推到下一年時，如果下一輪沿用同一組 id，
 *   剛響過還留在通知欄的那幾則會被收走。
 * - 用提前天數，不用它在清單裡排第幾個：使用者加選「前 7 天」之後，原本各則的位置都往後移一格，
 *   id 跟著位置走的話，同一個 id 會從「前 3 天」變成「當天」，重排時就分不出原生端那一則是誰。
 */
export function notificationId(reminderId: string, targetDate: string, daysBefore: number): number {
  return (fnv1a32(`${reminderId}:${targetDate.slice(0, 4)}:${daysBefore}`) % ID_SPACE) + 1;
}

// ── 通知內容 ────────────────────────────────────────────────────────────

/**
 * planned＝使用者自己挑的辦理日。寫「截止」會讓人以為那天一過就不能申請，所以改寫「要辦」。
 */
export function notificationTitle(title: string, daysBefore: number, planned = false): string {
  if (planned) {
    if (daysBefore === 0) return `今天要辦：${title}`;
    if (daysBefore === 1) return `明天要辦：${title}`;
    return `${daysBefore} 天後要辦：${title}`;
  }
  if (daysBefore === 0) return `今天截止：${title}`;
  if (daysBefore === 1) return `明天截止：${title}`;
  return `${title} ${daysBefore} 天後截止`;
}

export function notificationBody(reminder: Pick<Reminder, 'note' | 'targetDate' | 'planned'>): string {
  // 日期放最前面：收合的通知只顯示一行，日期要落在那一行裡
  const deadline = `${reminder.planned ? '預定' : '期限'} ${formatDate(reminder.targetDate)}`;
  return reminder.note ? `${deadline}・${reminder.note}` : deadline;
}

/** 提醒 × 提前天數 → 該則通知的本地觸發時間（09:00） */
export function notificationFireAt(targetDate: string, daysBefore: number): Date | null {
  const p = splitDate(targetDate);
  if (!p) return null;
  return new Date(p.y, p.m - 1, p.d - daysBefore, NOTIFY_HOUR, 0, 0, 0);
}

/** 這個提前天數的通知時間是不是還沒到 */
export function isUpcomingFireTime(targetDate: string, daysBefore: number, now: Date = new Date()): boolean {
  const fireAt = notificationFireAt(targetDate, daysBefore);
  return !!fireAt && fireAt.getTime() > now.getTime();
}

/** 這組日期與提前天數實際排得出幾則通知（時間已過的不算）。加入提醒前用來檢查，免得存了一筆永遠不會響的提醒 */
export function countUpcomingNotifications(targetDate: string, daysBefore: number[], now: Date = new Date()): number {
  return daysBefore.slice(0, MAX_PER_CYCLE).filter((days) => isUpcomingFireTime(targetDate, days, now)).length;
}

/** 加入提醒面板上的提前天數選項；0 = 當天 */
export const DAY_OPTIONS: readonly number[] = [30, 14, 7, 3, 1, 0];

/**
 * 面板預設勾哪些提前天數。只留通知時間還沒到的：
 * 期限剩 2 天時預設的「前 30、14、3 天」全部已經過了，照勾的話這一期一則通知都排不出來。
 * 全部都過了就改勾最接近期限、還來得及的那一個。
 *
 * 每年重複的提醒保留全部預設值（明年那一輪用得到），這一期一個都來不及時再補上還來得及的那一個。
 */
export function pickDefaultDaysBefore(
  defaults: readonly number[],
  targetDate: string | undefined,
  yearly: boolean,
  now: Date = new Date(),
): number[] {
  if (!targetDate) return [...defaults];
  // 每年重複且今年已過：存檔時會排到下一次，用那個日期算
  const effective = yearly ? nextYearlyOccurrence(targetDate, todayLocal(now)) : targetDate;
  const upcoming = defaults.filter((days) => isUpcomingFireTime(effective, days, now));
  if (upcoming.length > 0) return yearly ? [...defaults] : upcoming;
  const fallback = DAY_OPTIONS.find((days) => isUpcomingFireTime(effective, days, now));
  if (fallback === undefined) return [...defaults];
  return yearly ? [...defaults, fallback] : [fallback];
}

/** 把一筆提醒在某個期限日的那一輪通知加進 out */
function pushCycle(out: LocalNotificationSchema[], reminder: Reminder, targetDate: string, now: Date): void {
  reminder.daysBefore.slice(0, MAX_PER_CYCLE).forEach((days) => {
    const fireAt = notificationFireAt(targetDate, days);
    if (!fireAt || fireAt.getTime() <= now.getTime()) return;
    out.push({
      id: notificationId(reminder.id, targetDate, days),
      title: notificationTitle(reminder.title, days, reminder.planned),
      body: notificationBody({ note: reminder.note, targetDate, planned: reminder.planned }),
      schedule: { at: fireAt, allowWhileIdle: true },
      // 不用精確鬧鐘：Play 政策對 SCHEDULE_EXACT_ALARM 有審查，提醒差幾分鐘沒差
      isExactNotification: false,
      autoCancel: true,
      extra: {
        module: NOTIFICATION_MODULE,
        reminderId: reminder.id,
        url: reminder.url ?? FALLBACK_TAP_URL,
        daysBefore: days,
      },
    });
  });
}

/**
 * 純函式：把提醒展開成要排的通知。已過去的時間點不排。
 * 抽出來是為了測試不用碰 Capacitor。
 *
 * 每年重複的提醒多排一輪「明年同一天」：只排這一輪的話，明年的通知要等期限過後使用者再開一次 app
 * 才會排，報稅這種一年才開一次 app 的用法，隔年會整輪收不到。已打勾完成的每年提醒也照排明年那一輪。
 */
export function planNotifications(reminders: Reminder[], now: Date = new Date()): LocalNotificationSchema[] {
  const out: LocalNotificationSchema[] = [];
  for (const reminder of reminders) {
    if (!reminder.done) pushCycle(out, reminder, reminder.targetDate, now);
    if (reminder.repeatYearly) pushCycle(out, reminder, addYears(reminder.targetDate, 1), now);
  }
  if (out.length <= MAX_SCHEDULED) return out;
  const fireTime = (n: LocalNotificationSchema) => (n.schedule?.at instanceof Date ? n.schedule.at.getTime() : 0);
  return [...out].sort((a, b) => fireTime(a) - fireTime(b)).slice(0, MAX_SCHEDULED);
}

/** 原生端的一則通知：id 加上它排定的觸發時間（毫秒）。at 為 null 表示不知道（舊版帳本、getPending 沒帶時間） */
export interface ScheduledEntry {
  id: number;
  at: number | null;
}

/**
 * 觸發時間剛過、系統可能還沒送出的通知：未完成的提醒在過去 DELIVERY_GRACE_MS 內該響的那幾則。
 * 已完成或已刪除的提醒不在裡面，那些要照常取消（剛打勾的提醒不該再響）。
 */
export function recentlyDue(reminders: Reminder[], now: Date = new Date()): ScheduledEntry[] {
  const out: ScheduledEntry[] = [];
  for (const reminder of reminders) {
    if (reminder.done) continue;
    for (const days of reminder.daysBefore.slice(0, MAX_PER_CYCLE)) {
      const fireAt = notificationFireAt(reminder.targetDate, days);
      if (!fireAt) continue;
      const age = now.getTime() - fireAt.getTime();
      if (age >= 0 && age < DELIVERY_GRACE_MS) {
        out.push({ id: notificationId(reminder.id, reminder.targetDate, days), at: fireAt.getTime() });
      }
    }
  }
  return out;
}

export interface SyncPlan {
  cancel: number[];
  schedule: LocalNotificationSchema[];
  /** 這次重排之後原生端還留著、下次要能取消的全部通知 */
  ledger: ScheduledEntry[];
}

/**
 * 純函式：決定這次重排要取消哪些、排哪些、帳本記哪些。
 * known 是原生端目前可能還有的通知（上次的帳本 ∪ getPending 裡認得出是我們的）。
 *
 * 剛到期的那幾則只有在「id 相同、而且原生端排的就是同一個觸發時間」時才保留。
 * 只比對 id 不夠：使用者把期限改了幾天，同一個 id 在原生端排的還是舊日期的那一則，保留它等於留下一則期限已經改掉的舊通知。
 */
export function planSync(reminders: Reminder[], known: ScheduledEntry[], granted: boolean, now: Date = new Date()): SyncPlan {
  const knownIds = [...new Set(known.map((entry) => entry.id))];
  if (!granted) return { cancel: knownIds, schedule: [], ledger: [] };

  const due = new Map(recentlyDue(reminders, now).map((entry) => [entry.id, entry.at]));
  const kept = new Map<number, ScheduledEntry>();
  for (const entry of known) {
    if (entry.at !== null && due.get(entry.id) === entry.at) kept.set(entry.id, entry);
  }

  const schedule = planNotifications(reminders, now);
  const ledger = new Map<number, ScheduledEntry>(kept);
  for (const n of schedule) {
    ledger.set(n.id, { id: n.id, at: n.schedule?.at instanceof Date ? n.schedule.at.getTime() : null });
  }
  return {
    cancel: knownIds.filter((id) => !kept.has(id)),
    schedule,
    ledger: [...ledger.values()],
  };
}

/**
 * 純函式：提醒異動之後，哪些「已經響過」的通知不該再留在通知欄。
 *
 * 外掛的 cancel() 只取消還沒響的鬧鐘，不會收掉已經送到通知欄的通知。使用者把提醒打勾完成、刪掉、
 * 改了期限或取消某個提前天數之後，通知欄那一則如果還掛著，寫的是舊狀態（「驗車 5 天後截止・期限 11/20」，
 * 而期限已經改成 11/18）。這裡比對異動前後：異動前該響過、異動後不再成立的那幾則要收掉。
 * 提醒本身沒變的（只是別筆提醒有異動）不會被動到。
 */
export function staleDeliveredIds(before: Reminder[], after: Reminder[], now: Date = new Date()): number[] {
  const stillValid = new Set<string>();
  for (const reminder of after) {
    if (reminder.done) continue;
    for (const days of reminder.daysBefore.slice(0, MAX_PER_CYCLE)) {
      const fireAt = notificationFireAt(reminder.targetDate, days);
      if (fireAt) stillValid.add(`${notificationId(reminder.id, reminder.targetDate, days)}@${fireAt.getTime()}`);
    }
  }
  const out = new Set<number>();
  for (const reminder of before) {
    if (reminder.done) continue;
    for (const days of reminder.daysBefore.slice(0, MAX_PER_CYCLE)) {
      const fireAt = notificationFireAt(reminder.targetDate, days);
      // 還沒到觸發時間的不在通知欄裡，那些由 planSync 的 cancel 處理
      if (!fireAt || fireAt.getTime() > now.getTime()) continue;
      const id = notificationId(reminder.id, reminder.targetDate, days);
      if (!stillValid.has(`${id}@${fireAt.getTime()}`)) out.add(id);
    }
  }
  return [...out];
}

/** 把通知欄裡指定 id 的通知收掉。失敗不影響其他流程（頂多舊通知多留一下） */
export async function dismissDelivered(ids: number[]): Promise<void> {
  if (!isNativePlatform() || ids.length === 0) return;
  try {
    // Android 端只讀 id；title、body 是型別要求的欄位
    await LocalNotifications.removeDeliveredNotifications({
      notifications: ids.map((id) => ({ id, title: '', body: '' })),
    });
  } catch (err) {
    console.warn('[reminders] 收掉舊通知失敗', err);
  }
}

// ── 排程 ────────────────────────────────────────────────────────────────

async function readJson(key: string): Promise<unknown> {
  try {
    const { value } = await Preferences.get({ key });
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

/** 讀帳本：新格式是 [{ id, at }]；舊版只有 id 清單，一併讀進來（at 不知道），才取消得到舊版排的通知 */
async function readLedger(): Promise<ScheduledEntry[]> {
  const [current, legacy] = await Promise.all([readJson(SCHEDULED_KEY), readJson(LEGACY_SCHEDULED_IDS_KEY)]);
  const out: ScheduledEntry[] = [];
  if (Array.isArray(current)) {
    for (const item of current as Array<{ id?: unknown; at?: unknown }>) {
      if (item && Number.isInteger(item.id)) {
        out.push({ id: item.id as number, at: typeof item.at === 'number' && Number.isFinite(item.at) ? item.at : null });
      }
    }
  }
  if (Array.isArray(legacy)) {
    for (const id of legacy) if (Number.isInteger(id)) out.push({ id: id as number, at: null });
  }
  return out;
}

async function writeLedger(entries: ScheduledEntry[]): Promise<void> {
  try {
    await Preferences.set({ key: SCHEDULED_KEY, value: JSON.stringify(entries) });
    await Preferences.remove({ key: LEGACY_SCHEDULED_IDS_KEY });
  } catch {
    // 存不進去只會讓下次多取消幾個不存在的 id，不影響功能
  }
}

/** getPending 回來的 schedule.at 可能是 ISO 字串或 Date；讀不出來回 null */
function pendingFireTime(notification: PendingLocalNotificationSchema): number | null {
  const at = (notification.schedule as { at?: unknown } | undefined)?.at;
  if (at instanceof Date) return at.getTime();
  if (typeof at === 'string' || typeof at === 'number') {
    const time = new Date(at).getTime();
    return Number.isFinite(time) ? time : null;
  }
  return null;
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

/** 排隊中的重排；見 syncScheduledNotifications 的說明 */
let syncQueue: Promise<unknown> = Promise.resolve();

/**
 * 以目前所有提醒為準，重排本模組的全部通知：
 * 先取消上次排的（ledger ∪ getPending 裡 extra.module 是我們的），再整批 schedule。
 * 全部重排而不是比對差異，是因為差異比對的 bug 會變成「刪掉的提醒還在響」，重排不會。
 * 唯一不取消的是觸發時間剛過、提醒仍然有效的那幾則（見 DELIVERY_GRACE_MS）。
 *
 * 多次呼叫會照呼叫順序一個一個跑。啟動時的重排和使用者刪除提醒觸發的重排如果交錯執行，
 * 先開始的那次可能在後面才 schedule，把剛刪掉的提醒又排回去；排隊之後最後生效的一定是最新的清單。
 */
export function syncScheduledNotifications(reminders: Reminder[]): Promise<SyncResult> {
  const run = syncQueue.then(() => runSync(reminders));
  // runSync 自己接住所有例外；這裡再接一次只是保證佇列不會因為意外的 rejection 卡住
  syncQueue = run.catch(() => undefined);
  return run;
}

async function runSync(reminders: Reminder[]): Promise<SyncResult> {
  if (!isNativePlatform()) return { scheduled: 0, cancelled: 0, skipped: 'web' };
  try {
    const [pending, ledger] = await Promise.all([LocalNotifications.getPending(), readLedger()]);
    // 帳本記的觸發時間優先；帳本沒有的（帳本寫入失敗、舊版排的）才用 getPending 回來的時間
    const known = new Map<number, ScheduledEntry>();
    for (const n of pending.notifications) {
      if (isOurs(n)) known.set(n.id, { id: n.id, at: pendingFireTime(n) });
    }
    for (const entry of ledger) {
      if (entry.at !== null || !known.has(entry.id)) known.set(entry.id, entry);
    }

    // 權限不是 granted 就不排：8.3 之後 schedule() 會自己跳權限視窗，
    // 在 app 一開啟就跳出來會嚇到人，要問應該由畫面上的按鈕來問。
    const granted = (await getPermissionState()) === 'granted';
    const plan = planSync(reminders, [...known.values()], granted);

    if (plan.cancel.length > 0) {
      await LocalNotifications.cancel({ notifications: plan.cancel.map((id) => ({ id })) });
    }
    if (plan.schedule.length > 0) {
      await LocalNotifications.schedule({ notifications: plan.schedule });
    }
    await writeLedger(plan.ledger);
    return { scheduled: plan.schedule.length, cancelled: plan.cancel.length, skipped: granted ? null : 'permission' };
  } catch (err) {
    console.warn('[reminders] 通知排程失敗', err);
    return { scheduled: 0, cancelled: 0, skipped: null };
  }
}

// ── 點擊通知 ─────────────────────────────────────────────────────────────

type Navigate = (url: string) => void;

/** 讀出最近處理過的點擊；存的東西壞掉就當成沒有 */
function parseTapHistory(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * 可能同時有多個元件註冊，但 plugin 監聽器只掛一個，點擊時只叫最後註冊的那個，避免導頁兩次。
 * 站內路徑在這裡統一轉過（已下架的補助頁改到補助列表），每個註冊的人拿到的都是能開的路徑。
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
      const url = typeof extra.url === 'string' && extra.url ? extra.url : FALLBACK_TAP_URL;
      const at = (action.notification?.schedule as { at?: unknown } | undefined)?.at;
      const tapKey = `${action.notification?.id}@${typeof at === 'string' ? at : ''}`;
      void (async () => {
        // 用點通知冷啟動之後，Activity 被系統回收再重建時會帶著同一個 Intent，外掛會把同一次點擊再送一遍；
        // 不擋的話使用者隔天從桌面回到 app，又被帶去昨天那則通知的頁面
        try {
          const { value } = await Preferences.get({ key: RECENT_TAPS_KEY });
          const seen = parseTapHistory(value);
          if (seen.includes(tapKey)) return;
          await Preferences.set({ key: RECENT_TAPS_KEY, value: JSON.stringify([...seen, tapKey].slice(-TAP_HISTORY_SIZE)) });
        } catch {
          // 讀寫失敗就當成沒處理過，寧可多導一次也不要點了沒反應
        }
        const current = navigators[navigators.length - 1];
        current?.(/^https?:\/\//i.test(url) ? url : resolveSubsidyPath(url));
      })();
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
      `DESCRIPTION:${icsEscape(notificationTitle(reminder.title, days, reminder.planned))}`,
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
