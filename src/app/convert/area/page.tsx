import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import AreaCalculator from "./AreaCalculator";

export const metadata: Metadata = {
  title: "面積換算",
  description:
    "坪、平方公尺、平方公分、平方英尺即時互換。台灣1坪=3.30579平方公尺，支援公頃、平方公里等多單位換算。",
  keywords: ["面積換算", "坪換算", "平方公尺", "坪數計算", "面積單位"],
  openGraph: {
    title: "面積換算 | 好算",
    description: "坪、平方公尺、平方英尺等面積單位即時互換",
    url: "/convert/area",
  },
};

const faqs = [
  {
    question: "1 坪等於幾平方公尺？",
    answer:
      "1 坪 = 3.30578512 平方公尺（精確值）。這是台灣不動產常用的坪數換算標準。以口訣記：「一坪約三點三平方公尺」即可。",
  },
  {
    question: "台灣不動產的坪數包含公設嗎？",
    answer:
      "台灣房屋的「登記坪數」通常包含主建物、附屬建物（陽台、車位等）以及公共設施持分面積。購屋時應特別注意「室內實際使用坪數」與「登記坪數」的差異，公設比一般在 30～40% 之間。",
  },
  {
    question: "1 平方英尺等於幾平方公尺？",
    answer:
      "1 平方英尺（ft²）= 0.09290304 平方公尺。美國、英國等英語系國家普遍使用平方英尺計算房屋面積，台灣偶爾在外文資料中會看到此單位。",
  },
  {
    question: "30 坪是多少平方公尺？",
    answer:
      "30 坪 = 約 99.17 平方公尺（精確為 99.173 m²）。口訣：坪數乘以 3.3 可快速估算。請注意，看房時的「室內坪數」不含公設，若登記坪數含公設比 30%，30 坪登記面積的室內實際使用約 21 坪。",
  },
];

const relatedTools = [
  { label: "磁磚數量計算", href: "/renovation/tile" },
  { label: "長度換算", href: "/convert/length" },
  { label: "油漆用量計算機", href: "/renovation/paint" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "面積換算",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "坪、平方公尺、平方英尺等面積單位即時互換",
};

export default function AreaPage() {
  return (
    <CalculatorLayout
      title="面積換算"
      description="坪、平方公尺（m²）、平方公分（cm²）、平方英尺（ft²）等面積單位即時互換，點選單位輸入數值立即換算"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <AreaCalculator />
    </CalculatorLayout>
  );
}
