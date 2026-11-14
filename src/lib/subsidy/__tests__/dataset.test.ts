import { describe, it, expect } from "vitest";
import dataset from "../../../data/subsidies.json";
import { evaluate, evaluateAll } from "../eligibility";
import { resolveDeadline } from "../deadline";
import { EMPTY_PROFILE, type Profile } from "../profile";
import type { Subsidy } from "../types";
import { tools } from "../../tools-registry";

/**
 * 針對「實際資料」的回歸測試。
 * 這個 app 最不能犯的錯是把使用者能領的補助判成「不符合」而藏起來——
 * 研究員曾把加碼條件寫成必要條件（例如中央租金補貼被標成「需有子女」），
 * 這裡用幾個典型使用者鎖住旗艦項目的判斷。資料重建後若這裡變紅，先查 research/overrides.json。
 */

const items = dataset.items as unknown as Subsidy[];
const byId = (id: string): Subsidy => {
  const s = items.find((i) => i.id === id);
  if (!s) throw new Error(`資料裡找不到 ${id}（改名或被移除了？）`);
  return s;
};

const base: Profile = {
  ...EMPTY_PROFILE,
  isMarried: false,
  hasChildren: false,
  isPregnantOrNewborn: false,
  hasLaborInsurance: true,
  hasNationalPension: false,
  isDisabled: false,
  lowIncome: "none",
  isStudent: false,
  isUnemployed: false,
  ownsVehicle: "scooter",
  ownsHome: false,
};

const renter: Profile = { ...base, city: "台北市", age: 30, monthlyIncome: 40_000, isRenting: true };
const parent: Profile = {
  ...base,
  city: "新北市",
  age: 35,
  monthlyIncome: 60_000,
  isRenting: false,
  ownsHome: true,
  isMarried: true,
  hasChildren: true,
  childrenAges: [1, 4],
  ownsVehicle: "both",
};
const elder: Profile = {
  ...base,
  city: "高雄市",
  age: 72,
  monthlyIncome: 8_000,
  isRenting: false,
  ownsHome: true,
  hasLaborInsurance: false,
  ownsVehicle: "none",
};
const student: Profile = { ...base, city: "台中市", age: 20, monthlyIncome: 0, isRenting: true, isStudent: true, hasLaborInsurance: false };
const jobless: Profile = { ...base, city: "桃園市", age: 41, monthlyIncome: 0, isRenting: true, hasLaborInsurance: false, isUnemployed: true };

const notHidden = (id: string, p: Profile) => {
  const r = evaluate(byId(id), p);
  expect(r.verdict, `${id} 被判不符合：${r.failed.join("；")}`).not.toBe("not_eligible");
};

