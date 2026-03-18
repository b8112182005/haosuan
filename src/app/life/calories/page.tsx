import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import CaloriesCalculator from "./CaloriesCalculator";

export const metadata: Metadata = {
  title: "熱量計算機 — BMR & TDEE",
  description:
    "免費線上熱量計算機，依 Harris-Benedict 公式計算基礎代謝率（BMR）與每日所需熱量（TDEE），提供減重與增肌熱量建議。",
  keywords: ["熱量", "BMR", "TDEE", "基礎代謝", "卡路里", "減重", "增肌"],
  openGraph: {
    title: "熱量計算機 | 好算",
    description: "輸入性別、年齡、身高、體重與活動量，即時計算 BMR 與 TDEE",
    url: "https://haosuan.com/life/calories",
  },
};

const faqs = [
  {
    question: "減重每天要吃多少卡？",
    answer:
      "一般建議每日攝取熱量為 TDEE 減去 500 大卡，這樣每週約可減少 0.5 公斤脂肪（1 公斤脂肪約 7700 大卡）。不建議低於 BMR，長期過低熱量會導致肌肉流失與代謝下降。",
  },
  {
    question: "TDEE 是什麼？",
    answer:
      "TDEE（Total Daily Energy Expenditure）是「每日總消耗熱量」，代表你一天維持體重所需攝取的熱量。它等於 BMR（基礎代謝率）乘以活動量係數。若攝取等於 TDEE 則維持體重；低於則減重；高於則增重。",
  },
  {
    question: "我每天跑步 30 分鐘消耗多少卡？",
    answer:
      "以體重 60 公斤、中速跑步（8 km/h）計算，30 分鐘約消耗 250～300 大卡。實際消耗因體重、速度、地形不同而有差異。活動量等級選擇「中度」即涵蓋此類日常運動習慣。",
  },
];

const relatedTools = [
  { label: "BMI 計算機", href: "/life/bmi" },
  { label: "年齡計算機", href: "/life/age" },
  { label: "睡眠時間計算", href: "/life/sleep" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "熱量計算機",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "計算基礎代謝率 BMR 與每日所需熱量 TDEE",
};

export default function CaloriesPage() {
  return (
    <CalculatorLayout
      title="熱量計算機"
      description="輸入性別、年齡、身高、體重與活動量，計算基礎代謝率（BMR）與每日所需熱量（TDEE）"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <CaloriesCalculator />
    </CalculatorLayout>
  );
}
