import type { Subsidy, SubsidyConditions } from "./types";
import type { Profile } from "./profile";
import { resolveSubsidyDeadline, type LocalDate } from "./deadline";

/**
 * 資格判斷：把補助的機器可讀條件（conditions）逐條對照使用者條件。
 * 三種結果：
 * - eligible：每一條都對得上
 * - maybe：沒有任何一條確定不符，但有條件使用者沒回答、或資料只能人工判斷
 * - not_eligible：至少一條確定不符（或方案已結束）
 * 文字全部給一般人看，所以用「你」當主詞、直接講原因。
 */

export type Verdict = "eligible" | "maybe" | "not_eligible";

export interface Evaluation {
  subsidy: Subsidy;
  verdict: Verdict;
  /** 對得上的條件 */
  matched: string[];
  /** 確定不符的條件 */
  failed: string[];
  /** 沒回答或無法自動判斷的條件 */
  unknown: string[];
}

const fmt = (n: number) => n.toLocaleString("zh-TW");

function checkIncome(c: SubsidyConditions, p: Profile, out: Evaluation) {
  if (c.income_limit_value == null) return;
  const type = (c.income_limit_type ?? "").toLowerCase();
  const note = c.income_limit_note ? `（${c.income_limit_note}）` : "";
  const limit = c.income_limit_value;
  const personal = /personal|individual|applicant/.test(type);
  const monthly = /month/.test(type);
  const annual = /annual|year/.test(type);

  if (personal && (monthly || annual)) {
    if (p.monthlyIncome == null) {
      out.unknown.push(`收入門檻：${monthly ? "每月" : "每年"} ${fmt(limit)} 元以下${note}，你沒填收入`);
      return;
    }
    const income = monthly ? p.monthlyIncome : p.monthlyIncome * 12;
    const label = monthly ? `月收入 ${fmt(limit)} 元以下` : `年收入 ${fmt(limit)} 元以下（以月收入 × 12 估算）`;
    if (income <= limit) out.matched.push(label + note);
    else out.failed.push(`${label}${note}，你的${monthly ? "月" : "年"}收入 ${fmt(income)} 元超過`);
    return;
  }
  // 家庭總所得、每人每月平均所得、財產等要全家一起算，app 只收個人月收入，交給使用者自行確認
  out.unknown.push(`收入或財產門檻：${c.income_limit_note ?? `${fmt(limit)} 元`}，需用全家所得自行核對`);
}

function checkChildren(c: SubsidyConditions, p: Profile, out: Evaluation) {
  const needsChildren = c.has_children === true;
  const hasAgeRange = c.child_age_min != null || c.child_age_max != null;
  if (!needsChildren && !hasAgeRange) return;

  const min = c.child_age_min ?? 0;
  const max = c.child_age_max ?? 99;
  const rangeLabel =
    c.child_age_min != null && c.child_age_max != null
      ? `${min}～${max} 歲子女`
      : c.child_age_max != null
        ? `${max} 歲以下子女`
        : c.child_age_min != null
          ? `${min} 歲以上子女`
          : "有子女";

  if (p.hasChildren === null) {
    out.unknown.push(`需${rangeLabel}，你沒填家庭狀況`);
    return;
  }
  if (p.hasChildren === false) {
    // 懷孕中或新生兒：即將符合的「有子女」條件先放到 maybe
    if (p.isPregnantOrNewborn && min === 0) {
      out.unknown.push(`需${rangeLabel}；你懷孕中或有新生兒，出生後即符合`);
      return;
    }
    out.failed.push(`需${rangeLabel}，你沒有子女`);
    return;
  }
  if (!hasAgeRange) {
    out.matched.push("有子女");
    return;
  }
  if (p.childrenAges.length === 0) {
    out.unknown.push(`需${rangeLabel}，你沒填子女年齡`);
    return;
  }
  const hit = p.childrenAges.some((a) => a >= min && a <= max);
  if (hit) out.matched.push(`有${rangeLabel}`);
  else out.failed.push(`需${rangeLabel}，你的子女年齡 ${p.childrenAges.join("、")} 歲不在範圍`);
}

