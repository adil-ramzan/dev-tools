import { parseColor } from "@/lib/tools/color";
import { escapeXml } from "@/lib/tools/svg-placeholder";

/**
 * Builds the <head> metadata most pages need: title and description,
 * canonical URL, robots, Open Graph and Twitter/X card tags, theme color.
 * Every value is HTML-escaped. Nothing is fetched: URLs are only checked
 * for form, not visited.
 */

export type MetaFields = {
  title: string;
  description: string;
  canonical: string;
  siteName: string;
  image: string;
  imageAlt: string;
  ogType: "website" | "article" | "product" | "profile";
  locale: string;
  twitterCard: "summary" | "summary_large_image";
  twitterSite: string;
  twitterCreator: string;
  themeColor: string;
  index: boolean;
  follow: boolean;
  /** Include <meta charset> and <meta name="viewport">. */
  basics: boolean;
};

export const EMPTY_FIELDS: MetaFields = {
  title: "",
  description: "",
  canonical: "",
  siteName: "",
  image: "",
  imageAlt: "",
  ogType: "website",
  locale: "",
  twitterCard: "summary_large_image",
  twitterSite: "",
  twitterCreator: "",
  themeColor: "",
  index: true,
  follow: true,
  basics: true,
};

export const SAMPLE_FIELDS: MetaFields = {
  ...EMPTY_FIELDS,
  title: "Acme Analytics – Privacy-first website analytics",
  description: "Simple, cookie-free analytics for websites and apps. See what matters without tracking your visitors.",
  canonical: "https://acme.example/",
  siteName: "Acme Analytics",
  image: "https://acme.example/og/home.png",
  imageAlt: "Acme Analytics dashboard with a traffic chart",
  locale: "en_US",
  twitterSite: "@acme",
  themeColor: "#1f4fe0",
};

export const MAX_FIELD_LENGTH = 2000;

/** Lengths search engines usually show before truncating. They cut by pixel width, so these are guides only. */
export const TITLE_RANGE = [30, 60] as const;
export const DESCRIPTION_RANGE = [70, 160] as const;

export type FieldIssue = { field: keyof MetaFields; severity: "error" | "warning"; message: string };

function absoluteUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

const HANDLE = /^@[A-Za-z0-9_]{1,15}$/;
const LOCALE = /^[a-z]{2,3}_[A-Z]{2}$/;

export function checkFields(f: MetaFields): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const add = (field: keyof MetaFields, severity: FieldIssue["severity"], message: string) => issues.push({ field, severity, message });
  for (const key of Object.keys(f) as (keyof MetaFields)[]) {
    const value = f[key];
    if (typeof value === "string" && value.length > MAX_FIELD_LENGTH) add(key, "error", `Keep this under ${MAX_FIELD_LENGTH.toLocaleString("en-US")} characters.`);
  }
  const title = f.title.trim();
  const description = f.description.trim();
  if (!title) add("title", "warning", "Every page needs a title.");
  else if (title.length < TITLE_RANGE[0]) add("title", "warning", `Short titles (under ${TITLE_RANGE[0]} characters) waste space in search results.`);
  else if (title.length > TITLE_RANGE[1]) add("title", "warning", `Titles over about ${TITLE_RANGE[1]} characters are usually truncated in search results.`);
  if (description && description.length < DESCRIPTION_RANGE[0]) add("description", "warning", `Descriptions under ${DESCRIPTION_RANGE[0]} characters may be replaced by text from the page.`);
  else if (description.length > DESCRIPTION_RANGE[1]) add("description", "warning", `Descriptions over about ${DESCRIPTION_RANGE[1]} characters are usually truncated.`);
  if (f.canonical.trim() && !absoluteUrl(f.canonical.trim())) add("canonical", "error", "Use an absolute http(s) URL, such as https://example.com/page.");
  if (f.image.trim() && !absoluteUrl(f.image.trim())) add("image", "error", "Open Graph images need an absolute http(s) URL; relative paths are not resolved by most crawlers.");
  else if (f.image.trim().startsWith("http:")) add("image", "warning", "Use HTTPS for the image; some platforms do not load HTTP images.");
  if (f.image.trim() && !f.imageAlt.trim()) add("imageAlt", "warning", "Describe the image for people using screen readers.");
  for (const key of ["twitterSite", "twitterCreator"] as const) {
    if (f[key].trim() && !HANDLE.test(f[key].trim())) add(key, "error", "Use an @handle of 1 to 15 letters, digits or underscores.");
  }
  if (f.locale.trim() && !LOCALE.test(f.locale.trim())) add("locale", "warning", "Open Graph locales use language_TERRITORY, for example en_US or pt_BR.");
  if (f.themeColor.trim() && !parseColor(f.themeColor.trim()).ok) add("themeColor", "error", "Use a CSS color such as #1f4fe0 or rgb(31 79 224).");
  if (!f.index) add("index", "warning", "noindex keeps the page out of search results. Remove it before launch if that is not intended.");
  return issues;
}

const attr = (value: string) => escapeXml(value.trim());

/** The HTML for the head, one tag per line. Fields with errors are left out. */
export function buildMetaTags(f: MetaFields): string {
  const errors = new Set(checkFields(f).filter((i) => i.severity === "error").map((i) => i.field));
  const ok = (field: keyof MetaFields) => !errors.has(field) && typeof f[field] === "string" && (f[field] as string).trim() !== "";
  const lines: string[] = [];
  const meta = (key: "name" | "property", name: string, value: string) => lines.push(`<meta ${key}="${name}" content="${attr(value)}">`);
  const section = (comment: string) => lines.length && lines.push("") && lines.push(`<!-- ${comment} -->`);

  if (f.basics) {
    lines.push('<meta charset="utf-8">');
    lines.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  }
  if (ok("title")) lines.push(`<title>${attr(f.title)}</title>`);
  if (ok("description")) meta("name", "description", f.description);
  if (ok("canonical")) lines.push(`<link rel="canonical" href="${attr(f.canonical)}">`);
  if (!f.index || !f.follow) meta("name", "robots", `${f.index ? "index" : "noindex"}, ${f.follow ? "follow" : "nofollow"}`);
  if (ok("themeColor")) meta("name", "theme-color", f.themeColor);

  const og = ["title", "description", "canonical", "siteName", "image"].some((k) => ok(k as keyof MetaFields));
  if (og) {
    section("Open Graph");
    meta("property", "og:type", f.ogType);
    if (ok("title")) meta("property", "og:title", f.title);
    if (ok("description")) meta("property", "og:description", f.description);
    if (ok("canonical")) meta("property", "og:url", f.canonical);
    if (ok("siteName")) meta("property", "og:site_name", f.siteName);
    if (ok("locale") && !errors.has("locale")) meta("property", "og:locale", f.locale);
    if (ok("image")) {
      meta("property", "og:image", f.image);
      if (ok("imageAlt")) meta("property", "og:image:alt", f.imageAlt);
    }

    section("Twitter / X");
    // Twitter/X falls back to the og: tags for title, description and image, so only card-specific tags are added.
    meta("name", "twitter:card", ok("image") ? f.twitterCard : "summary");
    if (ok("twitterSite")) meta("name", "twitter:site", f.twitterSite);
    if (ok("twitterCreator")) meta("name", "twitter:creator", f.twitterCreator);
    if (ok("image") && ok("imageAlt")) meta("name", "twitter:image:alt", f.imageAlt);
  }
  return lines.join("\n");
}
