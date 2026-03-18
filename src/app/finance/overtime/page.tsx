import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import OvertimeCalculator from "./OvertimeCalculator";

export const metadata: Metadata = {
  title: "加班費計算機",
  description:
    "依台灣勞基法第 24 條，計算平日、休息日、國定假日加班費。輸入月薪與加班時數，即時顯示應領加班費與計費明細。",
  keywords: ["加班費計算機", "勞基法加班", "加班費", "平日加班", "假日加班"],
  openGraph: {
    title: "加班費計算機 | 好算",
    description: "依勞基法計算平日、假日加班費",
    url: "https://haosuan.com/finance/overtime",
  },
};

const faqs = [
  {
    question: "勞基法平日加班費怎麼算？",
    answer:
      "依勞基法第 24 條，平日加班前 2 小時，每小時加給工資 1/3（即正常工資的 1.33 倍）；第 3 小時起加給 2/3（即 1.67 倍）。時薪以月薪除以 240 計算。",
  },
  {
    question: "休息日加班費怎麼算？",
    answer:
      "休息日（例假日）加班前 2 小時每小時加給 1/3，工作 3 小時以上至 8 小時加給 2/3。雇主至少須支付一日工資，且每次加班至少以 2 小時計（不足 2 小時以 2 小時計）。",
  },
  {
    question: "國定假日加班費是雙薪嗎？",
    answer:
      "是的。在國定假日出勤工作，雇主應加倍發給工資（即雙薪）。若能補假，則補給等值假期。",
  },
  {
    question: "月薪 30 小時以內的計算方式正確嗎？",
    answer:
      "本工具使用月薪÷240（= 30天×8小時）計算時薪，此為勞基法規定的加班費計算基礎。部分雇主可能有不同約定，但不得低於法定標準。如您的勞動契約有特別規定，以合約為準。",
  },
];

const relatedTools = [
  { label: "薪資所得稅試算", href: "/finance/income-tax" },
  { label: "房貸試算", href: "/finance/mortgage" },
  { label: "發票營業稅計算", href: "/finance/invoice-tax" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "加班費計算機",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
  description: "依台灣勞基法計算平日、休息日、國定假日加班費",
};

export default function OvertimePage() {
  return (
    <CalculatorLayout
      title="加班費計算機"
      description="依台灣勞基法第 24 條，輸入月薪與加班時數，即時計算平日、休息日、國定假日的加班費"
      faqs={faqs}
      relatedTools={relatedTools}
      jsonLd={jsonLd}
    >
      <OvertimeCalculator />
    </CalculatorLayout>
  );
}
