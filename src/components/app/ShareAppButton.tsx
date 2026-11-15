"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { SITE_URL, APP_NAME, ANDROID_PACKAGE } from "@/lib/site";

const PLAY_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

/**
 * 分享 app／網站。app 內走 @capacitor/share（原生分享面板），
 * 網頁版走 navigator.share，兩者都不行就複製連結。
 */
export default function ShareAppButton({
  title = APP_NAME,
  text = "查補助、記期限、算數字，一個 app 搞定。",
  url,
  className = "",
  label = "分享給朋友",
}: {
  title?: string;
  text?: string;
  url?: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const shareUrl = url ?? (document.documentElement.dataset.platform === "android" ? PLAY_URL : SITE_URL);
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import("@capacitor/share");
        await Share.share({ title, text, url: shareUrl, dialogTitle: "分享" });
        return;
      }
    } catch {
      // 使用者取消分享面板也會丟例外，直接結束
      return;
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪貼簿也不行時什麼都不做
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={`inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-primary/60 hover:text-primary ${className}`}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
      {copied ? "已複製連結" : label}
    </button>
  );
}
