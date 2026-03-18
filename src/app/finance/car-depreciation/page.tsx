import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import CarDepreciationCalculator from "./CarDepreciationCalculator";

export const metadata: Metadata = {
  title: "二手車殘值估算 — 車輛折舊計算機",
  description:
    "免費線上二手車殘值計算機，依購車價格、車齡與品牌類型，以複利折舊法估算二手車殘值、折舊金額與殘值率。",
  keywords: ["二手車", "殘值", "折舊", "車齡", "中古車", "估價"],
  openGraph: {
    title: "二手車殘值估算 | 好算",
    description: "輸入購車價格、車齡與品牌，即時估算二手車殘值",
    url: "https://haosuan.com/finance/car-depreciation",
  },
};

const faqs = [
  {
    question: "二手車折舊率怎麼算？",
    answer:
      "本工具採用複利折舊法，根據品牌類型套用不同年折舊率：日系約 15%、德系約 18%、美系約 20%、國產約 22%。殘值 = 購車價 × (1 - 年折舊率)^車齡。實際價格仍受車況、里程數、市場供需影響。",
  },
  {
    question: "為什麼日系車折舊率最低？",
    answer:
      "日系車（如 Toyota、Honda）在台灣二手市場需求穩定、零件取得容易、維修成本低，加上品牌口碑好，因此保值率較高，年折舊率約 15%，是所有品牌中最低的。",
  },
  {
    question: "幾年車齡的二手車最划算？",
    answer:
      "一般建議購買 3-5 年車齡的二手車。新車前三年折舊最快，約損失 40-50% 價值；3-5 年後折舊趨緩，車況通常仍佳，是性價比最高的區間。",
  },
];

const relatedTools = [
  { label: "房貸計算機", href: "/finance/mortgage" },
  { label: "退休試算", href: "/finance/retirement" },
  { label: "複利計算機", href: "/finance/compound-interest" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "二手車殘值估算",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "依品牌與車齡計算二手車殘值與折舊金額",
};

export default function CarDepreciationPage() {
  return (
    <CalculatorLayout
      title="二手車殘值估算"
      description="輸入購車價格、車齡與品牌類型，以複利折舊法估算二手車殘值與折舊金額"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <CarDepreciationCalculator />
    </CalculatorLayout>
  );
}
