import { toDateString, type DeadlineState } from "./deadline";
import type { LateConsequence, SubsidyDeadline } from "./types";

export interface ReminderPreset {
  /** 越早送越早開始領：畫面改成「現在就能送件」，提醒讓使用者自己挑辦理日 */
  applyNow: boolean;
  /** YYYY-MM-DD；undefined 表示讓使用者在面板上自己選 */
  targetDate: string | undefined;
  daysBefore: number[];
  repeatYearly: boolean;
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
    return { applyNow: true, targetDate: undefined, daysBefore: [1, 0], repeatYearly: false, note: lateConsequence.short };
  }
  const note = lateConsequence?.short;
  if (state.kind === "upcoming") {
    return {
      applyNow: false,
      targetDate: toDateString(state.date),
      daysBefore: [30, 14, 3],
      repeatYearly: deadline.type === "fixed_annual",
      note,
    };
  }
  return { applyNow: false, targetDate: undefined, daysBefore: [7], repeatYearly: false, note };
}
