// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { EMPTY_FIELDS, SAMPLE_FIELDS, buildMetaTags, checkFields, type MetaFields } from "@/lib/tools/meta-tags";

const fields = (overrides: Partial<MetaFields>): MetaFields => ({ ...EMPTY_FIELDS, ...overrides });
const parse = (head: string) => new DOMParser().parseFromString(`<!doctype html><head>${head}</head>`, "text/html");
const issueFor = (f: MetaFields, field: keyof MetaFields) => checkFields(f).find((i) => i.field === field);

describe("buildMetaTags", () => {
  it("outputs only the basics for empty fields", () => {
    expect(buildMetaTags(EMPTY_FIELDS)).toBe('<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">');
    expect(buildMetaTags(fields({ basics: false }))).toBe("");
  });

  it("builds the full set for the sample", () => {
    const html = buildMetaTags(SAMPLE_FIELDS);
    expect(html).toContain("<title>Acme Analytics – Privacy-first website analytics</title>");
    expect(html).toContain('<link rel="canonical" href="https://acme.example/">');
    expect(html).toContain('<meta name="theme-color" content="#1f4fe0">');
    expect(html).toContain('<meta property="og:type" content="website">');
    expect(html).toContain('<meta property="og:url" content="https://acme.example/">');
    expect(html).toContain('<meta property="og:site_name" content="Acme Analytics">');
    expect(html).toContain('<meta property="og:locale" content="en_US">');
    expect(html).toContain('<meta property="og:image" content="https://acme.example/og/home.png">');
    expect(html).toContain('<meta property="og:image:alt" content="Acme Analytics dashboard with a traffic chart">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(html).toContain('<meta name="twitter:site" content="@acme">');
    expect(html).not.toContain("robots");
  });

  it("parses as HTML with the values intact", () => {
    const doc = parse(buildMetaTags(SAMPLE_FIELDS));
    expect(doc.title).toBe(SAMPLE_FIELDS.title);
    expect(doc.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(SAMPLE_FIELDS.description);
  });

  it("escapes every value so markup cannot break out", () => {
    const evil = `"><script>alert(1)</script>&'`;
    const html = buildMetaTags(fields({ title: evil, description: evil, siteName: evil, imageAlt: evil, image: "https://x.example/a.png" }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;&amp;&apos;");
    const doc = parse(html);
    expect(doc.querySelectorAll("script")).toHaveLength(0);
    expect(doc.title).toBe(evil);
    expect(doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content")).toBe(evil);
  });

  it("adds robots only when indexing or following is turned off", () => {
    expect(buildMetaTags(fields({ index: false }))).toContain('<meta name="robots" content="noindex, follow">');
    expect(buildMetaTags(fields({ follow: false }))).toContain('<meta name="robots" content="index, nofollow">');
  });

  it("leaves out fields with errors and falls back to a summary card without an image", () => {
    const html = buildMetaTags(fields({ title: "A title that is long enough to pass", canonical: "/relative", image: "not a url", twitterSite: "no-at", themeColor: "blurple" }));
    expect(html).not.toContain("canonical");
    expect(html).not.toContain("og:image");
    expect(html).not.toContain("twitter:site");
    expect(html).not.toContain("theme-color");
    expect(html).toContain('<meta name="twitter:card" content="summary">');
  });

  it("trims values", () => {
    expect(buildMetaTags(fields({ title: "   Spaced title for the page here   " }))).toContain("<title>Spaced title for the page here</title>");
  });
});

describe("checkFields", () => {
  it("passes the sample without issues", () => expect(checkFields(SAMPLE_FIELDS)).toEqual([]));

  it("gives length guidance for titles and descriptions", () => {
    expect(issueFor(fields({}), "title")?.message).toMatch(/needs a title/);
    expect(issueFor(fields({ title: "Short" }), "title")?.message).toMatch(/Short titles/);
    expect(issueFor(fields({ title: "x".repeat(61) }), "title")?.message).toMatch(/truncated/);
    expect(issueFor(fields({ description: "Too short." }), "description")?.severity).toBe("warning");
    expect(issueFor(fields({ description: "x".repeat(161) }), "description")?.message).toMatch(/truncated/);
  });

  it("validates URLs, handles, locale and color", () => {
    expect(issueFor(fields({ canonical: "example.com" }), "canonical")?.severity).toBe("error");
    expect(issueFor(fields({ canonical: "javascript:alert(1)" }), "canonical")?.severity).toBe("error");
    expect(issueFor(fields({ image: "http://x.example/a.png", imageAlt: "a" }), "image")?.severity).toBe("warning");
    expect(issueFor(fields({ image: "https://x.example/a.png" }), "imageAlt")?.severity).toBe("warning");
    expect(issueFor(fields({ twitterCreator: "@way_too_long_handle_x" }), "twitterCreator")?.severity).toBe("error");
    expect(issueFor(fields({ locale: "en-us" }), "locale")?.severity).toBe("warning");
    expect(issueFor(fields({ themeColor: "#zzz" }), "themeColor")?.severity).toBe("error");
    expect(issueFor(fields({ themeColor: "rgb(1 2 3)" }), "themeColor")).toBeUndefined();
    expect(issueFor(fields({ index: false }), "index")?.message).toMatch(/noindex/);
  });

  it("rejects oversized fields", () => {
    expect(issueFor(fields({ description: "x".repeat(2001) }), "description")?.severity).toBe("error");
  });
});
