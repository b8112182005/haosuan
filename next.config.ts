import type { NextConfig } from "next";

const isAppBuild = process.env.BUILD_TARGET === 'app';

const nextConfig: NextConfig = {
  // APP build 用 static export，Web build 保持 server mode
  ...(isAppBuild ? {
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
  } : {}),
};

export default nextConfig;
