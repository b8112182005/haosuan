import { toDateString, type DeadlineState } from "./deadline";
import type { LateConsequence, SubsidyDeadline, SubsidyStatus } from "./types";

export interface ReminderPreset {
  /** 越早送越早開始領：畫面改成「現在就能送件」，提醒讓使用者自己挑辦理日 */
  applyNow: boolean;
  /** YYYY-MM-DD；undefined 表示讓使用者在面板上自己選 */
  targetDate: string | undefined;
  daysBefore: number[];
  repeatYearly: boolean;
  /** true＝日期是使用者自己挑的辦理日，通知與畫面不能寫「截止」 */
  planned: boolean;
  note: string | undefined;
}

/**
 * 補助詳情頁「加入提醒」的預設值。
 * apply_now 的補助從申請日或文件備齊當月起算，預設「截止前 30、14、3 天」
 * 會把人帶到最後才送，所以不帶日期，只預設提前 1 天與當天。
 */
export function reminderPreset({
  deadline,
  lateConsequence,
  state,
}: {
  deadline: Pick<SubsidyDeadline, "type">;
  lateConsequence?: Pick<LateConsequence, "apply_now" | "short"> | null;
  state: DeadlineState;
}): ReminderPreset {
  if (lateConsequence?.apply_now) {
    return { applyNow: true, targetDate: undefined, daysBefore: [1, 0], repeatYearly: false, planned: true, note: lateConsequence.short };
  }
  const note = lateConsequence?.short;
  if (state.kind === "upcoming") {
    return {
      applyNow: false,
      targetDate: toDateString(state.date),
      daysBefore: [30, 14, 3],
      repeatYearly: deadline.type === "fixed_annual",
      planned: false,
      note,
    };
  }
  return { applyNow: false, targetDate: undefined, daysBefore: [7], repeatYearly: false, planned: true, note };
}

/**
 * 期限卡要不要寫「現在就能送件」。
 * 結束的項目沒有可送件的東西；期間還沒開始（upcoming 且 open 為 false）時現在送不了，
 * 寫「現在就能送件」會讓人白跑一趟，這兩種都退回一般顯示。
 */
export function showApplyNow(applyNow: boolean, state: DeadlineState | null): boolean {
  if (!applyNow || !state) return false;
  if (state.kind === "ended") return false;
  if (state.kind === "upcoming" && !state.open) return false;
  return true;
}

/** 詳情頁主按鈕的文字：「現在去申請」只給還能申請的 apply_now 項目 */
export function applyLinkLabel({
  applyNow,
  status,
  deadlineType,
}: {
  applyNow: boolean | undefined;
  status: SubsidyStatus | string | undefined;
  deadlineType: string | undefined;
}): string {
  const ended = status === "ended" || deadlineType === "ended";
  return applyNow && !ended ? "現在去申請" : "前往官方申請頁";
}
