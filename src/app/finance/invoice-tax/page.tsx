import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import InvoiceTaxCalculator from "./InvoiceTaxCalculator";

export const metadata: Metadata = {
  title: "發票營業稅計算",
  description:
    "台灣 5% 營業稅快速換算，支援含稅拆算未稅、未稅加算含稅兩種方向，適合開發票、報帳或採購核算使用。",
  keywords: ["營業稅計算", "發票計算", "含稅未稅", "5%稅率", "稅額計算"],
  openGraph: {
    title: "發票營業稅計算 | 好算",
    description: "含稅/未稅金額換算（5% 營業稅）",
    url: "https://haosuan.com/finance/invoice-tax",
  },
};

const faqs = [
  {
    question: "台灣營業稅率是多少？",
    answer:
      "台灣標準營業稅率為 5%，適用於大多數商品和服務。部分特殊情況如農產品、金融服務等稅率不同，但一般消費與商業交易均適用 5%。",
  },
  {
    question: "含稅金額怎麼拆出未稅和稅額？",
    answer:
      "公式：未稅 = 含稅 ÷ 1.05；稅額 = 含稅 - 未稅。例如含稅 1,050 元，未稅為 1,050 ÷ 1.05 = 1,000 元，稅額為 50 元。",
  },
  {
    question: "開立發票時稅額如何填寫？",
    answer:
      "開立三聯式發票（B2B）時，需分別填寫「未稅金額」和「稅額」，兩者相加才是發票總金額。二聯式（B2C）通常只填含稅總額。稅額若有小數點，按四捨五入取整數。",
  },
  {
    question: "進項稅額可以扣抵嗎？",
    answer:
      "依加值型及非加值型營業稅法，一般企業可以用進項稅額扣抵銷項稅額。例如購買原料含稅 10,500 元（進項稅額 500 元），銷售含稅 21,000 元（銷項稅額 1,000 元），應繳營業稅為 500 元。",
  },
];

const relatedTools = [
  { label: "加班費計算機", href: "/finance/overtime" },
  { label: "薪資所得稅試算", href: "/finance/income-tax" },
  { label: "百分比計算", href: "/math/percentage" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "發票營業稅計算",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "台灣 5% 營業稅含稅/未稅金額換算",
};

export default function InvoiceTaxPage() {
  return (
    <CalculatorLayout
      title="發票營業稅計算"
      description="台灣 5% 營業稅含稅與未稅金額快速換算，支援兩個方向計算，附常見金額對照表"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <InvoiceTaxCalculator />
    </CalculatorLayout>
  );
}
