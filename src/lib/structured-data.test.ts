import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { getToolBySlug, toolPath } from "@/content/tools";
import { tutorialPath, tutorials } from "@/content/tutorials";
import { absoluteUrl } from "@/lib/metadata";
import { faqSchema, jsonLdDocument, toolSchema, tutorialSchema, websiteSchema } from "@/lib/structured-data";
import type { ToolPageContent } from "@/types/tool";

const content: ToolPageContent = {
  metaDescription: "Format, validate and minify JSON.",
  howItWorks: [],
  example: { description: "", input: "", output: "" },
  faqs: [{ question: "Is `JSON.parse` used?", answer: "No, a strict `RFC 8259` parser." }],
};

/** Every key anywhere in the document. */
const keys = (value: unknown): string[] =>
  Array.isArray(value) ? value.flatMap(keys) : value && typeof value === "object" ? Object.entries(value).flatMap(([k, v]) => [k, ...keys(v)]) : [];

describe("structured data", () => {
  it("builds absolute URLs from the configured origin", () => {
    expect(absoluteUrl("/")).toBe(siteConfig.url);
    expect(absoluteUrl("/tools/json-formatter")).toBe(`${siteConfig.url}/tools/json-formatter`);
  });

  it("describes the website", () => {
    expect(jsonLdDocument(websiteSchema())).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
      description: siteConfig.description,
      inLanguage: "en",
    });
  });

  it("describes a tool from its registry entry and page content, with FAQs in one graph", () => {
    const tool = getToolBySlug("json-formatter")!;
    const doc = jsonLdDocument(toolSchema(tool, content, toolPath(tool.slug)), faqSchema(content.faqs)) as { "@context": string; "@graph": Record<string, unknown>[] };
    expect(doc["@context"]).toBe("https://schema.org");
    const [app, faq] = doc["@graph"];
    expect(app).toMatchObject({
      "@type": "WebApplication",
      name: "JSON Formatter & Validator",
      description: content.metaDescription,
      url: `${siteConfig.url}/tools/json-formatter`,
      applicationCategory: "DeveloperApplication",
      isAccessibleForFree: true,
    });
    // Backticks are content markup, not text.
    expect(faq).toEqual({
      "@type": "FAQPage",
      mainEntity: [{ "@type": "Question", name: "Is JSON.parse used?", acceptedAnswer: { "@type": "Answer", text: "No, a strict RFC 8259 parser." } }],
    });
  });

  it("describes a tutorial as a TechArticle about its tools", () => {
    const tutorial = tutorials[0];
    const tools = tutorial.tools.map((slug) => ({ name: getToolBySlug(slug)!.name, path: toolPath(slug) }));
    const article = tutorialSchema(tutorial, tutorialPath(tutorial.slug), tools);
    expect(article).toMatchObject({
      "@type": "TechArticle",
      headline: tutorial.title,
      description: tutorial.metaDescription,
      url: `${siteConfig.url}/tutorials/${tutorial.slug}`,
      mainEntityOfPage: `${siteConfig.url}/tutorials/${tutorial.slug}`,
    });
    expect(article.about).toHaveLength(tutorial.tools.length);
  });

  it("never claims ratings, reviews, prices, authors, dates or an organization", () => {
    const tool = getToolBySlug("json-formatter")!;
    const all = [websiteSchema(), toolSchema(tool, content, "/tools/json-formatter"), tutorialSchema(tutorials[0], "/tutorials/x", [])];
    const forbidden = ["aggregateRating", "review", "offers", "price", "author", "publisher", "datePublished", "dateModified", "creator", "provider"];
    for (const key of keys(all)) expect(forbidden, key).not.toContain(key);
  });
});
