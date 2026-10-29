import type { Metadata } from "next";
import Link from "next/link";
import { ContentSection } from "@/components/content/ContentSection";
import { PageHeader } from "@/components/layout/PageHeader";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: `How to send feedback, report a bug or suggest a tool for ${siteConfig.name}, and what to include so a problem can be reproduced.`,
  path: "/contact",
});

export default function ContactPage() {
  const email = siteConfig.contactEmail;

  return (
    <Container size="prose" className="flex flex-col gap-10 py-10 sm:py-14">
      <PageHeader title="Contact" description="Feedback, bug reports and tool suggestions are welcome." />

      <ContentSection id="how" title="How to get in touch">
        {email ? (
          <p>
            Email <a href={`mailto:${email}`}>{email}</a>. Messages are read by a person, so allow some time for a
            reply.
          </p>
        ) : (
          <p>
            A contact address has not been published yet. When one is, it will appear on this page. The site has no
            contact form, so nothing you type on this site is sent to anyone.
          </p>
        )}
      </ContentSection>

      <ContentSection id="bugs" title="Reporting a bug">
        <p>A useful report lets someone else see the same problem. Include:</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground">
          <li>the address of the tool page;</li>
          <li>your browser and its version, and your operating system;</li>
          <li>the steps you took and the settings you chose;</li>
          <li>what you expected to happen and what happened instead, with any error message;</li>
          <li>a small sample input that shows the problem.</li>
        </ul>
        <p>
          Do not send passwords, keys, tokens, cookies or personal data, even in a sample. Replace them with made-up
          values of the same shape, and check that the problem still occurs.
        </p>
      </ContentSection>

      <ContentSection id="suggestions" title="Suggesting a tool or an improvement">
        <p>
          Describe the task you are trying to do, the input you start from and the result you need. Check the{" "}
          <Link href="/tools">list of tools</Link> first: the task may be covered by a tool with a different name, and a
          suggestion to extend an existing tool is just as useful.
        </p>
      </ContentSection>
    </Container>
  );
}
