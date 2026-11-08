"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw, CheckCircle2, HelpCircle, XCircle, Pencil } from "lucide-react";
import type { Subsidy } from "@/lib/subsidy/types";
import { TAIWAN_CITIES } from "@/lib/subsidy/types";
import { EMPTY_PROFILE, loadProfile, saveProfile, clearProfile, type Profile } from "@/lib/subsidy/profile";
import { evaluateAll, summarize, type Evaluation } from "@/lib/subsidy/eligibility";
import { useToday } from "@/lib/subsidy/useToday";
import SubsidyCard from "./SubsidyCard";

type Step = "city" | "age" | "income" | "housing" | "family" | "status" | "vehicle";
const STEPS: Step[] = ["city", "age", "income", "housing", "family", "status", "vehicle"];
const STEP_TITLES: Record<Step, string> = {
  city: "你住在哪個縣市？",
  age: "你幾歲？",
  income: "你每個月的收入大約多少？",
  housing: "目前住的狀況？",
  family: "家庭狀況",
  status: "有沒有下列身分？",
  vehicle: "名下有車嗎？",
};
const STEP_HINTS: Record<Step, string> = {
  city: "多數地方加碼補助看「設籍」縣市；租金補貼看「居住」縣市。先填你實際住的地方。",
  age: "年齡影響青年、長者與育兒相關補助。",
  income: "填稅前月收入（薪資單上的應發金額）。只在你的手機上比對，不會上傳。",
  housing: "租金補貼要租屋；新青安與自購利息補貼要名下無房。",
  family: "子女年齡決定育兒津貼、托育補助、幼兒學前扣除額。",
  status: "勾選有的就好；不確定可以先略過，結果會標成「可能符合」。",
  vehicle: "機車汰舊換新、牌照稅、燃料費提醒會用到。",
};

const INCOME_CHIPS = [25000, 30000, 36000, 42000, 50000, 60000, 80000];
const AGE_CHIPS = [20, 25, 30, 35, 40, 45, 55, 65];

