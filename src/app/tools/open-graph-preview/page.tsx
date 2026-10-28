import { OpenGraphPreview } from "@/components/tools/open-graph-preview/OpenGraphPreview";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "open-graph-preview";

const content: ToolPageContent = {
  metaDescription:
    "Preview how a link may look on Facebook, LinkedIn and X from pasted HTML or typed fields, and find missing or broken Open Graph and Twitter card tags. Nothing is fetched.",
  howItWorks: [
    "Paste a page's HTML (the `<head>` is enough) or switch to Enter fields and type the title, description, URL and image. The tool reads the `<title>`, meta description, canonical link and every `og:` and `twitter:` tag, and draws approximate cards for Facebook and LinkedIn and for X, as a large image card or a summary card depending on `twitter:card`.",
    "Each platform falls back differently. Facebook and LinkedIn use the Open Graph tags and then the page's own title and description; X uses `twitter:` tags and then Open Graph. The cards show the result of those fallbacks, and the Checks list explains missing tags, relative or invalid URLs, unsupported SVG images, small or oddly shaped images, over-long text, invalid card types and handles, and duplicate tags.",
    "Image URLs are never loaded, so the preview cannot reveal anything to the image's host. Choose the share image from your device to see it in the cards; it is shown from a local Blob URL and never uploaded.",
  ],
  notes: [
    "The previews approximate each platform's layout. They are not pixel-identical, and platforms change their designs and truncation without notice.",
    "Nothing is fetched: the tool cannot check that the image exists, how large it really is, or what a live page serves to crawlers. After publishing, use each platform's own debugger to refresh its cached card.",
    "The HTML is parsed into an inert document: scripts do not run and images, styles and frames are not loaded. It is never inserted into this page.",
    "Use the Meta Tag Generator to write the tags; its output can be pasted here to check it.",
  ],
  example: {
    description: "A head with two common mistakes:",
    input: `<title>Pricing | Widgets Inc</title>
<meta property="og:image" content="/images/share.svg">
<meta name="twitter:card" content="large">`,
    inputLabel: "HTML",
    output: `Error og:image: "/images/share.svg" is not an absolute URL.
Error twitter:card: "large" is not a card type.
Warning og:title: No og:title: platforms fall back to <title>…`,
    outputLabel: "Checks (excerpt)",
  },
  faqs: [
    {
      question: "Why doesn't the preview show my image?",
      answer:
        "Image URLs are deliberately not loaded, for privacy. The card shows where the image would be and its host. To see it, choose the same image file from your device.",
    },
    {
      question: "Why does Facebook or X still show my old card?",
      answer:
        "Platforms cache link previews, often for days. After changing the tags, ask the platform to fetch the page again with its sharing debugger or card validator.",
    },
    {
      question: "Which image size should I use?",
      answer:
        "1200×630 pixels (1.91:1) works for large cards on Facebook, LinkedIn and X. Use PNG or JPEG under about 5 MB, an absolute HTTPS URL, and add og:image:width, og:image:height and og:image:alt.",
    },
    {
      question: "Do I need both og: and twitter: tags?",
      answer:
        "No. X falls back to og:title, og:description and og:image, so twitter:card (and optionally twitter:site) is usually all you need to add.",
    },
  ],
  related: ["meta-tag-generator", "http-header-analyzer", "url-parser", "favicon-generator"],
};

export const metadata = toolMetadata(slug, content);

export default function OpenGraphPreviewPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <OpenGraphPreview />
    </ToolPage>
  );
}
