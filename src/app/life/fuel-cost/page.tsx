import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import FuelCostCalculator from "./FuelCostCalculator";

export const metadata: Metadata = {
  title: "油耗費用計算機 — 油資試算",
  description:
    "免費線上油耗費用計算機，輸入行駛距離、車輛油耗與油價，即時計算耗油量與油資費用，內建台北高雄、環島等常用路線預設。",
  keywords: ["油耗", "油費", "油資", "加油", "油價", "每公里費用", "環島"],
  openGraph: {
    title: "油耗費用計算機 | 好算",
    description: "輸入距離、油耗與油價，即時計算油資費用與每公里成本",
    url: "https://haosuan.com/life/fuel-cost",
  },
};

const faqs = [
  {
    question: "一般汽車油耗大約多少？",
    answer:
      "台灣市售小客車平均油耗約 10～15 km/L，油電混合車可達 20～25 km/L。實際油耗受駕駛習慣、路況、冷氣使用與車輛保養狀況影響。",
  },
  {
    question: "目前台灣油價大約多少？",
    answer:
      "2024 年台灣 95 無鉛汽油約 30～34 元/公升，92 無鉛約 28～32 元/公升，柴油約 27～30 元/公升。油價每週調整一次，可參考中油官網公告。",
  },
  {
    question: "怎麼降低油耗省油？",
    answer:
      "保持穩定車速（時速 60～80 km 最省油）、避免急加速急煞車、定期保養引擎與輪胎氣壓、減少車內不必要負重、高速行駛時關窗開冷氣反而較省油。",
  },
];

const relatedTools = [
  { label: "BMI 計算機", href: "/life/bmi" },
  { label: "日期計算機", href: "/life/date-diff" },
  { label: "退休金計算機", href: "/finance/retirement" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "油耗費用計算機",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "計算行駛油耗、油資費用與每公里成本",
};

export default function FuelCostPage() {
  return (
    <CalculatorLayout
      title="油耗費用計算機"
      description="輸入行駛距離、車輛油耗與油價，即時計算耗油量、油資費用與每公里成本"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <FuelCostCalculator />
    </CalculatorLayout>
  );
}
