/**
 * 提醒資料層：JSON 存在 @capacitor/preferences（原生是 SharedPreferences / UserDefaults，
 * 網頁是 localStorage）。不需要登入、不上傳，資料只在這台裝置。
 *
 * 每次新增 / 更新 / 刪除 / 標記完成都會：寫入 → 重排通知 → 通知訂閱者。
 */

import { Preferences } from '@capacitor/preferences';
import type { NewReminderInput, Reminder, ReminderPatch, ReminderSource } from './types';
import { DEFAULT_DAYS_BEFORE, MAX_DAYS_BEFORE_COUNT } from './types';
import { daysUntil, isDateString, nextYearlyOccurrence, todayLocal } from './dates';
import { syncScheduledNotifications } from './notifications';

export type { NewReminderInput, Reminder, ReminderPatch, ReminderSource } from './types';
export { DEFAULT_DAYS_BEFORE } from './types';
export { addDays, daysUntil, formatDate, todayLocal } from './dates';

export const STORAGE_KEY = 'haoti.reminders.v1';

// ── 變更訂閱 ─────────────────────────────────────────────────────────────
// 補助詳情頁的「加入提醒」和提醒列表是兩個 useReminders 實例，
// 靠這個讓任一邊寫入後另一邊也更新，不用把狀態往上提。

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeReminders(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitChange(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch (err) {
      console.warn('[reminders] 訂閱者拋出錯誤', err);
    }
  }
}

// ── 正規化 ───────────────────────────────────────────────────────────────

