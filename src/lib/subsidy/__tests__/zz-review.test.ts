import { describe, it } from "vitest";
import { ACTIVE_SUBSIDY_INDEX } from "../index-data";
import { EMPTY_PROFILE, type Profile } from "../profile";
import { evaluateAll } from "../eligibility";
import { buildResultsView } from "../results";
import { CATEGORY_LABELS } from "../types";

const today = { y: 2026, m: 11, d: 19 };
const P = (o: Partial<Profile>): Profile => ({ ...EMPTY_PROFILE, ...o });

describe("review", () => {
  it("special identities", () => {
    const m = new Map<string, string[]>();
    for (const s of ACTIVE_SUBSIDY_INDEX) {
      const sp = s.conditions?.special_identity?.trim();
      if (sp) m.set(sp, [...(m.get(sp) ?? []), `${s.id}/${s.kind}`]);
    }
    console.log("SPECIAL", JSON.stringify([...m.entries()], null, 0));
  });
  it("income notes", () => {
    for (const s of ACTIVE_SUBSIDY_INDEX) {
      const n = s.conditions?.income_limit_note?.trim();
      if (n && n.length < 12) console.log("SHORTNOTE", s.id, JSON.stringify(n));
    }
  });
  it("shorten collisions", async () => {
    const { evaluate } = await import("../eligibility");
    const profiles = [EMPTY_PROFILE, P({ city: "新北市", age: 32, monthlyIncome: 40000, isRenting: true, ownsHome: false, isMarried: true, hasChildren: true, childrenAges: [1], hasLaborInsurance: true, lowIncome: "none", ownsVehicle: "scooter", isStudent: false, isUnemployed: false, isDisabled: false, hasNationalPension: false, isPregnantOrNewborn: false })];
    for (const s of ACTIVE_SUBSIDY_INDEX) {
      const note = s.conditions?.income_limit_note?.trim();
      if (!note) continue;
      for (const p of profiles) {
        const ev = evaluate(s, p, today);
        for (const t of ev.unknown) {
          if (t.includes(note)) {
            const after = t.replace(note, "看上面「所得／財產門檻」那一段");
            const isIncomeLine = /^(所得或財產門檻|綜所稅稅率門檻|個人收入門檻)/.test(t);
            if (!isIncomeLine || note.length < 6) console.log("SHORTEN", s.id, "|", JSON.stringify(note), "|", t, "=>", after);
          }
        }
      }
    }
  });
  it("hidden", () => {
    const profiles: Record<string, Profile> = {
      full: P({ city: "新北市", age: 32, monthlyIncome: 40000, isRenting: true, ownsHome: false, isMarried: true, hasChildren: true, childrenAges: [1], hasLaborInsurance: true, lowIncome: "none", ownsVehicle: "scooter", isStudent: false, isUnemployed: false, isDisabled: false, hasNationalPension: false, isPregnantOrNewborn: false }),
      disabledLow: P({ city: "臺北市", age: 70, monthlyIncome: 0, isRenting: false, ownsHome: true, isDisabled: true, lowIncome: "low", hasLaborInsurance: false, hasNationalPension: true, isStudent: false, isUnemployed: false, ownsVehicle: "none", hasChildren: false, isMarried: false, isPregnantOrNewborn: false }),
      student: P({ city: "臺中市", age: 20, monthlyIncome: 0, isStudent: true, isRenting: true, ownsHome: false, hasChildren: false, isMarried: false, isPregnantOrNewborn: false, lowIncome: "mid_low", isDisabled: false, hasLaborInsurance: false, hasNationalPension: false, isUnemployed: false, ownsVehicle: "none" }),
      unemployed: P({ city: "高雄市", age: 45, monthlyIncome: 0, isUnemployed: true, hasLaborInsurance: true, isRenting: true, ownsHome: false, hasChildren: false, isMarried: false, isPregnantOrNewborn: false, lowIncome: "none", isDisabled: false, isStudent: false, hasNationalPension: false, ownsVehicle: "car" }),
      pregnant: P({ city: "桃園市", age: 30, monthlyIncome: 50000, isPregnantOrNewborn: true, hasChildren: false, isMarried: true, hasLaborInsurance: true, isRenting: true, ownsHome: false, lowIncome: "none", isDisabled: false, isStudent: false, hasNationalPension: false, isUnemployed: false, ownsVehicle: "none" }),
    };
    for (const [name, p] of Object.entries(profiles)) {
      const ev = evaluateAll(ACTIVE_SUBSIDY_INDEX, p, today);
      const v = buildResultsView(ev, today);
      console.log("VIEW", name, JSON.stringify(v.counts), "picks:", v.picks.map((x) => `${x.row.evaluation.subsidy.id}:${x.why}:${x.row.status}`).join(","));
      for (const g of v.benefits) {
        const line = `另有 ${g.unlikely.length} 項，要特定身分或例外情形才適用：${g.unlikely.map((r) => r.evaluation.subsidy.short_name || r.evaluation.subsidy.name).join("、")}`;
        if (g.unlikely.length) console.log("UNLIKELYLINE", name, CATEGORY_LABELS[g.category], "rows", g.rows.length, "len", line.length, line);
        else if (g.rows.length === 0) console.log("EMPTYCAT", name, g.category);
      }
      console.log("INFO", name, "countsInfo", v.counts.info, "listed", v.info.rows.length + v.info.unlikely.length, "OBL", v.counts.obligations, v.obligations.rows.length + v.obligations.unlikely.length);
      // unlikely where a matched condition exists & special identity maps to a question the app asks
      for (const g of v.benefits) for (const r of g.unlikely) {
        const sp = r.evaluation.subsidy.conditions?.special_identity?.trim();
        console.log("UNL", name, r.evaluation.subsidy.id, "sp=", sp ?? "-", "exc=", r.evaluation.excepted, "matched=", r.evaluation.matched.length, "unknown=", r.evaluation.unknown.length);
      }
    }
  });
});
