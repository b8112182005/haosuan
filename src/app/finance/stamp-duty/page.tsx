import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import StampDutyCalculator from "./StampDutyCalculator";

export const metadata: Metadata = {
  title: "印花稅計算機 — 買賣、贈與契約印花稅試算",
  description:
    "免費線上印花稅計算機，輸入交易金額與契約類型，即時計算印花稅金額與適用費率。支援買賣契約、贈與契約等類型。",
  keywords: ["印花稅", "契稅", "買賣契約", "贈與契約", "不動產", "稅務"],
  openGraph: {
    title: "印花稅計算機 | 好算",
    description: "輸入交易金額與契約類型，即時計算印花稅金額",
    url: "https://haosuan.com/finance/stamp-duty",
  },
};

const faqs = [
  {
    question: "印花稅的稅率是多少？",
    answer:
      "依據台灣印花稅法，不動產買賣契約的印花稅率為千分之一（0.1%），贈與契約及其他承攬契據為千分之一點二（0.12%）。印花稅金額無條件進位至整數元。",
  },
  {
    question: "哪些契約需要繳印花稅？",
    answer:
      "需要貼花的憑證包括：銀錢收據、買賣動產契據、承攬契據、不動產買賣契約書等。日常生活中最常見的是不動產買賣或贈與時需繳納印花稅。",
  },
  {
    question: "印花稅什麼時候要繳？",
    answer:
      "印花稅應在書立憑證時繳納。可透過購買印花稅票貼於契約上，或向稅捐稽徵機關申請以繳款書繳納。未貼或短貼印花稅票者，可處 5 至 15 倍罰鍰。",
  },
];

const relatedTools = [
  { label: "房貸計算機", href: "/finance/mortgage" },
  { label: "所得稅計算機", href: "/finance/income-tax" },
  { label: "統一發票對獎", href: "/finance/invoice-tax" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "印花稅計算機",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "計算買賣、贈與等契約的印花稅金額與適用費率",
};

export default function StampDutyPage() {
  return (
    <CalculatorLayout
      title="印花稅計算機"
      description="輸入交易金額與契約類型，即時計算印花稅金額與適用費率"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <StampDutyCalculator />
    </CalculatorLayout>
  );
}
