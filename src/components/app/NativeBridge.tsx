"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { normalizePath } from "@/lib/platform";
import { runBackHandlers } from "@/lib/backHandler";
import { resolveSubsidyPath } from "@/lib/subsidy/paths";

/**
 * 只在 Capacitor 原生環境啟用的膠水程式：
 * - Android 返回鍵：開著的面板、試算精靈的上一題先處理（lib/backHandler）；
 *   沒有的話有上一頁就回上一頁，在首頁就離開 app（不處理會直接關閉 app，使用者會以為當掉）。
 * - 外部連結：補助申請頁都是政府網站，用 Chrome Custom Tabs（@capacitor/browser）開，
 *   按返回就回到 app，比丟到外部瀏覽器順。
 * - 通知點擊：導到提醒帶的 url；那個補助頁在這一版已經不在時改到補助列表。
 * - 啟動時、從背景回到前景時重排通知：被強制停止、系統清掉排程之後，開 app 就補回來；
 *   每年固定的提醒也在這時推到下一年。
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

      // 頁面有 hydration 不一致時，React 會重建 <html>，把 PlatformScript 寫的 data-platform
      // 和 SystemBars 注入的安全區變數一起清掉：網頁版的 Footer 跑出來、Header 被狀態列蓋住。
      // 這裡補寫一次平台，並請 SystemBars 重新注入（它掛在 window 上的介面，舊版或 iOS 沒有就略過）。
      const root = document.documentElement;
      const platform = Capacitor.getPlatform();
      if (root.dataset.platform !== platform) root.dataset.platform = platform;
      if (!root.style.getPropertyValue("--safe-area-inset-top")) {
        try {
          (window as unknown as { CapacitorSystemBarsAndroidInterface?: { onDOMReady?: () => void } })
            .CapacitorSystemBarsAndroidInterface?.onDOMReady?.();
        } catch {
          // 介面不存在或呼叫失敗：版面退回 env() 的安全區，不影響其他功能
        }
      }

      const { App } = await import("@capacitor/app");
      const { Browser } = await import("@capacitor/browser");

      const backSub = await App.addListener("backButton", ({ canGoBack }) => {
        if (runBackHandlers()) return;
        const atRoot = normalizePath(window.location.pathname) === "/";
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
          else router.push(resolveSubsidyPath(url));
        });
        if (typeof off === "function") cleanups.push(off);

        // 不等使用者走到提醒頁：提醒頁以外的畫面也可能是 app 這次啟動唯一看過的一頁
        const store = await import("@/lib/reminders/store");
        const rollover = () => {
          store.rolloverReminders().catch(() => {});
        };
        rollover();

        // app 常駐在背景好幾天是常態（使用者按 Home 不是滑掉）。只在啟動時檢查的話，
        // 期限過了的每年提醒要等到 app 被系統回收重開才會推到明年；回到前景時再檢查一次。
        const onVisible = () => {
          if (document.visibilityState === "visible") rollover();
        };
        document.addEventListener("visibilitychange", onVisible);
        cleanups.push(() => document.removeEventListener("visibilitychange", onVisible));
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
