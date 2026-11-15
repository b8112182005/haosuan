import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import NextStepCta from "@/components/common/NextStepCta";
import { HAOTI_LINE_URL, withUtm } from "@/lib/brand";
import ElectricityCalculator from "./ElectricityCalculator";

export const metadata: Metadata = {
  title: "電費計算機",
  description:
    "依台電 114 年 10 月 1 日起實施的住宅累進電價，輸入用電度數估算每月電費，可以切換夏月與非夏月。",
  keywords: ["電費計算機", "台電", "累進費率", "夏月電費", "用電度數"],
  openGraph: {
    title: "電費計算機 | 好耶",
    description: "依台電累進費率估算每月電費",
    url: "/life/electricity",
  },
};

const faqs = [
  {
    question: "台電夏月是哪幾個月？",
    answer:
      "台電規定夏月為每年 6 月 1 日至 9 月 30 日，共 4 個月。夏月用電費率較高，因此同樣用電度數在夏季的電費會比其他月份多。",
  },
  {
    question: "住宅用電有基本電費嗎？",
    answer:
      "一般住宅（表燈非營業用、非時間電價）沒有基本電費，照用電度數分段計價；當月電費未滿 100 元時以 100 元計收。改用「簡易型時間電價」的用戶才有每戶每月 75 元的基本電費，那種計費方式不適用這個計算機。",
  },
  {
    question: "累進費率怎麼計算？",
    answer:
      "台電採用分段累進計費，例如前 120 度按第一段費率，121～330 度的部分按第二段費率，依此類推。本工具已自動依各段費率計算並加總。",
  },
  {
    question: "為什麼我的電費帳單和計算結果不同？",
    answer:
      "台電多數住宅是每兩個月抄表一次，帳單上是兩個月的度數，各段的度數門檻也跟著加倍（第一段變成 240 度）。請把帳單度數除以 2 再輸入，算出來的金額乘以 2 才是帳單金額；直接輸入兩個月的總度數會高估。帳單期間跨越夏月與非夏月時，台電會按天數分開計算，和這裡的結果也會有差距。",
  },
  {
    question: "我家每月用 300 度電，大概幾錢？",
    answer:
      "非夏月約 620 元（120 度 × 1.78 元加 180 度 × 2.26 元），夏月（6～9 月）約 673 元（第二段單價是 2.55 元）。實際金額以台電帳單為準。",
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
      description="輸入用電度數，依台電 114 年 10 月 1 日起實施的住宅累進電價估算每月電費，可切換夏月（6～9 月）與非夏月"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <NextStepCta
        eyebrow="算完下一步"
        title="電費變高，不只要知道金額，也要記得檢查設備"
        description="把濾網清潔、冷氣保養、帳單繳費這類容易忘記的小事交給好提；先用 LINE 免費記 3 件事。"
        primaryLabel="去好提記提醒"
        primaryHref={withUtm(HAOTI_LINE_URL, "electricity")}
        secondaryLabel="看接案報價模板"
        secondaryHref="/templates/freelance-pricing"
      />
      <ElectricityCalculator />
    </CalculatorLayout>
  );
}
