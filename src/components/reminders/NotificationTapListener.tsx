'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { initNotificationTapHandler } from '@/lib/reminders/notifications';

/**
 * 點通知 → 導到 extra.url。不渲染任何東西。
 * 放在 app 的 layout 裡才能處理「app 關著時點通知」的冷啟動；
 * 提醒頁自己也有掛一個，兩邊同時存在不會導頁兩次（notifications.ts 只呼叫最後註冊的）。
 */
export default function NotificationTapListener() {
  const router = useRouter();

  useEffect(
    () =>
      initNotificationTapHandler((url) => {
        if (url.startsWith('/')) {
          router.push(url);
        } else {
          window.open(url, '_blank', 'noopener');
        }
      }),
    [router],
  );

  return null;
}
