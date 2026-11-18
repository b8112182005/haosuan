"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Accessibility,
  Baby,
  Bike,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  GraduationCap,
  HandHeart,
  HeartPulse,
  HelpCircle,
  Home,
  IdCard,
  Info,
  MapPin,
  Pencil,
  Receipt,
  RotateCcw,
  XCircle,
} from "lucide-react";
import type { Evaluation } from "@/lib/subsidy/eligibility";
import { PICK_CLOSING_DAYS, buildResultsView, reasonLine, type ResultRow, type RowList } from "@/lib/subsidy/results";
import { unansweredSteps, answeredCount, PROFILE_STEPS, type Profile, type ProfileStep } from "@/lib/subsidy/profile";
import { CATEGORY_LABELS, CATEGORY_ORDER, type SubsidyCategory } from "@/lib/subsidy/types";
import { amountHeadline } from "@/lib/subsidy/format";
import type { LocalDate } from "@/lib/subsidy/deadline";
import { useToday } from "@/lib/subsidy/useToday";
import { DeadlineBadge, StatusBadge } from "./SubsidyCard";

/* ---------- 畫面狀態：換頁回來時放回原位 ---------- */

const STORE_KEY = "haoye.check.view.v1";
const RESTORE_WINDOW_MS = 30 * 60 * 1000;

interface Stored {
  category: SubsidyCategory | "all";
  infoOpen: boolean;
  excludedOpen: boolean;
  /** 展開的「另有 N 項」，鍵是分類名；要繳、要辦的期限是 "obligations" */
  unlikelyOpen: string[];
  y: number;
  at: number;
  /** 記下位置時所在的那一筆瀏覽紀錄；瀏覽器沒有 Navigation API 時是 null */
  entry: string | null;
}

const DEFAULT_STORED: Stored = { category: "all", infoOpen: false, excludedOpen: false, unlikelyOpen: [], y: 0, at: 0, entry: null };

/**
 * 目前這一筆瀏覽紀錄的鍵。按返回回到同一筆紀錄時鍵不變，從別的連結走進來是新的一筆。
 * 用它分辨「按返回回來」和「從補助列表再點進來」：後者應該從頁面最上面開始，不該被捲到上次看的地方。
 * Chrome 與 Android WebView 有 Navigation API；沒有的瀏覽器回 null，退回只看時間。
 */
function entryKey(): string | null {
  const nav = (window as unknown as { navigation?: { currentEntry?: { key?: string } | null } }).navigation;
  return nav?.currentEntry?.key ?? null;
}

function readStored(): Stored {
  try {
    const raw = JSON.parse(window.sessionStorage.getItem(STORE_KEY) ?? "null") as Record<string, unknown> | null;
    if (!raw || typeof raw !== "object") return DEFAULT_STORED;
    const category = raw.category;
    return {
      category: category === "all" || CATEGORY_ORDER.includes(category as SubsidyCategory) ? (category as Stored["category"]) : "all",
      infoOpen: raw.infoOpen === true,
      excludedOpen: raw.excludedOpen === true,
      unlikelyOpen: Array.isArray(raw.unlikelyOpen) ? raw.unlikelyOpen.filter((k): k is string => typeof k === "string") : [],
      y: typeof raw.y === "number" && Number.isFinite(raw.y) ? raw.y : 0,
      at: typeof raw.at === "number" && Number.isFinite(raw.at) ? raw.at : 0,
      entry: typeof raw.entry === "string" ? raw.entry : null,
    };
  } catch {
    // 隱私模式讀不到 sessionStorage：當成沒有存過
    return DEFAULT_STORED;
  }
}

/** 每次寫入都記下當時在哪一筆瀏覽紀錄、幾點：回來時用這兩個判斷要不要照上次的樣子擺 */
function writeStored(patch: Partial<Stored>) {
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify({ ...readStored(), ...patch, entry: entryKey(), at: Date.now() }));
  } catch {
    // 存不了就算了，只是回來時不會停在原位
  }
}

/**
 * 存的畫面狀態能不能用在這一次：要在 30 分鐘內，而且是按返回回到同一筆瀏覽紀錄。
 * 從補助列表再點進來是新的一筆，應該從「全部」、最上面開始，不該還停在上次篩的那個分類。
 * 沒有 Navigation API 的瀏覽器分不出來，只看時間。
 */
function storedForThisVisit(): Stored {
  const stored = readStored();
  const here = entryKey();
  const sameEntry = stored.entry === null || here === null || stored.entry === here;
  return sameEntry && Date.now() - stored.at < RESTORE_WINDOW_MS ? stored : DEFAULT_STORED;
}

