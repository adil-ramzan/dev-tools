import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// Written to a static file at build time (the site is a static export).
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
