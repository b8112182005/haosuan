import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import ElectricityCalculator from "./ElectricityCalculator";

export const metadata: Metadata = {
  title: "電費計算機",
  description:
    "依台電 2024 年住宅累進費率，輸入用電度數即時估算每月電費，支援夏月與非夏月費率切換。",
  keywords: ["電費計算機", "台電", "累進費率", "夏月電費", "用電度數"],
  openGraph: {
    title: "電費計算機 | 好算",
    description: "依台電累進費率估算每月電費",
    url: "https://haosuan.com/life/electricity",
  },
};

const faqs = [
  {
    question: "台電夏月是哪幾個月？",
    answer:
      "台電規定夏月為每年 6 月 1 日至 9 月 30 日，共 4 個月。夏月用電費率較高，因此同樣用電度數在夏季的電費會比其他月份多。",
  },
  {
    question: "基本費是什麼？",
    answer:
      "基本費是不論用電量多少都需繳納的固定費用，目前住宅用電基本費為每月 75 元。此費用不受累進費率影響。",
  },
  {
    question: "累進費率怎麼計算？",
    answer:
      "台電採用分段累進計費，例如前 120 度按第一段費率，121～330 度的部分按第二段費率，依此類推。本工具已自動依各段費率計算並加總。",
  },
  {
    question: "為什麼我的電費帳單和計算結果不同？",
    answer:
      "本工具為估算工具，實際帳單可能包含：兩個月合併計費（台電為每兩個月抄表一次）、電表費、燃料費調整等。若帳單週期為雙月，請將度數除以 2 計算月平均，或直接輸入兩個月總度數。",
  },
];

const relatedTools = [
  { label: "BMI 計算機", href: "/life/bmi" },
  { label: "日期天數計算", href: "/life/date-diff" },
  { label: "冷氣噸數計算", href: "/renovation/ac-btu" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "電費計算機",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "依台電累進費率，估算每月電費",
};

export default function ElectricityPage() {
  return (
    <CalculatorLayout
      title="電費計算機"
      description="輸入用電度數，依台電 2024 年住宅累進費率即時估算每月電費，支援夏月（6～9月）與非夏月切換"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <ElectricityCalculator />
    </CalculatorLayout>
  );
}
