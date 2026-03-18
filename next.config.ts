import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const isAppBuild = process.env.BUILD_TARGET === 'app';

const nextConfig: NextConfig = {
  // APP build 用 static export，Web build 保持 server mode
  ...(isAppBuild ? {
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
  } : {}),
};

export default withPWA(nextConfig);
