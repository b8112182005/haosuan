import { MetadataRoute } from "next";
// 相對路徑：vitest 沒設 @ 別名，sitemap 測試要能 import 這個檔
import { getSitemapPaths } from "../lib/tools-registry";
import { SITE_URL } from "../lib/site";
import { DATA_VERSION, SUBSIDY_INDEX } from "../lib/subsidy/index-data";

export const dynamic = "force-static";

const BASE_URL = SITE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  const toolPaths = getSitemapPaths();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/free-template`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/templates/freelance-pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/guides/freelance-pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  const toolRoutes: MetadataRoute.Sitemap = toolPaths.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // 補助與說明頁的 lastModified 用資料版本日期：資料沒變就不該告訴搜尋引擎頁面變了，
  // 用 build 當天會讓每次部署都像是全站更新
  const subsidyStatic: MetadataRoute.Sitemap = [
    { path: "/subsidy", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/subsidy/check", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/subsidy/faq", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/subsidy/calendar", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/about", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  ].map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: DATA_VERSION,
    changeFrequency,
    priority,
  }));

  const subsidyRoutes: MetadataRoute.Sitemap = SUBSIDY_INDEX.map((s) => ({
    url: `${BASE_URL}/subsidy/${s.id}`,
    lastModified: DATA_VERSION,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...subsidyStatic, ...subsidyRoutes, ...toolRoutes];
}
