/**
 * Site-wide configuration. Anything that identifies the site (name, URL,
 * description) lives here so metadata, robots and sitemap stay in sync.
 */

function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export const siteConfig = {
  // Working name — replace once the brand is decided.
  name: "Developer Tools",
  shortName: "DevTools",
  tagline: "Developer utilities for the browser.",
  description:
    "Free online developer tools for formatting JSON, encoding URLs and Base64, testing regular expressions, generating UUIDs and more. No account required.",
  url: resolveSiteUrl(),
  locale: "en_US",
} as const;

export type NavItem = {
  label: string;
  href: string;
  /** Other path prefixes that should mark this item as current. */
  match?: string[];
};

// Primary navigation. The header hides the navigation and mobile menu
// toggle while this is empty.
export const mainNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "All tools", href: "/tools", match: ["/categories"] },
];

// Secondary site links in the footer. Category links are added from
// src/content/categories.ts.
export const footerNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "All tools", href: "/tools" },
];
