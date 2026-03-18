import { MetadataRoute } from "next";
import { getSitemapPaths } from "@/lib/tools-registry";

const BASE_URL = "https://haosuan.com";

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
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const toolRoutes: MetadataRoute.Sitemap = toolPaths.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...toolRoutes];
}
