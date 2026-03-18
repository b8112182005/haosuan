import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import MortgageCalculator from "./MortgageCalculator";

export const metadata: Metadata = {
  title: "房貸試算",
  description:
    "免費房貸試算機，支援本息均攤（等額本息）與本金均攤（等額本金），輸入貸款金額、年利率、年限，即時計算每月還款金額與利息總額。",
  keywords: ["房貸試算", "房貸計算機", "等額本息", "等額本金", "月付", "利率"],
  openGraph: {
    title: "房貸試算 | 好算",
    description: "計算每月還款金額、總利息與還款明細",
    url: "https://haosuan.com/finance/mortgage",
  },
};

const faqs = [
  {
    question: "本息均攤和本金均攤有什麼差別？",
    answer:
      "本息均攤（等額本息）：每月還款金額固定，前期利息比例高。適合預算固定、需要穩定現金流的購屋族。本金均攤（等額本金）：每月固定還本金，利息逐月遞減，總利息比本息均攤少，但前幾年月付較高。",
  },
  {
    question: "台灣現在的房貸利率是多少？",
    answer:
      "2024 年台灣主要銀行房貸固定利率約在 2.1%～3.5% 之間，浮動利率則更低。實際利率依銀行、貸款成數、信用狀況而異，建議向多家銀行詢價比較。",
  },
  {
    question: "貸款成數上限是多少？",
    answer:
      "依台灣銀行法規，首屋自住最高可貸 8 成（LTV 80%），第二戶降至 6～7 成，第三戶以上更嚴格。公寓、大樓及預售屋的成數規定略有不同。",
  },
  {
    question: "提前還款划算嗎？",
    answer:
      "提前還款可減少總利息支出，尤其在貸款初期（利息比例高）效果更顯著。但需注意部分銀行有「違約金條款」，提前還款可能需支付 1%～3% 手續費，應先確認合約條件。",
  },
];

const relatedTools = [
  { label: "複利計算機", href: "/finance/compound-interest" },
  { label: "薪資所得稅試算", href: "/finance/income-tax" },
  { label: "加班費計算機", href: "/finance/overtime" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "房貸試算",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "台灣房貸試算，支援本息均攤與本金均攤兩種還款方式",
};

export default function MortgagePage() {
  return (
    <CalculatorLayout
      title="房貸試算"
      description="輸入貸款金額、年利率與年限，即時計算每月還款金額、總利息，支援本息均攤與本金均攤兩種方式"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <MortgageCalculator />
    </CalculatorLayout>
  );
}
