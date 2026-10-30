import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ContentSection, ExampleBlock } from "@/components/content/ContentSection";
import { RichText } from "@/components/content/RichText";
import { JsonLd } from "@/components/seo/JsonLd";
import { ToolIcon } from "@/components/tools/ToolIcon";
import { Container } from "@/components/ui/Container";
import { FreeAccessNote, FreeBadge } from "@/components/ui/FreeAccess";
import { categoryPath, getCategoryBySlug } from "@/content/categories";
import { getToolBySlug, toolPath, tools } from "@/content/tools";
import { tutorialPath, tutorialsForTool } from "@/content/tutorials";
import { pageMetadata, withFreeNote } from "@/lib/metadata";
import { faqSchema, jsonLdDocument, toolSchema } from "@/lib/structured-data";
import type { ToolDefinition, ToolPageContent } from "@/types/tool";

/** Looks up a tool by slug, failing the build if the slug is wrong. */
export function requireTool(slug: string): ToolDefinition {
  const tool = getToolBySlug(slug);
  if (!tool) throw new Error(`Unknown tool slug: ${slug}`);
  return tool;
}

/** The meta description, with the free-access note where it fits. The structured data repeats it. */
const toolDescription = (content: ToolPageContent) => withFreeNote(content.metaDescription);

export function toolMetadata(slug: string, content: ToolPageContent): Metadata {
  const tool = requireTool(slug);
  return pageMetadata({
    title: tool.name,
    description: toolDescription(content),
    path: toolPath(slug),
    // Shared links have room for the note on every tool.
    socialDescription: withFreeNote(content.metaDescription, Infinity),
  });
}

function relatedTools(tool: ToolDefinition, content: ToolPageContent): ToolDefinition[] {
  const available = tools.filter((t) => t.status === "available" && t.slug !== tool.slug);
  if (content.related) {
    return content.related.map((slug) => available.find((t) => t.slug === slug)).filter((t) => t !== undefined);
  }
  const sameCategory = available.filter((t) => t.category === tool.category);
  return [...sameCategory, ...available.filter((t) => t.category !== tool.category)].slice(0, 4);
}

type ToolPageProps = {
  slug: string;
  content: ToolPageContent;
  /** The interactive tool. */
  children: ReactNode;
};

export function ToolPage({ slug, content, children }: ToolPageProps) {
  const tool = requireTool(slug);
  const category = getCategoryBySlug(tool.category);
  const related = relatedTools(tool, content);
  const guides = tutorialsForTool(slug);
  // The tool itself, plus FAQ structured data that mirrors the questions shown on the page.
  const structuredData = jsonLdDocument(
    toolSchema(tool, { ...content, metaDescription: toolDescription(content) }, toolPath(slug)),
    faqSchema(content.faqs),
  );

  return (
    <Container size="wide" className="flex flex-col gap-5 py-5 sm:gap-6 sm:py-8">
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="sm:hidden">
          <ToolIcon name={tool.icon} size={36} />
        </span>
        <span className="hidden sm:block">
          <ToolIcon name={tool.icon} size={48} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          {/* The badge stays outside the h1, so the heading is exactly the tool name. */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h1 className="text-xl leading-tight font-semibold tracking-[-0.02em] sm:text-3xl">{tool.name}</h1>
            <FreeBadge />
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">{tool.description}</p>
          <FreeAccessNote className="mt-1">
            <span className="font-medium text-foreground">No signup required.</span> Use this tool instantly — no
            account or payment required.
          </FreeAccessNote>
        </div>
      </div>

      <section aria-label={tool.name}>{children}</section>

      <div className="mt-2 grid gap-10 border-t border-border pt-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex max-w-3xl min-w-0 flex-col gap-10">
          <ContentSection id="how-it-works" title="How it works">
            {content.howItWorks.map((paragraph) => (
              <p key={paragraph}>
                <RichText text={paragraph} />
              </p>
            ))}
            {content.notes?.length ? (
              <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground">
                {content.notes.map((note) => (
                  <li key={note}>
                    <RichText text={note} />
                  </li>
                ))}
              </ul>
            ) : null}
          </ContentSection>

          <ContentSection id="example" title="Example">
            <p>
              <RichText text={content.example.description} />
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ExampleBlock label={content.example.inputLabel ?? "Input"} code={content.example.input} />
              <ExampleBlock label={content.example.outputLabel ?? "Output"} code={content.example.output} />
            </div>
          </ContentSection>

          <ContentSection id="faq" title="Frequently asked questions">
            {/* Answers are collapsed but stay in the page, so the FAQ structured data matches visible content. */}
            <div className="flex flex-col">
              {content.faqs.map((faq) => (
                <details key={faq.question} className="group border-t border-border last:border-b">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-3.5 marker:hidden [&::-webkit-details-marker]:hidden">
                    <h3 className="font-semibold text-foreground">
                      <RichText text={faq.question} />
                    </h3>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className="mt-1 shrink-0 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </summary>
                  <p className="pb-4">
                    <RichText text={faq.answer} />
                  </p>
                </details>
              ))}
            </div>
          </ContentSection>
        </div>

        <aside aria-labelledby="related-heading" className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
          <h2 id="related-heading" className="font-semibold tracking-tight">
            Related tools
          </h2>
          {related.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={toolPath(item.slug)}
                    className="group flex items-center gap-3 rounded-sm py-1.5 text-sm text-foreground no-underline hover:no-underline"
                  >
                    <ToolIcon name={item.icon} size={26} />
                    <span className="group-hover:text-accent group-hover:underline">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {guides.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <h2 className="font-semibold tracking-tight">Tutorials</h2>
              <ul className="flex flex-col gap-1.5 text-sm">
                {guides.map((guide) => (
                  <li key={guide.slug}>
                    <Link href={tutorialPath(guide.slug)}>{guide.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5 border-t border-border pt-4 text-sm">
            {category ? <Link href={categoryPath(category.slug)}>Browse {category.name}</Link> : null}
            <Link href="/tools">Browse all tools</Link>
          </div>
        </aside>
      </div>

      <JsonLd data={structuredData} />
    </Container>
  );
}
