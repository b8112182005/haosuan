import type { NextConfig } from "next";

const isAppBuild = process.env.BUILD_TARGET === "app";

// 好算為純前端 PWA，無外部 API 呼叫，故 CSP 可相對嚴格。
// 僅套用於 Web（Vercel）部署；BUILD_TARGET=app 的 static export 由 Capacitor 自行處理。
// script/style 保留 'unsafe-inline'（Next.js bootstrap 與 JSON-LD）；worker-src 'self' 確保 PWA service worker 不被擋。
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
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
          ];
        },
      }),
};

export default nextConfig;
