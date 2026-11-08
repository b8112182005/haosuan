import Link from "next/link";
import { APP_NAME } from "@/lib/site";

// 桌面寬度的導覽列；手機寬度（含 app）改用 BottomTabs，所以這裡的 nav 只在 md 以上顯示。
const navItems = [
  { label: "補助查詢", href: "/subsidy" },
  { label: "我的提醒", href: "/reminders" },
  { label: "計算工具", href: "/tools" },
  { label: "關於", href: "/about" },
];

export default function Header() {
  return (
    <header
      className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#6C5CE7] to-[#A29BFE] text-sm font-black text-white"
          >
            好
          </span>
          <span>{APP_NAME}</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="主要導覽">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
