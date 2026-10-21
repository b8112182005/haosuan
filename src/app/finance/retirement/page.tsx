import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import RetirementCalculator from "./RetirementCalculator";

export const metadata: Metadata = {
  title: "退休金試算",
  description:
    "免費退休金試算工具，輸入年齡、存款、每月儲蓄與預期報酬率，計算退休時總資產與退休後每月可動用金額。",
  keywords: ["退休金", "退休試算", "複利", "存退休金", "財務規劃", "台灣"],
  openGraph: {
    title: "退休金試算 | 好算",
    description: "計算退休時總資產與每月可動用金額",
    url: "/finance/retirement",
  },
};

const faqs = [
  {
    question: "我 30 歲開始存，65 歲退休，需要存多少？",
    answer:
      "以每月存 10,000 元、年化報酬率 5% 計算，35 年後約累積 950 萬元，退休後每月可動用約 2.6 萬元（30 年餘命）。若現有存款 50 萬元，總資產可達約 1,350 萬元，每月可用約 3.7 萬元。",
  },
  {
    question: "退休金目標 1,000 萬如何規劃？",
    answer:
      "以 30 歲開始、65 歲退休（35 年）、年化報酬 5% 計算，每月需投資約 10,500 元即可達到 1,000 萬元目標。若年化報酬提高至 7%，每月只需約 7,000 元。越早開始，複利效果越顯著。",
  },
  {
    question: "年化報酬率應該設多少？",
    answer:
      "保守型（定存、債券）約 1-3%；穩健型（台股指數、0050 等）歷史平均約 6-8%；積極型（科技股）可能達 10% 以上但波動大。長期退休規劃建議以 5-7% 作為合理假設。",
  },
];

const relatedTools = [
  { label: "複利計算機", href: "/finance/compound-interest" },
  { label: "薪資所得稅試算", href: "/finance/income-tax" },
  { label: "勞健保費計算", href: "/finance/insurance" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "退休金試算",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "計算退休時總資產與退休後每月可動用金額",
};

export default function RetirementPage() {
  return (
    <CalculatorLayout
      title="退休金試算"
      description="輸入目前年齡、退休年齡、存款與每月儲蓄，計算退休時的總資產與每月可動用金額"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <RetirementCalculator />
    </CalculatorLayout>
  );
}
