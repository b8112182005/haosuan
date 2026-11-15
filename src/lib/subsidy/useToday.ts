"use client";

import { useSyncExternalStore } from "react";
import { todayLocal, toDateString, type LocalDate } from "./deadline";

/**
 * 「今天」在靜態輸出時不存在，直接在 render 用 new Date() 會造成 hydration 不一致，
 * 用 setState-in-effect 又會被 react-hooks 規則擋。useSyncExternalStore 的 server snapshot
 * 回 null、client snapshot 回今天的字串，hydration 後自動切換，且不需要 effect。
 */
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function scheduleMidnightTick() {
  if (timer || typeof window === "undefined") return;
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  timer = setTimeout(() => {
    timer = null;
    listeners.forEach((fn) => fn());
    scheduleMidnightTick();
  }, next.getTime() - now.getTime());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  scheduleMidnightTick();
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): string {
  return toDateString(todayLocal());
}

function getServerSnapshot(): string | null {
  return null;
}

export function useToday(): LocalDate | null {
  const key = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d };
}