/** 精靈存檔、重填時呼叫：條件變了，上次選的分類、展開的區塊、捲動位置都對不上新的清單 */
export function resetResultsView() {
  try {
    window.sessionStorage.removeItem(STORE_KEY);
  } catch {
    // 清不掉時下次頂多停在舊的分類
  }
}

/* ---------- 小元件 ---------- */

// 之後可能整個換成插圖，所以對照集中在這一個元件
function CategoryIcon({ category, className }: { category: SubsidyCategory; className?: string }) {
  const props = { className, "aria-hidden": true as const };
  switch (category) {
    case "housing":
      return <Home {...props} />;
    case "family":
      return <Baby {...props} />;
    case "tax":
      return <Receipt {...props} />;
    case "labor":
      return <Briefcase {...props} />;
    case "youth":
      return <GraduationCap {...props} />;
    case "health":
      return <HeartPulse {...props} />;
    case "senior_disability":
      return <Accessibility {...props} />;
    case "low_income":
      return <HandHeart {...props} />;
    case "energy_transport":
      return <Bike {...props} />;
    default:
      return <IdCard {...props} />;
  }
}

// 置頂 Header 高 3.5rem；捲到區塊時留一點空隙，標題才不會貼著 Header
const SCROLL_MARGIN = { scrollMarginTop: "calc(3.5rem + var(--safe-top) + 0.5rem)" } as const;

function StatusIcon({ row }: { row: ResultRow }) {
  const { kind } = row.evaluation.subsidy;
  const cls = "mt-0.5 h-5 w-5 shrink-0";
  // role="img"：svg 只有 aria-label 時，TalkBack 不一定會把它當成有名稱的圖唸出來
  if (row.status === "no") return <XCircle role="img" className={`${cls} text-muted-foreground`} aria-label="不符合" />;
  if (kind === "obligation") return <CalendarClock role="img" className={`${cls} text-muted-foreground`} aria-label="繳費或辦理期限" />;
  if (kind === "info") return <Info role="img" className={`${cls} text-muted-foreground`} aria-label="須知" />;
  if (row.status === "match") return <CheckCircle2 role="img" className={`${cls} text-emerald-600`} aria-label="條件相符" />;
  if (row.status === "situational") return <Circle role="img" className={`${cls} text-muted-foreground`} aria-label="遇到才用得上" />;
  return <HelpCircle role="img" className={`${cls} text-amber-600`} aria-label="要再確認" />;
}

/** 年齡的文字和精靈第 5 題的按鈕同字 */
function ageText(a: number): string {
  return a === 0 ? "未滿 1 歲" : a >= 25 ? "25 歲以上" : `${a} 歲`;
}

