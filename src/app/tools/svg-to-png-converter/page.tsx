import { SvgToPngConverter } from "@/components/tools/svg-to-png-converter/SvgToPngConverter";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "svg-to-png-converter";

const content: ToolPageContent = {
  metaDescription:
    "Convert SVG to PNG in your browser at any scale or exact size, with a transparent or colored background. The SVG is sanitized and never uploaded.",
  howItWorks: [
    "Choose an .svg file, drop it on the page or paste the markup. The tool works out the SVG's own size from its `width` and `height`, or from its `viewBox` when those are missing, and shows a PNG preview straight away. Set the output by scale, by width or height (keeping the proportions), or as an exact size, choose a transparent or solid background, and download the PNG.",
    "The SVG is rendered at the output size rather than drawn small and enlarged, so edges stay sharp at any scale. With an exact size whose proportions differ from the SVG, the drawing is centered inside it, as browsers do by default (`preserveAspectRatio`).",
    "Before rendering, the SVG is sanitized: scripts, event handlers, embedded HTML (`foreignObject`) and every reference to an external file are removed. It is then drawn only as an image, never inserted into the page, so even a malicious file cannot run code or contact another server.",
  ],
  notes: [
    "External images, fonts and stylesheets are not loaded. Embed images as data: URIs, and convert text to outlines if it must use a specific font; otherwise text uses fonts installed on your device.",
    "The PNG can be at most 8,192 pixels on a side and 16.7 megapixels in total, which phones can still draw. SVG files are limited to 5 MB.",
    "Animations (SMIL or CSS) are captured at their first frame.",
    "Everything happens in your browser: the SVG and the PNG are never uploaded or stored.",
  ],
  example: {
    description: "An icon with only a viewBox, exported at 4× for a high-density screen:",
    input: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">…</svg>
Scale: 4×, transparent background`,
    inputLabel: "SVG and settings",
    output: "image.png · 96×96 px, transparent",
    outputLabel: "PNG",
  },
  faqs: [
    {
      question: "Why does my SVG look different as a PNG?",
      answer:
        "Usually because it references something external: a web font, a linked image or a stylesheet. Those are blocked for safety and privacy. Embed them in the SVG (data: URIs, text converted to paths) and convert again.",
    },
    {
      question: "What size will the PNG be?",
      answer:
        "At 1× scale, the SVG's own size in CSS pixels: its width and height, or the viewBox size if those are missing, or 300×150 if it has neither, which is the browser default. Units such as mm and pt are converted at 96 pixels per inch.",
    },
    {
      question: "Is it safe to convert an SVG from an unknown source?",
      answer:
        "Yes. The SVG is sanitized with DOMPurify and only ever drawn through an image element, where browsers do not run scripts or fetch resources. It is never inserted into this page.",
    },
    {
      question: "Can I make a favicon from an SVG?",
      answer:
        "Convert it to a large PNG here, then load that PNG into the Favicon Generator, which creates every size, favicon.ico and the HTML.",
    },
  ],
  related: ["favicon-generator", "screenshot-beautifier", "svg-placeholder-generator", "base64-file-converter"],
};

export const metadata = toolMetadata(slug, content);

export default function SvgToPngConverterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <SvgToPngConverter />
    </ToolPage>
  );
}
