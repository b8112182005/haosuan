import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import BmiCalculator from "./BmiCalculator";

export const metadata: Metadata = {
  title: "BMI 計算機",
  description:
    "免費線上 BMI 計算機，輸入身高體重即時計算 BMI 值，依台灣衛福部亞洲標準判斷體重狀態，並顯示理想體重範圍。",
  keywords: ["BMI", "身體質量指數", "體重", "健康", "肥胖", "台灣"],
  openGraph: {
    title: "BMI 計算機 | 好算",
    description: "輸入身高體重，即時計算 BMI 值與健康狀態",
    url: "https://haosuan.com/life/bmi",
  },
};

const faqs = [
  {
    question: "BMI 正常範圍是多少？",
    answer:
      "依台灣衛生福利部建議，BMI 18.5～24 為正常體重；18.5 以下為體重過輕；24～27 為體重過重；27 以上為肥胖。亞洲人因體脂肪比例較高，標準比 WHO 全球標準（25）更嚴格。",
  },
  {
    question: "BMI 有什麼限制？",
    answer:
      "BMI 無法區分體脂肪與肌肉量。體脂率高但體重正常的「隱性肥胖」，以及肌肉量多的運動員，BMI 可能顯示不準確。建議搭配腰圍、體脂率等指標一起評估。",
  },
  {
    question: "如何計算理想體重？",
    answer:
      "理想體重範圍是以 BMI 18.5～24 反推：最小值 = 18.5 × 身高(m)²，最大值 = 24 × 身高(m)²。本工具已自動計算並顯示您的建議體重區間。",
  },
  {
    question: "兒童可以用這個 BMI 計算機嗎？",
    answer:
      "本工具依據成人標準設計，不適用 18 歲以下。兒童 BMI 需對照年齡與性別的生長曲線百分位，建議由醫師或兒科評估。",
  },
];

const relatedTools = [
  { label: "年齡計算機", href: "/life/age" },
  { label: "睡眠時間計算", href: "/life/sleep" },
  { label: "電費計算機", href: "/life/electricity" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "BMI 計算機",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description:
    "輸入身高體重，即時計算 BMI 值與健康狀態，依台灣衛福部標準分類",
};

export default function BmiPage() {
  return (
    <CalculatorLayout
      title="BMI 計算機"
      description="輸入身高與體重，即時計算 BMI 值及健康狀態，依台灣衛福部亞洲標準評估"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <BmiCalculator />
    </CalculatorLayout>
  );
}
