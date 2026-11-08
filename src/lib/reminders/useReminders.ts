import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addReminder,
  listReminders,
  markDone as markDoneInStore,
  removeReminder,
  rolloverReminders,
  subscribeReminders,
  updateReminder,
} from './store';
import {
  getPermissionState,
  requestPermission as requestNotificationPermission,
  syncScheduledNotifications,
  type NotificationPermissionState,
} from './notifications';
import type { NewReminderInput, Reminder, ReminderPatch } from './types';

/** 未完成的按截止日由近到遠；完成的放最後 */
export function sortReminders(list: Reminder[]): Reminder[] {
  return [...list].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.targetDate !== b.targetDate) return a.targetDate < b.targetDate ? -1 : 1;
    return a.createdAt < b.createdAt ? -1 : 1;
  });
}

export interface UseRemindersResult {
  reminders: Reminder[];
  loading: boolean;
  permission: NotificationPermissionState;
  add: (input: NewReminderInput) => Promise<Reminder>;
  update: (id: string, patch: ReminderPatch) => Promise<Reminder | null>;
  remove: (id: string) => Promise<boolean>;
  markDone: (id: string, done: boolean) => Promise<Reminder | null>;
  requestPermission: () => Promise<NotificationPermissionState>;
  refresh: () => Promise<void>;
}

export function useReminders(): UseRemindersResult {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermissionState>('unsupported');
  // null = 還沒查過。用來偵測「從沒開 → 開」的轉換，補排之前沒排到的通知
  const lastPermissionRef = useRef<NotificationPermissionState | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const [list, perm] = await Promise.all([listReminders(), getPermissionState()]);
    if (!mountedRef.current) return;
    setReminders(sortReminders(list));
    setPermission(perm);
    setLoading(false);
    // 使用者去系統設定把通知打開再切回來：visibilitychange 會進到這裡，把通知補上
    const previous = lastPermissionRef.current;
    if (perm === 'granted' && previous !== null && previous !== 'granted') {
      void syncScheduledNotifications(list);
    }
    lastPermissionRef.current = perm;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // 先把過期的每年提醒推到明年，再讀列表，畫面才不會先閃一下「已過期」
    void rolloverReminders().then(refresh, refresh);

    const unsubscribe = subscribeReminders(() => {
      void refresh();
    });
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mountedRef.current = false;
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  const requestPermission = useCallback(async () => {
    const state = await requestNotificationPermission();
    if (!mountedRef.current) return state;
    setPermission(state);
    if (state === 'granted' && lastPermissionRef.current !== 'granted') {
      void listReminders().then(syncScheduledNotifications);
    }
    lastPermissionRef.current = state;
    return state;
  }, []);

  const add = useCallback((input: NewReminderInput) => addReminder(input), []);
  const update = useCallback((id: string, patch: ReminderPatch) => updateReminder(id, patch), []);
  const remove = useCallback((id: string) => removeReminder(id), []);
  const markDone = useCallback((id: string, done: boolean) => markDoneInStore(id, done), []);

  return { reminders, loading, permission, add, update, remove, markDone, requestPermission, refresh };
}
