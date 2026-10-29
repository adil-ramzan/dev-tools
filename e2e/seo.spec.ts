import { expect, test, type APIRequestContext } from "@playwright/test";
import { PRODUCTION_SITE_URL } from "../src/config/site";
import { categories } from "../src/content/categories";
import { availableTools } from "../src/content/tools";
import { tutorials } from "../src/content/tutorials";

// SEO checks on the production build in out/: what crawlers actually receive.

/** The origin the build was made for: NEXT_PUBLIC_SITE_URL, or the production default. */
const expectedOrigin = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || PRODUCTION_SITE_URL).replace(/\/+$/, "");

const LOCAL_URL = /https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/i;

const expectedPaths = [
  "/",
  "/tools",
  ...categories.map((c) => `/categories/${c.slug}`),
  ...availableTools.map((t) => `/tools/${t.slug}`),
  "/tutorials",
  ...tutorials.map((t) => `/tutorials/${t.slug}`),
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms",
];

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#x27;": "'", "&#39;": "'" };

/** Decodes the references React writes in attributes and text, in one pass so "&amp;lt;" stays "&lt;". */
const decode = (text: string) => text.replace(/&(?:amp|lt|gt|quot|#x27|#39);/g, (ref) => ENTITIES[ref]);

/** The head and structure of a page, read from its HTML as served. */
function readPage(html: string) {
  const all = (re: RegExp) => [...html.matchAll(re)].map((m) => decode(m[1]));
  return {
    titles: all(/<title>([^<]*)<\/title>/g),
    descriptions: all(/<meta name="description" content="([^"]*)"/g),
    canonicals: all(/<link rel="canonical" href="([^"]*)"/g),
    ogUrls: all(/<meta property="og:url" content="([^"]*)"/g),
    ogTitles: all(/<meta property="og:title" content="([^"]*)"/g),
    ogTypes: all(/<meta property="og:type" content="([^"]*)"/g),
    robots: all(/<meta name="robots" content="([^"]*)"/g),
    jsonLd: [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]),
    h1s: all(/<h1[^>]*>([\s\S]*?)<\/h1>/g).map((h) => h.replace(/<[^>]+>/g, "")),
    lang: all(/<html lang="([^"]*)"/g),
  };
}

async function sitemapUrls(request: APIRequestContext) {
  const xml = await (await request.get("/sitemap.xml")).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

/** The path a sitemap or canonical URL points to on the local server. */
const pathOf = (url: string) => new URL(url).pathname;

/** Canonical form of a route: no trailing slash, so the homepage is the bare origin. */
const canonicalFor = (path: string) => (path === "/" ? expectedOrigin : `${expectedOrigin}${path}`);

test("the production origin is public HTTPS, never localhost", () => {
  const url = new URL(expectedOrigin);
  expect(url.protocol).toBe("https:");
  expect(url.hostname).not.toMatch(/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/);
});

test("robots.txt allows crawling and points to the sitemap on the production origin", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).not.toMatch(LOCAL_URL);
  expect(robots).toMatch(/^User-Agent: \*$/m);
  expect(robots).toMatch(/^Allow: \/$/m);
  expect(robots).not.toMatch(/^Disallow:/m);
  expect(robots.match(/^Sitemap: (.+)$/m)?.[1]).toBe(`${expectedOrigin}/sitemap.xml`);
});

test("the sitemap lists exactly the indexable routes, once each, as absolute HTTPS URLs", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).not.toMatch(LOCAL_URL);
  const urls = await sitemapUrls(request);
  expect(new Set(urls).size, "unique entries").toBe(urls.length);
  for (const url of urls) {
    expect(url === expectedOrigin || url.startsWith(`${expectedOrigin}/`), url).toBe(true);
    expect(url.endsWith("/"), `${url}: no trailing slash`).toBe(false);
  }
  expect(urls.map(pathOf).sort()).toEqual([...expectedPaths].sort());
  expect(urls.sort()).toEqual(expectedPaths.map(canonicalFor).sort());
});

test("every indexable page has one unique title, description and canonical, and matching Open Graph tags", async ({ request }) => {
  test.setTimeout(120_000);
  const seenTitles = new Map<string, string>();
  const seenDescriptions = new Map<string, string>();
  for (const path of expectedPaths) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const html = await response.text();
    // Example content may mention a host named localhost; URLs pointing there must never appear.
    expect(html, `${path}: no localhost URLs`).not.toMatch(LOCAL_URL);
    const page = readPage(html);

    expect(page.lang, path).toEqual(["en"]);
    expect(page.h1s, `${path}: one h1`).toHaveLength(1);
    expect(page.titles, `${path}: one title`).toHaveLength(1);
    expect(page.descriptions, `${path}: one description`).toHaveLength(1);
    expect(page.canonicals, `${path}: one canonical`).toEqual([canonicalFor(path)]);
    expect(page.ogUrls, `${path}: og:url`).toEqual([canonicalFor(path)]);
    expect(page.ogTitles, `${path}: og:title`).toHaveLength(1);
    expect(page.ogTypes, `${path}: og:type`).toEqual([path.startsWith("/tutorials/") ? "article" : "website"]);
    expect(page.robots.join(), `${path}: indexable`).not.toContain("noindex");

    const [title] = page.titles;
    const [description] = page.descriptions;
    expect(title.length, `${path}: title length`).toBeLessThanOrEqual(70);
    expect(description.length, `${path}: description length`).toBeGreaterThanOrEqual(70);
    expect(description.length, `${path}: description length`).toBeLessThanOrEqual(170);
    expect(seenTitles.get(title), `${path}: title "${title}" is unique`).toBeUndefined();
    expect(seenDescriptions.get(description), `${path}: description is unique`).toBeUndefined();
    seenTitles.set(title, path);
    seenDescriptions.set(description, path);
  }
});

