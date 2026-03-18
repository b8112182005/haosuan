import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import DateDiffCalculator from "./DateDiffCalculator";

export const metadata: Metadata = {
  title: "日期天數計算",
  description:
    "免費線上日期天數計算機，計算兩個日期之間相差幾天、幾週、幾個月，並顯示工作天數（不含週末）。",
  keywords: ["日期計算", "天數計算", "相差幾天", "工作天數", "倒數計時"],
  openGraph: {
    title: "日期天數計算 | 好算",
    description: "計算兩個日期之間相差的天數、週數、工作天數",
    url: "https://haosuan.com/life/date-diff",
  },
};

const faqs = [
  {
    question: "計算結果包含起始日嗎？",
    answer:
      "本工具計算的是兩個日期之間的差距天數，不包含起始日本身。例如 1 月 1 日到 1 月 3 日，結果為 2 天。",
  },
  {
    question: "工作天數是怎麼計算的？",
    answer:
      "工作天數排除週六與週日，但不排除國定假日（因為國定假日可能補班，難以統一計算）。若需精確的工作天數，請自行扣除國定假日。",
  },
  {
    question: "可以計算未來的日期嗎？",
    answer: "可以。本工具支援任意日期組合，包含未來日期，方便計算倒數天數或活動規劃。",
  },
  {
    question: "日期順序有關係嗎？",
    answer: "沒有關係。本工具會自動取兩個日期的絕對差值，不論哪個日期在前都能正確計算。",
  },
];

const relatedTools = [
  { label: "年齡計算機", href: "/life/age" },
  { label: "BMI 計算機", href: "/life/bmi" },
  { label: "睡眠時間計算", href: "/life/sleep" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "日期天數計算",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "計算兩個日期之間相差的天數、週數與工作天數",
};

export default function DateDiffPage() {
  return (
    <CalculatorLayout
      title="日期天數計算"
      description="選擇兩個日期，即時計算相差天數、週數，並統計工作天數（不含週末）"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <DateDiffCalculator />
    </CalculatorLayout>
  );
}
