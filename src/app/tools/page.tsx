import type { Metadata } from "next";
import ToolsIndex from "@/components/tools/ToolsIndex";
import { getEnabledTools } from "@/lib/tools-registry";

export const metadata: Metadata = {
  title: "計算工具",
  description:
    "30 種台灣常用計算機：房貸、所得稅、勞健保費、加班費、電費、BMI、坪數換算、油漆用量。輸入即算，免費無廣告。",
  alternates: { canonical: "/tools" },
};

export default function ToolsPage() {
  const count = getEnabledTools().length;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">計算工具</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {count} 種計算機，5 大分類。算完可以直接加入提醒或分享結果。
        </p>
      </div>
      <ToolsIndex />
    </div>
  );
}
