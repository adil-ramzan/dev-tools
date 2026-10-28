import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

type PageMetadataInput = {
  title: string;
  description: string;
  /** Route path, e.g. "/tools/json-formatter". Used for the canonical URL. */
  path: string;
  /** Use the title as-is instead of applying the root "%s · Site" template. */
  absoluteTitle?: boolean;
};

/**
 * Builds consistent per-page metadata. Relative URLs resolve against
 * `metadataBase`, which the root layout sets from `siteConfig.url`.
 * Next.js merges metadata shallowly, so the shared Open Graph fields are
 * repeated here rather than inherited from the layout.
 */
export function pageMetadata({ title, description, path, absoluteTitle = false }: PageMetadataInput): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      title,
      description,
      url: path,
    },
    twitter: { card: "summary", title, description },
  };
}
