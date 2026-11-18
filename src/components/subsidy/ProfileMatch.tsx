"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import type { SubsidySummary } from "@/lib/subsidy/types";
import { loadProfile, type Profile } from "@/lib/subsidy/profile";
import { evaluate } from "@/lib/subsidy/eligibility";
import { toRow } from "@/lib/subsidy/results";
import { useToday } from "@/lib/subsidy/useToday";

/**
 * 項目頁「誰可以申請」底下的條件比對。
 * 條件存在裝置的 Preferences，靜態 HTML 裡沒有，所以讀完之前和沒填過的人看到同一行連結。
 */
export default function ProfileMatch({ subsidy }: { subsidy: SubsidySummary }) {
  const today = useToday();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    loadProfile().then((p) => {
      if (alive) setProfile(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!profile || !today) {
    return (
      <p className="mt-3 text-xs">
        <Link href="/subsidy/check" className="underline underline-offset-4">用資格試算比對你的條件</Link>
      </p>
    );
  }

  const row = toRow(evaluate(subsidy, profile, today), today);
  const { matched, unknown, failed, notes } = row.evaluation;
  const verdict =
    row.status === "match"
      ? "你填的條件都對得上。"
      : row.status === "situational"
        ? "這一項沒有年齡、縣市、身分門檻，符合上面「誰可以申請」的情況就能用。"
        : row.status === "no"
          ? "依你填的條件不符合。"
          : `還有 ${unknown.length} 條要你自己確認。`;
  // 所得門檻的全文就在這張卡片正上方那一段：這裡再貼一次，租金補貼這類項目會多出 15 行一樣的字
  const incomeNote = subsidy.conditions.income_limit_note?.trim();
  const shorten = (text: string) => (incomeNote && text.includes(incomeNote) ? text.replace(incomeNote, "金額看上面那一段") : text);
  const lines = [
    ...matched.map((text) => ({ kind: "ok" as const, text })),
    ...unknown.map((text) => ({ kind: "unknown" as const, text: shorten(text) })),
    ...failed.map((text) => ({ kind: "no" as const, text })),
  ];

  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3" data-testid="profile-match" data-status={row.status}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">你的條件比對</h3>
        <Link href="/subsidy/check" className="text-xs underline underline-offset-4">修改條件</Link>
      </div>
      <p className="mt-1 text-sm">{verdict}</p>
      {lines.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {lines.map((l, i) => (
            <li key={i} className="flex items-start gap-1.5">
              {l.kind === "ok" ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : l.kind === "unknown" ? (
                <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              ) : (
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
              )}
              <span>{l.text}</span>
            </li>
          ))}
        </ul>
      )}
      {notes[0] && <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">另需確認：{notes[0]}</p>}
    </div>
  );
}
