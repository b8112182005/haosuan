import { describe, expect, it } from "vitest";
import { activeYearEndNotices, isNoticeActive } from "../notice";
import type { SubsidySummary, YearEndNotice } from "../types";

const day = (m: number, d: number) => ({ y: 2026, m, d });

describe("每年固定期間的卡片", () => {
  it("11-01～12-31：10/31 不顯示，11/1 與 12/31 顯示，1/1 不顯示", () => {
    const range = { from: "11-01", to: "12-31" };
    expect(isNoticeActive(range, day(10, 31))).toBe(false);
    expect(isNoticeActive(range, day(11, 1))).toBe(true);
    expect(isNoticeActive(range, day(12, 31))).toBe(true);
    expect(isNoticeActive(range, { y: 2027, m: 1, d: 1 })).toBe(false);
  });

  it("跨年 12-15～01-15：12/20 與 1/10 顯示，2/1 不顯示，頭尾兩天含在內", () => {
    const range = { from: "12-15", to: "01-15" };
    expect(isNoticeActive(range, day(12, 20))).toBe(true);
    expect(isNoticeActive(range, day(1, 10))).toBe(true);
    expect(isNoticeActive(range, day(2, 1))).toBe(false);
    expect(isNoticeActive(range, day(12, 15))).toBe(true);
    expect(isNoticeActive(range, day(1, 15))).toBe(true);
    expect(isNoticeActive(range, day(12, 14))).toBe(false);
    expect(isNoticeActive(range, day(1, 16))).toBe(false);
  });

  it("月日格式寫錯：不顯示", () => {
    expect(isNoticeActive({ from: "11/01", to: "12-31" }, day(11, 5))).toBe(false);
    expect(isNoticeActive({ from: "13-01", to: "12-31" }, day(11, 5))).toBe(false);
  });
});

const notice: YearEndNotice = { from: "11-01", to: "12-31", title: "年底前要送件", lines: ["第一行"], sources: [] };
const item = (id: string, status: SubsidySummary["status_2026"], n: YearEndNotice | null = notice) =>
  ({ id, name: `${id} 全名`, short_name: id, status_2026: status, year_end_notice: n }) as unknown as SubsidySummary;

describe("activeYearEndNotices", () => {
  it("只收區間包含今天、而且還沒結束的項目", () => {
    const items = [item("a", "active"), item("b", "ended"), item("c", "active", null), item("d", "active", { ...notice, from: "01-01", to: "01-31" })];
    const result = activeYearEndNotices(items, day(11, 18));
    expect(result.map((r) => r.id)).toEqual(["a"]);
    expect(result[0].short_name).toBe("a");
    expect(result[0].notice.title).toBe("年底前要送件");
  });

  it("沒有短名稱時用全名", () => {
    const noShort = { ...item("a", "active"), short_name: "" } as SubsidySummary;
    expect(activeYearEndNotices([noShort], day(11, 18))[0].short_name).toBe("a 全名");
  });

  it("沒有任何項目帶卡片：回空陣列", () => {
    expect(activeYearEndNotices([({ ...item("a", "active"), year_end_notice: undefined } as SubsidySummary)], day(11, 18))).toEqual([]);
  });
});
