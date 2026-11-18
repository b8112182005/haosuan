"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { ACTIVE_SUBSIDY_INDEX } from "@/lib/subsidy/index-data";
import { TAIWAN_CITIES } from "@/lib/subsidy/types";
import {
  EMPTY_PROFILE,
  PROFILE_STEPS,
  loadProfile,
  peekProfile,
  saveProfile,
  clearProfile,
  unansweredSteps,
  type Profile,
  type ProfileStep,
} from "@/lib/subsidy/profile";
import { evaluateAll, type Evaluation } from "@/lib/subsidy/eligibility";
import { useToday } from "@/lib/subsidy/useToday";
import { useBackHandler } from "@/lib/useBackHandler";
import CheckResults, { resetResultsView } from "./CheckResults";

type Step = ProfileStep;
const STEPS = PROFILE_STEPS;
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
  status: "勾選有的就好；不確定可以先略過，結果會標成「要再確認」。",
  vehicle: "機車汰舊換新、牌照稅、燃料費提醒會用到。",
};

const INCOME_CHIPS = [25000, 30000, 36000, 42000, 50000, 60000, 80000];
const AGE_CHIPS = [20, 25, 30, 35, 40, 45, 55, 65];

export default function CheckWizard() {
  const today = useToday();
  // 這次載入頁面後已經讀過條件（peekProfile 不是 undefined）就直接用：從項目頁返回時第一次 render 就是結果，
  // 捲動位置才有得還原。整頁載入時一定是 undefined，第一次 render 是骨架，和靜態 HTML 一致
  const [profile, setProfile] = useState<Profile>(() => peekProfile() ?? EMPTY_PROFILE);
  const [stepIndex, setStepIndex] = useState(0);
  const [mode, setMode] = useState<"loading" | "wizard" | "results">(() => {
    const known = peekProfile();
    return known === undefined ? "loading" : known ? "results" : "wizard";
  });
  // 從結果頁按「修改條件」進來的：這時第 1 題按返回鍵要回結果頁，而不是離開試算
  const [editing, setEditing] = useState(false);
  // 從「補答」進來的：下一題只跳到還沒回答的題目，不用把答過的 7 題再走一遍
  const [filling, setFilling] = useState(false);
  const cityTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 上次填過就直接顯示結果（條件還能改）。已經讀過一次就不用再讀
  useEffect(() => {
    if (peekProfile() !== undefined) return;
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

  useEffect(() => () => clearTimeout(cityTimer.current), []);

  const step = STEPS[stepIndex];
  const update = (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch }));

  // 換題一律捲到最上面：縣市題選到最下面的選項再按下一題，下一題的標題會在畫面上方看不到
  const goTo = (index: number) => {
    clearTimeout(cityTimer.current);
    setStepIndex(Math.min(STEPS.length - 1, Math.max(0, index)));
    window.scrollTo({ top: 0 });
  };

  const finish = async () => {
    // 剛選完縣市就按「直接看結果」時，250ms 的自動跳題還沒觸發：不清掉的話結果頁會被它捲回最上面
    clearTimeout(cityTimer.current);
    // 條件變了，上次選的分類、展開的區塊、捲動位置都對不上新的清單
    resetResultsView();
    await saveProfile(profile);
    setEditing(false);
    setFilling(false);
    setMode("results");
    window.scrollTo({ top: 0 });
  };

  const reset = async () => {
    clearTimeout(cityTimer.current);
    resetResultsView();
    await clearProfile();
    setProfile(EMPTY_PROFILE);
    setStepIndex(0);
    setEditing(false);
    setFilling(false);
    setMode("wizard");
    window.scrollTo({ top: 0 });
  };

  const startEdit = (target?: ProfileStep, options?: { fill?: boolean }) => {
    // 什麼都沒填的人從結果頁按「開始填」是第一次填，不是修改：照第一次填的走法（縣市選完自動到下一題、
    // 主要按鈕是「下一題」），不要給他「修改條件」和三顆按鈕
    const nothingAnswered = unansweredSteps(profile).length === STEPS.length;
    setStepIndex(target ? Math.max(0, STEPS.indexOf(target)) : 0);
    setEditing(!nothingAnswered);
    setFilling(!nothingAnswered && options?.fill === true);
    setMode("wizard");
    window.scrollTo({ top: 0 });
  };

  const pickCity = (city: string) => {
    update({ city });
    // 修改模式不自動跳：使用者可能只是來換縣市，接著要按「看結果」
    if (editing) return;
    clearTimeout(cityTimer.current);
    cityTimer.current = setTimeout(() => goTo(1), 250);
  };

  // 修改模式的「下一題」：補答時只去還沒回答的題目，一般修改照順序。沒有下一題時是 undefined
  const pending = filling ? unansweredSteps(profile).map((s) => STEPS.indexOf(s)).find((i) => i > stepIndex) : undefined;
  const nextIndex = filling ? pending : stepIndex < STEPS.length - 1 ? stepIndex + 1 : undefined;
  // 數字題按 Enter：第一次填是下一題；補答時去下一個沒答的，沒有了就存檔看結果；一般修改是存檔看結果
  const enterGoesNext = !editing || (filling && nextIndex !== undefined);
  // 補答時還有題目沒答：主要動作是「下一題」，「看結果」退成次要
  const fillNext = filling && nextIndex !== undefined;
  const next = () => {
    if (!editing) goTo(stepIndex + 1);
    else if (filling && nextIndex !== undefined) goTo(nextIndex);
    else void finish();
  };

  // Android 返回鍵：第一次填的人答到第 2 題以後按返回是回上一題，第 1 題照常離開試算。
  // 修改條件的人不論第幾題都是存檔回結果頁（不存的話改了等於沒改）。
  useBackHandler(mode === "wizard" && (stepIndex > 0 || editing), () => {
    if (editing) void finish();
    else goTo(stepIndex - 1);
  });

  const evaluations = useMemo<Evaluation[] | null>(() => {
    if (mode !== "results" || !today) return null;
    return evaluateAll(ACTIVE_SUBSIDY_INDEX, profile, today);
  }, [mode, profile, today]);

  if (mode === "loading") {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted/40" aria-busy="true" />;
  }

  if (mode === "results") {
    return <CheckResults profile={profile} evaluations={evaluations} onEdit={startEdit} onReset={reset} />;
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* 進度 */}
      <div className="mb-5">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>第 {stepIndex + 1} / {STEPS.length} 題</span>
          {/* 修改模式底下已有「看結果」：再放一個「直接看結果」會有兩顆去同一處的按鈕，改成標示目前在改條件 */}
          {editing ? (
            <span>修改條件</span>
          ) : (
            <button type="button" onClick={finish} className="underline underline-offset-4 hover:text-foreground">
              直接看結果
            </button>
          )}
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
              <Choice key={c} active={profile.city === c} onClick={() => pickCity(c)}>
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
              onEnter={next}
              enterHint={enterGoesNext ? "next" : "done"}
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
              onEnter={next}
              enterHint={enterGoesNext ? "next" : "done"}
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
            <Toggle label="目前沒有工作（待業或失業）" value={profile.isUnemployed} onChange={(v) => update({ isUnemployed: v })} />
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

      {/* 導覽：固定在底部分頁列上方。縣市那一題有 22 個選項，按鈕放在最底下的話選完還要往下捲才找得到 */}
      <div className="sticky bottom-[calc(var(--tabs-h)+var(--safe-bottom)+0.75rem)] z-10 mt-8 flex items-center justify-between gap-2 rounded-full bg-background/95 p-1.5 ring-1 ring-border backdrop-blur">
        {/* 修改模式一排有三顆按鈕：320 寬放不下三組字，「看結果」會折成三行被切掉。這時「上一題」只留箭頭 */}
        <button
          type="button"
          onClick={() => goTo(stepIndex - 1)}
          disabled={stepIndex === 0}
          aria-label="上一題"
          className={`inline-flex h-11 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-border text-sm disabled:opacity-40 ${editing ? "w-11" : "px-4"}`}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {!editing && "上一題"}
        </button>
        {editing ? (
          <>
            {nextIndex !== undefined && (
              <button
                type="button"
                onClick={() => goTo(nextIndex)}
                className={
                  fillNext
                    ? "inline-flex h-11 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
                    : "inline-flex h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-border px-4 text-sm"
                }
              >
                下一題 <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={finish}
              className={
                fillNext
                  ? "inline-flex h-11 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-border px-4 text-sm"
                  : "inline-flex h-11 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
              }
            >
              看結果 <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        ) : stepIndex < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => goTo(stepIndex + 1)}
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
  onEnter,
  enterHint = "next",
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  step?: number;
  placeholder?: string;
  onEnter?: () => void;
  /** 手機鍵盤右下角那顆鍵的字：會去下一題是「下一步」，會存檔看結果是「完成」 */
  enterHint?: "next" | "done";
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
        enterKeyHint={enterHint}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
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
      <span className="min-w-0 flex-1 text-sm">{label}</span>
      {/* whitespace-nowrap：320 寬時「沒有」會折成兩行 */}
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          aria-pressed={value === false}
          onClick={() => onChange(false)}
          className={`h-10 min-w-12 whitespace-nowrap rounded-full px-3 text-xs ${value === false ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          沒有
        </button>
        <button
          type="button"
          aria-pressed={value === true}
          onClick={() => onChange(true)}
          className={`h-10 min-w-12 whitespace-nowrap rounded-full px-3 text-xs ${value === true ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          有
        </button>
      </div>
    </div>
  );
}

function ChildrenAges({ ages, onChange }: { ages: number[]; onChange: (ages: number[]) => void }) {
  // 0～24 歲每一歲都要能選：很多門檻卡在特定歲數（17 歲以下、6 歲以下、22 歲以下），
  // 只給 15、18 的話 17 歲的孩子只能選 18，結果會被判成不符合。
  // 25 代表「25 歲以上」：子女都成年的長者原本選不到年齡，育兒項目就全部變成「你沒填子女年齡」
  const options = Array.from({ length: 26 }, (_, age) => age);
  const label = (a: number) => (a === 0 ? "未滿 1 歲" : a >= 25 ? "25 歲以上" : `${a} 歲`);
  return (
    <div>
      {/* 已加入的放在按鈕上面：放下面會被底部固定的按鈕列蓋住，看不出有沒有加成功 */}
      {ages.length === 0 ? (
        <p className="mb-2 text-xs text-muted-foreground">每個小孩點一次年齡；同年齡有兩個就點兩次。</p>
      ) : (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">已加入（點一下移除）：</span>
          {ages.map((a, i) => (
            <button
              key={`${a}-${i}`}
              type="button"
              onClick={() => onChange(ages.filter((_, j) => j !== i))}
              className="h-9 rounded-full bg-primary/10 px-3 text-primary"
              aria-label={`移除 ${label(a)}`}
            >
              {label(a)} ×
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((a) => {
          const n = ages.filter((x) => x === a).length;
          return (
            <button
              key={a}
              type="button"
              onClick={() => onChange([...ages, a].sort((x, y) => x - y))}
              aria-pressed={n > 0 ? true : undefined}
              className={`h-9 rounded-full border px-3 text-xs ${
                n > 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-primary/50"
              }`}
            >
              {label(a)}
              {n > 1 && ` ×${n}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
