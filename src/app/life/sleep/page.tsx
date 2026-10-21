import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import SleepCalculator from "./SleepCalculator";

export const metadata: Metadata = {
  title: "睡眠時間計算",
  description:
    "依 90 分鐘睡眠週期理論，輸入起床時間反推最佳入睡時間，或輸入現在時間計算最佳起床時間，避免在深睡期被吵醒。",
  keywords: ["睡眠計算機", "睡眠週期", "最佳入睡時間", "幾點睡", "90分鐘"],
  openGraph: {
    title: "睡眠時間計算 | 好算",
    description: "依睡眠週期計算最佳入睡或起床時間",
    url: "/life/sleep",
  },
};

const faqs = [
  {
    question: "睡眠週期是什麼？",
    answer:
      "人的睡眠由多個週期組成，每個週期約 90 分鐘，包含淺睡、深睡（慢波睡眠）和 REM（快速動眼期）。在週期結束時自然甦醒，比在深睡期被鬧鐘吵醒更能讓人感到神清氣爽。",
  },
  {
    question: "睡幾個週期最好？",
    answer:
      "一般成人建議 5～6 個週期，約 7.5～9 小時。青少年可能需要更多，老年人可能自然縮短。重要的是規律睡眠時間，而非單純追求週期數。",
  },
  {
    question: "為什麼有 15 分鐘的緩衝？",
    answer:
      "大多數人從躺下到真正入睡需要約 10～20 分鐘，本工具預設 15 分鐘作為緩衝，讓建議時間更貼近現實。如果您入睡很快，可以相應調整入睡時間。",
  },
  {
    question: "為什麼我睡了足夠時數還是很累？",
    answer:
      "除了時數，睡眠質量也很重要。咖啡因、藍光（手機螢幕）、環境噪音、壓力等都會影響睡眠深度。建議睡前 1 小時避免使用電子產品，維持固定的睡眠時間表。",
  },
];

const relatedTools = [
  { label: "BMI 計算機", href: "/life/bmi" },
  { label: "年齡計算機", href: "/life/age" },
  { label: "日期天數計算", href: "/life/date-diff" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "睡眠時間計算",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "根據 90 分鐘睡眠週期計算最佳入睡或起床時間",
};

export default function SleepPage() {
  return (
    <CalculatorLayout
      title="睡眠時間計算"
      description="依 90 分鐘睡眠週期理論，計算最佳入睡時間或起床時間，讓您在自然睡眠週期結束時甦醒，起床更有精神"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <SleepCalculator />
    </CalculatorLayout>
  );
}
