"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
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

function writeStored(patch: Partial<Stored>) {
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify({ ...readStored(), ...patch }));
  } catch {
    // 存不了就算了，只是回來時不會停在原位
  }
}

/** 精靈存檔、重填、進修改模式時呼叫：條件變了，舊的捲動位置對不上新的清單。分類與展開狀態留著 */
export function clearResultsScroll() {
  writeStored({ y: 0 });
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
  if (row.status === "no") return <XCircle className={`${cls} text-muted-foreground`} aria-label="不符合" />;
  if (kind === "obligation") return <CalendarClock className={`${cls} text-muted-foreground`} aria-label="繳費或辦理期限" />;
  if (kind === "info") return <Info className={`${cls} text-muted-foreground`} aria-label="須知" />;
  if (row.status === "match") return <CheckCircle2 className={`${cls} text-emerald-600`} aria-label="條件相符" />;
  if (row.status === "situational") return <Circle className={`${cls} text-muted-foreground`} aria-label="遇到才用得上" />;
  return <HelpCircle className={`${cls} text-amber-600`} aria-label="要再確認" />;
}

const TONE_CLASS = {
  ok: "text-emerald-700 dark:text-emerald-400",
  ask: "text-amber-700 dark:text-amber-400",
  plain: "text-muted-foreground",
  no: "text-muted-foreground",
} as const;

