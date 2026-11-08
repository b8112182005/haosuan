import type { NextConfig } from "next";
import pkg from "./package.json";

const isAppBuild = process.env.BUILD_TARGET === "app";

// 好算好提為純前端站（補助資料隨 build 內建，遠端更新只讀 haosuan.vercel.app 的靜態 JSON），CSP 可相對嚴格。
// 僅套用於 Web（Vercel）部署；BUILD_TARGET=app 的 static export 由 Capacitor 自行處理。
// script/style 保留 'unsafe-inline'（Next.js bootstrap、平台偵測 inline script 與 JSON-LD）；worker-src 'self' 確保 PWA service worker 不被擋。
// GA4 只在 NEXT_PUBLIC_GA_ID 設定時載入（見 src/app/layout.tsx），CSP 也只在那時放行 Google 主機。
const gaEnabled = Boolean(process.env.NEXT_PUBLIC_GA_ID) && !isAppBuild;
const gaScriptHosts = gaEnabled ? " https://www.googletagmanager.com" : "";
const gaConnectHosts = gaEnabled
  ? " https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com"
  : "";
const gaImgHosts = gaEnabled ? " https://www.google-analytics.com" : "";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${gaScriptHosts}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${gaImgHosts}`,
  "font-src 'self' data:",
  `connect-src 'self'${gaConnectHosts}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // 讓 client 端程式知道這是 app build 還是 web build（例如 app 不載 GA、不註冊 service worker）
  env: {
    NEXT_PUBLIC_BUILD_TARGET: isAppBuild ? "app" : "web",
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // APP build 用 static export，Web build 保持 server mode
  ...(isAppBuild
    ? {
        output: "export",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        async headers() {
          return [
            {
              source: "/:path*",
              headers: securityHeaders,
            },
            {
              // app 端會跨網域抓這份資料檢查更新；只開放 GET 讀取
              source: "/data/:path*",
              headers: [
                { key: "Access-Control-Allow-Origin", value: "*" },
                { key: "Access-Control-Allow-Methods", value: "GET" },
                { key: "Cache-Control", value: "public, max-age=3600" },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
