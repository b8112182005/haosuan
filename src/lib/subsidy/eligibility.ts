import type { ConditionExceptionKey, SubsidyConditions, SubsidySummary } from "./types";
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

/**
 * 記錄一條「確定不符」。條文對這個條件另有例外（conditions.exceptions）時，
 * app 判斷不了使用者算不算例外，所以改列「可能符合」並把例外講出來，不直接排除。
 */
type Fail = (field: ConditionExceptionKey, text: string) => void;

function checkIncome(c: SubsidyConditions, p: Profile, out: Evaluation, fail: Fail) {
  const type = (c.income_limit_type ?? "").toLowerCase();
  if (c.income_limit_value == null) {
    // 資料寫了門檻類型（每人每月平均所得、家庭總收入…）卻沒有可比對的數字：門檻確實存在，app 判斷不了，
    // 不能當成沒有條件。none 是沒有門檻；listed_* 是「列冊低收」這類身分，已由 low_income 處理。
    if (type && type !== "none" && !type.startsWith("listed") && c.income_limit_note) {
      out.unknown.push(`所得或財產門檻：${c.income_limit_note}（要用全家資料核對）`);
    }
    return;
  }
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
    else fail("income", `${label}，你的${monthly ? "月" : "年"}收入約 ${fmt(income)} 元，超過門檻`);
    return;
  }
  // 家庭總所得、每人每月平均所得、財產等要全家一起算，app 只收個人月收入
  out.unknown.push(`所得或財產門檻：${c.income_limit_note ?? `${fmt(limit)} 元`}（要用全家資料核對）`);
}

function checkChildren(c: SubsidyConditions, p: Profile, out: Evaluation, fail: Fail) {
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
    fail("children", `需有${rangeLabel}，你沒有子女`);
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
  // 懷第二胎：現在的孩子超過年齡，但即將出生的那一個會符合
  else if (p.isPregnantOrNewborn && min === 0) out.unknown.push(`需有${rangeLabel}；你的子女 ${p.childrenAges.join("、")} 歲不在範圍，但你懷孕中或有新生兒，出生後即符合`);
  else fail("children", `需有${rangeLabel}，你的子女 ${p.childrenAges.join("、")} 歲不在範圍`);
}

function checkLowIncome(c: SubsidyConditions, p: Profile, out: Evaluation, fail: Fail) {
  if (!c.low_income) return;
  const label =
    c.low_income === "low" ? "低收入戶" : c.low_income === "mid_low" ? "中低收入戶（含低收入戶）" : "低收或中低收入戶";
  if (p.lowIncome === null) {
    out.unknown.push(`限${label}，你沒填`);
    return;
  }
  if (p.lowIncome === "none") {
    fail("low_income", `限${label}，你不是`);
    return;
  }
  if (c.low_income === "low" && p.lowIncome !== "low") {
    fail("low_income", `限低收入戶，你是中低收入戶`);
    return;
  }
  out.matched.push(label);
}

/**
 * owns_vehicle 是研究員寫的自由文字（「汽車或機車」「持有出廠滿 10 年的燃油機車…」）。
 * 只抓「機車／汽車」關鍵字；寫 optional 或在講動產計算的不是持有條件，略過。
 */
function checkVehicle(c: SubsidyConditions, p: Profile, out: Evaluation, fail: Fail) {
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
    fail("vehicle", `${label}才適用，你沒有車`);
    return;
  }
  const hasScooter = p.ownsVehicle === "scooter" || p.ownsVehicle === "both";
  const hasCar = p.ownsVehicle === "car" || p.ownsVehicle === "both";
  if (wantsScooter && !wantsCar && !hasScooter) fail("vehicle", "限機車車主，你只有汽車");
  else if (wantsCar && !wantsScooter && !hasCar) fail("vehicle", "限汽車車主，你只有機車");
  else out.matched.push(label);
}

