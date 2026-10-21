import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import WeightCalculator from "./WeightCalculator";

export const metadata: Metadata = {
  title: "重量換算",
  description:
    "公噸、公斤、公克、毫克、磅、盎司、台斤即時互換。台灣1台斤=600公克，支援公制英制及台灣傳統單位。",
  keywords: ["重量換算", "公斤換算", "磅換算", "台斤換算", "重量單位"],
  openGraph: {
    title: "重量換算 | 好算",
    description: "公斤、磅、台斤等重量單位即時互換",
    url: "/convert/weight",
  },
};

const faqs = [
  {
    question: "1 台斤等於幾公克？",
    answer:
      "台灣的 1 台斤 = 600 公克 = 16 兩。這與中國大陸的市斤（500 公克）不同，購買傳統市場食材或中藥材時要特別注意。",
  },
  {
    question: "1 磅等於幾公斤？",
    answer:
      "1 磅（lb）= 453.59237 公克 ≈ 0.4536 公斤。體重在歐美常用磅表示，例如 150 磅約等於 68 公斤。健身器材的負重也常以磅標示。",
  },
  {
    question: "1 盎司等於幾公克？",
    answer:
      "1 盎司（oz）= 28.3495 公克。食譜中的烘焙材料、咖啡豆份量常以盎司計算，例如一杯義式濃縮咖啡約 1 盎司（約 30ml）。",
  },
];

const relatedTools = [
  { label: "長度換算", href: "/convert/length" },
  { label: "面積換算", href: "/convert/area" },
  { label: "溫度換算", href: "/convert/temperature" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "重量換算",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "公斤、磅、台斤等重量單位即時互換",
};

export default function WeightPage() {
  return (
    <CalculatorLayout
      title="重量換算"
      description="公噸（t）、公斤（kg）、公克（g）、毫克（mg）、磅（lb）、盎司（oz）、台斤即時互換，選擇單位輸入數值立即換算"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <WeightCalculator />
    </CalculatorLayout>
  );
}
