/**
 * 補助資料的型別。與研究流程輸出的 JSON schema 一一對應，
 * 資料本體在 src/data/subsidies.json，由 scripts/subsidy/build-data.mjs 從研究結果合併產生。
 */

export type SubsidyCategory =
  | "housing"
  | "family"
  | "tax"
  | "labor"
  | "senior_disability"
  | "energy_transport"
  | "youth"
  | "health"
  | "low_income"
  | "other";

/**
 * 這一項對使用者是哪一種東西（research/kinds.json）：
 * - benefit：可以領、可以用的（現金、減免、免費服務、扣除額、貸款）
 * - obligation：要繳、要辦的期限（牌照稅、報稅、定期檢驗），沒有錢可以領
 * - info：權益須知與申辦工具（租約必載事項、基本工資、自然人憑證）
 * 試算結果頁靠它分開列：三種混在同一張清單時，「條件相符」的前幾名會是須知頁。
 */
export type SubsidyKind = "benefit" | "obligation" | "info";

export type SubsidyLevel = "central" | "local";

export type SubsidyStatus = "active" | "ended" | "pending" | "unknown";

export type Confidence = "high" | "medium" | "low";

export type DeadlineType =
  | "fixed_annual"
  | "rolling"
  | "window"
  | "budget_until_exhausted"
  | "event_based"
  /** 各縣市、各校各自公告，或每年日期不固定：不顯示倒數，避免拿一個不準的日期讓人錯過 */
  | "varies"
  | "ended"
  | "unknown";

export interface SubsidyAmount {
  text: string;
  min: number | null;
  max: number | null;
  unit: string | null;
  formula: string | null;
}

export type LowIncomeStatus = "low" | "mid_low" | "either";

/** conditions.exceptions 可以用的鍵：對應資格引擎的每一種硬條件 */
export type ConditionExceptionKey =
  | "age"
  | "must_rent"
  | "no_home_ownership"
  | "must_own_home"
  | "children"
  | "is_pregnant_or_newborn"
  | "is_married"
  | "has_labor_insurance"
  | "has_national_pension"
  | "is_disabled"
  | "low_income"
  | "is_student"
  | "is_unemployed"
  | "is_employed"
  | "income"
  | "vehicle";

export interface SubsidyConditions {
  min_age?: number | null;
  max_age?: number | null;
  must_rent?: boolean | null;
  no_home_ownership?: boolean | null;
  must_own_home?: boolean | null;
  has_children?: boolean | null;
  child_age_min?: number | null;
  child_age_max?: number | null;
  has_labor_insurance?: boolean | null;
  has_national_pension?: boolean | null;
  is_disabled?: boolean | null;
  low_income?: LowIncomeStatus | null;
  income_limit_type?: string | null;
  income_limit_value?: number | null;
  income_limit_note?: string | null;
  cities?: string[] | null;
  is_student?: boolean | null;
  is_employed?: boolean | null;
  is_unemployed?: boolean | null;
  is_pregnant_or_newborn?: boolean | null;
  is_married?: boolean | null;
  is_elderly?: boolean | null;
  owns_vehicle?: string | null;
  /** 試算精靈沒有問的身分（原住民、新住民、農民、純電動車車主…）。有填時引擎一律歸「可能符合」並請使用者自行確認 */
  special_identity?: string | null;
  /**
   * 特定身分適用較低的年齡門檻（例如敬老卡一般 65 歲、原住民 55 歲）。
   * 精靈沒有問這些身分，年齡落在兩個門檻之間的人歸「可能符合」，不直接判成不符合。
   */
  lower_age_for?: { age: number; who: string } | null;
  /**
   * 硬條件的例外：{ 條件: "例外的白話說明" }。使用者不符合那個條件時不直接判「不符合」，
   * 改列「可能符合」並顯示例外。例：{ "has_labor_insurance": "退保後 1 年內生產也可以領" }。
   * 只在條文明寫例外時用；例外其實是另一類主要對象時，應該把那個條件整個拿掉。
   */
  exceptions?: Partial<Record<ConditionExceptionKey, string>> | null;
  other?: string | null;
}

export interface SubsidyChannel {
  type: "online" | "office" | "mail" | "phone" | "app" | "bank" | "other";
  label: string;
  url: string | null;
}

export interface SubsidyDeadline {
  type: DeadlineType;
  start_month: number | null;
  start_day: number | null;
  end_month: number | null;
  end_day: number | null;
  /**
   * 只辦一次、跨年度的期間才填年份（例如電動車免徵牌照稅到 2030/12/31）。
   * 沒填年份時，月日會被當成「今年或明年的那一天」：跨多年的方案會被算成今年底截止。
   * 有 end_year 的期間過了就是結束，不會滾到下一年。
   */
  start_year?: number | null;
  end_year?: number | null;
  /**
   * 一年有兩段以上申請期間時（就學貸款上、下學期），第二段以後放這裡，月日一樣沒有年份。
   * app 取「現在開放中的那一段」，都沒開放就取最近要開始的那一段。
   */
  extra_windows?: Array<{ start_month: number; start_day: number; end_month: number; end_day: number }> | null;
  note: string;
  /**
   * 主期限下面的補充行，最多 3 行。例如購車補助的「購買期限：發票日期要在 2026/12/31 以前」、
   * 租金補貼的「已經在領：租約到期後 3 個月內上傳新租約」。只放全國一致、有來源的文字。
   */
  extra_lines?: Array<{ label: string; text: string }> | null;
  /** 經費用完就提前結束：期限卡多一行最後核對日，讓人知道日期之前也可能停 */
  budget_limited?: boolean | null;
  /** 最後一次對照官網確認還在受理的日期（YYYY-MM-DD） */
  last_checked?: string | null;
  /**
   * 每年固定的期間裡，主管機關已經公告到哪一天（YYYY-MM-DD）。截止日在這一天以前的那一期不算「照上一期推算」。
   * 用在下一年度已經公告、但今年度還沒結束的項目（租金補貼 116 年度在 115 年 10 月就公告了）：
   * 把兩個年度併成一段跨年的期間，今年度的 12/31 會從畫面上消失。
   */
  confirmed_through?: string | null;
}

