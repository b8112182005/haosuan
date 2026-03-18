import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.haosuan.app',
  appName: '好算',
  webDir: 'out',
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#09090b',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'Dark' as any,
      backgroundColor: '#09090b',
    },
  },
};

export default config;
