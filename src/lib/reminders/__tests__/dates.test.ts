// 故意用 UTC-8 跑：new Date('YYYY-MM-DD') 在這種時區會變成前一天，
// 要是 dates.ts 偷用它，這裡會抓到。
process.env.TZ = 'America/Los_Angeles';

import { describe, expect, it } from 'vitest';
import {
  addDays,
  addYears,
  daysBetween,
  daysUntil,
  formatDate,
  isDateString,
  nextYearlyOccurrence,
  parseLocalDate,
  toCompactDate,
  todayLocal,
} from '../dates';

describe('dates：解析與格式', () => {
  it('parseLocalDate 回傳本地日期，不會差一天', () => {
    const d = parseLocalDate('2026-01-01');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(0);
    expect(d!.getDate()).toBe(1);
    expect(d!.getHours()).toBe(0);

    // 對照組：在 UTC 以西的時區，UTC 解析會退到前一天
    if (new Date(2026, 0, 1).getTimezoneOffset() > 0) {
      expect(new Date('2026-01-01').getDate()).toBe(31);
    }
  });

  it('parseLocalDate 可以指定時分（排通知用 09:00）', () => {
    const d = parseLocalDate('2026-05-31', 9, 0)!;
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
    expect(d.getDate()).toBe(31);
  });

  it('isDateString 擋掉格式錯與不存在的日期', () => {
    expect(isDateString('2026-05-31')).toBe(true);
    expect(isDateString('2026-02-30')).toBe(false);
    expect(isDateString('2026-13-01')).toBe(false);
    expect(isDateString('2026-5-3')).toBe(false);
    expect(isDateString('20260531')).toBe(false);
    expect(isDateString(20260531)).toBe(false);
    expect(isDateString(null)).toBe(false);
  });

  it('formatDate / toCompactDate', () => {
    expect(formatDate('2026-05-31')).toBe('2026/05/31');
    expect(toCompactDate('2026-05-31')).toBe('20260531');
  });

  it('todayLocal 回傳 YYYY-MM-DD', () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(todayLocal(new Date(2026, 10, 7, 23, 59))).toBe('2026-11-07');
  });
});

describe('dates：天數差', () => {
  it('daysUntil 用固定日期算', () => {
    expect(daysUntil('2026-03-10', '2026-03-01')).toBe(9);
    expect(daysUntil('2026-03-01', '2026-03-01')).toBe(0);
    expect(daysUntil('2026-02-27', '2026-03-01')).toBe(-2);
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1);
  });

  it('跨日光節約切換日仍是整數天（美國 2026-03-08 撥快一小時）', () => {
    expect(daysUntil('2026-03-09', '2026-03-07')).toBe(2);
    expect(daysUntil('2026-11-02', '2026-10-31')).toBe(2);
  });

  it('daysBetween 遇到壞日期回傳 NaN 而不是丟例外', () => {
    expect(Number.isNaN(daysBetween('bad', '2026-01-01'))).toBe(true);
  });
});

describe('dates：加減', () => {
  it('addDays 處理月底、跨年、閏年', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('addYears 把 2/29 收到 2/28，不溢位到 3/1', () => {
    expect(addYears('2028-02-29', 1)).toBe('2029-02-28');
    expect(addYears('2026-05-31', 1)).toBe('2027-05-31');
  });

  it('nextYearlyOccurrence 推到今天或之後，幾年沒開 app 也會補到位', () => {
    expect(nextYearlyOccurrence('2024-05-31', '2026-11-07')).toBe('2027-05-31');
    expect(nextYearlyOccurrence('2026-12-25', '2026-11-07')).toBe('2026-12-25');
    expect(nextYearlyOccurrence('2026-11-07', '2026-11-07')).toBe('2026-11-07');
  });
});
