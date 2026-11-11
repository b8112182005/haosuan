import type { SubsidyConditions, SubsidySummary } from "./types";
import type { Profile } from "./profile";
import { resolveSubsidyDeadline, type LocalDate } from "./deadline";

/**
 * 資格判斷：把補助的機器可讀條件（conditions）逐條對照使用者條件。
 * 三種結果：
 * - eligible：每一條能自動比對的條件都對得上
 * - maybe：沒有任何一條確定不符，但有條件使用者沒回答、或只能用全家資料人工判斷
 * - not_eligible：至少一條確定不符（或方案已結束）
 *
 * conditions.other 是研究員寫的自由文字（幾乎每筆都有），無法比對，
 * 放進 notes 給使用者自己看，不影響 verdict——否則所有項目都只會是「可能符合」。
 * 文字全部給一般人看，所以用「你」當主詞、直接講原因。
 */

export type Verdict = "eligible" | "maybe" | "not_eligible";

export interface Evaluation<S extends SubsidySummary = SubsidySummary> {
  subsidy: S;
  verdict: Verdict;
  /** 對得上的條件 */
  matched: string[];
  /** 確定不符的條件 */
  failed: string[];
  /** 沒回答或無法自動判斷的條件 */
  unknown: string[];
  /** 無法比對、要使用者自行確認的補充條件（不影響 verdict） */
  notes: string[];
}

const fmt = (n: number) => n.toLocaleString("zh-TW");

