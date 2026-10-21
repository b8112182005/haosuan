import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import SavingsInterestCalculator from "./SavingsInterestCalculator";

export const metadata: Metadata = {
  title: "存款利息計算機 — 單利/複利",
  description:
    "免費線上存款利息計算機，支援單利與複利計算，輸入本金、年利率與期間，即時算出利息金額與到期本利和。",
  keywords: ["存款利息", "定存", "複利", "單利", "利率", "本利和", "儲蓄"],
  openGraph: {
    title: "存款利息計算機 | 好算",
    description: "輸入本金、年利率與存款期間，即時計算利息與到期本利和",
    url: "/finance/deposit-interest",
  },
};

const faqs = [
  {
    question: "單利和複利差在哪裡？",
    answer:
      "單利只以本金計算利息，每期利息固定；複利則會將前期利息併入本金再計息（利滾利），長期來看複利收益明顯高於單利。",
  },
  {
    question: "台灣定存利率大約多少？",
    answer:
      "2024 年台灣主要銀行一年期定存固定利率約 1.5%～1.8%，數位帳戶優惠利率可達 2%～3% 不等，依各銀行方案而定。",
  },
  {
    question: "為什麼實際年利率和名目年利率不同？",
    answer:
      "複利計算時，因為利息會再產生利息，實際年報酬率（有效年利率）會略高於名目年利率。存款期間越長，兩者差距越明顯。",
  },
];

const relatedTools = [
  { label: "退休金計算機", href: "/finance/retirement" },
  { label: "勞健保費計算", href: "/finance/insurance" },
  { label: "房貸計算機", href: "/finance/mortgage" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "存款利息計算機",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "計算存款利息、到期本利和與實際年利率",
};

export default function DepositInterestPage() {
  return (
    <CalculatorLayout
      title="存款利息計算機"
      description="輸入本金、年利率與存款期間，計算單利或複利的利息金額與到期本利和"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <SavingsInterestCalculator />
    </CalculatorLayout>
  );
}
