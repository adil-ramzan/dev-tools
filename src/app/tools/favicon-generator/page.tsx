import { FaviconGenerator } from "@/components/tools/favicon-generator/FaviconGenerator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "favicon-generator";

const content: ToolPageContent = {
  metaDescription:
    "Create a favicon from text, an emoji or your image: favicon.ico, PNGs from 16 to 512 pixels, the web manifest and HTML, in one ZIP. Runs in your browser.",
  howItWorks: [
    "Type one to three characters or an emoji, or choose an image, then set the shape, colors and padding. Every size is drawn as you change a setting: 16, 32 and 48 pixels for browser tabs and Windows, 180 pixels for the iOS home screen, and 192 and 512 pixels for Android and install prompts.",
    "Download everything as a ZIP: `favicon.ico`, the six PNGs, `site.webmanifest` and `head.html` with the tags to paste into your page's `<head>`. The ICO file is a real Windows icon containing the 16, 32 and 48 pixel images as PNG, which all current browsers read.",
    "Each size is drawn separately rather than shrunk from the largest one, so text is laid out to fit even at 16 pixels. For a detailed logo, check the 16 and 32 pixel previews: fine detail disappears at that size, and a simpler mark or more padding often reads better.",
  ],
  notes: [
    "Text and emoji use the fonts on your device, so an emoji looks like your system's emoji (Apple, Google, Microsoft…). The downloaded files keep the look you see.",
    "Images can be up to 25 MB and 40 megapixels. Square images of at least 512×512 pixels give the best results; others are fitted inside or cropped to fill.",
    "The HTML assumes the files are served from the root of your site. Change the paths if you put them in a folder.",
    "Nothing is uploaded: images are decoded and every file is created in your browser.",
  ],
  example: {
    description: "A letter icon in the default style:",
    input: `Text: D, sans-serif bold
Rounded square, white on #1f4fe0, padding 10%`,
    inputLabel: "Settings",
    output: `favicons.zip
  favicon.ico (16, 32, 48 px)
  favicon-16x16.png, favicon-32x32.png, favicon-48x48.png
  apple-touch-icon.png (180 px)
  android-chrome-192x192.png, android-chrome-512x512.png
  site.webmanifest, head.html`,
    outputLabel: "Download",
  },
  faqs: [
    {
      question: "Do I still need favicon.ico?",
      answer:
        "It is worth including: some tools and older browsers request /favicon.ico directly, regardless of your HTML. Modern browsers use the PNG or ICO linked in the head.",
    },
    {
      question: "Why does my icon look blurry in the browser tab?",
      answer:
        "Tabs show icons at 16 or 32 pixels. Thin lines and small text cannot survive that. Increase the contrast, reduce detail, or use a single letter or symbol.",
    },
    {
      question: "Can I use an SVG favicon?",
      answer:
        "Browsers other than Safari support SVG favicons. This tool creates PNG and ICO files, which work everywhere; to start from an SVG, convert it to a large PNG with the SVG to PNG Converter and choose that PNG here.",
    },
    {
      question: "What is the web manifest for?",
      answer:
        "It tells Android and desktop browsers which icons and colors to use when your site is installed or added to the home screen. Link it with `<link rel=\"manifest\">`, which head.html includes.",
    },
  ],
  related: ["svg-to-png-converter", "screenshot-beautifier", "meta-tag-generator", "color-converter"],
};

export const metadata = toolMetadata(slug, content);

export default function FaviconGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <FaviconGenerator />
    </ToolPage>
  );
}
