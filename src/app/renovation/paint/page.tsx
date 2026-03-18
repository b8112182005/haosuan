import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import PaintCalculator from "./PaintCalculator";

export const metadata: Metadata = {
  title: "油漆用量計算機",
  description:
    "依房間長寬高估算油漆用量，支援牆面與天花板、多層塗刷，自動計算建議桶數與費用估算，含瑀墨塗料推薦。",
  keywords: ["油漆用量計算", "油漆桶數估算", "塗料用量", "裝潢油漆", "台灣油漆"],
  openGraph: {
    title: "油漆用量計算機 | 好算",
    description: "依房間尺寸估算油漆桶數與費用",
    url: "https://haosuan.com/renovation/paint",
  },
};

const faqs = [
  {
    question: "一般乳膠漆每升可以塗幾平方公尺？",
    answer:
      "一般乳膠漆每升約可覆蓋 8～12 平方公尺（單層），本工具以 10 m²/升計算，並加入 10% 的損耗緩衝。實際用量依牆面粗糙程度、底漆條件、顏色深淺等因素而有所不同。",
  },
  {
    question: "需要幾層塗刷？",
    answer:
      "一般情況下，深色換淺色需要 2～3 層；修補小面積或顏色相近可能 1 層即可。專業建議：底漆 1 層 + 面漆 2 層效果最佳，可提升遮蓋力與耐用度。",
  },
  {
    question: "門窗面積要怎麼算？",
    answer:
      "標準門約 1.8～2.0 m²（0.9×2.0m），標準窗約 1.5 m²（1.5×1.0m）。本工具預設扣除 3 m²，代表約一扇門加一扇窗。可依實際情況調整。",
  },
  {
    question: "DIY 和找師傅費用差多少？",
    answer:
      "DIY 僅需材料費（油漆、滾筒、膠帶等），但品質依個人技術而定。找師傅施工費用約 NT$60～100/m²，加上材料費，總費用約為 DIY 的 1.5～2 倍，但品質有保障。",
  },
];

const relatedTools = [
  { label: "磁磚數量計算", href: "/renovation/tile" },
  { label: "冷氣噸數計算", href: "/renovation/ac-btu" },
  { label: "面積換算", href: "/convert/area" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "油漆用量計算機",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "依房間尺寸估算油漆桶數與費用",
};

export default function PaintPage() {
  return (
    <CalculatorLayout
      title="油漆用量計算機"
      description="輸入房間長寬高，即時估算所需油漆用量、建議桶數與費用，支援多層塗刷與門窗面積扣除"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
      showYumoPromo={true}
    >
      <PaintCalculator />
    </CalculatorLayout>
  );
}
