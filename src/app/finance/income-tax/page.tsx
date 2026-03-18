import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import IncomeTaxCalculator from "./IncomeTaxCalculator";

export const metadata: Metadata = {
  title: "薪資所得稅試算",
  description:
    "依台灣 2024 年（民國 113 年）綜合所得稅規定，輸入月薪、婚姻狀況及撫養親屬，即時試算年度所得稅與有效稅率。",
  keywords: ["所得稅試算", "薪資稅", "報稅計算機", "扣除額", "台灣稅務"],
  openGraph: {
    title: "薪資所得稅試算 | 好算",
    description: "依台灣 2024 年稅制試算年度所得稅",
    url: "https://haosuan.com/finance/income-tax",
  },
};

const faqs = [
  {
    question: "薪資所得特別扣除額是多少？",
    answer:
      "2024 年（民國 113 年）薪資所得特別扣除額為 218,000 元，但不能超過薪資本身。例如年薪 20 萬，只能扣除 20 萬，不足 21.8 萬。",
  },
  {
    question: "標準扣除額和列舉扣除額哪個好？",
    answer:
      "2024 年標準扣除額單身為 131,000 元、已婚 262,000 元。列舉扣除額包含捐贈、保險費、醫療費等，若列舉金額超過標準扣除額，選擇列舉扣除較划算。大多數上班族採標準扣除較方便。",
  },
  {
    question: "受撫養親屬免稅額怎麼算？",
    answer:
      "2024 年每人免稅額為 97,000 元。70 歲以上直系尊親屬（如父母、祖父母）可享 1.5 倍，即 145,500 元。受撫養親屬需符合相關條件（如未成年子女、在校就讀等）。",
  },
  {
    question: "試算結果需要繳稅嗎？",
    answer:
      "本工具僅為估算，實際應納稅額以財政部國稅局核定為準。另外，若有其他所得（股利、租金、兼差等），需一併申報。受僱者全年薪資若低於免稅額與扣除額之和，則不需繳稅。",
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
  description: "依台灣 2024 年稅制試算年度所得稅",
};

export default function IncomeTaxPage() {
  return (
    <CalculatorLayout
      title="薪資所得稅試算"
      description="依台灣 2024 年綜合所得稅規定，輸入月薪、婚姻狀況及撫養親屬人數，即時試算年度應繳稅額與有效稅率"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <IncomeTaxCalculator />
    </CalculatorLayout>
  );
}
