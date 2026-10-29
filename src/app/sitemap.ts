import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { categories, categoryPath } from "@/content/categories";
import { availableTools, toolPath } from "@/content/tools";

// Written to a static file at build time (the site is a static export).
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => `${siteConfig.url}${path}`;
  return [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/tools"), changeFrequency: "weekly", priority: 0.9 },
    ...categories.map((category) => ({
      url: url(categoryPath(category.slug)),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // Planned tools have no page yet, so they are left out.
    ...availableTools.map((tool) => ({
      url: url(toolPath(tool.slug)),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
