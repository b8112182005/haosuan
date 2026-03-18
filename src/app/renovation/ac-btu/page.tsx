import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import AcBtuCalculator from "./AcBtuCalculator";

export const metadata: Metadata = {
  title: "冷氣噸數計算",
  description:
    "依房間坪數、樓層、日照狀況與用途，計算適合的冷氣噸數（BTU），並提供建議規格與選購tips。",
  keywords: ["冷氣噸數計算", "冷氣BTU", "幾噸冷氣", "冷氣選購", "坪數冷氣"],
  openGraph: {
    title: "冷氣噸數計算 | 好算",
    description: "依坪數、樓層、朝向推薦適合的冷氣噸數",
    url: "https://haosuan.com/renovation/ac-btu",
  },
};

const faqs = [
  {
    question: "1 坪需要幾 BTU 的冷氣？",
    answer:
      "台灣一般住宅每坪約需 500～700 BTU，本工具以 600 BTU/坪為基準，再依樓層、日照、用途等條件調整。西曬或頂樓可能需要 700～800 BTU/坪。",
  },
  {
    question: "冷噸（冷凍噸）是什麼？",
    answer:
      "冷凍噸（RT）是冷氣容量單位，1 冷凍噸 = 12,000 BTU/hr = 3,517W。台灣常說的「幾噸」就是幾冷凍噸。一般家用分離式冷氣常見規格為 1～3.5 噸。",
  },
  {
    question: "冷氣要大一點還是小一點好？",
    answer:
      "建議選略大於需求的規格（10～20%）：太小的冷氣要一直全力運轉才能達到設定溫度，既耗電又磨損；適當大的冷氣可以用較低功率維持溫度，更省電。但過大也可能導致濕度調節不足。",
  },
  {
    question: "變頻冷氣和定頻有什麼差別？",
    answer:
      "變頻冷氣可依負荷調整壓縮機轉速，啟動後持續在最省電點運轉，適合長時間使用（每天 6 小時以上）。定頻冷氣售價便宜但電費較高，適合短時間偶爾使用的空間。台灣夏天長，多數情況下買變頻較划算。",
  },
  {
    question: "10 坪房間要幾噸冷氣？",
    answer:
      "一般低樓層、半日照的 10 坪臥室，建議約 1.5 噸（18,000 BTU）冷氣。若為頂樓或西曬，建議升級至 2 噸（24,000 BTU）。本工具依實際條件計算，可直接輸入坪數取得建議規格。",
  },
  {
    question: "頂樓或西曬要多買幾噸？",
    answer:
      "頂樓或西曬房間的熱負荷比一般房間高出 20～30%。以 10 坪為例，一般房間約需 1.5 噸，頂樓西曬則需約 2 噸。建議選購時至少升一個規格，並搭配隔熱措施（如隔熱膜、遮光窗簾）提升效能。",
  },
];

const relatedTools = [
  { label: "電費計算機", href: "/life/electricity" },
  { label: "油漆用量計算機", href: "/renovation/paint" },
  { label: "磁磚數量計算", href: "/renovation/tile" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "冷氣噸數計算",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "依坪數、樓層、朝向推薦適合的冷氣噸數",
};

export default function AcBtuPage() {
  return (
    <CalculatorLayout
      title="冷氣噸數計算"
      description="輸入房間坪數、樓層與日照狀況，即時計算建議的冷氣噸數與適合規格，並提供選購建議"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
      showYumoPromo={true}
    >
      <AcBtuCalculator />
    </CalculatorLayout>
  );
}