function checkIncome(c: SubsidyConditions, p: Profile, out: Evaluation) {
  if (c.income_limit_value == null) return;
  const type = (c.income_limit_type ?? "").toLowerCase();
  const limit = c.income_limit_value;

  // 稅率門檻（例如「適用稅率 20% 以上不能扣」）：不是金額，交給使用者對照自己的報稅級距
  if (/tax_rate|稅率/.test(type)) {
    out.unknown.push(`綜所稅稅率門檻：${c.income_limit_note ?? `適用稅率 ${limit}% 以上不適用`}`);
    return;
  }

  const note = c.income_limit_note ? `（${c.income_limit_note}）` : "";
  // 「本人／個人」才拿使用者填的個人收入比；家庭、每人平均（per_capita）一律無法自動判斷
  const household = /household|family|per_capita|家庭|家戶|每人/.test(type);
  const personal = !household && /personal|individual|applicant|本人|個人/.test(type);
  const annual = /annual|year|年/.test(type);
  const monthly = !annual && /month|月/.test(type);

  if (personal && (monthly || annual)) {
    if (p.monthlyIncome == null) {
      out.unknown.push(`個人收入門檻：${monthly ? "每月" : "每年"} ${fmt(limit)} 元以下${note}，你沒填收入`);
      return;
    }
    const income = monthly ? p.monthlyIncome : p.monthlyIncome * 12;
    const label = monthly ? `個人月收入 ${fmt(limit)} 元以下` : `個人年所得 ${fmt(limit)} 元以下（以月收入 × 12 估算）`;
    if (income <= limit) out.matched.push(label);
    else out.failed.push(`${label}，你的${monthly ? "月" : "年"}收入約 ${fmt(income)} 元，超過門檻`);
    return;
  }
  // 家庭總所得、每人每月平均所得、財產等要全家一起算，app 只收個人月收入
  out.unknown.push(`所得或財產門檻：${c.income_limit_note ?? `${fmt(limit)} 元`}（要用全家資料核對）`);
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
          : "子女";

  if (p.hasChildren === null) {
    out.unknown.push(`需有${rangeLabel}，你沒填家庭狀況`);
    return;
  }
  if (p.hasChildren === false) {
    // 懷孕中或新生兒：即將符合的「有子女」條件先放到 maybe
    if (p.isPregnantOrNewborn && min === 0) {
      out.unknown.push(`需有${rangeLabel}；你懷孕中或有新生兒，出生後即符合`);
      return;
    }
    out.failed.push(`需有${rangeLabel}，你沒有子女`);
    return;
  }
  if (!hasAgeRange) {
    out.matched.push("有子女");
    return;
  }
  if (p.childrenAges.length === 0) {
    out.unknown.push(`需有${rangeLabel}，你沒填子女年齡`);
    return;
  }
  const hit = p.childrenAges.some((a) => a >= min && a <= max);
  if (hit) out.matched.push(`有${rangeLabel}`);
  else out.failed.push(`需有${rangeLabel}，你的子女 ${p.childrenAges.join("、")} 歲不在範圍`);
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

/**
 * owns_vehicle 是研究員寫的自由文字（「汽車或機車」「持有出廠滿 10 年的燃油機車…」）。
 * 只抓「機車／汽車」關鍵字；寫 optional 或在講動產計算的不是持有條件，略過。
 */
function checkVehicle(c: SubsidyConditions, p: Profile, out: Evaluation) {
  const raw = c.owns_vehicle?.trim();
  if (!raw) return;
  const need = raw.toLowerCase();
  if (need === "optional" || need === "none" || /動產/.test(need)) return;

  const wantsScooter = /機車|scooter|motor/.test(need);
  const wantsCar = /汽車|小客|貨車|\bcar\b|auto/.test(need);
  const label = wantsScooter && !wantsCar ? "名下有機車" : wantsCar && !wantsScooter ? "名下有汽車" : "名下有汽車或機車";

  if (p.ownsVehicle === null) {
    out.unknown.push(`${label}才適用，你沒填`);
    return;
  }
  if (p.ownsVehicle === "none") {
    out.failed.push(`${label}才適用，你沒有車`);
    return;
  }
  const hasScooter = p.ownsVehicle === "scooter" || p.ownsVehicle === "both";
  const hasCar = p.ownsVehicle === "car" || p.ownsVehicle === "both";
  if (wantsScooter && !wantsCar && !hasScooter) out.failed.push("限機車車主，你只有汽車");
  else if (wantsCar && !wantsScooter && !hasCar) out.failed.push("限汽車車主，你只有機車");
  else out.matched.push(label);
}

function checkAge(c: SubsidyConditions, p: Profile, out: Evaluation) {
  // is_elderly 沒附 min_age 時才用 65；有附就照資料（例如勞保老年給付 60 歲）
  const min = c.min_age ?? (c.is_elderly ? 65 : null);
  const max = c.max_age ?? null;
  if (min == null && max == null) return;

  const label = min != null && max != null ? `${min}～${max} 歲` : max != null ? `${max} 歲以下` : `${min} 歲以上`;
  if (p.age === null) {
    out.unknown.push(`限${label}，你沒填年齡`);
    return;
  }
  const inRange = (age: number) => (min == null || age >= min) && (max == null || age <= max);
  if (inRange(p.age)) {
    out.matched.push(label);
    return;
  }
  // 給兒少的項目（文化幣、HPV 疫苗、學生補助）：家長查詢時，子女在範圍內就值得看
  if (max != null && max <= 22) {
    const kids = p.childrenAges.filter(inRange);
    if (kids.length > 0) {
      out.unknown.push(`限${label}：你本人不在範圍，但你的子女（${kids.join("、")} 歲）在範圍內`);
      return;
    }
  }
  out.failed.push(`限${label}，你 ${p.age} 歲`);
}

/**
 * 學生項目（就學貸款、學雜費減免、高中職免學費）常是家長在查。
 * 本人不是學生但有 6～24 歲子女時歸 maybe，不直接排除。
 */
function checkStudent(c: SubsidyConditions, p: Profile, out: Evaluation) {
  if (c.is_student !== true) return;
  if (p.isStudent === true) {
    out.matched.push("在學學生");
    return;
  }
  const schoolAgeKids = p.childrenAges.filter((a) => a >= 6 && a <= 24);
  if (schoolAgeKids.length > 0) {
    out.unknown.push(`限在學學生：你的子女（${schoolAgeKids.join("、")} 歲）在學的話適用`);
    return;
  }
  if (p.isStudent === null) out.unknown.push("限在學學生，你沒填");
  else out.failed.push("限在學學生");
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

export function evaluate<S extends SubsidySummary>(subsidy: S, profile: Profile): Evaluation<S> {
  const out: Evaluation<S> = { subsidy, verdict: "maybe", matched: [], failed: [], unknown: [], notes: [] };
  const c = subsidy.conditions ?? {};

  if (subsidy.status_2026 === "ended") {
    out.failed.push("方案已結束");
  }

  // 縣市：地方項目（subsidy.city）是硬條件；全國項目附的 cities 只是資料整理到的代表縣市
  if (subsidy.city) {
    if (!profile.city) out.unknown.push(`限${subsidy.city}，你沒填縣市`);
    else if (subsidy.city === profile.city) out.matched.push(`設籍或居住${profile.city}`);
    else out.failed.push(`限${subsidy.city}，你在${profile.city}`);
  } else if (c.cities && c.cities.length > 0) {
    if (!profile.city) out.unknown.push(`各縣市辦法不同（已整理：${c.cities.join("、")}），你沒填縣市`);
    else if (c.cities.includes(profile.city)) out.matched.push(`${profile.city}有辦理`);
    else out.unknown.push(`資料只整理了${c.cities.join("、")}；${profile.city}是否辦理要問當地政府`);
  }

  checkAge(c, profile, out);

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
  checkStudent(c, profile, out);
  checkBool(c.is_unemployed, profile.isUnemployed, { ok: "目前沒有工作", fail: "限目前沒有工作（待業或失業）的人", unknown: "限待業或失業中，你沒填" }, out);
  if (c.is_employed === true) {
    if (profile.isUnemployed === null) out.unknown.push("限在職者，你沒填");
    else if (profile.isUnemployed) out.failed.push("限在職者，你目前失業中");
    else out.matched.push("在職");
  }

  // 收入與車輛
  checkIncome(c, profile, out);
  checkVehicle(c, profile, out);

  // 無法機器判斷的補充條件：只提示，不影響 verdict
  if (c.other && c.other.trim()) out.notes.push(c.other.trim());

  out.verdict = out.failed.length > 0 ? "not_eligible" : out.unknown.length > 0 ? "maybe" : "eligible";
  return out;
}

const VERDICT_RANK: Record<Verdict, number> = { eligible: 0, maybe: 1, not_eligible: 2 };

/**
 * 全部項目的評估結果，依「符合 → 可能 → 不符」排序；同一組內，
 * 對得上的條件越多越前面（越貼近這個人），再依截止日近的在前。
 * today 由呼叫端（client）提供，才能依使用者裝置的日期排序。
 */
export function evaluateAll<S extends SubsidySummary>(subsidies: S[], profile: Profile, today: LocalDate): Evaluation<S>[] {
  const rows = subsidies.map((s) => evaluate(s, profile));
  const daysOf = (s: S) => {
    const st = resolveSubsidyDeadline(s, today);
    return st.kind === "upcoming" && st.open ? st.daysLeft : 10_000;
  };
  return rows.sort((a, b) => {
    const v = VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict];
    if (v !== 0) return v;
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
