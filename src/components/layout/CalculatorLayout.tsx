import { ReactNode } from "react";
import Link from "next/link";
import Breadcrumb from "./Breadcrumb";

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
  /** JSON-LD schema 物件（由頁面傳入，此元件只負責 inject） */
  jsonLd?: Record<string, unknown>;
}

export default function CalculatorLayout({
  title,
  description,
  children,
  faqs,
  relatedTools,
  showYumoPromo = false,
  jsonLd,
}: CalculatorLayoutProps) {
  // 有 FAQ 時額外產生 FAQPage structured data，讓頁面有資格拿 Google FAQ rich result
  const faqJsonLd =
    faqs && faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
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
