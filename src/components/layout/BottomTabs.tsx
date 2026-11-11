"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Landmark, Bell, Calculator, Menu } from "lucide-react";
import { normalizePath } from "@/lib/platform";

// 手機寬度（< md）顯示的底部分頁列；桌面寬度改由 Header 的導覽列負責。
// 在 app 裡這是主要導覽，所以 5 個分頁對應 5 個主要區塊。
const TABS = [
  { href: "/", label: "首頁", icon: Home, exact: true },
  { href: "/subsidy", label: "補助", icon: Landmark, exact: false },
  { href: "/reminders", label: "提醒", icon: Bell, exact: false },
  { href: "/tools", label: "工具", icon: Calculator, exact: false },
  { href: "/more", label: "更多", icon: Menu, exact: false },
] as const;

// 計算機頁（/life、/finance…）在分頁列上歸到「工具」
const TOOL_PREFIXES = ["/life", "/finance", "/renovation", "/convert", "/math", "/tools"];

function isActive(pathname: string, href: string, exact: boolean): boolean {
  const path = normalizePath(pathname);
  if (exact) return path === "/";
  if (href === "/tools") return TOOL_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
  return path === href || path.startsWith(href + "/");
}

export default function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主要分頁"
      className="bottom-tabs fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch" style={{ paddingBottom: "var(--safe-bottom)" }}>
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href, tab.exact);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] leading-none transition-colors ${
                  active ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "" : "opacity-80"}`} strokeWidth={active ? 2.4 : 1.8} />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
