import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import TemperatureCalculator from "./TemperatureCalculator";

export const metadata: Metadata = {
  title: "溫度換算",
  description:
    "攝氏（°C）、華氏（°F）、克耳文（K）即時互換。輸入任一溫度單位立即換算其他，支援正負溫度。",
  keywords: ["溫度換算", "攝氏華氏換算", "°C換°F", "克耳文換算", "溫度單位"],
  openGraph: {
    title: "溫度換算 | 好算",
    description: "攝氏、華氏、克耳文溫度即時互換",
    url: "https://haosuan.com/convert/temperature",
  },
};

const faqs = [
  {
    question: "攝氏和華氏怎麼換算？",
    answer:
      "攝氏轉華氏：°F = °C × 9/5 + 32。華氏轉攝氏：°C = (°F - 32) × 5/9。常用的記憶點：0°C = 32°F（結冰點），100°C = 212°F（沸點），37°C = 98.6°F（體溫）。",
  },
  {
    question: "克耳文是什麼？",
    answer:
      "克耳文（Kelvin，K）是國際單位制的溫度基本單位，以絕對零度（-273.15°C）為零點。0 K = -273.15°C，沒有負的克耳文溫度。科學計算（尤其是物理、天文）常使用克耳文。",
  },
  {
    question: "台灣天氣預報用攝氏嗎？",
    answer:
      "是的，台灣及大多數亞洲國家使用攝氏（°C）。美國、貝里斯等少數國家在日常生活中仍使用華氏（°F）。台灣夏天氣溫通常在 30～38°C 之間，冬天北部可能降至 10°C 以下。",
  },
  {
    question: "37°C 體溫換算成華氏是幾度？",
    answer:
      "37°C × 9/5 + 32 = 98.6°F。這是正常體溫的換算值，也是美國體溫計常標示的基準。若體溫超過 38°C（100.4°F）則視為發燒。",
  },
  {
    question: "0°F 是幾度攝氏？",
    answer:
      "0°F = -17.78°C（約 -18°C）。0°F 是 18 世紀科學家華倫海特設定的寒冷基準，大約是鹽水混合物的凍結點，並非水的冰點（水的冰點是 32°F = 0°C）。",
  },
];

const relatedTools = [
  { label: "長度換算", href: "/convert/length" },
  { label: "重量換算", href: "/convert/weight" },
  { label: "面積換算", href: "/convert/area" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "溫度換算",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "攝氏、華氏、克耳文溫度即時互換",
};

export default function TemperaturePage() {
  return (
    <CalculatorLayout
      title="溫度換算"
      description="攝氏（°C）、華氏（°F）、克耳文（K）即時互換，選擇來源單位輸入數值立即換算全部溫度單位"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <TemperatureCalculator />
    </CalculatorLayout>
  );
}
