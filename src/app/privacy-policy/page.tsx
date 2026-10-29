import type { Metadata } from "next";
import Link from "next/link";
import { ContentSection } from "@/components/content/ContentSection";
import { PageHeader } from "@/components/layout/PageHeader";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: `How ${siteConfig.name} handles your data: tools run in your browser, what the site loads, its hosting, browser storage, cookies, analytics and advertising.`,
  path: "/privacy-policy",
});

// Each statement here describes the current implementation. Update this page
// whenever that changes: a new external request, storage key, cookie, analytics or ads.
export default function PrivacyPolicyPage() {
  return (
    <Container size="prose" className="flex flex-col gap-10 py-10 sm:py-14">
      <PageHeader
        title="Privacy Policy"
        description="What happens to the data you use with this site, described in plain language."
      />

      <ContentSection id="summary" title="Summary">
        <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground">
          <li>The tools process your input in your browser. It is not uploaded to the site.</li>
          <li>There are no accounts, forms or contact submissions.</li>
          <li>The site&apos;s code contains no analytics, tracking or advertising, and sets no cookies.</li>
          <li>The only thing the site stores in your browser is your theme choice, if you make one.</li>
          <li>
            The site is hosted by Cloudflare, which receives the usual technical information that comes with every web
            request.
          </li>
        </ul>
        <p>
          This page describes how the site works today. It is a plain-language description, not legal advice.
        </p>
      </ContentSection>

      <ContentSection id="tool-input" title="Your tool input">
        <p>
          Every tool runs as JavaScript in your browser. Text you type or paste, files you choose and the results the
          tools produce stay on your device: the site has no server-side code that could receive them, and the tools do
          not send them anywhere. Tools do not save your input in browser storage or put it in the address bar, so it is
          discarded when you close or reload the page.
        </p>
        <p>Some tools use parts of your browser, always locally:</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground">
          <li>Copy buttons write to your clipboard only when you select them. The site does not read your clipboard.</li>
          <li>
            Files you choose or drop, for example in the image tools, are read in the browser and never uploaded.
            Downloads are created in the browser.
          </li>
          <li>
            Device Information and the User-Agent Parser&apos;s Use my browser option show what your browser reports
            about itself, such as screen size and browser version. That information is displayed, not sent.
          </li>
        </ul>
        <p>Two things can make your browser contact another website:</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground">
          <li>
            The Markdown Editor does not load images from other websites unless you turn on its Load images from other
            websites setting. When it is on, your browser requests each image from the site that hosts it, which can see
            your IP address and the image address, as with any web request.
          </li>
          <li>
            Selecting a link in a tool&apos;s preview, or a link to another site on these pages, opens that site like any
            other link.
          </li>
        </ul>
      </ContentSection>

      <ContentSection id="requests" title="What the site loads">
        <p>
          Pages, scripts, styles and fonts are all served from this site&apos;s own address. Fonts are bundled with the
          site rather than loaded from a font service, and the libraries some tools need are loaded from this site only
          when you open those tools. The pages do not load content from other domains.
        </p>
      </ContentSection>

      <ContentSection id="hosting" title="Hosting">
        <p>
          The site is a set of static files served by Cloudflare. As with any website, your browser&apos;s requests reach
          Cloudflare with the usual technical information: your IP address, the address of the page requested, your
          browser&apos;s user-agent string and, where your browser sends it, the referring page. Cloudflare processes
          this to deliver and protect the site, and may give the site operator aggregate statistics such as request
          counts, under{" "}
          <a href="https://www.cloudflare.com/privacypolicy/" rel="noopener noreferrer">
            Cloudflare&apos;s privacy policy
          </a>
          . Tool input is not part of these requests. The site adds no logging of its own.
        </p>
      </ContentSection>

      <ContentSection id="storage" title="Cookies and browser storage">
        <p>
          The site&apos;s code sets no cookies. If you choose Light or Dark with the theme button, that choice is saved
          in your browser&apos;s local storage under the key <code>theme</code>, so the site looks the same on your next
          visit. Until you choose, nothing is saved and the site follows your device&apos;s light or dark setting. It is
          never sent to the site, and you can clear it at any time through your
          browser&apos;s settings for site data.
        </p>
        <p>
          Cloudflare can set its own cookies for security features, such as bot protection, when they are enabled for a
          site. Those cookies are covered by Cloudflare&apos;s policies.
        </p>
      </ContentSection>

      <ContentSection id="analytics" title="Analytics and advertising">
        <p>
          The site&apos;s code includes no analytics, tracking pixels or other third-party scripts, and the site shows no
          advertising.
        </p>
        <p>
          If advertising is added in future, the advertising providers may use cookies or similar technologies to show
          and measure ads, according to their own privacy policies. This page would then be updated to name those
          providers and explain your choices.
        </p>
      </ContentSection>

      <ContentSection id="changes" title="Changes and questions">
        <p>
          When the site&apos;s behavior changes in a way that affects your data, this page will be updated to match. For
          questions about this policy, see the <Link href="/contact">contact page</Link>.
        </p>
      </ContentSection>
    </Container>
  );
}
