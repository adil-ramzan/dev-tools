import { SvgPlaceholderGenerator } from "@/components/tools/svg-placeholder-generator/SvgPlaceholderGenerator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "svg-placeholder-generator";

const content: ToolPageContent = {
  metaDescription:
    "Generate lightweight SVG placeholder images of any size with your own colors and label. Copy the SVG, a data URI or an img tag, or download the file.",
  howItWorks: [
    "Set the width and height, or pick a preset such as an Open Graph image or a banner ad, then choose the background and text colors, font and label. Without a label, the image shows its size, such as 600×400.",
    "Copy the result as SVG markup, as a data URI to use in an img src or CSS background, or as a complete img tag, or download it as an .svg file. Placeholders are tiny, usually under 500 bytes, and need no image server.",
    "The SVG is built from validated numbers and colors, and the label is escaped, so text such as <script> appears as text and can never add elements to the image.",
  ],
  notes: [
    "Sizes range from 1 to 4,000 pixels. Colors can be written as hex, rgb() or hsl().",
    "The automatic font size fits the label to the image; set a size to override it.",
    "Fonts are system fonts, so the label looks slightly different on each operating system.",
    "The data URI percent-encodes characters such as # and parentheses, so it works inside CSS url() without quotes.",
  ],
  example: {
    description: "A 300×150 placeholder with the default label:",
    input: "300 × 150, background #e2e8f0, text #475569",
    output: `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150" role="img" aria-label="300×150"><rect width="100%" height="100%" fill="#e2e8f0"/><text …>300×150</text></svg>`,
  },
  faqs: [
    {
      question: "Why use SVG placeholders instead of PNG?",
      answer: "They are a few hundred bytes at any size, stay sharp on every screen, and can be inlined as a data URI, so layouts work without network requests to a placeholder service.",
    },
    {
      question: "Is the text escaped?",
      answer: "Yes. Characters such as <, > and & are written as XML entities, so the label is always shown as text and cannot inject markup.",
    },
    {
      question: "How do I use the data URI in CSS?",
      answer: "Use it as background-image: url(data:image/svg+xml,…). The tool encodes the characters that would otherwise break the URL.",
    },
    {
      question: "Can I make a placeholder for social media previews?",
      answer: "Yes: choose the Open Graph 1200×630 preset. Note that many social networks do not accept SVG for preview images, so convert it to PNG for production.",
    },
  ],
  related: ["qr-code-generator", "css-gradient-generator", "color-converter", "lorem-ipsum-generator"],
};

export const metadata = toolMetadata(slug, content);

export default function SvgPlaceholderGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <SvgPlaceholderGenerator />
    </ToolPage>
  );
}
