import Link from "next/link";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/site";

const links = [
  {
    title: "補助與提醒",
    items: [
      { label: "補助資格試算", href: "/subsidy/check" },
      { label: "全部補助", href: "/subsidy" },
      { label: "疑難雜症", href: "/subsidy/faq" },
      { label: "年度時程表", href: "/subsidy/calendar" },
      { label: "我的提醒", href: "/reminders" },
    ],
  },
  {
    title: "財務計算",
    items: [
      { label: "房貸試算", href: "/finance/mortgage" },
      { label: "薪資所得稅", href: "/finance/income-tax" },
      { label: "勞健保費", href: "/finance/insurance" },
      { label: "加班費計算", href: "/finance/overtime" },
    ],
  },
  {
    title: "生活與換算",
    items: [
      { label: "電費計算", href: "/life/electricity" },
      { label: "BMI 計算機", href: "/life/bmi" },
      { label: "面積換算", href: "/convert/area" },
      { label: "全部 30 種工具", href: "/tools" },
    ],
  },
];

// Footer 只給網頁版；app 有底部分頁列，Footer 會變成多餘的一大塊，用 .web-only 隱藏。
export default function Footer() {
  return (
    <footer className="web-only mt-16 border-t border-border bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {links.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 text-sm font-semibold">{group.title}</h3>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center gap-2 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {APP_NAME} — 補助查詢、期限提醒、生活計算工具</p>
          <p className="flex flex-wrap justify-center gap-x-3">
            <Link href="/about" className="hover:text-foreground">關於與資料來源</Link>
            <Link href="/privacy" className="hover:text-foreground">隱私權政策</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground">聯絡我們</a>
          </p>
          <p>本站整理政府公開資訊，申請條件與金額以各主管機關公告為準。</p>
        </div>
      </div>
    </footer>
  );
}
