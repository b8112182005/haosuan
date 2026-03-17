"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const segmentLabels: Record<string, string> = {
  life: "生活",
  finance: "財務",
  renovation: "裝潢",
  convert: "換算",
  bmi: "BMI 計算機",
  age: "年齡計算機",
  sleep: "睡眠時間",
  electricity: "電費計算",
  mortgage: "房貸試算",
  "income-tax": "薪資所得稅",
  "compound-interest": "複利計算",
  overtime: "加班費計算",
  "invoice-tax": "發票營業稅",
  paint: "油漆用量",
  tile: "磁磚數量",
  "ac-btu": "冷氣噸數",
  area: "面積換算",
  length: "長度換算",
  weight: "重量換算",
  temperature: "溫度換算",
  percentage: "百分比計算",
  "word-count": "字數計算",
  "exchange-rate": "匯率換算",
  "date-diff": "日期天數",
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => ({
    label: segmentLabels[seg] ?? seg,
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground py-3 px-4 mx-auto max-w-5xl">
      <Link href="/" className="hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          {i === crumbs.length - 1 ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
