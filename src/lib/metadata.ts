import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

/**
 * Absolute URL for a route path, on the configured origin, with no trailing
 * slash. The homepage is the bare origin, as Next.js writes canonical URLs.
 */
export const absoluteUrl = (path: string) => (path === "/" ? siteConfig.url : `${siteConfig.url}${path}`);

type PageMetadataInput = {
  title: string;
  description: string;
  /** Route path, e.g. "/tools/json-formatter". Used for the canonical URL. */
  path: string;
  /** Use the title as-is instead of applying the root "%s · Site" template. */
  absoluteTitle?: boolean;
  /** Open Graph type: "article" for tutorials, "website" for everything else. */
  type?: "website" | "article";
};

/**
 * Builds consistent per-page metadata. Canonical and Open Graph URLs are
 * absolute and built like the sitemap's, so all three agree exactly.
 * Next.js merges metadata shallowly, so the shared Open Graph fields are
 * repeated here rather than inherited from the layout.
 */
export function pageMetadata({ title, description, path, absoluteTitle = false, type = "website" }: PageMetadataInput): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      type,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      title,
      description,
      url: absoluteUrl(path),
    },
    twitter: { card: "summary", title, description },
  };
}
