import Link from "next/link";

const links = [
  {
    title: "生活計算",
    items: [
      { label: "BMI 計算機", href: "/life/bmi" },
      { label: "年齡計算機", href: "/life/age" },
      { label: "睡眠時間", href: "/life/sleep" },
      { label: "電費計算", href: "/life/electricity" },
    ],
  },
  {
    title: "財務計算",
    items: [
      { label: "房貸試算", href: "/finance/mortgage" },
      { label: "薪資所得稅", href: "/finance/income-tax" },
      { label: "複利計算", href: "/finance/compound-interest" },
      { label: "加班費計算", href: "/finance/overtime" },
    ],
  },
  {
    title: "單位換算",
    items: [
      { label: "面積換算", href: "/convert/area" },
      { label: "長度換算", href: "/convert/length" },
      { label: "重量換算", href: "/convert/weight" },
      { label: "溫度換算", href: "/convert/temperature" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 mt-16">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {links.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold mb-3">{group.title}</h3>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} 好算 HaoSuan — 台灣生活計算工具</p>
          <p className="mt-1">免費線上計算工具，專為台灣用戶設計</p>
        </div>
      </div>
    </footer>
  );
}
