import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ExternalLink,
  MapPin,
  Building2,
  FileText,
  ListOrdered,
  AlertTriangle,
  HelpCircle,
  Calculator,
  Link2,
  Globe,
  Phone,
  Landmark,
  Smartphone,
  Mail,
  ChevronLeft,
} from "lucide-react";
import { getAllSubsidies, getSubsidyById, getSubsidyIds, getRelatedSubsidies } from "@/lib/subsidy/data";
import { CATEGORY_LABELS } from "@/lib/subsidy/types";
import type { SubsidyChannel } from "@/lib/subsidy/types";
import { describeWindow } from "@/lib/subsidy/deadline";
import { tools } from "@/lib/tools-registry";
import { serializeJsonLd } from "@/lib/json-ld";
import DeadlineCard from "@/components/subsidy/DeadlineCard";
import LiveUpdateNotice from "@/components/subsidy/LiveUpdateNotice";
import ShareAppButton from "@/components/app/ShareAppButton";
import { SITE_URL } from "@/lib/site";

// 靜態輸出：每個項目一頁；資料檔外的 id 直接 404
export const dynamicParams = false;

export function generateStaticParams() {
  return getSubsidyIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = getSubsidyById(id);
  if (!s) return {};
  const title = s.short_name || s.name;
  return {
    title: `${title}：資格、金額、截止日與申請方式`,
    description: s.summary.slice(0, 150),
    alternates: { canonical: `/subsidy/${s.id}` },
    openGraph: { title: `${title} | 好耶`, description: s.summary.slice(0, 150), url: `/subsidy/${s.id}` },
  };
}

const channelIcon: Record<SubsidyChannel["type"], React.ElementType> = {
  online: Globe,
  office: Landmark,
  mail: Mail,
  phone: Phone,
  app: Smartphone,
  bank: Building2,
  other: Link2,
};

const confidenceLabel = { high: "已對照官方來源", medium: "部分欄位待核對", low: "資料待核對" } as const;

// unverified_fields 存的是欄位名，顯示時換成一般人看得懂的詞；研究員自由填的字串就原樣顯示
const FIELD_LABELS: Record<string, string> = {
  amount: "金額",
  "amount.text": "金額",
  "amount.max": "金額上限",
  "amount.min": "金額下限",
  "amount.formula": "計算方式",
  conditions: "資格條件",
  "conditions.income_limit_value": "所得門檻",
  "conditions.income_limit_note": "所得門檻說明",
  deadline: "申請期限",
  "deadline.start_month": "開放月份",
  "deadline.end_month": "截止月份",
  "deadline.end_day": "截止日",
  status_2026: "2026 年是否辦理",
  official_url: "官方網址",
  documents: "應備文件",
  how_to_apply: "申請步驟",
  channels: "申請管道",
  eligibility: "資格條件",
  last_known_update: "官方更新日期",
};

