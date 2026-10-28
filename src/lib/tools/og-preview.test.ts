// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildMetaTags, SAMPLE_FIELDS } from "@/lib/tools/meta-tags";
import { SAMPLES, checkMetadata, extractMetadata, hostOf, isHttpUrl, openGraphCard, truncate, twitterCard } from "@/lib/tools/og-preview";

const parse = (html: string) => extractMetadata(html, window);
const fields = (html: string) => checkMetadata(parse(html)).map((i) => `${i.severity} ${i.field}`);

describe("extractMetadata", () => {
  it("reads title, description, canonical, og: and twitter: tags", () => {
    const m = parse(SAMPLES[0].html);
    expect(m.title).toBe("How we cut our build time in half – Acme Engineering");
    expect(m.description).toMatch(/^Caching, parallel jobs/);
    expect(m.canonical).toBe("https://engineering.acme.example/build-time");
    expect(m.og["og:image:width"]).toBe("1200");
    expect(m.twitter["twitter:card"]).toBe("summary_large_image");
    expect(m.duplicates).toEqual([]);
  });

  it("accepts name= or property= for either prefix, case-insensitively, and collapses whitespace", () => {
    const m = parse(`<meta name="OG:Title" content="  A\n   title "><meta property="twitter:card" content="summary">`);
    expect(m.og["og:title"]).toBe("A title");
    expect(m.twitter["twitter:card"]).toBe("summary");
  });

  it("keeps the first of duplicate tags and reports them", () => {
    const m = parse(SAMPLES[1].html);
    expect(m.og["og:title"]).toBe("Pricing");
    expect(m.duplicates).toContain("og:title");
    expect(parse("<title>a</title><title>b</title>").duplicates).toContain("title");
  });

  it("handles malformed HTML, empty content and unrelated tags", () => {
    const m = parse(`<head><meta property="og:title" content=""><meta property="og:description" content="Unclosed <div><p>text<meta name="viewport" content="x"><title>T`);
    expect(m.og["og:title"]).toBeUndefined();
    expect(m.og["og:description"]).toBe("Unclosed <div><p>text<meta name=");
    expect(parse("").title).toBeNull();
    expect(parse("not html at all").og).toEqual({});
  });

  it("never runs scripts or event handlers in the parsed document", () => {
    (window as unknown as { pwned?: boolean }).pwned = false;
    parse(`<script>window.pwned = true</script><img src="x" onerror="window.pwned = true"><meta property="og:title" content="ok">`);
    expect((window as unknown as { pwned?: boolean }).pwned).toBe(false);
  });

  it("reads the Meta Tag Generator's output", () => {
    const m = parse(buildMetaTags(SAMPLE_FIELDS));
    expect(m.og["og:title"]).toBe(SAMPLE_FIELDS.title);
    expect(m.og["og:image:alt"]).toBe(SAMPLE_FIELDS.imageAlt);
    expect(m.twitter["twitter:site"]).toBe("@acme");
  });
});

describe("cards", () => {
  it("falls back from Open Graph to the page's own title and description", () => {
    const card = openGraphCard(parse(`<title>Page</title><meta name="description" content="Desc"><link rel="canonical" href="https://www.example.com/a">`));
    expect(card).toMatchObject({ title: "Page", description: "Desc", image: null, url: "https://www.example.com/a", domain: "example.com" });
  });

  it("prefers twitter: tags on X and defaults to the large card", () => {
    const m = parse(`<meta property="og:title" content="OG"><meta name="twitter:title" content="TW"><meta property="og:image" content="https://a.example/i.png">`);
    expect(twitterCard(m)).toMatchObject({ title: "TW", image: "https://a.example/i.png", type: "summary_large_image" });
    expect(twitterCard(parse(SAMPLES[2].html)).type).toBe("summary");
  });

  it("prefers og:image:secure_url", () => {
    expect(openGraphCard(parse(`<meta property="og:image" content="http://a.example/i.png"><meta property="og:image:secure_url" content="https://a.example/i.png">`)).image).toBe("https://a.example/i.png");
  });
});

describe("checkMetadata", () => {
  it("finds no errors or warnings in the complete sample", () => {
    expect(checkMetadata(parse(SAMPLES[0].html)).filter((i) => i.severity !== "info")).toEqual([]);
  });

  it("flags the common mistakes", () => {
    const f = fields(SAMPLES[1].html);
    expect(f).toEqual(
      expect.arrayContaining(["error og:url", "error og:image", "error twitter:card", "warning twitter:site", "warning og:title", "warning og:description"]),
    );
    const messages = checkMetadata(parse(SAMPLES[1].html)).map((i) => i.message).join("\n");
    expect(messages).toContain("not an absolute URL");
    expect(messages).toContain("appears more than once");
    // Errors first.
    expect(f[0]).toMatch(/^error/);
  });

  it("explains missing metadata", () => {
    expect(fields("")).toEqual(expect.arrayContaining(["error og:title", "warning og:description", "warning og:url", "warning og:image", "warning twitter:card"]));
  });

  it("checks image URL scheme, format and size", () => {
    expect(fields('<meta property="og:image" content="http://a.example/i.png">')).toContain("warning og:image");
    expect(fields('<meta property="og:image" content="https://a.example/i.svg?v=2">')).toContain("error og:image");
    expect(fields('<meta property="og:image" content="https://a.example/i.png"><meta property="og:image:width" content="100"><meta property="og:image:height" content="100">')).toContain("warning og:image:width");
    expect(checkMetadata(parse('<meta property="og:image" content="https://a.example/i.png"><meta property="og:image:width" content="800"><meta property="og:image:height" content="800">')).find((i) => i.field === "og:image:width")?.message).toContain("cropped");
  });

  it("warns about long titles and descriptions", () => {
    expect(fields(`<meta property="og:title" content="${"x".repeat(100)}">`)).toContain("warning og:title");
    expect(fields(`<meta property="og:description" content="${"x".repeat(250)}">`)).toContain("info og:description");
  });
});

describe("helpers", () => {
  it("validates URLs and extracts hosts", () => {
    expect(isHttpUrl("https://a.example/x")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("/relative")).toBe(false);
    expect(isHttpUrl(null)).toBe(false);
    expect(hostOf("https://www.Example.com/x")).toBe("example.com");
    expect(hostOf("nope")).toBeNull();
  });

  it("truncates by user-perceived characters", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("hello world", 6)).toBe("hello…");
    expect(truncate("👩🏽‍💻👩🏽‍💻👩🏽‍💻", 2)).toBe("👩🏽‍💻…");
  });
});
