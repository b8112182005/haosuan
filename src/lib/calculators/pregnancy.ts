/**
 * 懷孕週數計算機
 * 依最後一次月經（LMP）計算預產期與重要里程碑
 */

export interface PregnancyMilestone {
  week: number;
  label: string;
  description: string;
}

export interface PregnancyResult {
  currentWeeks: number;        // 目前懷孕週數
  currentDays: number;         // 週數中的天數
  dueDate: Date;               // 預產期
  milestones: PregnancyMilestone[];
  trimester: 1 | 2 | 3 | null; // 孕期（三孕期）
  isFullTerm: boolean;         // 是否已足月（≥37週）
}

const MILESTONES: PregnancyMilestone[] = [
  { week: 12, label: "第一孕期結束", description: "流產風險大幅降低，通常可對外公布好消息" },
  { week: 16, label: "胎動初感", description: "部分媽媽開始感覺到胎動" },
  { week: 20, label: "中期超音波", description: "重要排畸胎超音波檢查週數" },
  { week: 28, label: "第三孕期開始", description: "開始每2週產檢，寶寶快速生長期" },
  { week: 34, label: "建議備妥待產包", description: "早產風險降低，開始準備待產物品" },
  { week: 36, label: "每週產檢開始", description: "進入每週產檢階段" },
  { week: 37, label: "足月", description: "此週後出生為足月兒" },
  { week: 40, label: "預產期", description: "預計生產日期（±2週均屬正常）" },
];

/**
 * @param lmpDate 最後一次月經第一天日期
 * @param today 今天日期（預設為當天）
 */
export function calculatePregnancy(
  lmpDate: Date,
  today: Date = new Date()
): PregnancyResult | null {
  if (!lmpDate || isNaN(lmpDate.getTime())) return null;
  if (lmpDate > today) return null;

  const diffMs = today.getTime() - lmpDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 280 + 60) return null; // 超過 48 週不顯示

  const currentWeeks = Math.floor(diffDays / 7);
  const currentDays = diffDays % 7;

  // 預產期：LMP + 280 天（40 週）
  const dueDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);

  let trimester: 1 | 2 | 3 | null = null;
  if (currentWeeks < 13) trimester = 1;
  else if (currentWeeks < 28) trimester = 2;
  else trimester = 3;

  const isFullTerm = currentWeeks >= 37;

  return {
    currentWeeks,
    currentDays,
    dueDate,
    milestones: MILESTONES,
    trimester,
    isFullTerm,
  };
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** 計算某個里程碑的預估日期 */
export function getMilestoneDate(lmpDate: Date, week: number): Date {
  return new Date(lmpDate.getTime() + week * 7 * 24 * 60 * 60 * 1000);
}
