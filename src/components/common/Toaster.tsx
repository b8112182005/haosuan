"use client";

import { useEffect, useState } from "react";
import { subscribeToast } from "@/lib/toast";

/** 全站唯一的短訊息顯示處，掛在 layout。見 lib/toast.ts */
export default function Toaster() {
  // seq 讓連續兩則相同的訊息也會重新計時
  const [toast, setToast] = useState<{ seq: number; message: string } | null>(null);

  useEffect(() => subscribeToast((message) => setToast((prev) => ({ seq: (prev?.seq ?? 0) + 1, message }))), []);

  useEffect(() => {
    if (!toast) return;
    // 字多的訊息（「這一期會通知 2 次（其餘時間已過）」）留久一點，2 秒讀不完
    const timer = window.setTimeout(() => setToast(null), Math.max(2000, toast.message.length * 160));
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabs-h)+1rem+var(--safe-bottom))] z-[80] flex justify-center px-4"
    >
      <div className="rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
        {toast.message}
      </div>
    </div>
  );
}
