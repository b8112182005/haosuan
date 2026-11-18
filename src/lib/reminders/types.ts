/**
 * 提醒模組共用型別。獨立成檔是因為 store 會呼叫 notifications 重排通知，
 * notifications 又需要 Reminder 型別；放一起會互相 import。
 */

export type ReminderSource = { type: 'subsidy'; id: string } | { type: 'custom' };

export interface Reminder {
  /** crypto.randomUUID()，沒有 randomUUID 時用時間戳＋亂數 */
  id: string;
  title: string;
  note?: string;
  /** YYYY-MM-DD，本地日期 */
  targetDate: string;
  /** 提前幾天提醒，例如 [30, 14, 3, 0]；0 = 當天。存檔時固定由大到小排序 */
  daysBefore: number[];
  /** 站內路徑（/subsidy/xxx）或 https 外部連結 */
  url?: string;
  source: ReminderSource;
  /** 每年固定期限（報稅等）：過期後自動推到下一年 */
  repeatYearly: boolean;
  /**
   * true＝targetDate 是使用者自己訂的辦理日，不是主管機關的截止日。
   * 通知與畫面不能寫「截止」，否則使用者會以為那天一過就不能申請。舊資料沒有這個欄位，視同 false。
   */
  planned?: boolean;
  /** ISO 字串 */
  createdAt: string;
  done: boolean;
  doneAt?: string;
}

export interface NewReminderInput {
  title: string;
  /** YYYY-MM-DD */
  targetDate: string;
  note?: string;
  /** 沒給就用 DEFAULT_DAYS_BEFORE */
  daysBefore?: number[];
  url?: string;
  /** 沒給就是 custom */
  source?: ReminderSource;
  repeatYearly?: boolean;
  /** 見 Reminder.planned */
  planned?: boolean;
}

export type ReminderPatch = Partial<Omit<Reminder, 'id' | 'createdAt'>>;

export const DEFAULT_DAYS_BEFORE: readonly number[] = [30, 14, 3, 0];

/**
 * 一筆提醒最多幾個提前天數。
 * 通知 id 是「提醒 hash × 8 ＋ 索引」，一筆提醒佔 8 個 id，超過就會撞到下一筆。
 */
export const MAX_DAYS_BEFORE_COUNT = 8;
