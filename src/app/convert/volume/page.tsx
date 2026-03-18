import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import VolumeCalculator from "./VolumeCalculator";

export const metadata: Metadata = {
  title: "容量換算 — 公升、毫升、加侖、品脫、量米杯",
  description:
    "免費線上容量換算工具，支援公升、毫升、美制加侖、美制品脫、台灣量米杯互相換算，即時顯示所有單位結果。",
  keywords: ["容量換算", "公升", "毫升", "加侖", "品脫", "量米杯", "體積"],
  openGraph: {
    title: "容量換算 | 好算",
    description: "公升、毫升、加侖、品脫、量米杯即時互換",
    url: "https://haosuan.com/convert/volume",
  },
};

const faqs = [
  {
    question: "1 加侖等於幾公升？",
    answer:
      "美制 1 加侖約等於 3.785 公升。注意英制加侖與美制加侖不同，英制 1 加侖約 4.546 公升。本工具使用美制加侖。",
  },
  {
    question: "台灣量米杯是幾毫升？",
    answer:
      "台灣標準量米杯容量為 180 毫升（mL），源自日本合（ごう）的容量標準。煮飯時一杯米通常搭配等量的水（180mL），但實際加水量依米種與口感偏好調整。",
  },
  {
    question: "烘焙食譜的 1 cup 是多少毫升？",
    answer:
      "歐美烘焙食譜中的 1 cup 是美制量杯，約 236.6 毫升，與台灣量米杯（180mL）不同。換算時請注意區分，以免用量錯誤。",
  },
];

const relatedTools = [
  { label: "重量換算", href: "/convert/weight" },
  { label: "長度換算", href: "/convert/length" },
  { label: "溫度換算", href: "/convert/temperature" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "容量換算",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "公升、毫升、加侖、品脫、量米杯容量單位互換",
};

export default function VolumePage() {
  return (
    <CalculatorLayout
      title="容量換算"
      description="輸入數值與來源單位，即時換算公升、毫升、加侖、品脫、量米杯"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <VolumeCalculator />
    </CalculatorLayout>
  );
}
