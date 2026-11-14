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
  countUpcomingNotifications,
  isUpcomingFireTime,
  pickDefaultDaysBefore,
  MAX_SCHEDULED,
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

  it('已完成的提醒不排；body 的期限放最前面（收合的通知只看得到第一行）', () => {
    const now = new Date(2026, 0, 1);
    expect(planNotifications([makeReminder({ done: true })], now)).toHaveLength(0);
    const [n] = planNotifications([makeReminder({ daysBefore: [0], note: '帶身分證' })], now);
    expect(n.body).toBe('期限 2026/05/31・帶身分證');
  });

  it('每年重複：這一輪之外，明年同一天那一輪也先排好', () => {
    const yearly = makeReminder({ repeatYearly: true, targetDate: '2026-04-30', daysBefore: [14, 3, 0] });
    const plan = planNotifications([yearly], new Date(2026, 3, 1));
    expect(plan).toHaveLength(6);
    const years = plan.map((n) => (n.schedule!.at as Date).getFullYear()).sort();
    expect(years).toEqual([2026, 2026, 2026, 2027, 2027, 2027]);
    // 兩輪的通知 id 不能撞在一起
    expect(new Set(plan.map((n) => n.id)).size).toBe(6);
    // 明年那一輪的內文是明年的期限
    const next = plan.filter((n) => (n.schedule!.at as Date).getFullYear() === 2027);
    expect(next.every((n) => n.body === '期限 2027/04/30')).toBe(true);
  });

  it('每年重複：期限當天之後沒再開 app，明年那一輪仍然在排程裡', () => {
    const yearly = makeReminder({ repeatYearly: true, targetDate: '2026-04-30', daysBefore: [14, 3, 0] });
    // 4/30 早上 9 點過後：這一輪三則都過了，只剩明年的三則
    const plan = planNotifications([yearly], new Date(2026, 3, 30, 10, 0));
    expect(plan).toHaveLength(3);
    expect(plan.every((n) => (n.schedule!.at as Date).getFullYear() === 2027)).toBe(true);
  });

  it('每年重複且已打勾完成：這一輪不排，明年那一輪照排', () => {
    const done = makeReminder({ repeatYearly: true, done: true, targetDate: '2026-04-30', daysBefore: [3, 0] });
    const plan = planNotifications([done], new Date(2026, 3, 1));
    expect(plan).toHaveLength(2);
    expect(plan.every((n) => (n.schedule!.at as Date).getFullYear() === 2027)).toBe(true);
  });

  it('2/29 的每年提醒，明年那一輪排在 2/28', () => {
    const leap = makeReminder({ repeatYearly: true, targetDate: '2028-02-29', daysBefore: [0] });
    const plan = planNotifications([leap], new Date(2028, 0, 1));
    const days = plan.map((n) => { const d = n.schedule!.at as Date; return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }).sort();
    expect(days).toEqual(['2028-2-29', '2029-2-28']);
  });

  it('通知總數超過上限時，只排最早要響的那些', () => {
    // 60 筆每年重複 × 4 個提前天數 × 2 輪 = 480 則，超過 Android 每個 app 的鬧鐘上限前先截掉
    const many = Array.from({ length: 60 }, (_, i) =>
      makeReminder({ id: `yearly-${i}`, targetDate: `2026-${String((i % 9) + 4).padStart(2, '0')}-15`, repeatYearly: true }),
    );
    const plan = planNotifications(many, new Date(2026, 0, 1));
    expect(plan).toHaveLength(MAX_SCHEDULED);
    const times = plan.map((n) => (n.schedule!.at as Date).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    // 留下來的最晚一則，不晚於被截掉的任何一則：2026 年那一輪（240 則）一定全部都在
    const year2026 = plan.filter((n) => (n.schedule!.at as Date).getFullYear() === 2026);
    expect(year2026).toHaveLength(240);
    expect(new Set(plan.map((n) => n.id)).size).toBe(MAX_SCHEDULED);
  });

  it('沒有連結的自訂提醒，點通知會到提醒清單', () => {
    const [n] = planNotifications([makeReminder({ url: undefined, source: { type: 'custom' }, daysBefore: [0] })], new Date(2026, 0, 1));
    expect((n.extra as { url: string }).url).toBe('/reminders');
  });

  it('countUpcomingNotifications：只算時間還沒到的', () => {
    // 4/30 截止，今天 4/28 早上 10 點：前 30、14、3 天都過了（前 3 天是 4/27 09:00），剩前 1 天與當天
    const now = new Date(2027, 3, 28, 10, 0);
    expect(countUpcomingNotifications('2027-04-30', [30, 14, 3], now)).toBe(0);
    expect(countUpcomingNotifications('2027-04-30', [30, 14, 3, 1, 0], now)).toBe(2);
    expect(isUpcomingFireTime('2027-04-30', 3, now)).toBe(false);
    expect(isUpcomingFireTime('2027-04-30', 0, now)).toBe(true);
    // 當天早上 9 點整已經不算
    expect(isUpcomingFireTime('2027-04-30', 0, new Date(2027, 3, 30, 9, 0))).toBe(false);
  });

  it('pickDefaultDaysBefore：預設只勾還來得及的提前天數', () => {
    const now = new Date(2027, 3, 28, 10, 0);
    // 期限還很遠：預設值原樣
    expect(pickDefaultDaysBefore([30, 14, 3], '2027-08-31', false, now)).toEqual([30, 14, 3]);
    // 剩 10 天：前 30、14 天已過，只留前 3 天
    expect(pickDefaultDaysBefore([30, 14, 3], '2027-05-08', false, now)).toEqual([3]);
    // 剩 2 天：三個預設都過了，改勾還來得及、離現在最遠的「前 1 天」
    expect(pickDefaultDaysBefore([30, 14, 3], '2027-04-30', false, now)).toEqual([1]);
    // 今天早上 10 點、期限就是今天：9 點的通知也過了，沒有可以選的，退回預設（確認時會被擋下來並說明）
    expect(pickDefaultDaysBefore([30, 14, 3], '2027-04-28', false, now)).toEqual([30, 14, 3]);
    // 沒有日期（自訂提醒還沒選日期）：預設值原樣
    expect(pickDefaultDaysBefore([30, 14, 3, 0], undefined, false, now)).toEqual([30, 14, 3, 0]);
  });

  it('pickDefaultDaysBefore：每年重複的保留全部預設，這一期來不及時補上一個', () => {
    const now = new Date(2027, 3, 28, 10, 0);
    // 剩 10 天：前 3 天還來得及，預設值整組保留（明年那一輪用得到前 30、14 天）
    expect(pickDefaultDaysBefore([30, 14, 3], '2027-05-08', true, now)).toEqual([30, 14, 3]);
    // 剩 2 天：補上「前 1 天」，這一期至少通知一次
    expect(pickDefaultDaysBefore([30, 14, 3], '2027-04-30', true, now)).toEqual([30, 14, 3, 1]);
    // 今年已過（4/1）：會排到明年 4/1，預設值全部有效
    expect(pickDefaultDaysBefore([30, 14, 3], '2027-04-01', true, now)).toEqual([30, 14, 3]);
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