function checkAge(c: SubsidyConditions, p: Profile, out: Evaluation, fail: Fail) {
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
  // 「一般 65 歲、原住民 55 歲」這類放寬：精靈沒問身分，年齡落在兩個門檻之間的人不能直接排除
  const alt = c.lower_age_for;
  if (alt && min != null && p.age < min && p.age >= alt.age && (max == null || p.age <= max)) {
    out.unknown.push(`一般要滿 ${min} 歲；${alt.who}滿 ${alt.age} 歲就適用，請自行確認是否符合`);
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
  fail("age", `限${label}，你 ${p.age} 歲`);
}

/**
 * 學生項目（就學貸款、學雜費減免、高中職免學費）常是家長在查。
 * 本人不是學生但有 6～24 歲子女時歸 maybe，不直接排除。
 */
function checkStudent(c: SubsidyConditions, p: Profile, out: Evaluation, fail: Fail) {
  if (c.is_student === false) {
    // 限未在學（初次尋職、青年就業獎勵這類）
    if (p.isStudent === null) out.unknown.push("限未在學的人，你沒填");
    else if (p.isStudent) fail("is_student", "限未在學的人，你是在學學生");
    else out.matched.push("未在學");
    return;
  }
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
  else fail("is_student", "限在學學生");
}

function checkBool(
  field: ConditionExceptionKey,
  required: boolean | null | undefined,
  value: boolean | null,
  labels: { ok: string; fail: string; unknown: string },
  out: Evaluation,
  fail: Fail
) {
  if (required !== true) return;
  if (value === null) out.unknown.push(labels.unknown);
  else if (value) out.matched.push(labels.ok);
  else fail(field, labels.fail);
}

/**
 * 資料寫 false 的條件＝「不能有」：無保險生母補助限沒有勞保、國保的人，國保保費補助限沒有勞保的人。
 * 只用在勞保與國保；其他欄位的 false 是研究員寫的「不需要」，沒有意義（must_own_home:false、is_elderly:false）。
 */
function checkMustNot(
  field: ConditionExceptionKey,
  required: boolean | null | undefined,
  value: boolean | null,
  labels: { ok: string; fail: string; unknown: string },
  out: Evaluation,
  fail: Fail
) {
  if (required !== false) return;
  if (value === null) out.unknown.push(labels.unknown);
  else if (value) fail(field, labels.fail);
  else out.matched.push(labels.ok);
}

/**
 * today 有給的時候，申請期限已過的項目（有 end_year 而且過了、或期限型別是 ended）直接判不符合：
 * 內建資料要等發新版 app 才會換掉，過期的項目不能一直掛在「條件相符」。
 */
export function evaluate<S extends SubsidySummary>(subsidy: S, profile: Profile, today?: LocalDate): Evaluation<S> {
  const out: Evaluation<S> = { subsidy, verdict: "maybe", matched: [], failed: [], unknown: [], notes: [] };
  const c = subsidy.conditions ?? {};
  const exceptions = c.exceptions ?? {};
  const fail: Fail = (field, text) => {
    const note = exceptions[field]?.trim();
    if (note) out.unknown.push(`${text}。例外：${note}`);
    else out.failed.push(text);
  };

  // 方案結束、期限已過與地方項目的縣市是沒有例外的硬條件，直接記在 failed
  if (subsidy.status_2026 === "ended") {
    out.failed.push("方案已結束");
  } else if (today) {
    const deadline = resolveSubsidyDeadline(subsidy, today);
    if (deadline.kind === "ended") out.failed.push(`申請期限已過（${deadline.label}）`);
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

  checkAge(c, profile, out, fail);

  // 居住狀況
  checkBool("must_rent", c.must_rent, profile.isRenting, { ok: "租屋中", fail: "限租屋者，你不是租屋", unknown: "限租屋者，你沒填住的狀況" }, out, fail);
  if (c.no_home_ownership === true) {
    if (profile.ownsHome === null) out.unknown.push("限名下無自有住宅，你沒填");
    else if (profile.ownsHome) fail("no_home_ownership", "限本人、配偶及未成年子女名下無自有住宅，你有");
    else out.matched.push("名下無自有住宅");
  }
  checkBool("must_own_home", c.must_own_home, profile.ownsHome, { ok: "自有住宅", fail: "限自有住宅所有權人，你名下沒有房子", unknown: "限自有住宅所有權人，你沒填" }, out, fail);

  // 家庭
  checkChildren(c, profile, out, fail);
  checkBool("is_pregnant_or_newborn", c.is_pregnant_or_newborn, profile.isPregnantOrNewborn, { ok: "懷孕中或有新生兒", fail: "限孕婦或新生兒家庭", unknown: "限孕婦或新生兒家庭，你沒填" }, out, fail);
  checkBool("is_married", c.is_married, profile.isMarried, { ok: "已婚", fail: "限已婚", unknown: "限已婚，你沒填" }, out, fail);

  // 身分
  checkBool("has_labor_insurance", c.has_labor_insurance, profile.hasLaborInsurance, { ok: "勞保被保險人", fail: "限勞保被保險人，你沒有勞保", unknown: "限勞保被保險人，你沒填" }, out, fail);
  checkBool("has_national_pension", c.has_national_pension, profile.hasNationalPension, { ok: "國民年金被保險人", fail: "限國民年金被保險人，你沒有國保", unknown: "限國民年金被保險人，你沒填" }, out, fail);
  checkMustNot("has_labor_insurance", c.has_labor_insurance, profile.hasLaborInsurance, { ok: "沒有勞保", fail: "限沒有勞保的人，你有勞保", unknown: "限沒有勞保的人，你沒填" }, out, fail);
  checkMustNot("has_national_pension", c.has_national_pension, profile.hasNationalPension, { ok: "沒有國保", fail: "限沒有國民年金保險的人，你有國保", unknown: "限沒有國民年金保險的人，你沒填" }, out, fail);
  checkBool("is_disabled", c.is_disabled, profile.isDisabled, { ok: "領有身心障礙證明", fail: "限領有身心障礙證明者", unknown: "限領有身心障礙證明者，你沒填" }, out, fail);
  checkLowIncome(c, profile, out, fail);
  checkStudent(c, profile, out, fail);
  // is_employed:false 和 is_unemployed:true 是同一件事，資料裡兩種寫法都有
  const needUnemployed = c.is_unemployed === true || c.is_employed === false;
  checkBool("is_unemployed", needUnemployed, profile.isUnemployed, { ok: "目前沒有工作", fail: "限目前沒有工作（待業或失業）的人", unknown: "限待業或失業中，你沒填" }, out, fail);
  if (c.is_employed === true) {
    if (profile.isUnemployed === null) out.unknown.push("限在職者，你沒填");
    else if (profile.isUnemployed) fail("is_employed", "限在職者，你目前失業中");
    else out.matched.push("在職");
  }

  // 收入與車輛
  checkIncome(c, profile, out, fail);
  checkVehicle(c, profile, out, fail);

  // 精靈沒有問的身分：無法確認，但也不能當成「條件相符」（否則老農津貼會出現在每個長者的相符清單）
  if (c.special_identity && c.special_identity.trim()) {
    out.unknown.push(`限${c.special_identity.trim()}：這一題 app 沒有問，請自行確認`);
  }

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
  const rows = subsidies.map((s) => evaluate(s, profile, today));
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
