import { ScreenshotBeautifier } from "@/components/tools/screenshot-beautifier/ScreenshotBeautifier";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "screenshot-beautifier";

const content: ToolPageContent = {
  metaDescription:
    "Put a screenshot on a gradient or solid background with padding, rounded corners, a shadow and an optional browser frame, then export a PNG. Never uploaded.",
  howItWorks: [
    "Choose a screenshot, drop it on the page or paste it from the clipboard with Ctrl+V (⌘+V on Mac). Pick a gradient, solid or transparent background, then adjust the padding, corner radius and drop shadow, and optionally place the image in a light or dark browser window frame. The result updates as you change a setting.",
    "Download the result as a PNG, or copy it straight to the clipboard to paste into a document, chat or social post. The screenshot is drawn at its own resolution, so text stays as sharp as in the original; padding, radius and shadow are in the screenshot's pixels.",
    "Everything is drawn with the browser's canvas on your device. The screenshot is never uploaded, and nothing is stored after you leave the page.",
  ],
  notes: [
    "Screenshots can be up to 25 MB and 40 megapixels. The result is limited to 16.7 megapixels, which phones can still draw; reduce the padding if a very large screenshot exceeds it.",
    "High-density (Retina) screenshots have twice the pixels of what you saw on screen, so they may need more padding and radius for the same look.",
    "Copy image needs a browser that supports writing images to the clipboard (current Chrome, Edge, Safari and Firefox do). Download works everywhere.",
    "The window frame is drawn by the tool; it does not show a real address bar or the page's URL.",
  ],
  example: {
    description: "A 1280×800 screenshot with the default settings:",
    input: `screenshot.png (1280×800)
Gradient #6366f1 → #ec4899, padding 64 px, radius 12 px, shadow 48 px`,
    inputLabel: "Image and settings",
    output: "screenshot-beautified.png · 1408×928 px",
    outputLabel: "PNG",
  },
  faqs: [
    {
      question: "Is my screenshot uploaded anywhere?",
      answer: "No. It is decoded and drawn in your browser, and the PNG is created on your device. You can use the tool offline once the page has loaded.",
    },
    {
      question: "Why is the shadow cut off?",
      answer: "The shadow is drawn inside the padding. Increase the padding, or reduce the shadow blur and offset, so it fits.",
    },
    {
      question: "Can I export JPEG or WebP?",
      answer: "The tool exports PNG, which keeps text crisp and supports transparency. Convert the PNG afterwards if you need a smaller lossy format.",
    },
    {
      question: "How do I get a transparent result?",
      answer: "Choose None as the background. The padding and shadow then sit on transparency, which works well on slides and documents with their own background.",
    },
  ],
  related: ["favicon-generator", "svg-to-png-converter", "css-gradient-generator", "css-box-shadow-generator"],
};

export const metadata = toolMetadata(slug, content);

export default function ScreenshotBeautifierPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <ScreenshotBeautifier />
    </ToolPage>
  );
}
