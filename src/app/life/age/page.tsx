import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import AgeCalculator from "./AgeCalculator";

export const metadata: Metadata = {
  title: "年齡計算機",
  description:
    "免費線上年齡計算機，輸入生日即時計算精確年齡（歲、月、日），顯示總天數、星座、生肖及下次生日倒數。",
  keywords: ["年齡計算機", "幾歲", "生日計算", "星座", "生肖"],
  openGraph: {
    title: "年齡計算機 | 好算",
    description: "輸入生日，計算精確年齡（歲、月、日）",
    url: "/life/age",
  },
};

const faqs = [
  {
    question: "年齡怎麼精確計算？",
    answer:
      "本工具以您的生日為起點，計算到今天為止的精確歲數，包含完整的年、月、日。遇到閏年或每月天數不同的情況，均已正確處理。",
  },
  {
    question: "為什麼我的年齡和身份證上不同？",
    answer:
      "台灣身份證上的年齡通常以「虛歲」計算（出生即為 1 歲，過農曆新年加 1 歲）。本工具計算的是「足歲」（實際已滿的年數），與西方算法相同。",
  },
  {
    question: "星座是怎麼判斷的？",
    answer:
      "星座依據出生月份與日期，按照西方占星的 12 星座分界日期判斷，例如牡羊座為 3/21～4/19。",
  },
  {
    question: "生肖怎麼計算？",
    answer:
      "生肖依出生年份，以 12 年一循環判斷。本工具以西曆出生年計算，不考慮農曆新年換年的邊界情況（農曆 1 月前出生者可能有一天誤差）。",
  },
];

const relatedTools = [
  { label: "BMI 計算機", href: "/life/bmi" },
  { label: "日期天數計算", href: "/life/date-diff" },
  { label: "睡眠時間計算", href: "/life/sleep" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "年齡計算機",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "輸入生日，計算精確年齡（歲、月、日）、星座、生肖",
};

export default function AgePage() {
  return (
    <CalculatorLayout
      title="年齡計算機"
      description="輸入生日，即時計算精確年齡（歲、月、日），並顯示總天數、星座、生肖與下次生日倒數"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <AgeCalculator />
    </CalculatorLayout>
  );
}
