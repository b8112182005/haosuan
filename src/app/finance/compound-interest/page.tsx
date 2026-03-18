import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import CompoundInterestCalculator from "./CompoundInterestCalculator";

export const metadata: Metadata = {
  title: "複利計算機",
  description:
    "免費複利計算機，輸入本金、年化報酬率、投資年限與每月定期投入，即時計算最終資產、總報酬率，支援月/季/年複利。",
  keywords: ["複利計算機", "投資試算", "定期定額", "年化報酬率", "複利效果"],
  openGraph: {
    title: "複利計算機 | 好算",
    description: "計算複利終值、年度成長明細，感受複利的威力",
    url: "https://haosuan.com/finance/compound-interest",
  },
};

const faqs = [
  {
    question: "什麼是複利？",
    answer:
      "複利是「利滾利」，每期的利息加入本金後，下一期的利息計算基礎變大。相較單利，複利的長期效果極為驚人——著名的「72 法則」：用 72 除以年化報酬率，即可估算本金翻倍所需年數。",
  },
  {
    question: "月複利和年複利差很多嗎？",
    answer:
      "複利頻率越高，最終金額略大。例如年利率 7%：年複利終值係數為 (1+7%)；月複利為 (1+7%/12)^12 ≈ 7.23%。差距存在但不大，實際影響視本金與年限而定。",
  },
  {
    question: "定期定額投資的優點是什麼？",
    answer:
      "定期定額（每月固定投入）可分散進場時間點風險（平均成本法），在市場波動時自動低價多買，適合長期穩健投資。即使每月只投入少量資金，長期複利效果也相當可觀。",
  },
  {
    question: "7% 的年化報酬率合理嗎？",
    answer:
      "以美國 S&P 500 指數過去 30 年的年化報酬率（含股息再投入）約為 10%，扣除通膨後約 7%，是長期股票型指數基金的常見參考值。台灣加權股價指數長期年化約 8～10%。個別股票或主動型基金波動較大。",
  },
];

const relatedTools = [
  { label: "房貸試算", href: "/finance/mortgage" },
  { label: "薪資所得稅試算", href: "/finance/income-tax" },
  { label: "百分比計算", href: "/math/percentage" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "複利計算機",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "計算複利終值、年度成長明細與定期定額效果",
};

export default function CompoundInterestPage() {
  return (
    <CalculatorLayout
      title="複利計算機"
      description="輸入本金、年化報酬率與每月投入，即時計算複利終值與年度成長明細，支援定期定額與月/季/年複利"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <CompoundInterestCalculator />
    </CalculatorLayout>
  );
}
