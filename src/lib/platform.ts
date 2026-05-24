/**
 * 平台偵測與功能旗標
 * 讓 Web 和 APP 共用代碼但行為不同
 */

export type Platform = 'web' | 'android' | 'ios';

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  getPlatform?: () => Platform;
}

function detectPlatform(): Platform {
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
