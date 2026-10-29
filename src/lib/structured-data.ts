import { siteConfig } from "@/config/site";
import { absoluteUrl } from "@/lib/metadata";
import type { ToolDefinition, ToolPageContent } from "@/types/tool";
import type { TutorialDefinition } from "@/types/tutorial";

/**
 * schema.org JSON-LD for the pages that have something to describe. Only facts
 * the page itself shows are used: no ratings, reviews, prices, authors, dates
 * or organization details. Each page renders at most one JSON-LD script, with
 * several entities combined in a @graph.
 */

type Node = Record<string, unknown>;

const plain = (text: string) => text.replace(/`/g, "");

const websiteRef = () => ({ "@type": "WebSite", name: siteConfig.name, url: absoluteUrl("/") });

export function websiteSchema(): Node {
  return { ...websiteRef(), description: siteConfig.description, inLanguage: "en" };
}

/** A tool page: a free web application that runs in the browser. */
export function toolSchema(tool: ToolDefinition, content: ToolPageContent, path: string): Node {
  return {
    "@type": "WebApplication",
    name: tool.name,
    description: content.metaDescription,
    url: absoluteUrl(path),
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    inLanguage: "en",
    isPartOf: websiteRef(),
  };
}

/** Mirrors the questions and answers shown on the page. */
export function faqSchema(faqs: ToolPageContent["faqs"]): Node {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: plain(faq.question),
      acceptedAnswer: { "@type": "Answer", text: plain(faq.answer) },
    })),
  };
}

export function tutorialSchema(tutorial: TutorialDefinition, path: string, tools: { name: string; path: string }[]): Node {
  return {
    "@type": "TechArticle",
    headline: tutorial.title,
    description: tutorial.metaDescription,
    url: absoluteUrl(path),
    mainEntityOfPage: absoluteUrl(path),
    inLanguage: "en",
    isAccessibleForFree: true,
    isPartOf: websiteRef(),
    about: tools.map((tool) => ({ "@type": "WebApplication", name: tool.name, url: absoluteUrl(tool.path) })),
  };
}

/** Wraps one or more entities in a single JSON-LD document. */
export function jsonLdDocument(...nodes: Node[]): Node {
  return nodes.length === 1
    ? { "@context": "https://schema.org", ...nodes[0] }
    : { "@context": "https://schema.org", "@graph": nodes };
}
