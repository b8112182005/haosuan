import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import PregnancyCalculator from "./PregnancyCalculator";

export const metadata: Metadata = {
  title: "懷孕週數計算機 — 預產期與里程碑",
  description:
    "免費線上懷孕週數計算機，輸入最後月經日期，即時計算目前懷孕週數、預產期及重要孕期里程碑。",
  keywords: ["懷孕", "週數", "預產期", "孕期", "里程碑", "產檢", "懷孕計算"],
  openGraph: {
    title: "懷孕週數計算機 | 好算",
    description: "輸入最後月經日期，計算懷孕週數、預產期與孕期里程碑",
    url: "https://haosuan.com/life/pregnancy",
  },
};

const faqs = [
  {
    question: "預產期怎麼算？",
    answer:
      "預產期以最後一次月經（LMP）第一天加上 280 天（40 週）計算，這是國際通用的 Naegele 法則。實際生產日期在預產期前後兩週內皆屬正常。",
  },
  {
    question: "三個孕期分別是哪幾週？",
    answer:
      "第一孕期為第 1～12 週，胚胎著床與器官開始形成；第二孕期為第 13～27 週，胎兒快速發育、媽媽較舒適；第三孕期為第 28～40 週，寶寶快速增重直到出生。",
  },
  {
    question: "什麼是足月？幾週算足月？",
    answer:
      "懷孕滿 37 週即為足月。37～38 週為早期足月，39～40 週為完全足月，41 週為晚期足月。42 週以上稱為過期妊娠，通常醫師會建議催生。",
  },
];

const relatedTools = [
  { label: "年齡計算機", href: "/life/age" },
  { label: "BMI 計算機", href: "/life/bmi" },
  { label: "日期計算機", href: "/life/date-diff" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "懷孕週數計算機",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "計算懷孕週數、預產期與孕期重要里程碑",
};

export default function PregnancyPage() {
  return (
    <CalculatorLayout
      title="懷孕週數計算機"
      description="輸入最後一次月經日期，計算目前懷孕週數、孕期階段、預產期及重要里程碑"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <PregnancyCalculator />
    </CalculatorLayout>
  );
}