function checkLowIncome(c: SubsidyConditions, p: Profile, out: Evaluation) {
  if (!c.low_income) return;
  const label =
    c.low_income === "low" ? "低收入戶" : c.low_income === "mid_low" ? "中低收入戶（含低收入戶）" : "低收或中低收入戶";
  if (p.lowIncome === null) {
    out.unknown.push(`限${label}，你沒填`);
    return;
  }
  if (p.lowIncome === "none") {
    out.failed.push(`限${label}，你不是`);
    return;
  }
  if (c.low_income === "low" && p.lowIncome !== "low") {
    out.failed.push(`限低收入戶，你是中低收入戶`);
    return;
  }
  out.matched.push(label);
}

function checkVehicle(c: SubsidyConditions, p: Profile, out: Evaluation) {
  if (!c.owns_vehicle) return;
  const need = c.owns_vehicle.toLowerCase();
  const label = /scooter|motor/.test(need) ? "有機車" : /car|auto/.test(need) ? "有汽車" : "有車輛";
  if (p.ownsVehicle === null) {
    out.unknown.push(`${label}才能申請，你沒填`);
    return;
  }
  if (p.ownsVehicle === "none") {
    out.failed.push(`${label}才能申請，你沒有車`);
    return;
  }
  const hasScooter = p.ownsVehicle === "scooter" || p.ownsVehicle === "both";
  const hasCar = p.ownsVehicle === "car" || p.ownsVehicle === "both";
  if (/scooter|motor/.test(need) && !hasScooter) out.failed.push("限機車車主，你只有汽車");
  else if (/car|auto/.test(need) && !/scooter|motor/.test(need) && !hasCar) out.failed.push("限汽車車主，你只有機車");
  else out.matched.push(label);
}

function checkBool(
  required: boolean | null | undefined,
  value: boolean | null,
  labels: { ok: string; fail: string; unknown: string },
  out: Evaluation
) {
  if (required !== true) return;
  if (value === null) out.unknown.push(labels.unknown);
  else if (value) out.matched.push(labels.ok);
  else out.failed.push(labels.fail);
}

