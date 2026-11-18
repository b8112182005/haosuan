/**
 * 資格試算用的個人條件。只存在裝置（Preferences），不上傳。
 * 每個欄位都允許 null = 使用者沒回答，引擎會把它當成「無法判斷」而不是「不符合」。
 */

export type LowIncomeStatus = "none" | "mid_low" | "low";
export type VehicleOwnership = "none" | "scooter" | "car" | "both";

export interface Profile {
  city: string | null;
  age: number | null;
  /** 個人每月收入（元，稅前） */
  monthlyIncome: number | null;
  isRenting: boolean | null;
  /** 本人、配偶或未成年子女名下有無自有住宅 */
  ownsHome: boolean | null;
  hasChildren: boolean | null;
  /** 子女年齡（歲），hasChildren 為 true 時使用 */
  childrenAges: number[];
  isPregnantOrNewborn: boolean | null;
  isMarried: boolean | null;
  hasLaborInsurance: boolean | null;
  hasNationalPension: boolean | null;
  isDisabled: boolean | null;
  lowIncome: LowIncomeStatus | null;
  isStudent: boolean | null;
  isUnemployed: boolean | null;
  ownsVehicle: VehicleOwnership | null;
}

export const EMPTY_PROFILE: Profile = {
  city: null,
  age: null,
  monthlyIncome: null,
  isRenting: null,
  ownsHome: null,
  hasChildren: null,
  childrenAges: [],
  isPregnantOrNewborn: null,
  isMarried: null,
  hasLaborInsurance: null,
  hasNationalPension: null,
  isDisabled: null,
  lowIncome: null,
  isStudent: null,
  isUnemployed: null,
  ownsVehicle: null,
};

const KEY = "haoti.profile.v1";

function sanitize(raw: unknown): Profile {
  if (!raw || typeof raw !== "object") return { ...EMPTY_PROFILE };
  const r = raw as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const bool = (v: unknown) => (typeof v === "boolean" ? v : null);
  const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | null =>
    typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
  return {
    city: typeof r.city === "string" && r.city ? r.city : null,
    age: num(r.age),
    monthlyIncome: num(r.monthlyIncome),
    isRenting: bool(r.isRenting),
    ownsHome: bool(r.ownsHome),
    hasChildren: bool(r.hasChildren),
    childrenAges: Array.isArray(r.childrenAges) ? r.childrenAges.filter((n): n is number => typeof n === "number" && n >= 0 && n < 30) : [],
    isPregnantOrNewborn: bool(r.isPregnantOrNewborn),
    isMarried: bool(r.isMarried),
    hasLaborInsurance: bool(r.hasLaborInsurance),
    hasNationalPension: bool(r.hasNationalPension),
    isDisabled: bool(r.isDisabled),
    lowIncome: oneOf(r.lowIncome, ["none", "mid_low", "low"] as const),
    isStudent: bool(r.isStudent),
    isUnemployed: bool(r.isUnemployed),
    ownsVehicle: oneOf(r.ownsVehicle, ["none", "scooter", "car", "both"] as const),
  };
}

/**
 * 這次載入頁面後讀到或存過的條件。undefined＝還沒讀過，null＝讀過、沒有存過。
 *
 * Preferences 是非同步的：站內換頁時元件重新掛載，等它讀完之前第一次 render 只有骨架，
 * 瀏覽器沒辦法把捲動位置還原到還沒長出來的清單，項目頁的條件比對也會晚一拍才冒出來把內容往下推。
 * 讀過或存過一次就留在這裡，之後的元件第一次 render 就拿得到，試算結果和項目頁看到的也一定是同一份。
 * 整頁載入時模組剛載入、值是 undefined，第一次 render 和靜態 HTML 一致，不會有 hydration 不一致。
 */
let memo: Profile | null | undefined;

/** 不等 Preferences：這次載入頁面後讀過或存過就回那一份，還沒有就回 undefined */
export function peekProfile(): Profile | null | undefined {
  return memo;
}

export async function loadProfile(): Promise<Profile | null> {
  if (memo !== undefined) return memo;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: KEY });
    memo = value ? sanitize(JSON.parse(value)) : null;
    return memo;
  } catch {
    // 讀不到時不記：下一個元件掛載時再試一次
    return null;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  const clean = sanitize(profile);
  // 先記在記憶體再寫入：寫入失敗時這次填的條件仍然在，結果頁和項目頁照常比對
  memo = clean;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: KEY, value: JSON.stringify(clean) });
  } catch {
    // 儲存失敗時使用者這次填的條件還在記憶體，不影響本次結果
  }
}

export async function clearProfile(): Promise<void> {
  memo = null;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.remove({ key: KEY });
  } catch {
    // 忽略
  }
}

export type ProfileStep = "city" | "age" | "income" | "housing" | "family" | "status" | "vehicle";
export const PROFILE_STEPS: ProfileStep[] = ["city", "age", "income", "housing", "family", "status", "vehicle"];

/** 還沒回答的題目，依問答順序。「沒有」「不是」也算回答 */
export function unansweredSteps(p: Profile): ProfileStep[] {
  const answered: Record<ProfileStep, boolean> = {
    city: Boolean(p.city),
    age: p.age !== null,
    income: p.monthlyIncome !== null,
    housing: p.isRenting !== null || p.ownsHome !== null,
    family: p.hasChildren !== null || p.isMarried !== null || p.isPregnantOrNewborn !== null,
    status:
      p.hasLaborInsurance !== null ||
      p.hasNationalPension !== null ||
      p.isDisabled !== null ||
      p.lowIncome !== null ||
      p.isStudent !== null ||
      p.isUnemployed !== null,
    vehicle: p.ownsVehicle !== null,
  };
  return PROFILE_STEPS.filter((step) => !answered[step]);
}

/** 已回答的題數（給進度顯示） */
export function answeredCount(p: Profile): number {
  return PROFILE_STEPS.length - unansweredSteps(p).length;
}
