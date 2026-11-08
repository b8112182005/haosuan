import type { CapacitorConfig } from '@capacitor/cli';
import { Style } from '@capacitor/status-bar';

// 好耶 Android app（好算計算機 + 好提補助/提醒）
// appId 一旦上架 Google Play 就不能再改。
const config: CapacitorConfig = {
  appId: 'com.haosuan.haoti',
  appName: '好耶',
  webDir: 'out',
  android: {
    // 補助申請連結全部是 https，不需要 http 混合內容
    allowMixedContent: false,
    // 讓 WebView 的 scheme 保持 https://localhost，與 Next.js 靜態輸出的絕對路徑相容
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      style: Style.Light,
      backgroundColor: '#ffffff',
      overlaysWebView: false,
    },
    // Android 15+ 強制 edge-to-edge；Capacitor 8 內建 SystemBars 會在 viewport-fit=cover 時
    // 注入 --safe-area-inset-* CSS 變數，globals.css 用它們替 Header 與底部分頁列留白。
    SystemBars: {
      style: 'LIGHT',
      insetsHandling: 'css',
    },
    LocalNotifications: {
      // 白色剪影小圖示，放在 android/app/src/main/res/drawable*/ic_stat_notify.png
      smallIcon: 'ic_stat_notify',
      iconColor: '#6C5CE7',
    },
  },
};

export default config;
