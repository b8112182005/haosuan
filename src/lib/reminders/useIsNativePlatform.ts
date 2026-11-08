import { useSyncExternalStore } from 'react';
import { isNativePlatform } from './notifications';

const subscribe = () => () => {};
const getServerSnapshot = () => false;

/**
 * 伺服器端一律當 web 渲染，客戶端第一次 render 才讀 Capacitor。
 * 用 useSyncExternalStore 而不是 useState + useEffect，是為了不觸發 hydration 不一致，
 * 也不用在 effect 裡同步 setState。
 */
export function useIsNativePlatform(): boolean {
  return useSyncExternalStore(subscribe, isNativePlatform, getServerSnapshot);
}
