import { QrCodeGenerator } from "@/components/tools/qr-code-generator/QrCodeGenerator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "qr-code-generator";

const content: ToolPageContent = {
  metaDescription:
    "Create QR codes for URLs and text in your browser. Choose the size, colors, margin and error correction, then download a PNG or a scalable SVG.",
  howItWorks: [
    "Type a URL or any text, and the QR code updates as you type. Choose its size, colors and margin, and an error correction level: higher levels let the code survive damage or a logo on top, but need more modules for the same text.",
    "Download the code as a PNG at the size you chose, or as an SVG that stays sharp at any size, which is best for print. You can also copy the SVG markup.",
    "Codes are generated in your browser with qrcode-generator, loaded only on this page. Text is encoded as UTF-8, so accented letters, other scripts and emoji work with modern scanners.",
  ],
  notes: [
    "Dark modules on a light background scan most reliably. The tool warns about low contrast, inverted colors and transparent backgrounds.",
    "Keep a quiet zone of at least 4 modules around the code, as the QR specification requires, unless it sits on a plain light background.",
    "A QR code can hold up to 2,953 bytes at Low error correction. Shorter content gives a simpler code that is easier to scan.",
    "The text is not sent anywhere, and the codes do not expire: they contain the text itself, not a link to a tracking service. Test every code with a phone before printing.",
  ],
  example: {
    description: "A URL at Medium error correction:",
    input: "https://example.com/menu?table=12",
    output: "QR code version 3 (29×29 modules), downloadable as PNG or SVG",
  },
  faqs: [
    {
      question: "Do these QR codes expire?",
      answer: "No. The code contains your text or URL directly, so it works as long as the URL does. Nothing is stored or redirected through another service.",
    },
    {
      question: "Which error correction level should I choose?",
      answer: "Medium suits most uses. Choose High if the code may be damaged or partly covered, for example by a logo, and Low for long text that must stay small.",
    },
    {
      question: "PNG or SVG?",
      answer: "SVG for print and anywhere the size may change, because it stays perfectly sharp. PNG for places that do not accept SVG, such as some email and document tools.",
    },
    {
      question: "Can I create a Wi-Fi QR code?",
      answer: "Yes. Enter WIFI:T:WPA;S:NetworkName;P:Password;; and most phones offer to join the network when they scan it. Special characters in the name or password must be escaped with a backslash.",
    },
  ],
  related: ["svg-placeholder-generator", "url-parser", "uuid-generator", "base64-file-converter"],
};

export const metadata = toolMetadata(slug, content);

export default function QrCodeGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <QrCodeGenerator />
    </ToolPage>
  );
}
