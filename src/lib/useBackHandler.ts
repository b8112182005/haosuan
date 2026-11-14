import { useEffect, useRef } from "react";
import { pushBackHandler } from "./backHandler";

/**
 * active 為 true 的期間攔下 Android 返回鍵，改呼叫 onBack。
 * onBack 用 ref 存最新的一份，呼叫端不必為了它包 useCallback，也不會每次 render 重新註冊。
 */
export function useBackHandler(active: boolean, onBack: () => void): void {
  const latest = useRef(onBack);
  useEffect(() => {
    latest.current = onBack;
  });

  useEffect(() => {
    if (!active) return;
    return pushBackHandler(() => {
      latest.current();
      return true;
    });
  }, [active]);
}
