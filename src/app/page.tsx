import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { ToolDirectory } from "@/components/tools/ToolDirectory";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/config/site";
import { categories } from "@/content/categories";
import { tools } from "@/content/tools";
import { pageMetadata } from "@/lib/metadata";
import { jsonLdDocument, websiteSchema } from "@/lib/structured-data";

export const metadata: Metadata = pageMetadata({
  title: `${siteConfig.name}: Free Online Utilities for Code and Data`,
  description: siteConfig.description,
  path: "/",
  absoluteTitle: true,
});

// Only claims the site can stand behind today.
const benefits = [
  {
    title: "Open and use",
    body: "Every tool is free. There is no account to create and nothing to install.",
  },
  {
    title: "One task per page",
    body: "Each tool has a focused page with only the controls that job needs.",
  },
  {
    title: "Links that last",
    body: "Every tool has a permanent, readable URL you can bookmark or share with your team.",
  },
  {
    title: "Comfortable anywhere",
    body: "Layouts adapt to phone, tablet and desktop, in light or dark mode, and work with a keyboard.",
  },
];

export default function HomePage() {
  return (
    <>
      <section aria-labelledby="hero-heading" className="border-b border-border">
        {/* Compact hero: one-line headline and short subtitle, so the tool grid starts above the fold. */}
        <Container size="wide" className="flex flex-col gap-6 pt-10 pb-12 sm:pt-12 sm:pb-14">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-center">
            <h1
              id="hero-heading"
              className="text-3xl leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-5xl"
            >
              The essential tools for better code
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
              All {tools.length} tools are free to use, with no account required. Format, inspect, convert and
              generate code and data with simple online utilities.
            </p>
          </div>

          <ToolDirectory tools={tools} categories={categories} variant="hero" headingLevel="h2" />
        </Container>
      </section>

      <section aria-labelledby="workflow-heading">
        <Container size="wide" className="flex flex-col gap-8 py-12 sm:py-14">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Why use it</p>
            <h2 id="workflow-heading" className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              Designed for a simple workflow
            </h2>
          </div>
          <ol className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit, index) => (
              <li key={benefit.title} className="flex flex-col gap-2 border-t border-border py-5">
                <span className="font-mono text-xs text-accent">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="font-semibold tracking-tight">{benefit.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{benefit.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <JsonLd data={jsonLdDocument(websiteSchema())} />
    </>
  );
}
