import type { Metadata } from "next";
import FaqBrowser, { type FaqEntry } from "@/components/subsidy/FaqBrowser";
import { getAllSubsidies, getGeneralFaqs } from "@/lib/subsidy/data";
import { CATEGORY_LABELS } from "@/lib/subsidy/types";
import { serializeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "補助疑難雜症",
  description: "房東不同意怎麼辦？戶籍在外縣市能申請嗎？被退件怎麼補件？撥款要多久？政府補助申請常見問題，每一題都附官方來源。",
  alternates: { canonical: "/subsidy/faq" },
};

// 一般問答的 tag → 顯示名稱；沒對到的 tag 直接顯示
const TAG_LABELS: Record<string, string> = {
  housing: "居住",
  rent: "租屋",
  tax: "稅務",
  family: "生育育兒",
  labor: "勞工",
  health: "健康與健保",
  low_income: "弱勢扶助",
  youth: "青年與學生",
  senior: "長者",
  disability: "身障",
  process: "申請流程",
  digital: "數位工具",
  fraud: "防詐騙",
  general: "通用",
};

export default function SubsidyFaqPage() {
  const general = getGeneralFaqs();
  const subsidies = getAllSubsidies();

  const entries: FaqEntry[] = [
    ...general.map((f) => ({
      q: f.q,
      a: f.a,
      source_url: f.source_url,
      group: f.tags[0] ? (TAG_LABELS[f.tags[0]] ?? f.tags[0]) : "通用",
    })),
    ...subsidies.flatMap((s) =>
      s.faqs.map((f) => ({
        q: f.q,
        a: f.a,
        source_url: f.source_url,
        group: CATEGORY_LABELS[s.category],
        subsidyId: s.id,
        subsidyName: s.short_name || s.name,
      }))
    ),
  ];

  const groups = Array.from(new Set(entries.map((e) => e.group)));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.slice(0, 50).map((e) => ({
      "@type": "Question",
      name: e.q,
      acceptedAnswer: { "@type": "Answer", text: e.a },
    })),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">疑難雜症</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {entries.length} 則申請補助會遇到的問題，每一則都附官方來源。找不到的，到各補助項目頁再看一次「常見卡關」。
        </p>
      </div>
      <FaqBrowser entries={entries} groups={groups} />
    </div>
  );
}
