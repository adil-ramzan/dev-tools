import type { Metadata } from "next";
import Link from "next/link";
import { ContentSection } from "@/components/content/ContentSection";
import { PageHeader } from "@/components/layout/PageHeader";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Use",
  description: `The terms for using ${siteConfig.name}: appropriate use, checking results before you rely on them, no warranty, and limits of liability.`,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <Container size="prose" className="flex flex-col gap-10 py-10 sm:py-14">
      <PageHeader title="Terms of Use" description="The conditions for using the tools on this site, in plain language." />

      <ContentSection id="agreement" title="Using the site">
        <p>
          By using {siteConfig.name} you agree to these terms. The tools are free to use and need no account. If you do not agree, please do not use the site.
        </p>
      </ContentSection>

      <ContentSection id="appropriate-use" title="Appropriate use">
        <p>Use the tools lawfully and responsibly. In particular, do not use them:</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground">
          <li>to access systems, accounts or data you are not authorized to access;</li>
          <li>to process data you do not have the right to use;</li>
          <li>to attack, overload or disrupt this site or any other service, for example with automated requests;</li>
          <li>in a way that breaks the law or infringes other people&apos;s rights.</li>
        </ul>
        <p>
          Some tools, such as the password, hash, encryption and network tools, are useful for security work. Use them
          only on systems and data you own or have permission to test.
        </p>
      </ContentSection>

      <ContentSection id="your-responsibility" title="Check results before you rely on them">
        <p>
          The tools produce results automatically, and every tool has limits, which its page describes. You are
          responsible for checking that a result is correct and suitable before you use it, especially in production
          systems, security settings, network configuration, legal or financial documents, or anything else where a
          mistake is costly. Keep your own copies of important data: the tools do not save your input or results.
        </p>
      </ContentSection>

      <ContentSection id="no-warranty" title="No guarantee">
        <p>
          The site and its tools are provided as they are and as available, without any warranty. There is no guarantee
          that results are complete, accurate or error-free, that they meet standards or requirements that apply to you,
          or that the site will always be available. Tools and content may change or be removed at any time.
        </p>
      </ContentSection>

      <ContentSection id="liability" title="Limitation of liability">
        <p>
          To the extent the law allows, the people who run this site are not liable for any loss or damage arising from
          your use of the site or its results, including lost data, lost profits, security incidents or business
          interruption. Nothing in these terms limits liability that cannot be limited under the law that applies to
          you, and these terms do not take away rights you have as a consumer.
        </p>
      </ContentSection>

      <ContentSection id="other" title="Third-party content and changes">
        <p>
          Links to other websites are provided for convenience; those sites have their own terms. These terms may be
          updated as the site changes, and the version on this page is the one that applies. The{" "}
          <Link href="/privacy-policy">privacy policy</Link> explains how your data is handled, and the{" "}
          <Link href="/contact">contact page</Link> explains how to reach the site with questions.
        </p>
      </ContentSection>
    </Container>
  );
}
