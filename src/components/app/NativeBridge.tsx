"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * 只在 Capacitor 原生環境啟用的膠水程式：
 * - Android 返回鍵：有上一頁就回上一頁，在首頁就離開 app（不處理會直接關閉 app，使用者會以為當掉）。
 * - 外部連結：補助申請頁都是政府網站，用 Chrome Custom Tabs（@capacitor/browser）開，
 *   按返回就回到 app，比丟到外部瀏覽器順。
 * - 通知點擊：導到提醒帶的 url。
 * 所有 Capacitor 套件都用動態 import，網頁版不會載入它們。
 */
export default function NativeBridge() {
  const router = useRouter();

  useEffect(() => {
    let disposed = false;
    const cleanups: Array<() => void> = [];

    (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform() || disposed) return;

      const { App } = await import("@capacitor/app");
      const { Browser } = await import("@capacitor/browser");

      const backSub = await App.addListener("backButton", ({ canGoBack }) => {
        const path = window.location.pathname.replace(/\/index\.html$/, "/");
        const atRoot = path === "/" || path === "";
        if (atRoot || !canGoBack) {
          App.exitApp();
        } else {
          window.history.back();
        }
      });
      cleanups.push(() => {
        backSub.remove();
      });

      const openExternal = (url: string) => {
        Browser.open({ url, presentationStyle: "popover" }).catch(() => {
          window.open(url, "_blank", "noopener");
        });
      };

      const onClick = (event: MouseEvent) => {
        if (event.defaultPrevented || event.button !== 0) return;
        const target = event.target as HTMLElement | null;
        const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
        if (!anchor) return;
        const href = anchor.getAttribute("href") ?? "";
        if (!/^https?:\/\//i.test(href)) return;
        let host = "";
        try {
          host = new URL(href).host;
        } catch {
          return;
        }
        if (host === window.location.host) return;
        event.preventDefault();
        openExternal(href);
      };
      document.addEventListener("click", onClick, true);
      cleanups.push(() => document.removeEventListener("click", onClick, true));

      try {
        const notifications = await import("@/lib/reminders/notifications");
        const off = notifications.initNotificationTapHandler((url: string) => {
          if (/^https?:\/\//i.test(url)) openExternal(url);
          else router.push(url);
        });
        if (typeof off === "function") cleanups.push(off);
      } catch {
        // 提醒模組不存在或初始化失敗時，app 其餘功能照常
      }
    })().catch(() => {
      // Capacitor 不存在（純網頁）時安靜略過
    });

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, [router]);

  return null;
}
