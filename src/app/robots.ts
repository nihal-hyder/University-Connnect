import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env/public";

/** Public discovery pages are crawlable; accounts, workspaces and APIs are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/manage", "/onboarding", "/api/", "/auth/", "/maintenance", "/offline", "/societies/apply"],
    },
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
    host: publicEnv.siteUrl,
  };
}
