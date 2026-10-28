import { Base64FileConverter } from "@/components/tools/base64-file-converter/Base64FileConverter";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "base64-file-converter";

const content: ToolPageContent = {
  metaDescription:
    "Convert any file to Base64 or a data URI, or decode Base64 into a downloadable file. Files stay in your browser and binary data is kept byte for byte.",
  howItWorks: [
    "To encode, choose a file. The browser reads it locally and the tool encodes its bytes as Base64, showing the file size and the encoded length. Turn on Data URI to get a `data:` URL you can use in CSS or HTML, or wrap lines at 76 characters for email (MIME).",
    "To decode, paste Base64 or a data URI and select Decode. The tool checks every character, decodes the bytes exactly, and detects common file types such as PNG, JPEG, PDF and ZIP from their first bytes, so it can suggest a file name. Then download the file.",
    "Bytes are handled as bytes from start to finish. Images, archives and other binary files round-trip without corruption, unlike tools that pass data through text.",
  ],
  notes: [
    "The limit is 10 MB per file. Base64 is about a third larger than the original, and the page holds both in memory while converting.",
    "Very long output is previewed in the box; Copy and Download always include the full text.",
    "Files are never uploaded or stored. The download link is created in your browser and released when you clear or leave the page.",
    "The detected type comes from the file's first bytes and only suggests what the data is. It does not prove the file is safe or valid; be careful with files from untrusted sources.",
  ],
  example: {
    description: "A 1×1 pixel PNG as a data URI:",
    input: "pixel.png (70 bytes)",
    output: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  },
  faqs: [
    {
      question: "Is my file uploaded?",
      answer:
        "No. The file is read with the browser's File API and converted on your device. Nothing is sent to a server, and nothing is saved after you leave the page.",
    },
    {
      question: "What is a data URI?",
      answer:
        "A URL that contains the file itself: data:, the MIME type, ;base64, and the encoded bytes. Browsers can display it directly, which is handy for small images in CSS or HTML. Large data URIs make pages slower, so use them for small files only.",
    },
    {
      question: "Why does decoding fail with \"invalid character\"?",
      answer:
        "Base64 uses only A–Z, a–z, 0–9, + and / (or - and _ in URL-safe Base64) with = padding. Anything else, such as quotes or a stray comma, is reported with its position instead of being skipped, so the decoded file is never silently corrupted.",
    },
    {
      question: "How do I encode text instead of a file?",
      answer: "Use the Base64 Encoder & Decoder, which converts text as UTF-8.",
    },
  ],
  related: ["base64-encoder-decoder", "mime-type-lookup", "hash-generator", "url-encoder-decoder"],
};

export const metadata = toolMetadata(slug, content);

export default function Base64FileConverterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <Base64FileConverter />
    </ToolPage>
  );
}
