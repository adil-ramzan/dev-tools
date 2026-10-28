import { MetaTagGenerator } from "@/components/tools/meta-tag-generator/MetaTagGenerator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "meta-tag-generator";

const content: ToolPageContent = {
  metaDescription:
    "Generate HTML meta tags for a page's head: title, description, canonical URL, robots, theme color, Open Graph and Twitter/X card tags, escaped and ready to copy.",
  howItWorks: [
    "Fill in the details of the page and the HTML updates as you type. The tool writes the `<title>`, the meta description, a canonical link, a robots tag when you block indexing or link following, a theme color, and the Open Graph and Twitter/X card tags that social networks and chat apps read when someone shares the link.",
    "Every value is HTML-escaped, so quotes and angle brackets in a title cannot break the markup. Fields are checked as you go: titles and descriptions get length guidance, and URLs, handles, the locale and the color are validated. A field with an error is left out of the output until it is fixed.",
    "Twitter/X falls back to the Open Graph title, description and image, so only the card type, handles and image description are added as `twitter:` tags. That keeps the head shorter without changing how cards look.",
  ],
  notes: [
    "Length guidance is approximate: search engines truncate by pixel width, not characters, and may rewrite titles and descriptions.",
    "Open Graph images should be absolute HTTPS URLs. 1200×630 pixels (1.91:1) works for large cards on most platforms; keep the file under about 5 MB.",
    "Nothing is fetched or sent: URLs are only checked for form. The tool does not preview cards or inspect a live page's metadata.",
    "The keywords meta tag is not generated, because major search engines ignore it.",
  ],
  example: {
    description: "Tags for a home page with a share image:",
    input: `Title: Acme Analytics – Privacy-first website analytics
Canonical URL: https://acme.example/
Share image URL: https://acme.example/og/home.png`,
    inputLabel: "Fields (excerpt)",
    output: `<title>Acme Analytics – Privacy-first website analytics</title>
<link rel="canonical" href="https://acme.example/">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:title" content="Acme Analytics – Privacy-first website analytics">
<meta property="og:url" content="https://acme.example/">
<meta property="og:image" content="https://acme.example/og/home.png">

<!-- Twitter / X -->
<meta name="twitter:card" content="summary_large_image">`,
    outputLabel: "HTML (excerpt)",
  },
  faqs: [
    {
      question: "Where do these tags go?",
      answer:
        "Inside the `<head>` of the page's HTML. In frameworks such as Next.js, Nuxt or Astro, set the same values through the framework's metadata API instead, so it can render them for you.",
    },
    {
      question: "Why does my shared link still show the old title or image?",
      answer:
        "Social platforms cache link previews. After changing the tags, use the platform's debugging or card validator tool to fetch the page again, and change the image URL if the old image is cached.",
    },
    {
      question: "Do I need a canonical URL?",
      answer:
        "It is recommended whenever the same content is reachable at several URLs, for example with tracking parameters or both www and non-www. It tells search engines which URL to show, and it is also used as og:url.",
    },
    {
      question: "What is the difference between summary and large image cards?",
      answer:
        "Summary shows a small square thumbnail next to the title; large image shows a wide image above it. Large image needs an image at least 300×157 pixels and works best at 1200×630.",
    },
  ],
  related: ["url-parser", "http-header-analyzer", "html-entity-encoder-decoder", "slug-generator"],
};

export const metadata = toolMetadata(slug, content);

export default function MetaTagGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <MetaTagGenerator />
    </ToolPage>
  );
}
