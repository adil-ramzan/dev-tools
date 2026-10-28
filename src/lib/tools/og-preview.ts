import { graphemes } from "@/lib/tools/favicon";

/**
 * Open Graph and Twitter/X card preview from pasted HTML. The HTML is parsed
 * with DOMParser, which never runs scripts or loads resources, and is never
 * inserted into the page. URLs are checked for form only: nothing is
 * fetched, including the share image.
 */

export const MAX_HTML_LENGTH = 1_000_000;

export type PageMeta = {
  title: string | null;
  description: string | null;
  canonical: string | null;
  og: Record<string, string>;
  twitter: Record<string, string>;
  /** Property or name of tags that appear more than once (only the first is used). */
  duplicates: string[];
};

const OG_KEYS = ["og:title", "og:description", "og:image", "og:image:secure_url", "og:image:alt", "og:image:width", "og:image:height", "og:url", "og:site_name", "og:type", "og:locale"];
const TWITTER_KEYS = ["twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt", "twitter:site", "twitter:creator"];

type ParserWindow = { DOMParser: typeof DOMParser };

const clean = (value: string | null | undefined) => {
  const v = value?.replace(/\s+/g, " ").trim();
  return v ? v : null;
};

/** Reads the metadata platforms use from an HTML document or fragment. */
export function extractMetadata(html: string, win: ParserWindow): PageMeta {
  const doc = new win.DOMParser().parseFromString(html.slice(0, MAX_HTML_LENGTH), "text/html");
  const og: Record<string, string> = {};
  const twitter: Record<string, string> = {};
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const meta of Array.from(doc.querySelectorAll("meta"))) {
    // Facebook reads property=, Twitter/X reads name=; both are accepted for either prefix, as the platforms do.
    const key = (meta.getAttribute("property") ?? meta.getAttribute("name") ?? "").trim().toLowerCase();
    const content = clean(meta.getAttribute("content"));
    if (!key || content === null) continue;
    const target = OG_KEYS.includes(key) ? og : TWITTER_KEYS.includes(key) ? twitter : null;
    if (!target && key !== "description") continue;
    if (seen.has(key)) {
      duplicates.add(key);
      continue;
    }
    seen.add(key);
    if (target) target[key] = content;
  }
  const description = clean(doc.querySelector('meta[name="description" i]')?.getAttribute("content"));
  const canonical = clean(doc.querySelector('link[rel~="canonical" i]')?.getAttribute("href"));
  const titles = doc.querySelectorAll("title");
  if (titles.length > 1) duplicates.add("title");
  return { title: clean(titles[0]?.textContent), description, canonical, og, twitter, duplicates: [...duplicates] };
}

