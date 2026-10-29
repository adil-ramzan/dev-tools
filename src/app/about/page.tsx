import type { Metadata } from "next";
import Link from "next/link";
import { ContentSection } from "@/components/content/ContentSection";
import { PageHeader } from "@/components/layout/PageHeader";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/config/site";
import { categories, categoryPath, toolsInCategory } from "@/content/categories";
import { availableTools } from "@/content/tools";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description: `What ${siteConfig.name} is, which developer tools it offers, who they are for, and how the tools process your input in your browser.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <Container size="prose" className="flex flex-col gap-10 py-10 sm:py-14">
      <PageHeader
        title={`About ${siteConfig.name}`}
        description="A collection of small, focused utilities for everyday development work, free to use in the browser."
      />

      <ContentSection id="purpose" title="What this site is for">
        <p>
          Development is full of small tasks that interrupt real work: pretty-printing an API response, decoding a token to
          see why a request fails, working out a subnet, converting a timestamp or generating a test password. Each of
          the {availableTools.length} tools here does one of those jobs on its own page, with the controls that job needs
          and a short explanation of how it works and what its limits are.
        </p>
        <p>
          The tools are free and need no account or installation. Every tool has a permanent address, so you can
          bookmark one or share it with a colleague.
        </p>
      </ContentSection>

      <ContentSection id="tools" title="The tools">
        <p>The tools are grouped into these categories:</p>
        <ul className="flex flex-col gap-3">
          {categories.map((category) => {
            const count = toolsInCategory(category.slug).length;
            return (
              <li key={category.slug} className="border-t border-border pt-3">
                <Link href={categoryPath(category.slug)} className="font-medium">
                  {category.name}
                </Link>
                <span className="text-sm"> · {count} {count === 1 ? "tool" : "tools"}</span>
                <p className="mt-1 text-sm">{category.description}</p>
              </li>
            );
          })}
        </ul>
        <p>
          <Link href="/tutorials">Tutorials</Link> walk through common tasks step by step, such as calculating a subnet
          or checking response headers, and link to the tools they use.
        </p>
      </ContentSection>

      <ContentSection id="audience" title="Who it helps">
        <p>
          The tools are written for people who work with code and systems: web and backend developers, people who
          operate servers and networks, and anyone learning those fields. Most tools explain their results, such as which
          header is missing or why a JSON document is invalid, so they are also useful for understanding a format, not
          only for converting it.
        </p>
      </ContentSection>

      <ContentSection id="privacy" title="How your input is handled">
        <p>
          The site is a set of static pages. There is no server-side code that receives what you type: each tool runs
          as JavaScript in your browser, and your input, files and results stay on your device. Tools do not save your
          input in browser storage or put it in the address bar, so it is gone when you close or reload the page.
        </p>
        <p>
          There is one opt-in exception: the Markdown Editor can load images from other websites if you turn that
          setting on, which sends a request to each image&apos;s host. The{" "}
          <Link href="/privacy-policy">privacy policy</Link> describes this, the site&apos;s hosting and the one setting
          the site remembers (your theme) in detail.
        </p>
      </ContentSection>

      <ContentSection id="accuracy" title="Accuracy and limits">
        <p>
          Each tool page lists the standards it follows and the cases it does not handle. Results are generated
          automatically and can still be wrong for unusual input, so check them before you rely on them in production.
          The <Link href="/terms">terms of use</Link> cover this. If you find a mistake, the{" "}
          <Link href="/contact">contact page</Link> explains how to report it.
        </p>
      </ContentSection>
    </Container>
  );
}
