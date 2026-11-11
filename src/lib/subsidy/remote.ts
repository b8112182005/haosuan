"use client";

import { useEffect, useState } from "react";
import type { Subsidy, SubsidyDataset } from "./types";
import { DATA_VERSION, getSubsidyById } from "./data";
import { REMOTE_DATA_URL, SITE_URL } from "@/lib/site";
import { amountHeadline } from "./format";

/**
 * 補助資料隨 app 一起打包，但政策會變。網站每次部署都會把最新資料檔放在 /data/subsidies.json，
 * app 啟動後抓一次：版本比內建新就存進 Preferences，詳情頁用 LiveUpdateNotice 提示差異。
 * 網頁版只在同網域時抓（自己的部署就是最新資料，通常不會有差異）。
 */

const CACHE_KEY = "haoti.subsidyData.v1";
const LAST_CHECK_KEY = "haoti.subsidyData.lastCheck";
const MIN_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 小時內不重抓

let memoryCache: SubsidyDataset | null | undefined;

function isDataset(v: unknown): v is SubsidyDataset {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  return typeof d.version === "string" && Array.isArray(d.items) && Array.isArray(d.general_faqs);
}

export async function getCachedRemoteDataset(): Promise<SubsidyDataset | null> {
  if (memoryCache !== undefined) return memoryCache;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: CACHE_KEY });
    const parsed = value ? JSON.parse(value) : null;
    memoryCache = isDataset(parsed) && parsed.version > DATA_VERSION ? parsed : null;
  } catch {
    memoryCache = null;
  }
  return memoryCache;
}

async function fetchRemote(): Promise<unknown> {
  const { Capacitor, CapacitorHttp } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    // 原生 HTTP 不受 WebView 的 CORS 限制
    const res = await CapacitorHttp.get({ url: REMOTE_DATA_URL, responseType: "json", connectTimeout: 10_000, readTimeout: 10_000 });
    if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
    return typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  }
  // 網頁版：只在同網域時抓；其他網域（預覽部署）不需要
  if (typeof window === "undefined") return null;
  let sameOrigin = false;
  try {
    sameOrigin = new URL(SITE_URL).host === window.location.host;
  } catch {
    sameOrigin = false;
  }
  if (!sameOrigin) return null;
  const res = await fetch("/data/subsidies.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function refreshRemoteDataset(force = false): Promise<{ updated: boolean; version: string | null }> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    if (!force) {
      const { value } = await Preferences.get({ key: LAST_CHECK_KEY });
      if (value && Date.now() - Number(value) < MIN_INTERVAL_MS) {
        const cached = await getCachedRemoteDataset();
        return { updated: false, version: cached?.version ?? null };
      }
    }
    const data = await fetchRemote();
    await Preferences.set({ key: LAST_CHECK_KEY, value: String(Date.now()) });
    if (!isDataset(data)) return { updated: false, version: null };
    if (data.version <= DATA_VERSION) {
      // 遠端沒有比較新：清掉舊快取，避免拿舊的遠端資料蓋掉新 app 的內建資料
      await Preferences.remove({ key: CACHE_KEY });
      memoryCache = null;
      return { updated: false, version: data.version };
    }
    await Preferences.set({ key: CACHE_KEY, value: JSON.stringify(data) });
    memoryCache = data;
    return { updated: true, version: data.version };
  } catch {
    return { updated: false, version: null };
  }
}

export interface LiveSubsidy {
  /** 遠端較新的資料版本；null 表示沒有更新 */
  version: string | null;
  /** 遠端版本的同一項目；項目在遠端被移除時為 null */
  item: Subsidy | null | undefined;
  loading: boolean;
}

/** 讀取某個項目的遠端更新版本（有的話） */
export function useLiveSubsidy(id: string): LiveSubsidy {
  const [state, setState] = useState<LiveSubsidy>({ version: null, item: undefined, loading: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      await refreshRemoteDataset();
      const remote = await getCachedRemoteDataset();
      if (!alive) return;
      if (!remote) {
        setState({ version: null, item: undefined, loading: false });
        return;
      }
      const item = remote.items.find((s) => s.id === id) ?? null;
      setState({ version: remote.version, item, loading: false });
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return state;
}

/** 兩個版本的項目有沒有使用者會在意的差異 */
export function diffSubsidy(local: Subsidy, remote: Subsidy): string[] {
  const diffs: string[] = [];
  if (local.amount.text !== remote.amount.text) diffs.push(`金額：${amountHeadline(remote.amount)}（詳細金額已更新）`);
  if (
    local.deadline.type !== remote.deadline.type ||
    local.deadline.end_month !== remote.deadline.end_month ||
    local.deadline.end_day !== remote.deadline.end_day ||
    local.deadline.start_month !== remote.deadline.start_month ||
    local.deadline.start_day !== remote.deadline.start_day
  )
    diffs.push(`期限：${remote.deadline.note || "已調整"}`);
  if (local.status_2026 !== remote.status_2026) diffs.push(`狀態：${remote.status_2026 === "ended" ? "已結束" : remote.status_2026 === "active" ? "進行中" : remote.status_2026}`);
  if (local.official_url !== remote.official_url) diffs.push("申請網址已更新");
  return diffs;
}

export function getBundledSubsidy(id: string): Subsidy | undefined {
  return getSubsidyById(id);
}
