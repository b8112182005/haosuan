import { describe, it, expect } from "vitest";
import dataset from "../../../data/subsidies.json";
import { evaluate, evaluateAll } from "../eligibility";
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

  it("地方項目照樣依縣市排除", () => {
    expect(evaluate(byId("rent-subsidy-new-taipei-youth"), renter).verdict).toBe("not_eligible");
    expect(evaluate(byId("birth-incentive-taipei"), { ...renter, isPregnantOrNewborn: true }).verdict).not.toBe("not_eligible");
  });
});