describe("資料集基本檢查", () => {
  it("id 不重複、每筆都有來源與 https 官方網址", () => {
    const ids = new Set<string>();
    for (const s of items) {
      expect(ids.has(s.id), `id 重複 ${s.id}`).toBe(false);
      ids.add(s.id);
      expect(s.sources.length, `${s.id} 沒有來源`).toBeGreaterThan(0);
      expect(s.official_url, s.id).toMatch(/^https?:\/\//);
      expect(s.faqs.length, `${s.id} 問答少於 3 則`).toBeGreaterThanOrEqual(3);
    }
  });

  it("related_calculator 都指向存在的計算機", () => {
    const slugs = new Set(tools.map((t) => t.slug));
    for (const s of items) {
      if (s.related_calculator) expect(slugs.has(s.related_calculator), `${s.id} → ${s.related_calculator}`).toBe(true);
    }
  });

  it("有固定期限的項目月份與日期在合理範圍", () => {
    for (const s of items) {
      const d = s.deadline;
      if (d.end_month != null) expect(d.end_month >= 1 && d.end_month <= 12, s.id).toBe(true);
      if (d.end_day != null) expect(d.end_day >= 1 && d.end_day <= 31, s.id).toBe(true);
      if (d.type === "fixed_annual") expect(d.end_month, `${s.id} fixed_annual 卻沒有截止月份`).not.toBeNull();
    }
  });

  it("什麼都沒填時，沒有任何進行中的項目被判不符合", () => {
    const active = items.filter((s) => s.status_2026 !== "ended");
    const failed = evaluateAll(active, EMPTY_PROFILE, { y: 2026, m: 11, d: 11 }).filter((e) => e.verdict === "not_eligible");
    expect(failed.map((e) => e.subsidy.id)).toEqual([]);
  });
});

describe("期限顯示（以 2026-11-15 為今天）", () => {
  const today = { y: 2026, m: 11, d: 15 };
  const state = (id: string) => resolveDeadline(byId(id).deadline, today);

  it("跨年度的方案用公告的年份，不會顯示成今年底截止", () => {
    for (const [id, y, m, d] of [
      ["ev-license-tax-exemption", 2030, 12, 31],
      ["ev-commodity-tax-exemption", 2030, 12, 31],
      ["youth-safe-home-loan-3", 2029, 7, 31],
      ["vulnerable-extra-living-allowance-2026", 2027, 1, 31],
    ] as const) {
      const st = state(id);
      expect(st.kind, id).toBe("upcoming");
      if (st.kind === "upcoming") {
        expect(st.date, id).toEqual({ y, m, d });
        expect(st.open, `${id} 應該在期間內`).toBe(true);
      }
    }
  });

  it("就學貸款有上、下學期兩段：11 月看到的是 1/15 開始的下學期", () => {
    const st = state("student-loan-2026");
    expect(st.kind).toBe("upcoming");
    if (st.kind === "upcoming") {
      expect(st.open).toBe(false);
      expect(st.start).toEqual({ y: 2027, m: 1, d: 15 });
      expect(st.date).toEqual({ y: 2027, m: 2, d: 28 });
    }
  });

  it("只辦 115 年度的方案過了截止日顯示已截止，不會滾到 2027 年", () => {
    const afterNewYear = { y: 2027, m: 1, d: 5 };
    for (const id of [
      "home-appliance-replacement-subsidy",
      "electric-scooter-purchase-subsidy-moea",
      "old-vehicle-replacement-moenv",
      "taipei-electric-scooter-subsidy-2026",
      "taoyuan-electric-scooter-subsidy-2026",
      "taichung-low-carbon-vehicle-subsidy-2026",
      "tainan-electric-two-wheeler-subsidy-2026",
      "new-taipei-electric-scooter-subsidy-2026",
    ]) {
      expect(resolveDeadline(byId(id).deadline, afterNewYear).kind, id).toBe("ended");
      expect(state(id).kind, `${id} 今天應該還在期間內`).toBe("upcoming");
    }
  });

  it("各縣市、各校自訂期限的項目不顯示倒數", () => {
    for (const id of [
      "old-house-renewal-repair-subsidy",
      "low-income-tuition-waiver",
      "disabled-preschooler-education-subsidy",
      "disadvantaged-college-student-grant-2026",
      "elderly-denture-subsidy",
      "home-purchase-loan-interest-subsidy",
      "home-repair-loan-interest-subsidy",
      "central-social-housing-rental",
      "indigenous-college-scholarship",
      "regional-revitalization-youth-station-2026",
      "minimum-wage-2026",
    ]) {
      expect(state(id), id).toEqual({ kind: "none", label: "依公告為準" });
    }
  });

  it("期限說明提到比今年晚的截止年份時，資料要填 end_year", () => {
    // 「到 2030 年 12 月 31 日」「至 118 年 7 月 31 日」這種寫法卻沒填年份，app 會把它算成今年或明年
    const suspicious: string[] = [];
    for (const s of items) {
      const d = s.deadline;
      if (!d.end_month || d.end_year || s.status_2026 === "ended") continue;
      const day = d.end_day ?? 31;
      const patterns = [
        new RegExp(`(20(?:2[89]|[3-9]\\d))\\s*年?[^。；]{0,12}?${d.end_month}\\s*月\\s*${day}\\s*日`),
        // 民國 117 年（2028）以後
        new RegExp(`(11[7-9]|12\\d)\\s*年[^。；]{0,12}?${d.end_month}\\s*月\\s*${day}\\s*日`),
        new RegExp(`(20(?:2[89]|[3-9]\\d))-${String(d.end_month).padStart(2, "0")}-${String(day).padStart(2, "0")}`),
      ];
      if (patterns.some((p) => p.test(d.note))) suspicious.push(s.id);
    }
    expect(suspicious).toEqual([]);
  });
});

describe("旗艦項目不能被誤判成不符合", () => {
  it("單身租屋上班族：中央租金補貼、台北加碼、房租扣除額、新青安", () => {
    notHidden("rent-subsidy-central-300b", renter);
    notHidden("rent-subsidy-taipei-topup", renter);
    notHidden("income-tax-rent-deduction", renter);
    notHidden("youth-safe-home-loan-3", renter);
    notHidden("central-social-housing-rental", renter);
    notHidden("labor-insurance-relief-loan", renter);
  });

  it("育兒家庭（1 歲與 4 歲）：育兒津貼、托育補助、幼兒園學費、學前扣除額、育嬰留停", () => {
    notHidden("childcare-allowance-0-2", parent);
    notHidden("toddler-care-subsidy-0-2", parent);
    notHidden("preschool-fee-cap-2-6", parent);
    notHidden("income-tax-preschool-deduction", parent);
    notHidden("parental-leave-allowance", parent);
    // 有房的人不該看到租金補貼被列為符合
    expect(evaluate(byId("rent-subsidy-central-300b"), parent).verdict).toBe("not_eligible");
  });

  it("72 歲長者（沒填低收身分以外的補助資格）：老人津貼、敬老卡、健保費補助、假牙、長照", () => {
    notHidden("mid-low-income-elderly-allowance", elder);
    notHidden("kaohsiung-senior-card-and-chongyang", elder);
    notHidden("elderly-nhi-premium-subsidy", elder);
    notHidden("elderly-denture-subsidy", elder);
    notHidden("long-term-care-2", elder);
    notHidden("low-income-household-thresholds-2026", elder);
  });

  it("20 歲大學生：文化幣、就學貸款、弱勢助學、租金補貼", () => {
    notHidden("culture-coin-youth-2026", student);
    notHidden("student-loan-2026", student);
    notHidden("disadvantaged-college-student-grant-2026", student);
    notHidden("rent-subsidy-central-300b", student);
  });

  it("41 歲失業者（已退保）：失業給付、職訓津貼、失業健保費補助、提早就業獎助", () => {
    notHidden("unemployment-benefit", jobless);
    notHidden("vocational-training-living-allowance", jobless);
    notHidden("nhi-premium-subsidy-unemployed", jobless);
    notHidden("early-reemployment-bonus", jobless);
    notHidden("occupational-accident-and-wage-arrears", { ...jobless, hasLaborInsurance: true });
  });

  it("家長替 16 歲子女查：就學貸款、高中職免學費不會被藏起來", () => {
    const withTeen: Profile = { ...parent, childrenAges: [16] };
    notHidden("student-loan-2026", withTeen);
    notHidden("senior-high-tuition-free", withTeen);
  });

  it("精靈沒問的身分（農民、原住民、新住民、純電動車）不會被列為條件相符", () => {
    for (const id of ["elderly-farmer-allowance", "indigenous-college-scholarship", "new-immigrant-scholarship", "ev-license-tax-exemption"]) {
      const s = byId(id);
      for (const p of [renter, parent, elder, student]) {
        expect(evaluate(s, p).verdict, `${id} 對沒有該身分的人顯示為條件相符`).not.toBe("eligible");
      }
    }
  });

  it("家長替身障幼兒、弱勢兒少查：本人沒有身障證明、超過 17 歲也不會被排除", () => {
    const withKid: Profile = { ...parent, childrenAges: [4] };
    notHidden("disabled-preschooler-education-subsidy", withKid);
    notHidden("disadvantaged-children-youth-living-assistance", withKid);
    notHidden("special-circumstances-family-assistance", renter);
  });

  it("58 歲（一般門檻 65 歲、原住民 55 歲起的項目）：敬老卡、假牙、長者健保費補助不會被藏起來", () => {
    const at58: Profile = { ...elder, age: 58 };
    notHidden("kaohsiung-senior-card-and-chongyang", at58);
    notHidden("taipei-senior-card-and-chongyang", { ...at58, city: "台北市" });
    notHidden("new-taipei-senior-card-and-chongyang", { ...at58, city: "新北市" });
    notHidden("elderly-denture-subsidy", at58);
    notHidden("elderly-nhi-premium-subsidy", at58);
    // 54 歲連放寬門檻都沒到，照樣排除
    expect(evaluate(byId("kaohsiung-senior-card-and-chongyang"), { ...elder, age: 54 }).verdict).toBe("not_eligible");
  });

  it("56 歲有舊制年資的人：勞保老年給付不會被藏起來", () => {
    notHidden("labor-insurance-old-age-pension-age", { ...renter, age: 56 });
    expect(evaluate(byId("labor-insurance-old-age-pension-age"), { ...renter, age: 45 }).verdict).toBe("not_eligible");
  });

  it("條文有例外的人不會被藏起來（2026-11-15 獨立稽核找到的項目）", () => {
    // 離職退保後 1 年內生產
    const newMom: Profile = { ...jobless, age: 30, isPregnantOrNewborn: true, hasLaborInsurance: false, hasNationalPension: false };
    notHidden("labor-insurance-maternity-benefit", newMom);
    notHidden("national-pension-maternity-benefit", newMom);
    // 房東：名下有房、不是租屋
    const landlord: Profile = { ...base, city: "台北市", age: 50, monthlyIncome: 80_000, isRenting: false, ownsHome: true };
    notHidden("social-housing-sublet-management", landlord);
    notHidden("rental-dispute-complaint-channels", landlord);
    // 只有土地、名下沒有房子
    notHidden("land-value-tax-november", { ...landlord, ownsHome: false });
    // 名下有房但在外地租屋、或 2 年內剛買房
    const ownerRenter: Profile = { ...renter, ownsHome: true };
    notHidden("income-tax-rent-deduction", ownerRenter);
    notHidden("home-purchase-loan-interest-subsidy", ownerRenter);
    notHidden("central-social-housing-rental", ownerRenter);
    notHidden("rent-subsidy-central-300b", ownerRenter);
    // 62 歲已退休
    const retired: Profile = { ...base, city: "台中市", age: 62, monthlyIncome: 0, isRenting: false, ownsHome: true, isUnemployed: true, hasLaborInsurance: false };
    notHidden("labor-pension-voluntary-contribution", retired);
    // 沒被雇主加保的勞工
    notHidden("occupational-accident-and-wage-arrears", { ...renter, hasLaborInsurance: false });
    // 一般戶但領有身障生活補助
    notHidden("vulnerable-extra-living-allowance-2026", { ...renter, isDisabled: true, lowIncome: "none" });
    // 找到工作、正要申請獎勵金的青年
    notHidden("youth-stable-employment-bonus", { ...renter, age: 24, isUnemployed: false });
    // 考到證照、沒有在學的新住民
    notHidden("new-immigrant-scholarship", { ...renter, isStudent: false });
    // 家長替 12 歲、今年年底才滿 13 歲的孩子查文化幣
    notHidden("culture-coin-youth-2026", { ...parent, childrenAges: [12] });
  });

  it("有勞保的孕婦不會看到無保險生母補助列為相符；沒有任何保險的人看得到", () => {
    const s = byId("uninsured-mother-birth-subsidy-100k");
    const mom: Profile = { ...renter, isPregnantOrNewborn: true };
    expect(evaluate(s, { ...mom, hasLaborInsurance: true }).verdict).toBe("not_eligible");
    notHidden("uninsured-mother-birth-subsidy-100k", { ...mom, hasLaborInsurance: false, hasNationalPension: false });
  });

  it("月收入 30 萬的租屋族：中央租金補貼不會列為條件相符，並顯示所得門檻", () => {
    const r = evaluate(byId("rent-subsidy-central-300b"), { ...renter, monthlyIncome: 300_000 });
    expect(r.verdict).toBe("maybe");
    expect(r.unknown.join(" ")).toContain("所得");
  });

  it("懷第二胎、老大 5 歲：育兒津貼與托育補助不會被藏起來", () => {
    const secondChild: Profile = { ...parent, childrenAges: [5], isPregnantOrNewborn: true };
    notHidden("childcare-allowance-0-2", secondChild);
    notHidden("toddler-care-subsidy-0-2", secondChild);
  });

  it("2027 年 1 月 5 日：只辦 115 年度的購車與家電補助不再列為相符", () => {
    const rows = evaluateAll(items.filter((s) => s.status_2026 !== "ended"), { ...renter, ownsVehicle: "both" }, { y: 2027, m: 1, d: 5 });
    const expired = ["home-appliance-replacement-subsidy", "electric-scooter-purchase-subsidy-moea", "old-vehicle-replacement-moenv", "taipei-electric-scooter-subsidy-2026"];
    for (const id of expired) {
      const row = rows.find((r) => r.subsidy.id === id);
      expect(row?.verdict, id).toBe("not_eligible");
      expect(row?.failed.join(" "), id).toContain("申請期限已過");
    }
  });

  it("桃園市原住民族租金補貼還在辦：桃園租屋族看得到，並標明限原住民", () => {
    const s = byId("rent-subsidy-taoyuan-topup");
    expect(s.status_2026).toBe("active");
    const r = evaluate(s, { ...renter, city: "桃園市" });
    expect(r.verdict).toBe("maybe");
    expect(r.unknown.join(" ")).toContain("原住民");
  });

  it("地方項目照樣依縣市排除", () => {
    expect(evaluate(byId("rent-subsidy-new-taipei-youth"), renter).verdict).toBe("not_eligible");
    expect(evaluate(byId("birth-incentive-taipei"), { ...renter, isPregnantOrNewborn: true }).verdict).not.toBe("not_eligible");
  });
});
