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
  /** Open Graph and Twitter description, when sharing should say more than the search snippet. */
  socialDescription?: string;
};

/**
 * Builds consistent per-page metadata. Canonical and Open Graph URLs are
 * absolute and built like the sitemap's, so all three agree exactly.
 * Next.js merges metadata shallowly, so the shared Open Graph fields are
 * repeated here rather than inherited from the layout.
 */
export function pageMetadata({ title, description, path, absoluteTitle = false, type = "website", socialDescription = description }: PageMetadataInput): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      type,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      title,
      description: socialDescription,
      url: absoluteUrl(path),
    },
    twitter: { card: "summary", title, description: socialDescription },
  };
}

/** Appended to tool descriptions to say that every tool is free and needs no account. */
export const FREE_NOTE = "Free, no signup.";

/** Longest description that search results show in full. */
const SNIPPET_LENGTH = 160;

/**
 * Adds the free-access note to a description that does not already mention
 * it, when the result fits in `maxLength`. The default keeps search snippets
 * whole, so the note never truncates a hand-written description.
 */
export function withFreeNote(description: string, maxLength = SNIPPET_LENGTH): string {
  if (/\bfree\b/i.test(description)) return description;
  const extended = `${description} ${FREE_NOTE}`;
  return extended.length <= maxLength ? extended : description;
}