export function isHttpUrl(value: string | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function hostOf(value: string | null): string | null {
  return isHttpUrl(value) ? new URL(value).hostname.replace(/^www\./, "") : null;
}

export type CardType = "summary_large_image" | "summary";

export type Card = {
  title: string | null;
  description: string | null;
  image: string | null;
  imageAlt: string | null;
  url: string | null;
  domain: string | null;
  siteName: string | null;
};

/** What Facebook and LinkedIn use: Open Graph first, then the page's own title and description. */
export function openGraphCard(m: PageMeta): Card {
  const url = m.og["og:url"] ?? m.canonical;
  return {
    title: m.og["og:title"] ?? m.title,
    description: m.og["og:description"] ?? m.description,
    image: m.og["og:image:secure_url"] ?? m.og["og:image"] ?? null,
    imageAlt: m.og["og:image:alt"] ?? null,
    url,
    domain: hostOf(url),
    siteName: m.og["og:site_name"] ?? null,
  };
}

/** What Twitter/X uses: twitter: tags, falling back to Open Graph. */
export function twitterCard(m: PageMeta): Card & { type: CardType } {
  const base = openGraphCard(m);
  const declared = m.twitter["twitter:card"];
  return {
    ...base,
    title: m.twitter["twitter:title"] ?? m.og["og:title"] ?? m.title,
    description: m.twitter["twitter:description"] ?? m.og["og:description"] ?? m.description,
    image: m.twitter["twitter:image"] ?? base.image,
    imageAlt: m.twitter["twitter:image:alt"] ?? base.imageAlt,
    type: declared === "summary" ? "summary" : "summary_large_image",
  };
}

export type Issue = { severity: "error" | "warning" | "info"; field: string; message: string };

/** Shortens text to `max` user-perceived characters with an ellipsis, as platforms do. */
export function truncate(text: string, max: number): string {
  const chars = graphemes(text);
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join("").trimEnd()}…`;
}

export function checkMetadata(m: PageMeta): Issue[] {
  const issues: Issue[] = [];
  const add = (severity: Issue["severity"], field: string, message: string) => issues.push({ severity, field, message });
  const card = openGraphCard(m);

  if (!m.og["og:title"]) add(m.title ? "warning" : "error", "og:title", m.title ? "No og:title: platforms fall back to <title>, which often includes the site name and is cut differently." : "No og:title or <title>: the card will show only the URL.");
  if (!m.og["og:description"]) add("warning", "og:description", m.description ? "No og:description: the meta description is used instead by some platforms only." : "No description at all: cards show no summary text.");
  if (!m.og["og:url"] && !m.canonical) add("warning", "og:url", "No og:url or canonical link: shares of URLs with tracking parameters are counted separately.");

  for (const [field, value] of [["og:url", m.og["og:url"]], ["canonical", m.canonical]] as const) {
    if (value && !isHttpUrl(value)) add("error", field, `"${truncate(value, 80)}" is not an absolute http(s) URL.`);
  }

  if (!card.image) add("warning", "og:image", "No og:image: most platforms show a small text-only card, which gets far fewer clicks.");
  for (const [field, value] of [["og:image", card.image], ["twitter:image", m.twitter["twitter:image"]]] as const) {
    if (!value) continue;
    if (!isHttpUrl(value)) add("error", field, `"${truncate(value, 80)}" is not an absolute URL. Crawlers do not resolve relative image paths reliably; use https://….`);
    else if (value.startsWith("http:")) add("warning", field, "The image uses HTTP. Some platforms only load HTTPS images.");
    else if (/\.svg(\?|#|$)/i.test(value)) add("error", field, "SVG images are not supported for share cards. Use PNG, JPEG or WebP.");
  }
  if (card.image && !card.imageAlt) add("info", "og:image:alt", "No image description (og:image:alt): screen reader users get no description of the image.");

  const width = Number(m.og["og:image:width"]);
  const height = Number(m.og["og:image:height"]);
  if (m.og["og:image:width"] || m.og["og:image:height"]) {
    if (!(width > 0 && height > 0)) add("warning", "og:image:width", "og:image:width and og:image:height should both be positive numbers of pixels.");
    else if (width < 200 || height < 200) add("warning", "og:image:width", `The image is ${width}×${height}. Facebook needs at least 200×200 and shows large cards from 600×315.`);
    else if (Math.abs(width / height - 1.91) > 0.25) add("info", "og:image:width", `The image is ${width}×${height} (${(width / height).toFixed(2)}:1). Large cards are 1.91:1, such as 1200×630, so it will be cropped.`);
  } else if (card.image) add("info", "og:image:width", "Adding og:image:width and og:image:height lets platforms show the image on the first share, before they download it.");

  const title = card.title ?? "";
  if (graphemes(title).length > 88) add("warning", "og:title", `The title is ${graphemes(title).length} characters; cards usually cut it at about 60 to 88.`);
  const description = card.description ?? "";
  if (graphemes(description).length > 200) add("info", "og:description", `The description is ${graphemes(description).length} characters; cards show about the first 150 to 200.`);

  const declared = m.twitter["twitter:card"];
  if (!declared) add("warning", "twitter:card", "No twitter:card: X may show the link without a card. Use summary_large_image for a large image.");
  else if (!["summary", "summary_large_image", "app", "player"].includes(declared)) add("error", "twitter:card", `"${truncate(declared, 40)}" is not a card type. Use summary or summary_large_image.`);
  for (const key of ["twitter:site", "twitter:creator"]) {
    const v = m.twitter[key];
    if (v && !/^@[A-Za-z0-9_]{1,15}$/.test(v)) add("warning", key, `"${truncate(v, 40)}" is not an @handle.`);
  }
  for (const d of m.duplicates) add("warning", d, `${d === "title" ? "<title>" : d} appears more than once; platforms use one of them, usually the first.`);
  if (m.og["og:type"] && !/^[a-z.]+(:[a-z_.]+)?$/.test(m.og["og:type"])) add("info", "og:type", `"${truncate(m.og["og:type"], 40)}" is not a standard og:type such as website or article.`);

  const order = { error: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => order[a.severity] - order[b.severity]);
}

export const SAMPLES: { label: string; html: string }[] = [
  {
    label: "Complete article",
    html: `<!doctype html>
<html lang="en">
<head>
  <title>How we cut our build time in half – Acme Engineering</title>
  <meta name="description" content="Caching, parallel jobs and a smaller Docker image took our CI from 18 to 9 minutes. Here is what worked and what did not.">
  <link rel="canonical" href="https://engineering.acme.example/build-time">
  <meta property="og:type" content="article">
  <meta property="og:title" content="How we cut our build time in half">
  <meta property="og:description" content="Caching, parallel jobs and a smaller Docker image took our CI from 18 to 9 minutes. Here is what worked and what did not.">
  <meta property="og:url" content="https://engineering.acme.example/build-time">
  <meta property="og:site_name" content="Acme Engineering">
  <meta property="og:image" content="https://engineering.acme.example/og/build-time.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Chart of build times dropping from 18 to 9 minutes">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@acme_eng">
</head>
<body><h1>How we cut our build time in half</h1></body>
</html>`,
  },
  {
    label: "Common mistakes",
    html: `<head>
  <title>Pricing | Widgets Inc | The best widgets for teams of every size, from startups to enterprises worldwide</title>
  <meta property="og:title" content="Pricing">
  <meta property="og:title" content="Widgets pricing">
  <meta property="og:image" content="/images/share.svg">
  <meta property="og:url" content="widgets.example/pricing">
  <meta name="twitter:card" content="large">
  <meta name="twitter:site" content="widgets">
</head>`,
  },
  {
    label: "Small summary card",
    html: `<head>
  <title>jane.dev</title>
  <meta name="description" content="Notes on TypeScript, testing and web performance.">
  <meta property="og:title" content="Jane Doe – Software engineer">
  <meta property="og:description" content="Notes on TypeScript, testing and web performance.">
  <meta property="og:url" content="https://jane.example/">
  <meta property="og:image" content="https://jane.example/avatar.jpg">
  <meta property="og:image:width" content="400">
  <meta property="og:image:height" content="400">
  <meta property="og:image:alt" content="Portrait of Jane">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:creator" content="@janedev">
</head>`,
  },
];
