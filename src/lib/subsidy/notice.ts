import type { LocalDate } from "./deadline";
import type { SubsidySummary, YearEndNotice } from "./types";

/** "MM-DD" → 月*100+日，拿來直接比大小；格式不對回 null（資料寫錯時不顯示，不要丟錯讓整頁壞掉） */
function monthDayKey(value: string): number | null {
  const m = /^(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return month * 100 + day;
}

/**
 * 每年固定期間的卡片今天要不要顯示。from～to 含頭尾；from 比 to 晚代表跨年（12-15～01-15），
 * 這時「今天」在 from 之後或 to 之前都算。只比月日，所以每年都會出現。
 */
export function isNoticeActive(notice: Pick<YearEndNotice, "from" | "to">, today: LocalDate): boolean {
  const from = monthDayKey(notice.from);
  const to = monthDayKey(notice.to);
  if (from === null || to === null) return false;
  const now = today.m * 100 + today.d;
  return from <= to ? now >= from && now <= to : now >= from || now <= to;
}

export interface ActiveYearEndNotice {
  id: string;
  short_name: string;
  notice: YearEndNotice;
}

/** 今天要顯示的卡片。已結束的項目不顯示：卡片會叫人去申請，結束的項目沒有可申請的 */
export function activeYearEndNotices(items: SubsidySummary[], today: LocalDate): ActiveYearEndNotice[] {
  const result: ActiveYearEndNotice[] = [];
  for (const item of items) {
    const notice = item.year_end_notice;
    if (!notice || item.status_2026 === "ended") continue;
    if (!isNoticeActive(notice, today)) continue;
    result.push({ id: item.id, short_name: item.short_name || item.name, notice });
  }
  return result;
}
