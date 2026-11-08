// Single source of truth for the public site URL.
// Set NEXT_PUBLIC_SITE_URL in Vercel when a custom domain is attached;
// until then the Vercel production host is the canonical origin.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://haosuan.vercel.app"
).replace(/\/+$/, "");

export function absUrl(path: string): string {
  return path.startsWith("/") ? `${SITE_URL}${path}` : `${SITE_URL}/${path}`;
}

/** 產品名稱：好算（計算機）＋好提（補助與提醒），Android app 與網站共用同一個名字 */
export const APP_NAME = "好耶";
export const APP_TAGLINE = "查補助、記期限、算數字";

/** 服務提供者（個人開發者名義）。改用工作室或公司名義時集中改這裡。 */
export const PROVIDER_NAME = "好耶（個人開發者）";

/** 客服／個資權利行使聯絡信箱 */
export const CONTACT_EMAIL = "b8112182005@gmail.com";

/** Google Play 套件名稱，與 capacitor.config.ts 的 appId 一致 */
export const ANDROID_PACKAGE = "com.haosuan.haoti";

/** app 版本（由 next.config.ts 從 package.json 注入） */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

/** app 端檢查補助資料更新用的靜態 JSON 位置（web build 會把 src/data 的內容複製到 public/data） */
export const REMOTE_DATA_URL = `${SITE_URL}/data/subsidies.json`;