function Row({ row, today, onOpen, showLateShort }: { row: ResultRow; today: LocalDate | null; onOpen: () => void; showLateShort?: boolean }) {
  const { subsidy } = row.evaluation;
  const reason = reasonLine(row);
  const light = row.status === "situational" || row.status === "unlikely" || row.status === "no";
  const lateShort = showLateShort ? subsidy.late_consequence?.short : null;
  return (
    <Link
      href={`/subsidy/${subsidy.id}`}
      onClick={onOpen}
      data-row={subsidy.id}
      data-status={row.status}
      className="flex items-start gap-3 px-4 py-3 active:bg-accent"
    >
      <StatusIcon row={row} />
      <div className="min-w-0 flex-1">
        <p className={`line-clamp-2 text-sm leading-snug ${light ? "font-medium" : "font-semibold"}`}>{subsidy.short_name || subsidy.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {subsidy.kind === "benefit" && (
            <span className="max-w-full truncate text-[13px] font-medium text-emerald-700 dark:text-emerald-300">{amountHeadline(subsidy.amount)}</span>
          )}
          {subsidy.city && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {subsidy.city}
            </span>
          )}
          <DeadlineBadge subsidy={subsidy} today={today} />
          <StatusBadge subsidy={subsidy} />
          {row.applyNow && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">現在就能送件</span>
          )}
        </div>
        {lateShort && <p className="mt-1 text-xs leading-relaxed text-foreground">{lateShort}</p>}
        {subsidy.kind === "info" && reason.tone === "plain" ? (
          <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-muted-foreground">{subsidy.summary}</p>
        ) : (
          <p className={`mt-1 line-clamp-2 text-xs leading-relaxed ${TONE_CLASS[reason.tone]}`}>{reason.text}</p>
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
      <span className="line-clamp-2 leading-relaxed">{children}</span>
      <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
  );
}

/* ---------- 結果頁 ---------- */

interface Props {
  profile: Profile;
  evaluations: Evaluation[] | null;
  onEdit: (step?: ProfileStep) => void;
  onReset: () => void;
}

export default function CheckResults({ profile, evaluations, onEdit, onReset }: Props) {
  const today = useToday();
  const view = useMemo(() => (evaluations && today ? buildResultsView(evaluations, today) : null), [evaluations, today]);

  // 這個元件只在 client 掛載後才 render（精靈先讀完條件才會切到結果），所以可以直接在 lazy initializer 讀 sessionStorage
  const [ui, setUi] = useState<Stored>(readStored);
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
    const { y, at, entry } = readStored();
    if (y <= 0) return;
    const here = entryKey();
    // 存的位置屬於另一筆瀏覽紀錄：這次是從別的連結走進來的，留在最上面。位置先留著，之後按返回回到那一筆時還用得到
    if (entry !== null && here !== null && entry !== here) return;
    if (Date.now() - at < RESTORE_WINDOW_MS) requestAnimationFrame(() => window.scrollTo(0, y));
    writeStored({ y: 0 });
  }, [view]);

  if (!view) return <div className="h-64 animate-pulse rounded-2xl bg-muted/40" aria-busy="true" />;

  const { counts } = view;
  const category = ui.category !== "all" && view.benefits.some((g) => g.category === ui.category) ? ui.category : "all";
  const benefitTotal = view.benefits.reduce((n, g) => n + g.rows.length, 0);
  const unanswered = unansweredSteps(profile);
  const noneAnswered = unanswered.length === PROFILE_STEPS.length;

  const chips: Array<{ label: string; step: ProfileStep }> = [];
  const chip = (label: string | false | null, step: ProfileStep) => {
    if (label) chips.push({ label, step });
  };
  chip(profile.city, "city");
  chip(profile.age !== null && `${profile.age} 歲`, "age");
  chip(profile.monthlyIncome !== null && `月收入 ${profile.monthlyIncome.toLocaleString("zh-TW")}`, "income");
  chip(profile.isRenting ? "租屋" : profile.ownsHome ? "有房" : null, "housing");
  chip(profile.isMarried && "已婚", "family");
  chip(profile.hasChildren && `子女 ${profile.childrenAges.length || "有"}`, "family");
  chip(profile.isPregnantOrNewborn && "懷孕或有新生兒", "family");
  chip(profile.hasLaborInsurance && "有勞保", "status");
  chip(profile.hasNationalPension && "有國保", "status");
  chip(profile.isStudent && "學生", "status");
  chip(profile.isUnemployed && "待業中", "status");
  chip(profile.isDisabled && "身障", "status");
  chip(profile.lowIncome === "low" ? "低收" : profile.lowIncome === "mid_low" ? "中低收" : null, "status");
  chip(profile.ownsVehicle === "scooter" ? "有機車" : profile.ownsVehicle === "car" ? "有汽車" : profile.ownsVehicle === "both" ? "有汽機車" : null, "vehicle");

  const rememberPosition = () => writeStored({ y: window.scrollY, at: Date.now(), entry: entryKey() });
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
    <Row key={row.evaluation.subsidy.id} row={row} today={today} onOpen={rememberPosition} showLateShort={extra?.showLateShort} />
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
        {open && list.unlikely.map((r) => rowOf(r))}
      </ListCard>
    );
  };

  const shownBenefits = category === "all" ? view.benefits : view.benefits.filter((g) => g.category === category);
  const hasObligations = view.obligations.rows.length > 0 || view.obligations.unlikely.length > 0;
  const hasInfo = view.info.rows.length > 0 || view.info.unlikely.length > 0;
  const extraParts: Array<{ text: string; onClick: () => void }> = [];
  if (counts.obligations > 0) extraParts.push({ text: `${counts.obligations} 項要繳、要辦的期限`, onClick: jumpToObligations });
  if (counts.info > 0) extraParts.push({ text: `${counts.info} 項須知與工具`, onClick: jumpToInfo });

  return (
    <div className="space-y-6">
      {/* 條件卡 */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">你的條件</p>
          <div className="flex shrink-0 gap-1.5">
            <button type="button" onClick={() => onEdit()} aria-label="修改條件" className="inline-flex h-9 items-center gap-1 rounded-full border border-border px-3 text-xs hover:bg-accent">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> 修改
            </button>
            <button type="button" onClick={onReset} aria-label="清除重填" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-accent">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {noneAnswered ? (
            <span className="text-sm text-muted-foreground">沒有填任何條件，有門檻的項目都會列在「要再確認」。</span>
          ) : chips.length === 0 ? (
            <span className="text-sm text-muted-foreground">已回答 {answeredCount(profile)} 題</span>
          ) : (
            chips.map((c) => (
              <button key={c.label} type="button" onClick={() => onEdit(c.step)} className="rounded-full bg-muted px-2.5 py-1 text-xs hover:bg-accent">
                {c.label}
              </button>
            ))
          )}
        </div>
        {unanswered.length > 0 && !noneAnswered && (
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>還有 {unanswered.length} 題沒回答。補答之後，要再確認的項目會變少。</span>
            <button type="button" onClick={() => onEdit(unanswered[0])} className="h-8 shrink-0 rounded-full border border-border px-3 text-foreground hover:bg-accent">
              補答
            </button>
          </div>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat kind="match" icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />} n={counts.match} label="條件相符" />
          <Stat kind="check" icon={<HelpCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />} n={counts.check} label="要再確認" />
          <Stat kind="situational" icon={<Circle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />} n={counts.situational} label="遇到才用得上" />
        </div>
        {extraParts.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            另外有{" "}
            {extraParts.map((p, i) => (
              <span key={p.text}>
                {i > 0 && "，"}
                <button type="button" onClick={p.onClick} className="underline underline-offset-4 hover:text-foreground">
                  {p.text}
                </button>
              </span>
            ))}
            。
          </p>
        )}
      </div>

      {/* 先處理 */}
      {view.picks.length > 0 && (
        <section data-section="picks" className="rounded-2xl border border-amber-300 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20">
          <h2 className="px-1 text-base font-semibold">先處理這 {view.picks.length} 項</h2>
          <p className="mb-2 px-1 text-xs text-muted-foreground">越晚送領得越少，或 {PICK_CLOSING_DAYS} 天內截止。</p>
          <ListCard>{view.picks.map((p) => rowOf(p.row, { showLateShort: p.why === "apply_now" }))}</ListCard>
        </section>
      )}

      {/* 可以領、可以用的 */}
      {view.benefits.length > 0 && (
        <section data-section="benefits" ref={benefitsRef} style={SCROLL_MARGIN}>
          <h2 className="text-base font-semibold">可以領、可以用的</h2>
          <p className="text-xs text-muted-foreground">按生活分類排。相符的在前，要再確認的在後。</p>
          <div className="sticky z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur" style={{ top: "calc(3.5rem + var(--safe-top))" }}>
            <div className="flex gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <CategoryChip active={category === "all"} id="all" onClick={() => pickCategory("all")}>
                全部 {benefitTotal}
              </CategoryChip>
              {view.benefits.map((g) => (
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