test("tool titles and descriptions come from the registry and page content", async ({ request }) => {
  for (const tool of availableTools) {
    const page = readPage(await (await request.get(`/tools/${tool.slug}`)).text());
    expect(page.titles[0]).toBe(`${tool.name} · Developer Tools`);
    expect(page.h1s[0]).toBe(tool.name);
  }
  for (const tutorial of tutorials) {
    const page = readPage(await (await request.get(`/tutorials/${tutorial.slug}`)).text());
    expect(page.titles[0]).toBe(`${tutorial.title} · Developer Tools`);
    expect(page.descriptions[0]).toBe(tutorial.metaDescription);
  }
});

type JsonLdNode = Record<string, unknown> & { "@type": string };

/** Parses the page's JSON-LD and returns its entities, failing on invalid JSON or a missing context. */
function entities(scripts: string[], path: string): JsonLdNode[] {
  expect(scripts.length, `${path}: at most one JSON-LD script`).toBeLessThanOrEqual(1);
  if (!scripts.length) return [];
  // "<" is escaped so the content can never close the script element.
  expect(scripts[0], path).not.toContain("<");
  const doc = JSON.parse(scripts[0]);
  expect(doc["@context"], path).toBe("https://schema.org");
  return doc["@graph"] ?? [doc];
}

/** Every URL anywhere in the JSON-LD. */
const urlsIn = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.flatMap(urlsIn)
    : value && typeof value === "object"
      ? Object.entries(value).flatMap(([key, v]) => (key === "@context" ? [] : urlsIn(v)))
      : typeof value === "string" && /^https?:\/\//.test(value)
        ? [value]
        : [];

test("structured data is valid, matches the visible page and claims nothing invented", async ({ request }) => {
  test.setTimeout(120_000);
  for (const path of expectedPaths) {
    const html = await (await request.get(path)).text();
    const page = readPage(html);
    const nodes = entities(page.jsonLd, path);
    const types = nodes.map((n) => n["@type"]);

    // Only the site's own URLs and the schema.org context appear.
    for (const url of urlsIn(nodes)) expect(url === expectedOrigin || url.startsWith(`${expectedOrigin}/`), `${path}: ${url}`).toBe(true);
    for (const forbidden of ["aggregateRating", "review", "offers", "author", "publisher", "datePublished", "Organization"]) {
      expect(page.jsonLd.join(""), `${path}: ${forbidden}`).not.toContain(`"${forbidden}"`);
    }

    if (path === "/") {
      expect(types).toEqual(["WebSite"]);
      expect(nodes[0]).toMatchObject({ name: "Developer Tools", url: expectedOrigin });
    } else if (path.startsWith("/tools/")) {
      expect(types, path).toEqual(["WebApplication", "FAQPage"]);
      const [app, faq] = nodes;
      expect(app.name, path).toBe(page.h1s[0]);
      expect(app.url, path).toBe(canonicalFor(path));
      expect(app.description, path).toBe(page.descriptions[0]);
      expect(app.applicationCategory, path).toBe("DeveloperApplication");
      // The FAQ data mirrors the questions in the page, no more and no fewer.
      const questions = [...html.matchAll(/<summary[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => decode(m[1].replace(/<[^>]+>/g, "")));
      const mainEntity = faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
      expect(mainEntity.map((q) => q.name), path).toEqual(questions);
      for (const q of mainEntity) expect(q.acceptedAnswer.text.length, path).toBeGreaterThan(0);
    } else if (path.startsWith("/tutorials/")) {
      expect(types, path).toEqual(["TechArticle"]);
      const [article] = nodes;
      expect(article.headline, path).toBe(page.h1s[0]);
      expect(article.url, path).toBe(canonicalFor(path));
      expect(article.mainEntityOfPage, path).toBe(canonicalFor(path));
      const tutorial = tutorials.find((t) => path.endsWith(`/${t.slug}`))!;
      expect((article.about as { url: string }[]).map((a) => pathOf(a.url)), path).toEqual(tutorial.tools.map((slug) => `/tools/${slug}`));
    } else {
      expect(types, `${path}: no structured data`).toEqual([]);
    }
  }
});

test("unknown tools, categories and tutorials return a noindex 404 without a canonical", async ({ request }) => {
  for (const path of ["/tools/not-a-tool", "/categories/not-a-category", "/tutorials/not-a-tutorial", "/no-such-page"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    const page = readPage(await response.text());
    expect(page.robots, path).toEqual(["noindex"]);
    expect(page.canonicals, path).toEqual([]);
    expect(page.jsonLd, path).toEqual([]);
  }
});

test("CSS, JavaScript and fonts are served and not blocked for crawlers", async ({ request }) => {
  const html = await (await request.get("/")).text();
  const assets = [...html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+\.(?:css|js|woff2))"/g)].map((m) => m[1]);
  expect(assets.length).toBeGreaterThan(0);
  for (const asset of new Set(assets)) expect((await request.get(asset)).status(), asset).toBe(200);
});
