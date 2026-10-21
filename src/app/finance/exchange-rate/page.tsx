import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import ExchangeRateCalculator from "./ExchangeRateCalculator";

export const metadata: Metadata = {
  title: "匯率換算",
  description:
    "免費線上匯率換算工具，支援台幣與美元、日圓、歐元、港幣、人民幣等 14 種常用幣別互換，快速估算旅遊或購物所需金額。",
  keywords: ["匯率換算", "台幣換算", "美金換台幣", "日圓換台幣", "外幣計算機"],
  openGraph: {
    title: "匯率換算 | 好算",
    description: "台幣與 14 種常用幣別即時換算",
    url: "/finance/exchange-rate",
  },
};

const faqs = [
  {
    question: "匯率是即時的嗎？",
    answer:
      "本工具使用的是參考匯率，非即時報價。匯率每日浮動，建議出發前查詢台灣銀行（bot.com.tw）或您銀行的最新即期匯率，以獲得最準確數字。",
  },
  {
    question: "「即期匯率」和「現鈔匯率」有什麼差別？",
    answer:
      "即期匯率用於電匯等轉帳交易；現鈔匯率（買入/賣出）用於換現金，因為銀行需承擔現金搬運成本，通常比即期匯率差一些。出國換現金請以現鈔賣出價計算。",
  },
  {
    question: "在哪裡換外幣最划算？",
    answer:
      "台灣銀行、兆豐銀行通常有較好的匯率，機場換匯匯差較大。在日本等地直接用提款機提當地現金，有時比在台灣換更划算，但需注意手續費。",
  },
  {
    question: "怎麼計算旅遊預算？",
    answer:
      "先估算需要的外幣總額，再乘以現鈔賣出匯率（您要付出多少台幣），即為旅遊預算。建議多備 10% 緩衝應對匯率波動。",
  },
];

const relatedTools = [
  { label: "房貸試算", href: "/finance/mortgage" },
  { label: "薪資所得稅試算", href: "/finance/income-tax" },
  { label: "發票營業稅計算", href: "/finance/invoice-tax" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "匯率換算",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "台幣與常用幣別換算工具",
};

export default function ExchangeRatePage() {
  return (
    <CalculatorLayout
      title="匯率換算"
      description="台幣與美元、日圓、歐元等 14 種常用幣別快速換算，出國旅遊、網購外幣必備工具"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <ExchangeRateCalculator />
    </CalculatorLayout>
  );
}
