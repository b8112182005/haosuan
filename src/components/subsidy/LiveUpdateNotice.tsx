"use client";

import { RefreshCw, AlertTriangle } from "lucide-react";
import { useLiveSubsidy, diffSubsidy, type DiffableSubsidy } from "@/lib/subsidy/remote";

/**
 * 詳情頁頂部：內建資料與網站最新資料有差異時提示。
 * 沒差異、沒更新、還在載入時什麼都不顯示，避免每頁都多一塊。
 */
export default function LiveUpdateNotice({ subsidy }: { subsidy: DiffableSubsidy }) {
  const live = useLiveSubsidy(subsidy.id);
  if (live.loading || !live.version) return null;

  if (live.item === null) {
    return (
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>最新資料（{live.version}）已移除這個項目，可能已停辦或改名。申請前請以主管機關公告為準。</p>
      </div>
    );
  }

  if (!live.item) return null;
  const diffs = diffSubsidy(subsidy, live.item);
  if (diffs.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
      <p className="flex items-center gap-2 font-medium">
        <RefreshCw className="h-4 w-4" /> 有較新的資料（{live.version}）
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-6">
        {diffs.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
      {live.item.official_url !== subsidy.official_url && (
        <a href={live.item.official_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block underline underline-offset-4">
          前往新的官方網址
        </a>
      )}
    </div>
  );
}
