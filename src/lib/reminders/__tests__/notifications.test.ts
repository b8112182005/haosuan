import { describe, expect, it, vi } from 'vitest';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, string>() }));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: memory.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => {
      memory.set(key, value);
    },
    remove: async ({ key }: { key: string }) => {
      memory.delete(key);
    },
    clear: async () => {
      memory.clear();
    },
    keys: async () => ({ keys: [...memory.keys()] }),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => 'web',
  },
  registerPlugin: () => ({}),
}));

import {
  buildIcs,
  fnv1a32,
  foldIcsLine,
  getPermissionState,
  googleCalendarUrl,
  initNotificationTapHandler,
  notificationFireAt,
  notificationId,
  notificationTitle,
  planNotifications,
  requestPermission,
  syncScheduledNotifications,
} from '../notifications';
import type { Reminder } from '../types';

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: '7c1c3a8e-2f55-4c1e-9b6a-0f3a9a1d2c44',
    title: '租金補貼',
    targetDate: '2026-05-31',
    daysBefore: [30, 14, 3, 0],
    url: '/subsidy/rent',
    source: { type: 'subsidy', id: 'rent' },
    repeatYearly: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    done: false,
    ...overrides,
  };
}

describe('通知 id', () => {
  it('同一個輸入永遠得到同一個 id', () => {
    expect(fnv1a32('abc')).toBe(fnv1a32('abc'));
    expect(notificationId('r1', 0)).toBe(notificationId('r1', 0));
  });

  it('是 32-bit 正整數', () => {
    for (const id of ['a', 'r1', makeReminder().id, 'x'.repeat(100)]) {
      for (let i = 0; i < 8; i += 1) {
        const n = notificationId(id, i);
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(2_147_483_647);
      }
    }
  });

  it('同一筆提醒的不同 daysBefore 索引不會撞', () => {
    const ids = new Set<number>();
    for (let i = 0; i < 8; i += 1) ids.add(notificationId(makeReminder().id, i));
    expect(ids.size).toBe(8);
  });

  it('200 筆提醒 × 8 個索引全部不重複（固定字串，結果可重現）', () => {
    const ids = new Set<number>();
    for (let r = 0; r < 200; r += 1) {
      for (let i = 0; i < 8; i += 1) ids.add(notificationId(`reminder-${r}`, i));
    }
    expect(ids.size).toBe(1600);
  });

  it('索引超出 0–7 會丟 RangeError', () => {
    expect(() => notificationId('r1', 8)).toThrow(RangeError);
    expect(() => notificationId('r1', -1)).toThrow(RangeError);
  });
});

describe('展開排程', () => {
  it('每個 daysBefore 一則，時間是當地 09:00，已過去的不排', () => {
    // 現在是 2026-01-10 中午；期限 2026-01-20 → 30 天前、14 天前已過，只剩 3 天前與當天
    const now = new Date(2026, 0, 10, 12, 0, 0);
    const plan = planNotifications([makeReminder({ targetDate: '2026-01-20' })], now);

    expect(plan).toHaveLength(2);
    expect(plan.map((n) => n.extra.daysBefore)).toEqual([3, 0]);
    for (const n of plan) {
      expect(n.schedule?.at?.getHours()).toBe(9);
      expect(n.schedule?.at?.getMinutes()).toBe(0);
      expect(n.schedule?.allowWhileIdle).toBe(true);
      expect(n.isExactNotification).toBe(false);
      expect(n.extra.module).toBe('reminders');
      expect(n.extra.reminderId).toBe(makeReminder().id);
      expect(n.extra.url).toBe('/subsidy/rent');
    }
    expect(plan[0].schedule?.at?.getDate()).toBe(17);
    expect(plan[1].schedule?.at?.getDate()).toBe(20);
    expect(plan[0].title).toBe('租金補貼 3 天後截止');
    expect(plan[1].title).toBe('今天截止：租金補貼');
    expect(plan[0].body).toBe('期限 2026/01/20');
  });

  it('09:00 整點以後就不再排當天那則', () => {
    const reminder = makeReminder({ targetDate: '2026-01-20', daysBefore: [0] });
    expect(planNotifications([reminder], new Date(2026, 0, 20, 8, 59))).toHaveLength(1);
    expect(planNotifications([reminder], new Date(2026, 0, 20, 9, 0))).toHaveLength(0);
  });

  it('已完成的提醒不排；body 有備註時放在日期前面', () => {
    const now = new Date(2026, 0, 1);
    expect(planNotifications([makeReminder({ done: true })], now)).toHaveLength(0);
    const [n] = planNotifications([makeReminder({ daysBefore: [0], note: '帶身分證' })], now);
    expect(n.body).toBe('帶身分證・期限 2026/05/31');
  });

  it('notificationTitle 文案', () => {
    expect(notificationTitle('繳稅', 0)).toBe('今天截止：繳稅');
    expect(notificationTitle('繳稅', 1)).toBe('明天截止：繳稅');
    expect(notificationTitle('繳稅', 14)).toBe('繳稅 14 天後截止');
  });

  it('notificationFireAt 跨月回推', () => {
    const at = notificationFireAt('2026-03-02', 3)!;
    expect(at.getMonth()).toBe(1);
    expect(at.getDate()).toBe(27);
    expect(at.getHours()).toBe(9);
    expect(notificationFireAt('bad', 3)).toBeNull();
  });
});

