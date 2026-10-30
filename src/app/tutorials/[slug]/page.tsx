import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentSection, ExampleBlock } from "@/components/content/ContentSection";
import { RichText } from "@/components/content/RichText";
import { PageHeader } from "@/components/layout/PageHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { ToolIcon } from "@/components/tools/ToolIcon";
import { requireTool } from "@/components/tools/ToolPage";
import { buttonClassName } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { toolPath } from "@/content/tools";
import { getTutorialBySlug, tutorialPath, tutorials } from "@/content/tutorials";
import { pageMetadata } from "@/lib/metadata";
import { jsonLdDocument, tutorialSchema } from "@/lib/structured-data";

// Only tutorials in the registry get a page; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return tutorials.map((tutorial) => ({ slug: tutorial.slug }));
}

export async function generateMetadata({ params }: PageProps<"/tutorials/[slug]">): Promise<Metadata> {
  const tutorial = getTutorialBySlug((await params).slug);
  if (!tutorial) return {};
  return pageMetadata({ title: tutorial.title, description: tutorial.metaDescription, path: tutorialPath(tutorial.slug), type: "article" });
}

export default async function TutorialPage({ params }: PageProps<"/tutorials/[slug]">) {
  const tutorial = getTutorialBySlug((await params).slug);
  if (!tutorial) notFound();

  const tools = tutorial.tools.map(requireTool);
  const main = tools[0];
  const others = tutorials.filter((t) => t.slug !== tutorial.slug);

  return (
    <Container size="default" className="flex flex-col gap-8 py-10 sm:py-14">
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow={<Link href="/tutorials">Tutorials</Link>} title={tutorial.title} description={tutorial.description} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href={toolPath(main.slug)} className={buttonClassName({ variant: "primary" })}>
            Open the {main.name}
          </Link>
          <p className="text-sm text-muted-foreground">Free to use, no signup required.</p>
        </div>
      </div>

      <div className="grid gap-10 border-t border-border pt-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex max-w-3xl min-w-0 flex-col gap-10">
          <section aria-label="Introduction" className="flex flex-col gap-4 leading-relaxed text-muted-foreground">
            {tutorial.intro.map((paragraph) => (
              <p key={paragraph}>
                <RichText text={paragraph} />
              </p>
            ))}
          </section>

          <ContentSection id="steps" title="Steps">
            <ol className="flex flex-col">
              {tutorial.steps.map((step, index) => (
                <li key={step.title} className="flex flex-col gap-2 border-t border-border py-5">
                  <span className="font-mono text-xs text-accent">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="font-semibold tracking-tight text-foreground">{step.title}</h3>
                  {step.body.map((paragraph) => (
                    <p key={paragraph}>
                      <RichText text={paragraph} />
                    </p>
                  ))}
                  {step.tool ? (
                    <p className="text-sm">
                      <Link href={toolPath(step.tool)}>Open the {requireTool(step.tool).name}</Link>
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </ContentSection>

          <ContentSection id="example" title="Worked example">
            <p>
              <RichText text={tutorial.example.description} />
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ExampleBlock label={tutorial.example.inputLabel ?? "Input"} code={tutorial.example.input} />
              <ExampleBlock label={tutorial.example.outputLabel ?? "Output"} code={tutorial.example.output} />
            </div>
          </ContentSection>

          <ContentSection id="mistakes" title="Common mistakes">
            <ul className="flex flex-col gap-4">
              {tutorial.mistakes.map((mistake) => (
                <li key={mistake.title} className="flex flex-col gap-1">
                  <h3 className="font-semibold text-foreground">
                    <RichText text={mistake.title} />
                  </h3>
                  <p>
                    <RichText text={mistake.body} />
                  </p>
                </li>
              ))}
            </ul>
          </ContentSection>
        </div>

        <aside aria-labelledby="tools-heading" className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
          <h2 id="tools-heading" className="font-semibold tracking-tight">
            Tools in this tutorial
          </h2>
          <ul className="flex flex-col gap-1">
            {tools.map((tool) => (
              <li key={tool.slug}>
                <Link
                  href={toolPath(tool.slug)}
                  className="group flex items-center gap-3 rounded-sm py-1.5 text-sm text-foreground no-underline hover:no-underline"
                >
                  <ToolIcon name={tool.icon} size={26} />
                  <span className="group-hover:text-accent group-hover:underline">{tool.name}</span>
                </Link>
              </li>
            ))}
          </ul>
          {others.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <h2 className="font-semibold tracking-tight">More tutorials</h2>
              <ul className="flex flex-col gap-1.5 text-sm">
                {others.map((other) => (
                  <li key={other.slug}>
                    <Link href={tutorialPath(other.slug)}>{other.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      <JsonLd
        data={jsonLdDocument(
          tutorialSchema(tutorial, tutorialPath(tutorial.slug), tools.map((tool) => ({ name: tool.name, path: toolPath(tool.slug) }))),
        )}
      />
    </Container>
  );
}
