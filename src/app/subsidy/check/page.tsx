import type { Metadata } from "next";
import CheckWizard from "@/components/subsidy/CheckWizard";
import { getAllSubsidies } from "@/lib/subsidy/data";

export const metadata: Metadata = {
  title: "補助資格試算",
  description: "回答縣市、年齡、收入、租屋與家庭狀況等問題，列出你可能符合的政府補助與申請截止日。條件只在你的裝置上比對，不會上傳。",
  alternates: { canonical: "/subsidy/check" },
};

export default function SubsidyCheckPage() {
  const subsidies = getAllSubsidies();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">我能領什麼補助？</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {subsidies.filter((s) => s.status_2026 !== "ended").length} 個進行中的項目，依你的條件逐條比對。答案只存在這支手機。
        </p>
      </div>
      <CheckWizard />
    </div>
  );
}
