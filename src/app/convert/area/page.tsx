import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import AreaConverter from "./AreaConverter";

export const metadata: Metadata = {
  title: "面積換算",
  description:
    "坪、平方公尺（m²）、平方英尺、公頃等面積單位快速換算，台灣房產常用坪數與國際單位互換，即時計算無需背公式。",
  keywords: ["面積換算", "坪換算", "坪換平方公尺", "m²換坪", "面積計算機"],
  openGraph: {
    title: "面積換算 | 好算",
    description: "坪、平方公尺、平方英尺等面積單位互換",
    url: "https://haosuan.com/convert/area",
  },
};

const faqs = [
  {
    question: "1 坪等於幾平方公尺？",
    answer:
      "1 坪 = 3.30578512 平方公尺（精確值）。實際使用常取近似值 3.3058 或 3.306。反過來，1 m² ≈ 0.3025 坪。",
  },
  {
    question: "台灣的「坪」是怎麼來的？",
    answer:
      "坪是日治時代傳入台灣的面積單位，源自日本的「坪」（つぼ）。1 坪 = 6 尺 × 6 尺，1 日本尺 ≈ 30.3cm，因此 1 坪 ≈ 1.818m × 1.818m ≈ 3.306 m²。",
  },
  {
    question: "公告地積是用哪個單位？",
    answer:
      "台灣地政機關土地面積以「平方公尺（m²）」為法定單位，但買賣習慣上仍廣泛使用「坪」。建物登記的建坪也多以坪標示（實際登記數字為 m²，乘以 0.3025 換算）。",
  },
  {
    question: "1 公頃等於幾坪？",
    answer:
      "1 公頃 = 10,000 m² ≈ 3,025 坪。農地面積常以「公頃」或「分」（1 公頃 = 10 分）計算，1 分地 = 1,000 m² ≈ 302.5 坪。",
  },
];

const relatedTools = [
  { label: "長度換算", href: "/convert/length" },
  { label: "磁磚數量計算", href: "/renovation/tile" },
  { label: "油漆用量計算機", href: "/renovation/paint" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "面積換算",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "坪、平方公尺等面積單位互換工具",
};

export default function AreaPage() {
  return (
    <CalculatorLayout
      title="面積換算"
      description="坪、平方公尺（m²）、平方英尺、公頃等面積單位即時互換，台灣房產、裝潢必備換算工具"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <AreaConverter />
    </CalculatorLayout>
  );
}
