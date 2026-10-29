import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { ToolIcon } from "@/components/tools/ToolIcon";
import { requireTool } from "@/components/tools/ToolPage";
import { Container } from "@/components/ui/Container";
import { toolPath } from "@/content/tools";
import { tutorialPath, tutorials } from "@/content/tutorials";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Developer Tutorials",
  description:
    "Step-by-step guides for everyday developer tasks: subnetting, inspecting HTTP headers, generating secure passwords, HTML entities and JSON validation.",
  path: "/tutorials",
});

export default function TutorialsPage() {
  return (
    <Container size="default" className="flex flex-col gap-10 py-10 sm:py-14">
      <PageHeader
        title="Tutorials"
        description="Practical guides to common development tasks, with worked examples, common mistakes and the tools to do the job."
      />

      <ul aria-label="Tutorials" className="flex flex-col">
        {tutorials.map((tutorial) => {
          const main = requireTool(tutorial.tools[0]);
          return (
            <li key={tutorial.slug} className="flex gap-4 border-t border-border py-6 last:border-b">
              <span className="hidden sm:block">
                <ToolIcon name={main.icon} size={40} />
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  <Link href={tutorialPath(tutorial.slug)} className="text-foreground hover:text-accent">
                    {tutorial.title}
                  </Link>
                </h2>
                <p className="text-muted-foreground">{tutorial.description}</p>
                <p className="text-sm text-muted-foreground">
                  Uses{" "}
                  {tutorial.tools.map((slug, i) => (
                    <span key={slug}>
                      {i > 0 ? ", " : null}
                      <Link href={toolPath(slug)}>{requireTool(slug).name}</Link>
                    </span>
                  ))}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
