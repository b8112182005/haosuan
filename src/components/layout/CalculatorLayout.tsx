import { ReactNode } from "react";
import Link from "next/link";
import Breadcrumb from "./Breadcrumb";
import NextStepCta, { type NextStepCtaProps } from "@/components/common/NextStepCta";
import { CTA_URLS } from "@/lib/brand";
import { serializeJsonLd } from "@/lib/json-ld";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface RelatedTool {
  label: string;
  href: string;
}

export interface CalculatorLayoutProps {
  /** 工具頁標題 */
  title: string;
  /** 工具頁說明文字 */
  description: string;
  /** 計算機 UI 區塊 */
  children: ReactNode;
  /** FAQ 列表（至少 3 項） */
  faqs?: FaqItem[];
  /** 相關工具連結 */
  relatedTools?: RelatedTool[];
  /** 是否顯示 YumoPromo（裝潢分類用） */
  showYumoPromo?: boolean;
  /** 計算後下一步 CTA：用於導向提醒、模板包或 checklist */
  nextStepCta?: NextStepCtaProps;
  /** JSON-LD schema 物件（由頁面傳入，此元件只負責 inject） */
  jsonLd?: Record<string, unknown>;
}

const defaultNextStepCta: NextStepCtaProps = {
  eyebrow: "算完下一步",
  title: "把結果變成可以追蹤的提醒或模板",
  description:
    "接案報價、工程估算、生活期限都不要只停在一次試算。先領免費模板包，或用好提 LINE 記下重要日期。",
  primaryLabel: "領免費模板包",
  primaryHref: "/free-template",
  secondaryLabel: "加入好提 LINE",
  secondaryHref: CTA_URLS.lineHomeHero,
};

export default function CalculatorLayout({
  title,
  description,
  children,
  faqs,
  relatedTools,
  showYumoPromo = false,
  nextStepCta,
  jsonLd,
}: CalculatorLayoutProps) {
  const resolvedNextStepCta = nextStepCta ?? defaultNextStepCta;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      )}

      <div className="mx-auto max-w-5xl px-4 pb-16">
        <Breadcrumb />

        {/* 標題區 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </div>

        {/* 計算機主體 */}
        <div className="mb-12 animate-in fade-in duration-300">{children}</div>

        {/* 計算後下一步 */}
        <NextStepCta {...resolvedNextStepCta} />

        {/* YumoPromo — 裝潢分類 */}
        {showYumoPromo && <YumoPromo />}

        {/* 相關工具 */}
        {relatedTools && relatedTools.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-semibold mb-4">相關工具</h2>
            <div className="flex flex-wrap gap-2">
              {relatedTools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="inline-flex items-center rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                >
                  {tool.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {faqs && faqs.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">常見問題</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <details
                  key={i}
                  className="group border border-border rounded-lg overflow-hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-medium hover:bg-muted/50 transition-colors list-none">
                    {faq.question}
                    <span className="ml-4 shrink-0 text-muted-foreground text-lg leading-none group-open:rotate-45 transition-transform duration-200">
                      +
                    </span>
                  </summary>
                  <div className="px-5 pb-4 pt-1 text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

/** 裝潢分類專用品牌推廣區塊 */
function YumoPromo() {
  return (
    <div className="mb-12 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-6">
      <div className="flex items-start gap-4">
        <div className="shrink-0 text-3xl">🏠</div>
        <div>
          <h3 className="font-semibold text-amber-900 dark:text-amber-100">
            瑀墨室內設計裝潢
          </h3>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
            專業台灣室內設計裝潢服務，提供油漆、磁磚、冷氣安裝等一站式施工。
            歡迎諮詢報價，讓您的家更美好。
          </p>
          <a
            href="https://yumo.tw"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center text-sm font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 underline underline-offset-4 transition-colors"
          >
            了解瑀墨裝潢服務 →
          </a>
        </div>
      </div>
    </div>
  );
}
