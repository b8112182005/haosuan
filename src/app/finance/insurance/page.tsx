import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import NextStepCta from "@/components/common/NextStepCta";
import { HAOTI_LINE_URL, withUtm } from "@/lib/brand";
import InsuranceCalculator from "./InsuranceCalculator";

export const metadata: Metadata = {
  title: "勞健保費計算機 — 2024 年費率",
  description:
    "免費線上勞健保費計算機，依 2024 年最新費率計算勞保、健保自付額，含眷屬加保試算，快速得知每月實領薪資。",
  keywords: ["勞保", "健保", "勞健保", "薪資", "扣繳", "眷屬", "保費計算"],
  openGraph: {
    title: "勞健保費計算機 | 好算",
    description: "輸入月薪與眷屬人數，即時計算勞保費、健保費及實領薪資",
    url: "/finance/insurance",
  },
};

const faqs = [
  {
    question: "勞保和健保費員工各負擔多少比例？",
    answer:
      "勞保費率為 10.5%，員工負擔 20%（約月薪的 2.1%）；健保費率為 5.17%，員工負擔 30%（約月薪的 1.551%）。其餘由雇主及政府分攤。",
  },
  {
    question: "眷屬加保會增加多少健保費？",
    answer:
      "每增加一位眷屬，員工的健保費會等比例增加。例如本人健保費為 500 元，加 1 位眷屬則為 1,000 元，加 2 位為 1,500 元，以此類推。",
  },
  {
    question: "實際扣繳金額為什麼跟計算結果有差異？",
    answer:
      "本計算機以月薪直接計算，實際勞保是依「投保薪資分級表」對應級距計算，健保也有投保金額級距，因此可能有些許差異，結果僅供參考。",
  },
];

const relatedTools = [
  { label: "退休金計算機", href: "/finance/retirement" },
  { label: "存款利息計算", href: "/finance/deposit-interest" },
  { label: "所得稅計算機", href: "/finance/income-tax" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "勞健保費計算機",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "計算勞保、健保員工自付額與實領薪資",
};

export default function InsurancePage() {
  return (
    <CalculatorLayout
      title="勞健保費計算機"
      description="輸入月薪與眷屬人數，即時計算勞保費、健保費、合計扣除及每月實領薪資"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <NextStepCta
        eyebrow="算完下一步"
        title="接案收入不穩時，更要把勞健保與報稅節點記起來"
        description="好算先幫你估每月負擔；好提可以幫你記繳費、報稅與合約請款期限。"
        primaryLabel="用好提記期限"
        primaryHref={withUtm(HAOTI_LINE_URL, "insurance")}
        secondaryLabel="下載報價模板包"
        secondaryHref="/templates/freelance-pricing"
      />
      <InsuranceCalculator />
    </CalculatorLayout>
  );
}
