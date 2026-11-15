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

export async function loadProfile(): Promise<Profile | null> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: KEY });
    if (!value) return null;
    return sanitize(JSON.parse(value));
  } catch {
    return null;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: KEY, value: JSON.stringify(sanitize(profile)) });
  } catch {
    // 儲存失敗時使用者這次填的條件還在記憶體，不影響本次結果
  }
}

export async function clearProfile(): Promise<void> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.remove({ key: KEY });
  } catch {
    // 忽略
  }
}

/** 已回答的題數（給進度顯示） */
export function answeredCount(p: Profile): number {
  let n = 0;
  if (p.city) n++;
  if (p.age !== null) n++;
  if (p.monthlyIncome !== null) n++;
  if (p.isRenting !== null || p.ownsHome !== null) n++;
  if (p.hasChildren !== null || p.isMarried !== null || p.isPregnantOrNewborn !== null) n++;
  if (
    p.hasLaborInsurance !== null ||
    p.hasNationalPension !== null ||
    p.isDisabled !== null ||
    p.lowIncome !== null ||
    p.isStudent !== null ||
    p.isUnemployed !== null
  )
    n++;
  if (p.ownsVehicle !== null) n++;
  return n;
}