export function evaluate(subsidy: Subsidy, profile: Profile): Evaluation {
  const out: Evaluation = { subsidy, verdict: "maybe", matched: [], failed: [], unknown: [] };
  const c = subsidy.conditions ?? {};

  if (subsidy.status_2026 === "ended") {
    out.failed.push("方案已結束");
  }

  // 縣市
  const cities = subsidy.city ? [subsidy.city] : c.cities && c.cities.length > 0 ? c.cities : null;
  if (cities) {
    if (!profile.city) out.unknown.push(`限${cities.join("、")}，你沒填縣市`);
    else if (cities.includes(profile.city)) out.matched.push(`設籍或居住${profile.city}`);
    else out.failed.push(`限${cities.join("、")}，你在${profile.city}`);
  }

  // 年齡
  if (c.min_age != null || c.max_age != null || c.is_elderly) {
    const min = c.is_elderly ? Math.max(c.min_age ?? 0, 65) : c.min_age;
    const label =
      min != null && c.max_age != null ? `${min}～${c.max_age} 歲` : c.max_age != null ? `${c.max_age} 歲以下` : `${min} 歲以上`;
    if (profile.age === null) out.unknown.push(`限${label}，你沒填年齡`);
    else if ((min == null || profile.age >= min) && (c.max_age == null || profile.age <= c.max_age)) out.matched.push(label);
    else out.failed.push(`限${label}，你 ${profile.age} 歲`);
  }

  // 居住狀況
  checkBool(c.must_rent, profile.isRenting, { ok: "租屋中", fail: "限租屋者，你不是租屋", unknown: "限租屋者，你沒填住的狀況" }, out);
  if (c.no_home_ownership === true) {
    if (profile.ownsHome === null) out.unknown.push("限名下無自有住宅，你沒填");
    else if (profile.ownsHome) out.failed.push("限本人、配偶及未成年子女名下無自有住宅，你有");
    else out.matched.push("名下無自有住宅");
  }
  checkBool(c.must_own_home, profile.ownsHome, { ok: "自有住宅", fail: "限自有住宅所有權人，你名下沒有房子", unknown: "限自有住宅所有權人，你沒填" }, out);

  // 家庭
  checkChildren(c, profile, out);
  checkBool(c.is_pregnant_or_newborn, profile.isPregnantOrNewborn, { ok: "懷孕中或有新生兒", fail: "限孕婦或新生兒家庭", unknown: "限孕婦或新生兒家庭，你沒填" }, out);
  checkBool(c.is_married, profile.isMarried, { ok: "已婚", fail: "限已婚", unknown: "限已婚，你沒填" }, out);

  // 身分
  checkBool(c.has_labor_insurance, profile.hasLaborInsurance, { ok: "勞保被保險人", fail: "限勞保被保險人，你沒有勞保", unknown: "限勞保被保險人，你沒填" }, out);
  checkBool(c.has_national_pension, profile.hasNationalPension, { ok: "國民年金被保險人", fail: "限國民年金被保險人，你沒有國保", unknown: "限國民年金被保險人，你沒填" }, out);
  checkBool(c.is_disabled, profile.isDisabled, { ok: "領有身心障礙證明", fail: "限領有身心障礙證明者", unknown: "限領有身心障礙證明者，你沒填" }, out);
  checkLowIncome(c, profile, out);
  checkBool(c.is_student, profile.isStudent, { ok: "在學學生", fail: "限在學學生", unknown: "限在學學生，你沒填" }, out);
  checkBool(c.is_unemployed, profile.isUnemployed, { ok: "非自願離職／失業中", fail: "限失業中（非自願離職）", unknown: "限失業中，你沒填" }, out);
  if (c.is_employed === true) {
    if (profile.isUnemployed === null) out.unknown.push("限在職者，你沒填");
    else if (profile.isUnemployed) out.failed.push("限在職者，你目前失業中");
    else out.matched.push("在職");
  }

  // 收入與車輛
  checkIncome(c, profile, out);
  checkVehicle(c, profile, out);

  // 無法機器判斷的其他條件
  if (c.other) out.unknown.push(c.other);

  out.verdict = out.failed.length > 0 ? "not_eligible" : out.unknown.length > 0 ? "maybe" : "eligible";
  return out;
}

const VERDICT_RANK: Record<Verdict, number> = { eligible: 0, maybe: 1, not_eligible: 2 };

/**
 * 全部項目的評估結果，依「符合 → 可能 → 不符」再依截止日排序。
 * today 由呼叫端（client）提供，才能依使用者裝置的日期排序。
 */
export function evaluateAll(subsidies: Subsidy[], profile: Profile, today: LocalDate): Evaluation[] {
  const rows = subsidies.map((s) => evaluate(s, profile));
  const daysOf = (s: Subsidy) => {
    const st = resolveSubsidyDeadline(s, today);
    return st.kind === "upcoming" && st.open ? st.daysLeft : 10_000;
  };
  return rows.sort((a, b) => {
    const v = VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict];
    if (v !== 0) return v;
    // 有確定符合條件數多的排前面（資訊更具體）
    const m = b.matched.length - a.matched.length;
    if (m !== 0) return m;
    return daysOf(a.subsidy) - daysOf(b.subsidy);
  });
}

export function summarize(evaluations: Evaluation[]) {
  return {
    eligible: evaluations.filter((e) => e.verdict === "eligible").length,
    maybe: evaluations.filter((e) => e.verdict === "maybe").length,
    notEligible: evaluations.filter((e) => e.verdict === "not_eligible").length,
  };
}
