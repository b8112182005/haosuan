import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import PercentageCalculator from "./PercentageCalculator";

export const metadata: Metadata = {
  title: "百分比計算",
  description:
    "三種百分比計算模式：X是Y的幾%、X的Y%是多少、從X到Y增減了幾%。適合折扣計算、業績增減率、比例分析。",
  keywords: ["百分比計算", "折扣計算", "增減幅度", "比例計算", "百分比換算"],
  openGraph: {
    title: "百分比計算 | 好算",
    description: "三種百分比計算：比例、折扣、增減幅度",
    url: "https://haosuan.com/math/percentage",
  },
};

const faqs = [
  {
    question: "台灣說的「打折」怎麼換算成百分比？",
    answer:
      "台灣「打折」是以10為基準：8折 = 80% = 20% off，7折 = 70%，9折 = 90%。例如原價 1,000 元打 8 折後為 800 元。使用本工具「X 的 Y% 是多少」模式，輸入原價與折數即可計算。",
  },
  {
    question: "怎麼計算業績成長率？",
    answer:
      "使用「增減幅度」模式，輸入上期業績（From）和本期業績（To），即可計算成長百分比。例如上月業績 100 萬，本月 120 萬，即成長 20%。負數表示衰退。",
  },
  {
    question: "百分比和百分點有什麼不同？",
    answer:
      "百分比是相對變化，百分點是絕對差值。例如利率從 2% 升至 3%，是上升了 1 個百分點（1 pp），但相對增加了 50%。本工具計算的是相對百分比變化。",
  },
];

const relatedTools = [
  { label: "發票營業稅計算", href: "/finance/invoice-tax" },
  { label: "薪資所得稅試算", href: "/finance/income-tax" },
  { label: "字數計算", href: "/math/word-count" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "百分比計算",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "三種百分比計算：比例、折扣、增減幅度",
};

export default function PercentagePage() {
  return (
    <CalculatorLayout
      title="百分比計算"
      description="三種計算模式：X 是 Y 的幾%、X 的 Y% 是多少、從 X 到 Y 增減了幾%，切換 Tab 選擇所需計算類型"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <PercentageCalculator />
    </CalculatorLayout>
  );
}
