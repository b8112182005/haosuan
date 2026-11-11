import type { Metadata } from "next";
import FaqBrowser, { type FaqEntry } from "@/components/subsidy/FaqBrowser";
import { getAllSubsidies, getGeneralFaqs } from "@/lib/subsidy/data";
import { serializeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "補助疑難雜症",
  description: "房東不同意怎麼辦？戶籍在外縣市能申請嗎？被退件怎麼補件？撥款要多久？政府補助申請常見問題，每一題都附官方來源。",
  alternates: { canonical: "/subsidy/faq" },
};

// 問答依研究主題分組（研究員自由填的 tags 有六十幾種，不適合當篩選條件）
const TOPIC_LABELS: Record<string, string> = {
  "cross-cutting-faq-2026": "申請通用",
  "government-digital-access": "線上申辦",
  "rent-subsidy-central": "租金補貼",
  "housing-rental-disputes-and-rights": "租屋權利",
  "housing-loans-and-programs": "購屋與社宅",
  "income-tax-2026": "稅務",
  "childcare-and-birth": "生育育兒",
  "family-support-misc": "家庭扶助",
  "labor-benefits": "勞工",
  "youth-and-students": "青年與學生",
  "health-insurance-pension-screening": "健保與健檢",
  "disability-and-elderly": "長者與身障",
  "low-income-thresholds": "低收／中低收",
  "energy-appliance-vehicle": "節能與車輛",
  "annual-calendar-2026-2027": "年度期限",
};
const topicLabel = (topic: string | undefined) => (topic && TOPIC_LABELS[topic]) || "其他";

export default function SubsidyFaqPage() {
  const general = getGeneralFaqs();
  const subsidies = getAllSubsidies();

  // 依 TOPIC_LABELS 的順序排（申請通用、線上申辦最前面）
  const order = Object.keys(TOPIC_LABELS);
  const rank = (topic: string | undefined) => {
    const i = topic ? order.indexOf(topic) : -1;
    return i < 0 ? order.length : i;
  };
  const generalSorted = [...general].sort((a, b) => rank(a.topic) - rank(b.topic));
  const subsidiesSorted = [...subsidies].sort((a, b) => rank(a.topic) - rank(b.topic));

  // 一般問答排前面：它們回答的是「不知道該看哪一項」時的問題
  const entries: FaqEntry[] = [
    ...generalSorted.map((f) => ({
      q: f.q,
      a: f.a,
      source_url: f.source_url,
      group: topicLabel(f.topic),
    })),
    ...subsidiesSorted.flatMap((s) =>
      s.faqs.map((f) => ({
        q: f.q,
        a: f.a,
        source_url: f.source_url,
        group: topicLabel(s.topic),
        subsidyId: s.id,
        subsidyName: s.short_name || s.name,
      }))
    ),
  ];

  // 篩選鈕依 TOPIC_LABELS 的順序排，只列有資料的
  const present = new Set(entries.map((e) => e.group));
  const groups = [...Object.values(TOPIC_LABELS), "其他"].filter((g) => present.has(g));

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
