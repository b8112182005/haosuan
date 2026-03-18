import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import TileCalculator from "./TileCalculator";

export const metadata: Metadata = {
  title: "磁磚數量計算",
  description:
    "依施工面積與磁磚尺寸計算所需片數，支援損耗率與縫隙設定，提供按箱購買建議與施工費用估算。",
  keywords: ["磁磚計算", "磁磚數量", "地磚計算", "磁磚片數", "裝潢估價"],
  openGraph: {
    title: "磁磚數量計算 | 好算",
    description: "依坪數與磁磚尺寸計算所需片數與耗料",
    url: "https://haosuan.com/renovation/tile",
  },
};

const faqs = [
  {
    question: "為什麼要加損耗率？",
    answer:
      "磁磚施工時需要裁切，尤其是角落、圓柱周圍等位置，加上可能的破損或選色誤差，一般建議加購 5～15% 的備料。矩形空間較規則建議 5～8%，L 型或不規則空間建議 10～15%。",
  },
  {
    question: "常見磁磚尺寸有哪些？",
    answer:
      "台灣常見地磚尺寸有 30×30、45×45、60×60、80×80 公分等；壁磚常用 20×30、30×60 公分。較大尺寸的磁磚視覺上讓空間看起來更寬敞，但裁切難度也更高。",
  },
  {
    question: "縫隙要留多寬？",
    answer:
      "一般地磚建議留 3～5mm 縫隙，有助於因溫差造成的膨脹收縮。壁磚可留 2～3mm，戶外地磚建議 5～10mm。無縫施工雖美觀，但長期使用易因熱脹冷縮造成隆起。",
  },
  {
    question: "每箱磁磚有幾片？",
    answer:
      "本工具預設每箱 10 片，這是小尺寸磁磚（如 30×30）的常見包裝。大尺寸磁磚（如 60×60 以上）通常每箱 4～6 片，購買前請確認實際包裝數量。",
  },
  {
    question: "5 坪地板要買幾片 60×60 磁磚？",
    answer:
      "5 坪 ≈ 16.53 平方公尺，60×60 磁磚每片面積 0.36 m²，基礎需求約 46 片。加上 10% 損耗備料，建議購買約 51 片（約 6 箱，每箱以 10 片計）。實際數量請以本工具輸入施工面積後計算為準。",
  },
];

const relatedTools = [
  { label: "油漆用量計算機", href: "/renovation/paint" },
  { label: "冷氣噸數計算", href: "/renovation/ac-btu" },
  { label: "面積換算", href: "/convert/area" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "磁磚數量計算",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "依施工面積與磁磚尺寸計算所需片數與耗料",
};

export default function TilePage() {
  return (
    <CalculatorLayout
      title="磁磚數量計算"
      description="輸入施工面積與磁磚尺寸，即時計算所需磁磚片數、建議箱數與費用估算，支援損耗率設定"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
      showYumoPromo={true}
    >
      <TileCalculator />
    </CalculatorLayout>
  );
}