/** 子女標籤：同樣的文字合併成「×N」；超過 3 種只列前 3 種，免得標籤長過一行 */
function childrenLabel(ages: number[]): string {
  if (ages.length === 0) return "有子女";
  const counts = new Map<string, number>();
  for (const a of ages) {
    const t = ageText(a);
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const parts = [...counts.entries()].map(([t, n]) => (n > 1 ? `${t} ×${n}` : t));
  return `子女 ${parts.slice(0, 3).join("、")}${parts.length > 3 ? "等" : ""}`;
}

const STEP_NAMES: Record<ProfileStep, string> = {
  city: "縣市",
  age: "年齡",
  income: "收入",
  housing: "住的狀況",
  family: "家庭",
  status: "身分",
  vehicle: "車輛",
};

const TONE_CLASS = {
  ok: "text-emerald-700 dark:text-emerald-400",
  ask: "text-amber-700 dark:text-amber-400",
  plain: "text-muted-foreground",
  no: "text-muted-foreground",
} as const;

function Row({ row, today, showLateShort }: { row: ResultRow; today: LocalDate | null; showLateShort?: boolean }) {
  const { subsidy } = row.evaluation;
  const reason = reasonLine(row);
  const light = row.status === "situational" || row.status === "unlikely" || row.status === "no";
  const lateShort = showLateShort ? subsidy.late_consequence?.short : null;
  // 不符合的列不放期限、受理狀態、「現在就能送件」：那些字會讓人以為還領得到
  const isNo = row.status === "no";
  return (
    <Link
      href={`/subsidy/${subsidy.id}`}
      data-row={subsidy.id}
      data-status={row.status}
      className="flex items-start gap-3 px-4 py-3 active:bg-accent"
    >
      <StatusIcon row={row} />
      <div className="min-w-0 flex-1">
        <p className={`line-clamp-2 text-sm leading-snug ${light ? "font-medium" : "font-semibold"}`}>{subsidy.short_name || subsidy.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {subsidy.kind === "benefit" && (
            <span
              className={`max-w-full truncate text-[13px] ${
                isNo ? "text-muted-foreground" : "font-medium text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {amountHeadline(subsidy.amount)}
            </span>
          )}
          {subsidy.city && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {subsidy.city}
            </span>
          )}
          {!isNo && <DeadlineBadge subsidy={subsidy} today={today} />}
          {!isNo && <StatusBadge subsidy={subsidy} />}
          {!isNo && row.applyNow && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">現在就能送件</span>
          )}
        </div>
        {lateShort && <p className="mt-1 text-xs leading-relaxed text-foreground">{lateShort}</p>}
        {subsidy.kind === "info" && reason.tone === "plain" ? (
          <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-muted-foreground">{subsidy.summary}</p>
        ) : (
          <p className={`mt-1 line-clamp-2 text-xs leading-relaxed ${isNo ? "text-foreground/80" : TONE_CLASS[reason.tone]}`}>{reason.text}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function ListCard({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">{children}</div>;
}

function ExpandRow({ open, onToggle, children }: { open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-xs text-muted-foreground active:bg-accent"
    >
      <span className="leading-relaxed">{children}</span>
      <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
  );
}

/* ---------- 結果頁 ---------- */

interface Props {
  profile: Profile;
  evaluations: Evaluation[] | null;
  /** fill＝從「補答」進去：下一題只跳到還沒回答的題目 */
  onEdit: (step?: ProfileStep, options?: { fill?: boolean }) => void;
  onReset: () => void;
}

export default function CheckResults({ profile, evaluations, onEdit, onReset }: Props) {
  const today = useToday();
  const view = useMemo(() => (evaluations && today ? buildResultsView(evaluations, today) : null), [evaluations, today]);

  // 這個元件只在 client 掛載後才 render（精靈先讀完條件才會切到結果），所以可以直接在 lazy initializer 讀 sessionStorage
  const [ui, setUi] = useState<Stored>(storedForThisVisit);
  // 「重填」會清掉 7 題的答案，按下去先問一次
  const [confirmingReset, setConfirmingReset] = useState(false);
  const update = (patch: Partial<Stored>) => {
    setUi((u) => ({ ...u, ...patch }));
    writeStored(patch);
  };
  const benefitsRef = useRef<HTMLElement>(null);
  const restored = useRef(false);

  // 等一個 frame 再捲：站內換頁時 Next 會在同一個 commit 把頁面捲到最上面，還原要排在它後面
  useLayoutEffect(() => {
    if (!view || restored.current) return;
    restored.current = true;
    // 存的位置屬於另一筆瀏覽紀錄時 storedForThisVisit 回的是預設值（y 是 0）：這次是從別的連結走進來的，留在最上面。
    // 那一筆的位置先留著不動，之後按返回回到那一筆時還用得到
    const { y } = storedForThisVisit();
    if (y <= 0) return;
    requestAnimationFrame(() => window.scrollTo(0, y));
    writeStored({ y: 0 });
  }, [view]);

  // 離開這一頁不只點清單裡的一列：底部分頁列、頁首、頁尾的連結也算。點任何連結的當下記位置，按返回回來時才有得還原。
  // 用點擊而不是卸載時讀 scrollY：卸載那一刻頁面可能已經被捲到新頁面的位置
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("a[href]")) writeStored({ y: window.scrollY });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!view) return <div className="h-64 animate-pulse rounded-2xl bg-muted/40" aria-busy="true" />;

  const { counts } = view;
  // 只有收合項目（限特定身分）的分類不出籤：籤上會寫「生育育兒 0」，點進去只有一行。它在「全部」裡照常出現
  const chipGroups = view.benefits.filter((g) => g.rows.length > 0);
  const category = ui.category !== "all" && chipGroups.some((g) => g.category === ui.category) ? ui.category : "all";
  const benefitTotal = chipGroups.reduce((n, g) => n + g.rows.length, 0);
  const unanswered = unansweredSteps(profile);
  const noneAnswered = unanswered.length === PROFILE_STEPS.length;

  const chips: Array<{ label: string; step: ProfileStep }> = [];
  const chip = (label: string | false | null, step: ProfileStep) => {
    if (label) chips.push({ label, step });
  };
  chip(profile.city, "city");
  chip(profile.age !== null && `${profile.age} 歲`, "age");
  chip(profile.monthlyIncome !== null && (profile.monthlyIncome === 0 ? "沒有收入" : `月收入 ${profile.monthlyIncome.toLocaleString("zh-TW")}`), "income");
  // 字和精靈第 4 題的選項同字：標籤上看得出當初選了哪一個
  chip(
    profile.isRenting
      ? "租屋"
      : profile.ownsHome === true
        ? "自己或配偶的房子"
        : profile.isRenting === false && profile.ownsHome === false
          ? "家人的房子／宿舍"
          : null,
    "housing",
  );
  chip(profile.isMarried && "已婚", "family");
  chip(profile.hasChildren && childrenLabel(profile.childrenAges), "family");
  chip(profile.isPregnantOrNewborn && "懷孕或有新生兒", "family");
  chip(profile.hasLaborInsurance && "有勞保", "status");
  chip(profile.hasNationalPension && "有國保", "status");
  chip(profile.isStudent && "學生", "status");
  chip(profile.isUnemployed && "待業中", "status");
  chip(profile.isDisabled && "身障", "status");
  chip(profile.lowIncome === "low" ? "低收" : profile.lowIncome === "mid_low" ? "中低收" : null, "status");
  chip(profile.ownsVehicle === "scooter" ? "有機車" : profile.ownsVehicle === "car" ? "有汽車" : profile.ownsVehicle === "both" ? "有汽機車" : null, "vehicle");

  const jumpTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const jumpToObligations = () => jumpTo("results-obligations");
  const jumpToInfo = () => {
    update({ infoOpen: true });
    requestAnimationFrame(() => jumpTo("results-info"));
  };
  const pickCategory = (next: SubsidyCategory | "all") => {
    update({ category: next });
    // 頁面已經捲過這個區塊的開頭時，切換後清單變短，使用者會停在不相干的地方，所以把開頭捲回來
    requestAnimationFrame(() => {
      const el = benefitsRef.current;
      if (!el) return;
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      if (el.getBoundingClientRect().top < margin) el.scrollIntoView({ block: "start" });
    });
  };
  const toggleUnlikely = (key: string) =>
    update({ unlikelyOpen: ui.unlikelyOpen.includes(key) ? ui.unlikelyOpen.filter((k) => k !== key) : [...ui.unlikelyOpen, key] });

  const rowOf = (row: ResultRow, extra?: { showLateShort?: boolean }) => (
    <Row key={row.evaluation.subsidy.id} row={row} today={today} showLateShort={extra?.showLateShort} />
  );

  const renderList = (list: RowList, key: string, unlikelyText: string, split = false) => {
    const open = ui.unlikelyOpen.includes(key);
    const main = split ? list.rows.filter((r) => r.status !== "situational") : list.rows;
    const situational = split ? list.rows.filter((r) => r.status === "situational") : [];
    return (
      <ListCard>
        {main.map((r) => rowOf(r))}
        {situational.length > 0 && (
          <div className="bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground">遇到才用得上</div>
        )}
        {situational.map((r) => rowOf(r))}
        {list.unlikely.length > 0 && (
          <ExpandRow open={open} onToggle={() => toggleUnlikely(key)}>
            {/* 名稱直接寫出來：原住民、農民不用先展開，也看得到自己的項目收在這一行 */}
            另有 {list.unlikely.length} 項，{unlikelyText}：{list.unlikely.map((r) => r.evaluation.subsidy.short_name || r.evaluation.subsidy.name).join("、")}
          </ExpandRow>
        )}
        {open && <div className="divide-y divide-border bg-muted/30">{list.unlikely.map((r) => rowOf(r))}</div>}
      </ListCard>
    );
  };

  const shownBenefits = category === "all" ? view.benefits : view.benefits.filter((g) => g.category === category);
  const hasObligations = view.obligations.rows.length > 0 || view.obligations.unlikely.length > 0;
  const hasInfo = view.info.rows.length > 0 || view.info.unlikely.length > 0;
  // 繳費期限排在整份補助清單後面：最近的一個快到時在這裡先講，不然剩 11 天的地價稅要捲過 35 列才看得到
  const nearest = view.obligationsNearestDays;
  const extraParts: Array<{ text: string; note?: string; onClick: () => void }> = [];
  if (counts.obligations > 0) {
    extraParts.push({
      text: `${counts.obligations} 項要繳、要辦的期限`,
      note: nearest !== null && nearest <= 30 ? (nearest === 0 ? "最近的今天截止" : `最近的剩 ${nearest} 天`) : undefined,
      onClick: jumpToObligations,
    });
  }
  if (counts.info > 0) extraParts.push({ text: `${counts.info} 項須知與工具`, onClick: jumpToInfo });

  return (
    <div className="space-y-6">
      {/* 條件卡 */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">你的條件</p>
          {/* 什麼都沒填時沒有東西可改、可清：按鈕只留空狀態裡的「開始填」 */}
          {!noneAnswered && (
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => onEdit()} aria-label="修改條件" className="inline-flex h-10 items-center gap-1 rounded-full border border-border px-3.5 text-xs hover:bg-accent">
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> 修改
              </button>
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                aria-label="清除重填"
                className="inline-flex h-10 items-center gap-1 rounded-full border border-border px-3.5 text-xs text-muted-foreground hover:bg-accent"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> 重填
              </button>
            </div>
          )}
        </div>
        {confirmingReset && (
          <div role="alertdialog" aria-label="清除重填" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs dark:border-red-900 dark:bg-red-950/30">
            <span>7 題的答案都會清掉，要從第 1 題重填。</span>
            <span className="flex gap-2">
              <button type="button" onClick={() => setConfirmingReset(false)} className="h-9 rounded-full border border-border bg-background px-3.5">
                不清除
              </button>
              <button type="button" onClick={onReset} className="h-9 rounded-full bg-red-600 px-3.5 font-medium text-white hover:bg-red-700">
                清除
              </button>
            </span>
          </div>
        )}
        {noneAnswered ? (
          <div className="mt-3 rounded-xl bg-muted/50 px-4 py-4">
            <p className="text-base font-semibold">還沒填條件</p>
            <p className="mt-1 text-sm text-muted-foreground">回答 7 題，大約 1 分鐘。下面的清單會縮成跟你有關的項目。</p>
            <button type="button" onClick={() => onEdit()} className="mt-3 h-11 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">
              開始填
            </button>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {chips.length === 0 ? (
              <span className="text-sm text-muted-foreground">已回答 {answeredCount(profile)} 題</span>
            ) : (
              chips.map((c) => (
                <button key={c.label} type="button" onClick={() => onEdit(c.step)} aria-label={`修改：${c.label}`} className="inline-flex h-9 items-center rounded-full bg-muted px-3 text-xs hover:bg-accent">
                  {c.label}
                </button>
              ))
            )}
          </div>
        )}
        {unanswered.length > 0 && !noneAnswered && (
          // 灰字加描邊小按鈕沒人看到：改成琥珀色一塊，並寫出是哪幾題，補答按鈕用主色
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="min-w-0 flex-1 basis-48 text-xs leading-relaxed">
              還有 {unanswered.length} 題沒回答：{unanswered.map((s) => STEP_NAMES[s]).join("、")}。補答之後，要再確認的項目會變少。
            </p>
            <button type="button" onClick={() => onEdit(unanswered[0], { fill: true })} className="h-10 shrink-0 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground">
              補答
            </button>
          </div>
        )}
        {!noneAnswered && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat kind="match" icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />} n={counts.match} label="條件相符" />
          <Stat kind="check" icon={<HelpCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />} n={counts.check} label="要再確認" />
          <Stat kind="situational" icon={<Circle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />} n={counts.situational} label="遇到才用得上" />
        </div>
        )}
        {!noneAnswered && extraParts.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">另外有</span>
            {extraParts.map((p) => (
              <button key={p.text} type="button" onClick={p.onClick} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-left hover:bg-accent">
                <span>{p.text}</span>
                {p.note && <span className="font-medium text-amber-700 dark:text-amber-400">{p.note}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 先處理 */}
      {view.picks.length > 0 && (
        <section data-section="picks" className="rounded-2xl border border-amber-300 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20">
          <h2 className="px-1 text-base font-semibold">先處理這 {view.picks.length} 項</h2>
          <p className="mb-2 px-1 text-xs text-muted-foreground">越晚送領得越少，或 {PICK_CLOSING_DAYS} 天內截止。
            {unanswered.length > 0 && `有 ${unanswered.length} 題沒回答，補答後這份名單可能會變。`}
          </p>
          <ListCard>{view.picks.map((p) => rowOf(p.row, { showLateShort: p.why === "apply_now" }))}</ListCard>
        </section>
      )}

      {/* 可以領、可以用的 */}
      {view.benefits.length > 0 && (
        <section data-section="benefits" ref={benefitsRef} style={SCROLL_MARGIN}>
          <h2 className="text-base font-semibold">可以領、可以用的</h2>
          <p className="text-xs text-muted-foreground">按生活分類排。相符的在前，要再確認的在後。</p>
          <div className="sticky z-10 -mx-4 border-b border-border bg-background px-4 py-2" style={{ top: "calc(3.5rem + var(--safe-top))" }}>
            <div className="flex gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <CategoryChip active={category === "all"} id="all" onClick={() => pickCategory("all")}>
                全部 {benefitTotal}
              </CategoryChip>
              {chipGroups.map((g) => (
                <CategoryChip key={g.category} active={category === g.category} id={g.category} onClick={() => pickCategory(g.category)}>
                  {CATEGORY_LABELS[g.category]} {g.rows.length}
                </CategoryChip>
              ))}
            </div>
          </div>
          <div className="mt-2 space-y-5">
            {shownBenefits.map((g) => (
              <section key={g.category} data-category-section={g.category}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    <CategoryIcon category={g.category} className="h-4 w-4 text-muted-foreground" />
                    {CATEGORY_LABELS[g.category]}
                  </h3>
                  {(g.match > 0 || g.check > 0) && (
                    <span className="text-xs text-muted-foreground">
                      {[g.match > 0 && `相符 ${g.match}`, g.check > 0 && `要確認 ${g.check}`].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
                {renderList(g, g.category, "要特定身分或例外情形才適用", true)}
              </section>
            ))}
          </div>
        </section>
      )}

      {/* 要繳、要辦的期限 */}
      {hasObligations && (
        <section id="results-obligations" data-section="obligations" style={SCROLL_MARGIN}>
          <h2 className="text-base font-semibold">要繳、要辦的期限</h2>
          <p className="mb-2 text-xs text-muted-foreground">沒有錢可以領；錯過會被罰或加收滯納金。近的排前面。</p>
          {renderList(view.obligations, "obligations", "少數情形才跟你有關")}
        </section>
      )}

      {/* 須知與工具 */}
      {hasInfo && (
        <section id="results-info" data-section="info" style={SCROLL_MARGIN}>
          <button
            type="button"
            onClick={() => update({ infoOpen: !ui.infoOpen })}
            aria-expanded={ui.infoOpen}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 text-left active:bg-accent"
          >
            <span>
              <span className="block text-sm font-semibold">須知與工具（{counts.info}）</span>
              <span className="block text-xs text-muted-foreground">租約怎麼簽、基本工資、線上申辦用的憑證。</span>
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${ui.infoOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {ui.infoOpen && (
            <div className="mt-2">
              <ListCard>{[...view.info.rows, ...view.info.unlikely].map((r) => rowOf(r))}</ListCard>
            </div>
          )}
        </section>
      )}

      {/* 不符合 */}
      {counts.excluded > 0 && (
        <section data-section="excluded">
          <button
            type="button"
            onClick={() => update({ excludedOpen: !ui.excludedOpen })}
            aria-expanded={ui.excludedOpen}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 text-left text-sm active:bg-accent"
          >
            <span>不符合的 {counts.excluded} 項</span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${ui.excludedOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {ui.excludedOpen && (
            <div className="mt-3 space-y-4">
              {view.excluded.map((g) => (
                <div key={g.category}>
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                    <CategoryIcon category={g.category} className="h-4 w-4 text-muted-foreground" />
                    {CATEGORY_LABELS[g.category]}
                  </h3>
                  <ListCard>{g.rows.map((r) => rowOf(r))}</ListCard>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        這是依你填的條件與公開資格做的初步比對，不是審核結果。有些補助還看財產、家庭人口、戶籍年限，點進項目看「誰可以申請」與「常見卡關」。想記下截止日，到項目頁按「加入提醒」。
        不確定怎麼辦？看<Link href="/subsidy/faq" className="underline underline-offset-4">疑難雜症</Link>。
      </p>
    </div>
  );
}

function Stat({ kind, icon, n, label }: { kind: string; icon: React.ReactNode; n: number; label: string }) {
  return (
    <div className="rounded-xl bg-muted/50 py-2" data-count={kind}>
      <div className="flex items-center justify-center gap-1 text-lg font-bold">
        {icon}
        {n}
      </div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function CategoryChip({ active, id, onClick, children }: { active: boolean; id: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-category={id}
      className={`h-9 shrink-0 rounded-full border px-3 text-xs transition-colors ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}