export function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // 舊 WebView 沒有 randomUUID，走下面的 fallback
  }
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand()}-${rand()}`;
}

/**
 * 去重、去掉負數與非整數、由大到小排序、最多 MAX_DAYS_BEFORE_COUNT 個。
 * 固定排序是為了讓通知 id（靠陣列索引）不會因為輸入順序不同而變。
 * 空的就用預設：一筆不會通知的提醒對使用者沒有意義。
 */
export function normalizeDaysBefore(input: unknown): number[] {
  if (!Array.isArray(input)) return [...DEFAULT_DAYS_BEFORE];
  const cleaned = Array.from(
    new Set(
      input.filter(
        (n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 366,
      ),
    ),
  )
    .sort((a, b) => b - a)
    .slice(0, MAX_DAYS_BEFORE_COUNT);
  return cleaned.length > 0 ? cleaned : [...DEFAULT_DAYS_BEFORE];
}

function normalizeSource(input: unknown): ReminderSource {
  if (input && typeof input === 'object') {
    const s = input as { type?: unknown; id?: unknown };
    if (s.type === 'subsidy' && typeof s.id === 'string' && s.id) {
      return { type: 'subsidy', id: s.id };
    }
  }
  return { type: 'custom' };
}

/** 只收站內路徑或 https；點通知會直接導到這個 url，不能讓 javascript: 之類的進來 */
export function normalizeUrl(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const url = input.trim();
  if (!url) return undefined;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  if (/^https:\/\//i.test(url)) return url;
  return undefined;
}

function normalizeText(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const text = input.trim();
  return text ? text : undefined;
}

/** 從儲存讀出來的每一筆都過一次；壞掉的一筆丟掉，不要讓整個列表讀不出來 */
function sanitize(raw: unknown): Reminder | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = normalizeText(r.title);
  if (typeof r.id !== 'string' || !r.id || !title) return null;
  if (!isDateString(r.targetDate)) return null;
  return {
    id: r.id,
    title,
    note: normalizeText(r.note),
    targetDate: r.targetDate,
    daysBefore: normalizeDaysBefore(r.daysBefore),
    url: normalizeUrl(r.url),
    source: normalizeSource(r.source),
    repeatYearly: r.repeatYearly === true,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
    done: r.done === true,
    doneAt: typeof r.doneAt === 'string' ? r.doneAt : undefined,
  };
}

// ── 讀寫 ────────────────────────────────────────────────────────────────

async function readAll(): Promise<Reminder[]> {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitize).filter((r): r is Reminder => r !== null);
  } catch (err) {
    console.warn('[reminders] 讀取失敗', err);
    return [];
  }
}

async function writeAll(list: Reminder[]): Promise<boolean> {
  try {
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(list) });
    return true;
  } catch (err) {
    console.warn('[reminders] 寫入失敗', err);
    return false;
  }
}

/** 寫入 → 重排通知 → 通知訂閱者。排程失敗不算寫入失敗：資料已在裝置上，下次開 app 會補排。 */
async function commit(list: Reminder[]): Promise<void> {
  const ok = await writeAll(list);
  if (!ok) throw new Error('提醒沒有存進裝置，請再試一次');
  try {
    await syncScheduledNotifications(list);
  } catch (err) {
    console.warn('[reminders] 重排通知失敗', err);
  }
  emitChange();
}

// ── 公開 API ─────────────────────────────────────────────────────────────

export async function listReminders(): Promise<Reminder[]> {
  return readAll();
}

export async function getReminder(id: string): Promise<Reminder | null> {
  const list = await readAll();
  return list.find((r) => r.id === id) ?? null;
}

/**
 * 新增。同一個補助（source.type === 'subsidy' 且 id 相同）只會有一筆：
 * 詳情頁的「加入提醒」按兩次會更新原本那筆，不會變兩張卡、兩倍通知。
 */
export async function addReminder(input: NewReminderInput): Promise<Reminder> {
  const title = normalizeText(input.title);
  if (!title) throw new Error('提醒標題不能是空的');
  if (!isDateString(input.targetDate)) throw new Error('日期格式要是 YYYY-MM-DD');

  const repeatYearly = input.repeatYearly === true;
  // 每年重複的期限若已過（11 月才加「5 月報稅」），直接排到下一次，不然加完馬上顯示已過期
  const targetDate = repeatYearly ? nextYearlyOccurrence(input.targetDate) : input.targetDate;
  const source = normalizeSource(input.source);

  const list = await readAll();
  const existingIndex =
    source.type === 'subsidy'
      ? list.findIndex((r) => r.source.type === 'subsidy' && r.source.id === source.id)
      : -1;
  const existing = existingIndex >= 0 ? list[existingIndex] : null;

  const reminder: Reminder = {
    id: existing?.id ?? generateId(),
    title,
    note: normalizeText(input.note),
    targetDate,
    daysBefore: normalizeDaysBefore(input.daysBefore),
    url: normalizeUrl(input.url),
    source,
    repeatYearly,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    done: false,
    doneAt: undefined,
  };

  const next = existing ? list.map((r, i) => (i === existingIndex ? reminder : r)) : [...list, reminder];
  await commit(next);
  return reminder;
}

export async function updateReminder(id: string, patch: ReminderPatch): Promise<Reminder | null> {
  const list = await readAll();
  const index = list.findIndex((r) => r.id === id);
  if (index < 0) return null;
  const current = list[index];

  const title = patch.title === undefined ? current.title : normalizeText(patch.title);
  if (!title) throw new Error('提醒標題不能是空的');
  const targetDate = patch.targetDate === undefined ? current.targetDate : patch.targetDate;
  if (!isDateString(targetDate)) throw new Error('日期格式要是 YYYY-MM-DD');

  const updated: Reminder = {
    ...current,
    title,
    targetDate,
    note: 'note' in patch ? normalizeText(patch.note) : current.note,
    daysBefore: patch.daysBefore === undefined ? current.daysBefore : normalizeDaysBefore(patch.daysBefore),
    url: 'url' in patch ? normalizeUrl(patch.url) : current.url,
    source: patch.source === undefined ? current.source : normalizeSource(patch.source),
    repeatYearly: patch.repeatYearly === undefined ? current.repeatYearly : patch.repeatYearly === true,
    done: patch.done === undefined ? current.done : patch.done === true,
    doneAt: 'doneAt' in patch ? (typeof patch.doneAt === 'string' ? patch.doneAt : undefined) : current.doneAt,
  };

  const next = list.map((r, i) => (i === index ? updated : r));
  await commit(next);
  return updated;
}

export async function removeReminder(id: string): Promise<boolean> {
  const list = await readAll();
  const next = list.filter((r) => r.id !== id);
  if (next.length === list.length) return false;
  await commit(next);
  return true;
}

export async function markDone(id: string, done: boolean): Promise<Reminder | null> {
  return updateReminder(id, {
    done,
    doneAt: done ? new Date().toISOString() : undefined,
  });
}

/**
 * 每年重複且已過期的提醒：推到下一次、取消完成狀態、重排通知。回傳異動筆數。
 * 沒有異動也會重排一次通知：手機重開機或系統清掉排程後，開 app 就補回來。
 */
export async function rolloverReminders(): Promise<number> {
  const list = await readAll();
  const today = todayLocal();
  let changed = 0;
  const next = list.map((r) => {
    if (!r.repeatYearly || daysUntil(r.targetDate, today) >= 0) return r;
    changed += 1;
    return {
      ...r,
      targetDate: nextYearlyOccurrence(r.targetDate, today),
      done: false,
      doneAt: undefined,
    };
  });

  if (changed > 0) {
    await commit(next);
  } else {
    try {
      await syncScheduledNotifications(list);
    } catch (err) {
      console.warn('[reminders] 重排通知失敗', err);
    }
  }
  return changed;
}
