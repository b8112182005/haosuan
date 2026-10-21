import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import LengthCalculator from "./LengthCalculator";

export const metadata: Metadata = {
  title: "長度換算",
  description:
    "公里、公尺、公分、公厘、英里、英尺、英吋即時互換。支援公制與英制長度單位，輸入數值立即換算全部單位。",
  keywords: ["長度換算", "公尺換算", "英吋換算", "英尺換算", "長度單位"],
  openGraph: {
    title: "長度換算 | 好算",
    description: "公里、公尺、英吋、英尺等長度單位即時互換",
    url: "/convert/length",
  },
};

const faqs = [
  {
    question: "1 英吋等於幾公分？",
    answer:
      "1 英吋（inch）= 2.54 公分。這是最常用的英制/公制長度換算，電視螢幕尺寸、手機螢幕大小都用英吋表示。例如 55 吋電視對角線長度約 139.7 公分。",
  },
  {
    question: "1 英尺等於幾公尺？",
    answer:
      "1 英尺（foot/ft）= 30.48 公分 = 0.3048 公尺。1 英尺 = 12 英吋。身高在歐美常用英尺英吋表示，例如 5 英尺 10 英吋約等於 177.8 公分。",
  },
  {
    question: "1 英里等於幾公里？",
    answer:
      "1 英里（mile）= 1.609344 公里。跑步賽事常見的「一英里跑」約等於跑 1.6 公里。美國道路速限使用英里/小時（mph），1 mph ≈ 1.6 km/h。",
  },
];

const relatedTools = [
  { label: "面積換算", href: "/convert/area" },
  { label: "重量換算", href: "/convert/weight" },
  { label: "溫度換算", href: "/convert/temperature" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "長度換算",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "公里、公尺、英吋、英尺等長度單位即時互換",
};

export default function LengthPage() {
  return (
    <CalculatorLayout
      title="長度換算"
      description="公里（km）、公尺（m）、公分（cm）、公厘（mm）、英里、英尺（ft）、英吋（in）即時互換，選擇單位輸入數值立即換算"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <LengthCalculator />
    </CalculatorLayout>
  );
}
