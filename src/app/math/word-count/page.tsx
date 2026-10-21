import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import WordCountCalculator from "./WordCountCalculator";

export const metadata: Metadata = {
  title: "字數計算",
  description:
    "即時計算中文字數、英文單詞數、總字元數（含/不含空白）、段落數與行數。適合寫作、論文、文案、社群貼文字數計算。",
  keywords: ["字數計算", "中文字數", "字元計算", "單詞計算", "文章字數"],
  openGraph: {
    title: "字數計算 | 好算",
    description: "即時計算中英文字數、字元數、段落行數",
    url: "/math/word-count",
  },
};

const faqs = [
  {
    question: "中文字數和英文單詞數有什麼差別？",
    answer:
      "中文字數是指漢字個數（每個中文字算1字），英文單詞數則是以空白分隔的英文詞組個數。一篇文章可能同時含有中英文，本工具會分別計算兩者。一般論文字數限制指的是「中文字數」。",
  },
  {
    question: "社群媒體字數限制是怎麼算的？",
    answer:
      "各平台計算方式不同：Twitter/X 每則 280 字元（中文字算 2 個字元），Instagram 限 2,200 字元，LINE 訊息無明確限制。本工具的「總字元數」可作為參考，但要注意不同平台對中文字的計算方式可能有差異。",
  },
  {
    question: "段落數怎麼計算？",
    answer:
      "本工具以「連續兩個換行（空白行）」分隔段落，只計算非空白段落的數量。如果您的文字每行結束後直接換行（無空白行間隔），則全文只算作 1 個段落。論文通常以空行分隔段落，可作為段落計算的參考。",
  },
];

const relatedTools = [
  { label: "百分比計算", href: "/math/percentage" },
  { label: "BMI 計算機", href: "/life/bmi" },
  { label: "日期天數計算", href: "/life/date-diff" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "字數計算",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "即時計算中英文字數、字元數、段落行數",
};

export default function WordCountPage() {
  return (
    <CalculatorLayout
      title="字數計算"
      description="貼入文字立即計算中文字數、英文單詞數、總字元數（含/不含空白）、段落數與行數，適合論文、文案、社群媒體字數確認"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <WordCountCalculator />
    </CalculatorLayout>
  );
}
