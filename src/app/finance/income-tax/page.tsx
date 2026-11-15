import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import IncomeTaxCalculator from "./IncomeTaxCalculator";

export const metadata: Metadata = {
  title: "薪資所得稅試算",
  description:
    "依 115 年度（2026 年所得，2027 年 5 月申報）綜合所得稅規定，輸入月薪、婚姻狀況及撫養親屬，試算年度所得稅與有效稅率。",
  keywords: ["所得稅試算", "薪資稅", "報稅計算機", "扣除額", "台灣稅務"],
  openGraph: {
    title: "薪資所得稅試算 | 好耶",
    description: "依 115 年度（2027 年 5 月申報）的免稅額、扣除額與級距試算所得稅",
    url: "/finance/income-tax",
  },
};

const faqs = [
  {
    question: "薪資所得特別扣除額是多少？",
    answer:
      "115 年度（2026 年所得）薪資所得特別扣除額是 227,000 元，但不能超過薪資本身。例如年薪 20 萬，只能扣 20 萬。114 年度（2026 年 5 月申報的那一次）是 218,000 元。",
  },
  {
    question: "標準扣除額和列舉扣除額哪個好？",
    answer:
      "115 年度標準扣除額單身 136,000 元、有配偶 272,000 元。列舉扣除額包含捐贈、保險費、醫療費、購屋借款利息等，列舉的合計超過標準扣除額時才選列舉。",
  },
  {
    question: "受撫養親屬免稅額怎麼算？",
    answer:
      "115 年度每人免稅額 101,000 元；年滿 70 歲的本人、配偶與受扶養直系尊親屬（父母、祖父母）是 151,500 元。受扶養親屬要符合條件，例如未成年子女，或已成年但在校就學。",
  },
  {
    question: "試算結果需要繳稅嗎？",
    answer:
      "本工具僅為估算，實際應納稅額以財政部國稅局核定為準。另外，若有其他所得（股利、租金、兼差等），需一併申報。受僱者全年薪資若低於免稅額與扣除額之和，則不需繳稅。",
  },
  {
    question: "月薪 40,000 元要繳多少所得稅？",
    answer:
      "月薪 40,000 元、年薪 480,000 元、單身、沒有扶養親屬：扣掉薪資所得特別扣除額 22.7 萬、免稅額 10.1 萬、標準扣除額 13.6 萬，綜合所得淨額 16,000 元，適用 5% 稅率，全年應繳 800 元。年終獎金、其他所得要另外加進年薪。",
  },
];

const relatedTools = [
  { label: "加班費計算機", href: "/finance/overtime" },
  { label: "房貸試算", href: "/finance/mortgage" },
  { label: "複利計算機", href: "/finance/compound-interest" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "薪資所得稅試算",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "依 115 年度（2027 年 5 月申報）的免稅額、扣除額與級距試算所得稅",
};

export default function IncomeTaxPage() {
  return (
    <CalculatorLayout
      title="薪資所得稅試算"
      description="依 115 年度（2026 年所得，2027 年 5 月申報）綜合所得稅規定，輸入月薪、婚姻狀況及撫養親屬人數，試算年度應繳稅額與有效稅率"
      faqs={faqs}
      relatedTools={relatedTools}
      nextStepCta={{
        eyebrow: "報稅之外",
        title: "把接案收入、成本與請款節點先整理好",
        description:
          "所得稅只是結果。若你有接案或自由工作收入，平常就該把報價、成本、付款節點與維護責任記清楚，年底才不會回頭補帳。",
        primaryLabel: "查看接案報價模板包",
        primaryHref: "/templates/freelance-pricing",
        secondaryLabel: "計算加班費",
        secondaryHref: "/finance/overtime",
      }}
      jsonLd={jsonLd}
    >
      <IncomeTaxCalculator />
    </CalculatorLayout>
  );
}