/**
 * 錯過或晚送會怎樣。只收有法條或作業要點原文的規則（build-data 會檢查來源），
 * 因為這一句會放在期限卡第一屏，也會跟著提醒進到通知裡。
 */
export interface LateConsequence {
  /** 期限卡第一屏的一兩句：規則與條號 */
  text: string;
  /** 放進提醒備註的短句，通知內文會接在期限日期後面，24 字以內 */
  short: string;
  /**
   * 從申請日或文件備齊當月起算：越早送領越多。這類項目的主按鈕改成「現在去申請」，
   * 提醒預設一週內，不預設「截止前 30、14、3 天」，那會把人帶到最後才送
   */
  apply_now: boolean;
  sources: SubsidySource[];
}

/** 每年固定期間（例如 11/1～12/31）在補助首頁、時程表與該項目頁顯示的卡片 */
export interface YearEndNotice {
  /** MM-DD，用裝置的今天判斷，每年都會出現 */
  from: string;
  to: string;
  title: string;
  lines: string[];
  sources: SubsidySource[];
}

export interface SubsidyFaq {
  q: string;
  a: string;
  source_url: string | null;
}

export interface SubsidySource {
  url: string;
  title: string;
  publisher: string | null;
  accessed: string | null;
}

export interface Subsidy {
  id: string;
  name: string;
  short_name: string;
  category: SubsidyCategory;
  kind: SubsidyKind;
  level: SubsidyLevel;
  city: string | null;
  agency: string;
  summary: string;
  eligibility: string[];
  amount: SubsidyAmount;
  conditions: SubsidyConditions;
  documents: string[];
  how_to_apply: string[];
  channels: SubsidyChannel[];
  deadline: SubsidyDeadline;
  faqs: SubsidyFaq[];
  pitfalls: string[];
  related_calculator: string | null;
  official_url: string;
  sources: SubsidySource[];
  status_2026: SubsidyStatus;
  last_known_update: string | null;
  confidence: Confidence;
  unverified_fields: string[];
  /** 核對員對照官方頁面重查金額、期限、是否辦理的日期（YYYY-MM-DD）；沒查過為 null */
  verified_at?: string | null;
  /** 核對員的一兩句結論：看了哪些頁面、改了什麼 */
  verification_summary?: string | null;
  /** 研究主題 id，方便追溯來源檔 */
  topic?: string;
  late_consequence?: LateConsequence | null;
  year_end_notice?: YearEndNotice | null;
}

/**
 * 列表、資格試算、時程表用的精簡版（src/data/subsidies-index.json）。
 * client component 一律用這個；完整的 Subsidy 只在詳情頁的 server component 讀。
 */
export type SubsidySummary = Pick<
  Subsidy,
  | "id"
  | "name"
  | "short_name"
  | "category"
  | "kind"
  | "level"
  | "city"
  | "agency"
  | "summary"
  | "eligibility"
  | "amount"
  | "conditions"
  | "deadline"
  | "status_2026"
  | "confidence"
  | "topic"
  | "year_end_notice"
  | "late_consequence"
>;

export interface GeneralFaq {
  q: string;
  a: string;
  source_url: string | null;
  tags: string[];
  topic?: string;
}

export interface SubsidyDataset {
  /** 資料版本，YYYY-MM-DD；app 用它判斷遠端資料是否較新 */
  version: string;
  generated_at: string;
  /** 內容雜湊；版本日期相同時用來分辨內容有沒有變 */
  hash?: string;
  items: Subsidy[];
  general_faqs: GeneralFaq[];
}

export const CATEGORY_LABELS: Record<SubsidyCategory, string> = {
  housing: "居住",
  family: "生育育兒",
  tax: "稅務",
  labor: "勞工",
  senior_disability: "長者與身障",
  energy_transport: "節能與交通",
  youth: "青年與學生",
  health: "健康與健保",
  low_income: "弱勢扶助",
  other: "其他",
};

export const CATEGORY_ORDER: SubsidyCategory[] = [
  "housing",
  "family",
  "tax",
  "labor",
  "youth",
  "health",
  "senior_disability",
  "low_income",
  "energy_transport",
  "other",
];

export const TAIWAN_CITIES = [
  "台北市", "新北市", "桃園市", "台中市", "台南市", "高雄市",
  "基隆市", "新竹市", "嘉義市", "新竹縣", "苗栗縣", "彰化縣",
  "南投縣", "雲林縣", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣",
  "台東縣", "澎湖縣", "金門縣", "連江縣",
] as const;

export type TaiwanCity = (typeof TAIWAN_CITIES)[number];
