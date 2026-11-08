import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock 會被提到檔案最上面執行，工廠函式裡只能用 vi.hoisted 宣告的變數
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
  // local-notifications 在 import 時就會呼叫 registerPlugin，要有東西可回
  registerPlugin: () => ({}),
}));

import {
  STORAGE_KEY,
  addReminder,
  getReminder,
  listReminders,
  markDone,
  normalizeDaysBefore,
  normalizeUrl,
  removeReminder,
  rolloverReminders,
  subscribeReminders,
  updateReminder,
} from '../store';
import { addDays, nextYearlyOccurrence, todayLocal } from '../dates';

beforeEach(() => {
  memory.clear();
});

describe('store：新增與讀取', () => {
  it('add 後 list 讀得到，欄位都正規化', async () => {
    const target = addDays(todayLocal(), 20);
    const created = await addReminder({
      title: '  租金補貼  ',
      targetDate: target,
      url: '/subsidy/rent',
      source: { type: 'subsidy', id: 'rent' },
    });

    expect(created.id).toEqual(expect.any(String));
    expect(created.title).toBe('租金補貼');
    expect(created.daysBefore).toEqual([30, 14, 3, 0]);
    expect(created.done).toBe(false);
    expect(created.repeatYearly).toBe(false);

    const list = await listReminders();
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(created);
    expect(memory.has(STORAGE_KEY)).toBe(true);
  });

  it('daysBefore 去重、去負數、由大到小排序', () => {
    expect(normalizeDaysBefore([0, 3, 30, 30, -1, 2.5, 14])).toEqual([30, 14, 3, 0]);
    expect(normalizeDaysBefore([])).toEqual([30, 14, 3, 0]);
    expect(normalizeDaysBefore(undefined)).toEqual([30, 14, 3, 0]);
    // 最多 8 個：通知 id 一筆提醒只有 8 格
    expect(normalizeDaysBefore([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toHaveLength(8);
  });

  it('url 只收站內路徑與 https', () => {
    expect(normalizeUrl('/subsidy/rent')).toBe('/subsidy/rent');
    expect(normalizeUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(normalizeUrl('http://example.com/a')).toBeUndefined();
    expect(normalizeUrl('//evil.com')).toBeUndefined();
    expect(normalizeUrl('javascript:alert(1)')).toBeUndefined();
    expect(normalizeUrl('')).toBeUndefined();
  });

  it('空標題或壞日期會丟錯', async () => {
    await expect(addReminder({ title: '   ', targetDate: '2026-05-31' })).rejects.toThrow();
    await expect(addReminder({ title: '繳稅', targetDate: '2026-5-31' })).rejects.toThrow();
    expect(await listReminders()).toHaveLength(0);
  });

  it('getReminder 找不到回傳 null', async () => {
    const created = await addReminder({ title: '驗車', targetDate: addDays(todayLocal(), 5) });
    expect(await getReminder(created.id)).toEqual(created);
    expect(await getReminder('nope')).toBeNull();
  });

  it('同一個補助重複加入只會有一筆，且沿用原本 id', async () => {
    const first = await addReminder({
      title: '租金補貼',
      targetDate: addDays(todayLocal(), 20),
      source: { type: 'subsidy', id: 'rent' },
    });
    const second = await addReminder({
      title: '租金補貼（延長）',
      targetDate: addDays(todayLocal(), 40),
      daysBefore: [7, 0],
      source: { type: 'subsidy', id: 'rent' },
    });
    const list = await listReminders();
    expect(list).toHaveLength(1);
    expect(second.id).toBe(first.id);
    expect(list[0].title).toBe('租金補貼（延長）');
    expect(list[0].daysBefore).toEqual([7, 0]);
  });

  it('自訂提醒可以重複加入', async () => {
    await addReminder({ title: '換濾心', targetDate: addDays(todayLocal(), 90) });
    await addReminder({ title: '換濾心', targetDate: addDays(todayLocal(), 180) });
    expect(await listReminders()).toHaveLength(2);
  });

  it('每年重複且日期已過：新增當下就排到下一次', async () => {
    const created = await addReminder({
      title: '綜所稅',
      targetDate: '2020-05-31',
      repeatYearly: true,
    });
    expect(created.targetDate).toBe(nextYearlyOccurrence('2020-05-31'));
    expect(created.targetDate >= todayLocal()).toBe(true);
  });
});

describe('store：更新、刪除、完成', () => {
  it('update 改標題與日期；空標題會丟錯；不存在回傳 null', async () => {
    const created = await addReminder({ title: '驗車', targetDate: addDays(todayLocal(), 5) });
    const newDate = addDays(todayLocal(), 9);
    const updated = await updateReminder(created.id, { title: '機車驗車', targetDate: newDate, note: '帶行照' });
    expect(updated?.title).toBe('機車驗車');
    expect(updated?.targetDate).toBe(newDate);
    expect(updated?.note).toBe('帶行照');
    expect(updated?.createdAt).toBe(created.createdAt);

    await expect(updateReminder(created.id, { title: '' })).rejects.toThrow();
    expect(await updateReminder('nope', { title: 'x' })).toBeNull();
  });

  it('remove 回傳是否有刪到', async () => {
    const created = await addReminder({ title: '驗車', targetDate: addDays(todayLocal(), 5) });
    expect(await removeReminder('nope')).toBe(false);
    expect(await removeReminder(created.id)).toBe(true);
    expect(await listReminders()).toHaveLength(0);
  });

  it('markDone 來回切換，doneAt 跟著設定與清除', async () => {
    const created = await addReminder({ title: '驗車', targetDate: addDays(todayLocal(), 5) });
    const done = await markDone(created.id, true);
    expect(done?.done).toBe(true);
    expect(done?.doneAt).toEqual(expect.any(String));

    const undone = await markDone(created.id, false);
    expect(undone?.done).toBe(false);
    expect(undone?.doneAt).toBeUndefined();
  });

  it('每次異動都會通知訂閱者，退訂後不再通知', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeReminders(listener);
    const created = await addReminder({ title: '驗車', targetDate: addDays(todayLocal(), 5) });
    await markDone(created.id, true);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    await removeReminder(created.id);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('store：每年重複的過期推移', () => {
  function seed(items: unknown[]) {
    memory.set(STORAGE_KEY, JSON.stringify(items));
  }

  it('repeatYearly 且已過期 → 推到明年、取消完成、回傳異動數', async () => {
    const future = addDays(todayLocal(), 10);
    seed([
      {
        id: 'tax',
        title: '綜所稅',
        targetDate: '2024-05-31',
        daysBefore: [30, 14, 3, 0],
        source: { type: 'custom' },
        repeatYearly: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        done: true,
        doneAt: '2024-05-20T00:00:00.000Z',
      },
      {
        id: 'inspect',
        title: '驗車',
        targetDate: '2024-05-31',
        daysBefore: [3, 0],
        source: { type: 'custom' },
        repeatYearly: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        done: false,
      },
      {
        id: 'future',
        title: '牌照稅',
        targetDate: future,
        daysBefore: [3, 0],
        source: { type: 'custom' },
        repeatYearly: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        done: false,
      },
    ]);

    expect(await rolloverReminders()).toBe(1);

    const list = await listReminders();
    const tax = list.find((r) => r.id === 'tax')!;
    expect(tax.targetDate).toBe(nextYearlyOccurrence('2024-05-31'));
    expect(tax.targetDate.slice(5)).toBe('05-31');
    expect(tax.targetDate >= todayLocal()).toBe(true);
    expect(tax.done).toBe(false);
    expect(tax.doneAt).toBeUndefined();

    // 不重複的過期提醒不動，未到期的也不動
    expect(list.find((r) => r.id === 'inspect')!.targetDate).toBe('2024-05-31');
    expect(list.find((r) => r.id === 'future')!.targetDate).toBe(future);

    // 再跑一次沒有東西要推
    expect(await rolloverReminders()).toBe(0);
  });
});

describe('store：壞資料', () => {
  it('不是 JSON 或不是陣列 → 空清單，不丟例外', async () => {
    // readAll 遇到壞 JSON 會 console.warn，這裡是故意餵壞資料，不要讓它弄髒測試輸出
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    memory.set(STORAGE_KEY, 'not json');
    expect(await listReminders()).toEqual([]);
    memory.set(STORAGE_KEY, JSON.stringify({ a: 1 }));
    expect(await listReminders()).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('壞掉的單筆被丟掉，其他正常的留著', async () => {
    memory.set(
      STORAGE_KEY,
      JSON.stringify([
        { id: 'ok', title: '驗車', targetDate: '2030-01-01', daysBefore: 'x', source: null },
        { id: 'bad-date', title: '驗車', targetDate: '2030-02-30' },
        { title: '沒有 id', targetDate: '2030-01-01' },
        null,
        'string',
      ]),
    );
    const list = await listReminders();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('ok');
    expect(list[0].daysBefore).toEqual([30, 14, 3, 0]);
    expect(list[0].source).toEqual({ type: 'custom' });
  });
});
