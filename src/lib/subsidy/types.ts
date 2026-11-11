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

export type SubsidyLevel = "central" | "local";

export type SubsidyStatus = "active" | "ended" | "pending" | "unknown";

export type Confidence = "high" | "medium" | "low";

export type DeadlineType =
  | "fixed_annual"
  | "rolling"
  | "window"
  | "budget_until_exhausted"
  | "event_based"
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
  note: string;
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
}

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