export default function CheckWizard({ subsidies }: { subsidies: Subsidy[] }) {
  const today = useToday();
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [stepIndex, setStepIndex] = useState(0);
  const [mode, setMode] = useState<"loading" | "wizard" | "results">("loading");

  // 上次填過就直接顯示結果（條件還能改）
  useEffect(() => {
    let alive = true;
    loadProfile().then((saved) => {
      if (!alive) return;
      if (saved) {
        setProfile(saved);
        setMode("results");
      } else {
        setMode("wizard");
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const step = STEPS[stepIndex];
  const update = (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch }));

  const finish = async () => {
    await saveProfile(profile);
    setMode("results");
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const reset = async () => {
    await clearProfile();
    setProfile(EMPTY_PROFILE);
    setStepIndex(0);
    setMode("wizard");
  };

  const evaluations = useMemo<Evaluation[] | null>(() => {
    if (mode !== "results" || !today) return null;
    return evaluateAll(
      subsidies.filter((s) => s.status_2026 !== "ended"),
      profile,
      today
    );
  }, [mode, subsidies, profile, today]);

  if (mode === "loading") {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted/40" aria-busy="true" />;
  }

  if (mode === "results") {
    return <Results evaluations={evaluations} profile={profile} onEdit={() => { setStepIndex(0); setMode("wizard"); }} onReset={reset} />;
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* 進度 */}
      <div className="mb-5">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>第 {stepIndex + 1} / {STEPS.length} 題</span>
          <button type="button" onClick={finish} className="underline underline-offset-4 hover:text-foreground">
            直接看結果
          </button>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <h2 className="text-xl font-bold">{STEP_TITLES[step]}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{STEP_HINTS[step]}</p>

      <div className="mt-5 space-y-4">
        {step === "city" && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {TAIWAN_CITIES.map((c) => (
              <Choice key={c} active={profile.city === c} onClick={() => update({ city: c })}>
                {c}
              </Choice>
            ))}
          </div>
        )}

        {step === "age" && (
          <>
            <NumberField
              label="年齡（歲）"
              value={profile.age}
              onChange={(v) => update({ age: v })}
              min={0}
              max={120}
              placeholder="例如 32"
            />
            <div className="flex flex-wrap gap-2">
              {AGE_CHIPS.map((a) => (
                <Choice key={a} small active={profile.age === a} onClick={() => update({ age: a })}>
                  {a} 歲
                </Choice>
              ))}
            </div>
          </>
        )}

        {step === "income" && (
          <>
            <NumberField
              label="每月收入（元，稅前）"
              value={profile.monthlyIncome}
              onChange={(v) => update({ monthlyIncome: v })}
              min={0}
              max={10_000_000}
              step={1000}
              placeholder="例如 38000"
            />
            <div className="flex flex-wrap gap-2">
              {INCOME_CHIPS.map((n) => (
                <Choice key={n} small active={profile.monthlyIncome === n} onClick={() => update({ monthlyIncome: n })}>
                  {n.toLocaleString("zh-TW")}
                </Choice>
              ))}
              <Choice small active={profile.monthlyIncome === 0} onClick={() => update({ monthlyIncome: 0 })}>
                目前沒收入
              </Choice>
            </div>
          </>
        )}

        {step === "housing" && (
          <>
            <Field label="住的地方">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Choice active={profile.isRenting === true} onClick={() => update({ isRenting: true })}>租屋</Choice>
                <Choice active={profile.isRenting === false && profile.ownsHome === true} onClick={() => update({ isRenting: false, ownsHome: true })}>自己或配偶的房子</Choice>
                <Choice active={profile.isRenting === false && profile.ownsHome === false} onClick={() => update({ isRenting: false, ownsHome: false })}>家人的房子／宿舍</Choice>
              </div>
            </Field>
            {profile.isRenting && (
              <Field label="本人、配偶、未成年子女名下有沒有房子？">
                <div className="grid grid-cols-2 gap-2">
                  <Choice active={profile.ownsHome === false} onClick={() => update({ ownsHome: false })}>沒有</Choice>
                  <Choice active={profile.ownsHome === true} onClick={() => update({ ownsHome: true })}>有</Choice>
                </div>
              </Field>
            )}
          </>
        )}

        {step === "family" && (
          <>
            <Field label="婚姻">
              <div className="grid grid-cols-2 gap-2">
                <Choice active={profile.isMarried === false} onClick={() => update({ isMarried: false })}>未婚／離婚／喪偶</Choice>
                <Choice active={profile.isMarried === true} onClick={() => update({ isMarried: true })}>已婚</Choice>
              </div>
            </Field>
            <Field label="懷孕中，或 1 年內有新生兒？">
              <div className="grid grid-cols-2 gap-2">
                <Choice active={profile.isPregnantOrNewborn === false} onClick={() => update({ isPregnantOrNewborn: false })}>沒有</Choice>
                <Choice active={profile.isPregnantOrNewborn === true} onClick={() => update({ isPregnantOrNewborn: true })}>有</Choice>
              </div>
            </Field>
            <Field label="有沒有子女？">
              <div className="grid grid-cols-2 gap-2">
                <Choice active={profile.hasChildren === false} onClick={() => update({ hasChildren: false, childrenAges: [] })}>沒有</Choice>
                <Choice active={profile.hasChildren === true} onClick={() => update({ hasChildren: true })}>有</Choice>
              </div>
            </Field>
            {profile.hasChildren && (
              <Field label="子女年齡（可多選，每個小孩點一次）">
                <ChildrenAges ages={profile.childrenAges} onChange={(ages) => update({ childrenAges: ages })} />
              </Field>
            )}
          </>
        )}

        {step === "status" && (
          <div className="space-y-2">
            <Toggle label="有勞保（含職業工會投保）" value={profile.hasLaborInsurance} onChange={(v) => update({ hasLaborInsurance: v })} />
            <Toggle label="有國民年金（沒勞保、25～64 歲通常自動納保）" value={profile.hasNationalPension} onChange={(v) => update({ hasNationalPension: v })} />
            <Toggle label="領有身心障礙證明" value={profile.isDisabled} onChange={(v) => update({ isDisabled: v })} />
            <Toggle label="在學學生" value={profile.isStudent} onChange={(v) => update({ isStudent: v })} />
            <Toggle label="目前失業中（非自願離職）" value={profile.isUnemployed} onChange={(v) => update({ isUnemployed: v })} />
            <Field label="低收入戶／中低收入戶資格">
              <div className="grid grid-cols-3 gap-2">
                <Choice active={profile.lowIncome === "none"} onClick={() => update({ lowIncome: "none" })}>都不是</Choice>
                <Choice active={profile.lowIncome === "mid_low"} onClick={() => update({ lowIncome: "mid_low" })}>中低收</Choice>
                <Choice active={profile.lowIncome === "low"} onClick={() => update({ lowIncome: "low" })}>低收</Choice>
              </div>
            </Field>
          </div>
        )}

        {step === "vehicle" && (
          <div className="grid grid-cols-2 gap-2">
            <Choice active={profile.ownsVehicle === "none"} onClick={() => update({ ownsVehicle: "none" })}>沒有</Choice>
            <Choice active={profile.ownsVehicle === "scooter"} onClick={() => update({ ownsVehicle: "scooter" })}>機車</Choice>
            <Choice active={profile.ownsVehicle === "car"} onClick={() => update({ ownsVehicle: "car" })}>汽車</Choice>
            <Choice active={profile.ownsVehicle === "both"} onClick={() => update({ ownsVehicle: "both" })}>機車和汽車</Choice>
          </div>
        )}
      </div>

      {/* 導覽 */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={stepIndex === 0}
          className="inline-flex h-11 items-center gap-1 rounded-full border border-border px-4 text-sm disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> 上一題
        </button>
        {stepIndex < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStepIndex((i) => i + 1)}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            下一題 <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1 rounded-full bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            看結果 <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- 結果 ---------- */

function Results({
  evaluations,
  profile,
  onEdit,
  onReset,
}: {
  evaluations: Evaluation[] | null;
  profile: Profile;
  onEdit: () => void;
  onReset: () => void;
}) {
  const today = useToday();
  const [showNo, setShowNo] = useState(false);
  if (!evaluations) return <div className="h-64 animate-pulse rounded-2xl bg-muted/40" aria-busy="true" />;

  const sum = summarize(evaluations);
  const eligible = evaluations.filter((e) => e.verdict === "eligible");
  const maybe = evaluations.filter((e) => e.verdict === "maybe");
  const no = evaluations.filter((e) => e.verdict === "not_eligible");

  const summaryChips = [
    profile.city,
    profile.age !== null ? `${profile.age} 歲` : null,
    profile.monthlyIncome !== null ? `月收入 ${profile.monthlyIncome.toLocaleString("zh-TW")}` : null,
    profile.isRenting ? "租屋" : profile.ownsHome ? "有房" : null,
    profile.hasChildren ? `子女 ${profile.childrenAges.length || "有"}` : null,
    profile.isDisabled ? "身障" : null,
    profile.lowIncome === "low" ? "低收" : profile.lowIncome === "mid_low" ? "中低收" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">你的條件</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {summaryChips.length === 0 ? (
                <span className="text-sm text-muted-foreground">沒有填任何條件，結果都會是「可能符合」</span>
              ) : (
                summaryChips.map((c) => (
                  <span key={c} className="rounded-full bg-muted px-2.5 py-1 text-xs">{c}</span>
                ))
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={onEdit} aria-label="修改條件" className="rounded-full border border-border p-2 hover:bg-accent">
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" onClick={onReset} aria-label="清除重填" className="rounded-full border border-border p-2 hover:bg-accent">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} n={sum.eligible} label="符合" />
          <Stat icon={<HelpCircle className="h-4 w-4 text-amber-600" />} n={sum.maybe} label="可能符合" />
          <Stat icon={<XCircle className="h-4 w-4 text-muted-foreground" />} n={sum.notEligible} label="不符合" />
        </div>
      </div>

      {eligible.length > 0 && (
        <Group title="符合條件" hint="每一條自動比對的條件都對得上。申請前仍要看項目頁的文件與注意事項。">
          {eligible.map((e) => (
            <SubsidyCard key={e.subsidy.id} subsidy={e.subsidy} today={today} highlight="eligible" footer={<Reasons e={e} />} />
          ))}
        </Group>
      )}

      {maybe.length > 0 && (
        <Group title="可能符合" hint="有條件你還沒填，或要用全家所得、財產等資料自行確認。">
          {maybe.map((e) => (
            <SubsidyCard key={e.subsidy.id} subsidy={e.subsidy} today={today} highlight="maybe" footer={<Reasons e={e} />} />
          ))}
        </Group>
      )}

      {no.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowNo((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-left text-sm"
          >
            <span>不符合的 {no.length} 項</span>
            <span className="text-xs text-muted-foreground">{showNo ? "收起" : "展開"}</span>
          </button>
          {showNo && (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {no.map((e) => (
                <SubsidyCard key={e.subsidy.id} subsidy={e.subsidy} today={today} highlight="not_eligible" footer={<Reasons e={e} />} />
              ))}
            </div>
          )}
        </section>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        這是依你填的條件與公開資格做的初步比對，不是審核結果。有些補助還看財產、家庭人口、戶籍年限，請到項目頁看「資格條件」與「常見卡關」。想記下截止日，到項目頁按「加入提醒」。
        不確定怎麼辦？看 <Link href="/subsidy/faq" className="underline underline-offset-4">疑難雜症</Link>。
      </p>
    </div>
  );
}

function Reasons({ e }: { e: Evaluation }) {
  const rows: Array<{ kind: "ok" | "no" | "unknown"; text: string }> = [
    ...e.matched.map((t) => ({ kind: "ok" as const, text: t })),
    ...e.failed.map((t) => ({ kind: "no" as const, text: t })),
    ...e.unknown.map((t) => ({ kind: "unknown" as const, text: t })),
  ];
  if (rows.length === 0) return <p className="mt-3 text-xs text-muted-foreground">沒有額外身分條件，符合基本資格即可申請。</p>;
  return (
    <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
      {rows.slice(0, 5).map((r, i) => (
        <li key={i} className="flex items-start gap-1.5">
          {r.kind === "ok" ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          ) : r.kind === "no" ? (
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
          ) : (
            <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          )}
          <span className={r.kind === "no" ? "text-muted-foreground" : ""}>{r.text}</span>
        </li>
      ))}
      {rows.length > 5 && <li className="text-muted-foreground">還有 {rows.length - 5} 條，見項目頁</li>}
    </ul>
  );
}

function Group({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mb-3 text-xs text-muted-foreground">{hint}</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Stat({ icon, n, label }: { icon: React.ReactNode; n: number; label: string }) {
  return (
    <div className="rounded-xl bg-muted/50 py-2">
      <div className="flex items-center justify-center gap-1 text-lg font-bold">
        {icon}
        {n}
      </div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

/* ---------- 表單元件 ---------- */

function Choice({ active, onClick, children, small }: { active: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${small ? "h-9 px-3 text-xs" : "min-h-11 px-3 py-2 text-sm"} rounded-xl border text-center transition-colors ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        onChange={(e) => {
          const n = e.target.value === "" ? null : Number(e.target.value);
          onChange(n === null || Number.isNaN(n) ? null : Math.min(max, Math.max(min, n)));
        }}
        className="h-12 w-full rounded-xl border border-input bg-background px-4 text-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1">
        <button
          type="button"
          aria-pressed={value === false}
          onClick={() => onChange(false)}
          className={`h-8 rounded-full px-3 text-xs ${value === false ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          沒有
        </button>
        <button
          type="button"
          aria-pressed={value === true}
          onClick={() => onChange(true)}
          className={`h-8 rounded-full px-3 text-xs ${value === true ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          有
        </button>
      </div>
    </div>
  );
}

function ChildrenAges({ ages, onChange }: { ages: number[]; onChange: (ages: number[]) => void }) {
  const options = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18];
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange([...ages, a].sort((x, y) => x - y))}
            className="h-9 rounded-full border border-border bg-card px-3 text-xs hover:border-primary/50"
          >
            {a === 0 ? "未滿 1 歲" : `${a} 歲`}
          </button>
        ))}
      </div>
      {ages.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">已加入：</span>
          {ages.map((a, i) => (
            <button
              key={`${a}-${i}`}
              type="button"
              onClick={() => onChange(ages.filter((_, j) => j !== i))}
              className="rounded-full bg-primary/10 px-2.5 py-1 text-primary"
              aria-label={`移除 ${a} 歲`}
            >
              {a === 0 ? "未滿 1 歲" : `${a} 歲`} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
