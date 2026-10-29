/**
 * Site-wide configuration. Anything that identifies the site (name, URL,
 * description) lives here so metadata, robots and sitemap stay in sync.
 */

/** The deployed Cloudflare Workers address, used by production builds when NEXT_PUBLIC_SITE_URL is not set. */
export const PRODUCTION_SITE_URL = "https://dev-tools.emadilramzan.workers.dev";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);

/**
 * The site's origin, without a trailing slash. Production builds (`next build`)
 * must have a public HTTPS origin: they fail rather than write a localhost or
 * malformed URL into canonical links, the sitemap or robots.txt.
 */
export function resolveSiteUrl(raw = process.env.NEXT_PUBLIC_SITE_URL, nodeEnv = process.env.NODE_ENV): string {
  const production = nodeEnv === "production";
  const value = raw?.trim();
  if (!value) return production ? PRODUCTION_SITE_URL : "http://localhost:3000";

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`NEXT_PUBLIC_SITE_URL is not a valid URL: "${value}"`);
  }
  if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new Error(`NEXT_PUBLIC_SITE_URL must be an origin only, such as ${PRODUCTION_SITE_URL}: "${value}"`);
  }
  if (production && (url.protocol !== "https:" || LOCAL_HOSTS.has(url.hostname))) {
    throw new Error(`NEXT_PUBLIC_SITE_URL must be a public https:// URL in production builds: "${value}"`);
  }
  return url.origin;
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
  // Public contact address for /contact. None has been published yet, so the
  // contact page says so instead of showing an address or a form.
  contactEmail: null as string | null,
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
  { label: "Tutorials", href: "/tutorials" },
];
