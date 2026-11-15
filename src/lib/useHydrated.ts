import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * 靜態輸出的 HTML 與 hydration 的第一次 render 回 false，之後回 true。
 *
 * 用在「現在幾點」「今天幾號」這類只有裝置上才知道的預設值：直接在 render 用 new Date()，
 * 畫面上的文字會和靜態 HTML 對不上，React 會把整頁丟掉重畫，連 <html> 上的屬性一起清掉。
 * 用 useSyncExternalStore 而不是 useState + useEffect，是為了不用在 effect 裡同步 setState。
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
