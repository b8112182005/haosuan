/**
 * 平台偵測與功能旗標
 * 讓 Web 和 APP 共用代碼但行為不同
 *
 * 兩層判斷：
 * - isAppBuild：build 時決定（BUILD_TARGET=app），用來排除 GA、service worker 等 app 不需要的東西。
 * - platform / isApp：執行時由 Capacitor bridge 判斷；SSR/靜態輸出階段一律是 'web'。
 *   需要在首次繪製前就區分的樣式，改用 globals.css 的 html[data-platform] 規則
 *   （由 src/components/app/PlatformScript.tsx 的 inline script 設定）。
 */

export type Platform = 'web' | 'android' | 'ios';

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  getPlatform?: () => Platform;
}

export const isAppBuild = process.env.NEXT_PUBLIC_BUILD_TARGET === 'app';

export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'web';
  const cap = (window as Window & { Capacitor?: CapacitorBridge }).Capacitor;
  if (!cap?.isNativePlatform?.()) return 'web';
  return cap.getPlatform?.() ?? 'web';
}

export const platform = detectPlatform();
export const isApp = platform !== 'web';
export const isWeb = platform === 'web';
export const isAndroid = platform === 'android';
export const isIOS = platform === 'ios';

/** 功能旗標 — 統一管理 Web 和 APP 的差異行為 */
export const features = {
  nativeShare: isApp,        // APP 才有原生分享
  nativeHaptics: isApp,      // APP 才有震動回饋
  nativeClipboard: isApp,    // APP 才用 Capacitor Clipboard
  pwaInstallBanner: isWeb,   // 只在 Web 顯示安裝提示
  appRatingPrompt: isApp,    // 只在 APP 顯示評分提示
} as const;

/**
 * usePathname() 的值在 app 裡可能帶著 /index.html（見 PlatformScript 的整頁載入後備路徑）
 * 或結尾斜線（靜態輸出 trailingSlash）。比對路由前先正規化成「/subsidy/check」這種形式。
 */
export function normalizePath(pathname: string): string {
  const p = pathname.replace(/\/index\.html$/, "").replace(/\/+$/, "");
  return p === "" ? "/" : p;
}
