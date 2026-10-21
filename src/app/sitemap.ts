import { MetadataRoute } from "next";
import { getSitemapPaths } from "@/lib/tools-registry";
import { SITE_URL } from "@/lib/site";

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

  return [...staticRoutes, ...toolRoutes];
}