describe('網頁環境', () => {
  it('權限一律 unsupported，sync 不做事、tap handler 回傳 noop', async () => {
    expect(await getPermissionState()).toBe('unsupported');
    expect(await requestPermission()).toBe('unsupported');
    expect(await syncScheduledNotifications([makeReminder()])).toEqual({
      scheduled: 0,
      cancelled: 0,
      skipped: 'web',
    });
    const remove = initNotificationTapHandler(() => {});
    expect(typeof remove).toBe('function');
    expect(() => remove()).not.toThrow();
  });
});

describe('行事曆替代出口', () => {
  it('googleCalendarUrl 是全天事件，結束日 +1', () => {
    const url = googleCalendarUrl(makeReminder({ note: '帶身分證' }), 'https://haosuan.vercel.app');
    expect(url.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE')).toBe(true);
    expect(url).toContain('dates=20260531/20260601');
    expect(url).toContain(`text=${encodeURIComponent('租金補貼')}`);
    expect(url).toContain(encodeURIComponent('https://haosuan.vercel.app/subsidy/rent'));
    expect(url).toContain(encodeURIComponent('帶身分證'));
  });

  it('buildIcs 含 VALARM，第一個 TRIGGER 對應 daysBefore 第一個值', () => {
    const ics = buildIcs(
      makeReminder({ title: '租金補貼, 第二期; 測試', note: '帶身分證' }),
      new Date(Date.UTC(2026, 0, 1, 0, 0, 0)),
      'https://haosuan.vercel.app',
    );
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTAMP:20260101T000000Z');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260531');
    expect(ics).toContain('DTEND;VALUE=DATE:20260601');
    expect(ics).toContain('SUMMARY:租金補貼\\, 第二期\\; 測試');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics.indexOf('TRIGGER:-P30D')).toBeGreaterThan(0);
    expect(ics.indexOf('TRIGGER:-P30D')).toBeLessThan(ics.indexOf('TRIGGER:-P14D'));
    expect(ics).toContain('TRIGGER:-P0D');
    expect(ics).toContain('URL:https://haosuan.vercel.app/subsidy/rent');
    expect(ics).not.toContain('RRULE');
    // RFC 5545 用 CRLF
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.split('\r\n').every((line) => Buffer.byteLength(line, 'utf8') <= 75)).toBe(true);
  });

  it('repeatYearly 會帶 RRULE', () => {
    expect(buildIcs(makeReminder({ repeatYearly: true }))).toContain('RRULE:FREQ=YEARLY');
  });

  it('foldIcsLine 以 byte 數切行，展開後與原文相同', () => {
    const long = `DESCRIPTION:${'這是一段很長的中文說明'.repeat(10)}`;
    const folded = foldIcsLine(long);
    const lines = folded.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => Buffer.byteLength(line, 'utf8') <= 75)).toBe(true);
    expect(lines.slice(1).every((line) => line.startsWith(' '))).toBe(true);
    expect(folded.replace(/\r\n /g, '')).toBe(long);
  });
});