export default async function SubsidyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = getSubsidyById(id);
  if (!s) notFound();

  const related = getRelatedSubsidies(s, 4);
  const calc = s.related_calculator ? tools.find((t) => t.slug === s.related_calculator) : undefined;
  const allCount = getAllSubsidies().length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "GovernmentService",
    name: s.name,
    description: s.summary,
    provider: { "@type": "GovernmentOrganization", name: s.agency },
    areaServed: s.city ?? "臺灣",
    url: `${SITE_URL}/subsidy/${s.id}`,
    ...(s.faqs.length > 0
      ? {
          mainEntityOfPage: {
            "@type": "FAQPage",
            mainEntity: s.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        }
      : {}),
  };

  return (
    <article className="mx-auto max-w-3xl px-4 pb-10 pt-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />

      <Link href="/subsidy" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> 全部補助（{allCount}）
      </Link>

      {/* 標題區 */}
      <header className="mb-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5">{CATEGORY_LABELS[s.category]}</span>
          <span className="rounded-full bg-muted px-2 py-0.5">{s.level === "central" ? "全國" : "地方"}</span>
          {s.city && (
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {s.city}
            </span>
          )}
          {s.status_2026 === "ended" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">已結束</span>}
          {s.status_2026 === "pending" && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">待公告</span>}
        </div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{s.name}</h1>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" /> {s.agency}
        </p>
        <p className="mt-3 text-[15px] leading-relaxed">{s.summary}</p>
      </header>

      <LiveUpdateNotice subsidy={s} />

      {/* 金額 + 期限 */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">補助金額</p>
          <p className="mt-0.5 text-lg font-bold leading-snug text-emerald-900 dark:text-emerald-100">{s.amount.text}</p>
          {s.amount.formula && <p className="mt-1.5 text-xs leading-relaxed text-emerald-800/80 dark:text-emerald-200/80">計算方式：{s.amount.formula}</p>}
          {calc && (
            <Link
              href={calc.href}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-white dark:bg-emerald-900/50 dark:text-emerald-100"
            >
              <Calculator className="h-3.5 w-3.5" /> 用「{calc.name}」算看看
            </Link>
          )}
        </section>
        <DeadlineCard subsidy={s} />
      </div>

      {/* 主要行動 */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <a
          href={s.official_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          前往官方申請頁 <ExternalLink className="h-4 w-4" />
        </a>
        <ShareAppButton title={s.name} text={`${s.name}：${s.amount.text}。${describeWindow(s.deadline)}。`} url={`${SITE_URL}/subsidy/${s.id}`} label="分享這項補助" />
      </div>

      {/* 資格 */}
      <Section icon={FileText} title="誰可以申請">
        {s.eligibility.length === 0 ? (
          <p className="text-sm text-muted-foreground">官方未列出額外身分條件，詳見申請頁。</p>
        ) : (
          <ul className="space-y-2">
            {s.eligibility.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        )}
        {s.conditions.income_limit_note && (
          <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            所得／財產門檻：{s.conditions.income_limit_note}
          </p>
        )}
        <p className="mt-3 text-xs">
          <Link href="/subsidy/check" className="underline underline-offset-4">用資格試算比對你的條件</Link>
        </p>
      </Section>

      {/* 文件 */}
      {s.documents.length > 0 && (
        <Section icon={ListOrdered} title="要準備的文件">
          <ul className="space-y-2">
            {s.documents.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border text-[10px] text-muted-foreground">{i + 1}</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 步驟 */}
      {s.how_to_apply.length > 0 && (
        <Section icon={ListOrdered} title="怎麼申請">
          <ol className="space-y-3">
            {s.how_to_apply.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* 管道 */}
      {s.channels.length > 0 && (
        <Section icon={Link2} title="申請管道">
          <div className="flex flex-wrap gap-2">
            {s.channels.map((c, i) => {
              const Icon = channelIcon[c.type] ?? Link2;
              const cls = "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/50 hover:text-primary";
              return c.url ? (
                <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" className={cls}>
                  <Icon className="h-3.5 w-3.5" /> {c.label}
                </a>
              ) : (
                <span key={i} className={cls}>
                  <Icon className="h-3.5 w-3.5" /> {c.label}
                </span>
              );
            })}
          </div>
        </Section>
      )}

      {/* 注意事項 */}
      {s.pitfalls.length > 0 && (
        <Section icon={AlertTriangle} title="常見卡關" tone="warn">
          <ul className="space-y-2">
            {s.pitfalls.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* FAQ */}
      {s.faqs.length > 0 && (
        <Section icon={HelpCircle} title="常見問題">
          <div className="space-y-2">
            {s.faqs.map((f, i) => (
              <details key={i} className="group rounded-xl border border-border">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium">
                  {f.q}
                  <span className="shrink-0 text-lg leading-none text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                  {f.source_url && (
                    <a href={f.source_url} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-0.5 text-xs underline underline-offset-4">
                      來源 <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </details>
            ))}
          </div>
        </Section>
      )}

      {/* 相關 */}
      {related.length > 0 && (
        <Section icon={Landmark} title="相關補助">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {related.map((r) => (
              <Link key={r.id} href={`/subsidy/${r.id}`} className="rounded-xl border border-border p-3 text-sm hover:border-primary/50">
                <span className="block font-medium">{r.short_name || r.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{r.amount.text}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 來源 */}
      <footer className="mt-8 rounded-2xl border border-border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">
          資料來源與核對 · {confidenceLabel[s.confidence]}
          {s.last_known_update && ` · 官方最後更新 ${s.last_known_update}`}
        </p>
        <ul className="mt-2 space-y-1">
          {s.sources.map((src, i) => (
            <li key={i}>
              <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">
                {src.title}
              </a>
              {src.publisher && <span> · {src.publisher}</span>}
              {src.accessed && <span> · 讀取於 {src.accessed}</span>}
            </li>
          ))}
        </ul>
        {s.verified_at && (
          <p className="mt-2 text-emerald-700 dark:text-emerald-400">
            ✓ {s.verified_at} 由第二位核對員對照官方頁面重查金額、期限與是否仍辦理。
            {s.verification_summary && <span className="text-muted-foreground"> {s.verification_summary}</span>}
          </p>
        )}
        {s.unverified_fields.length > 0 && (
          <p className="mt-2">
            未取得官方依據的欄位：{s.unverified_fields.map((f) => FIELD_LABELS[f] ?? f).join("、")}。申請前請向主管機關確認。
          </p>
        )}
        <p className="mt-2">本頁為公開資訊整理，不是主管機關網站；審核結果以主管機關為準。</p>
      </footer>
    </article>
  );
}

function Section({
  icon: Icon,
  title,
  children,
  tone,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  tone?: "warn";
}) {
  return (
    <section className={`mb-6 rounded-2xl border p-4 ${tone === "warn" ? "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20" : "border-border"}`}>
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" /> {title}
      </h2>
      {children}
    </section>
  );
}
