import type { Metadata } from "next";
import CalculatorLayout from "@/components/layout/CalculatorLayout";
import NextStepCta from "@/components/common/NextStepCta";
import { HAOTI_LINE_URL, withUtm } from "@/lib/brand";
import InsuranceCalculator from "./InsuranceCalculator";

export const metadata: Metadata = {
  title: "勞健保費計算機 — 115 年（2026）費率與投保級距",
  description:
    "依 115 年（2026）勞保、就保、健保的費率與投保級距，輸入月薪與眷屬人數，算出每月自付的勞健保費與實領薪資。",
  keywords: ["勞保", "健保", "勞健保", "薪資", "扣繳", "眷屬", "保費計算"],
  openGraph: {
    title: "勞健保費計算機 | 好耶",
    description: "輸入月薪與眷屬人數，即時計算勞保費、健保費及實領薪資",
    url: "/finance/insurance",
  },
};

const faqs = [
  {
    question: "勞保和健保費員工各負擔多少比例？",
    answer:
      "115 年（2026）勞保普通事故保險費率 11.5%、就業保險費率 1%，合計 12.5%，員工負擔 20%；健保費率 5.17%，員工負擔 30%。其餘由雇主與政府分攤。",
  },
  {
    question: "眷屬加保會增加多少健保費？",
    answer:
      "健保費按人數計：本人加 1 位眷屬是 2 份，加 2 位是 3 份，加 3 位是 4 份；眷屬超過 3 人以 3 人計。例如投保金額 45,800 元，本人每月 710 元，加 1 位眷屬是 1,420 元。",
  },
  {
    question: "實際扣繳金額為什麼跟計算結果有差異？",
    answer:
      "計算機用你輸入的月薪對到投保級距。公司申報的投保薪資和月薪不同時（例如獎金、津貼沒有計入），扣款就會不同。另外勞保月投保薪資最高一級是 45,800 元，月薪更高也用 45,800 元算；健保投保金額最高是 313,000 元。",
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
      notice="116 年 1 月 1 日起，勞保普通事故保險費率由 11.5% 調為 12%（加就業保險 1% 合計 13%），每月最低工資調為 30,900 元。116 年的勞保投保薪資分級表與健保投保金額分級表還沒公告，這個計算機目前用 115 年的數字，公告後更新。"
    >
      <NextStepCta
        eyebrow="算完下一步"
        title="接案收入不穩時，更要把勞健保與報稅節點記起來"
        description="好耶先幫你估每月負擔；好提可以幫你記繳費、報稅與合約請款期限。"
        primaryLabel="用好提記期限"
        primaryHref={withUtm(HAOTI_LINE_URL, "insurance")}
        secondaryLabel="下載報價模板包"
        secondaryHref="/templates/freelance-pricing"
      />
      <InsuranceCalculator />
    </CalculatorLayout>
  );
}
