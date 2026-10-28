import { Base64EncoderDecoder } from "@/components/tools/base64-encoder-decoder/Base64EncoderDecoder";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "base64-encoder-decoder";

const content: ToolPageContent = {
  metaDescription:
    "Encode text to Base64 or decode Base64 to text online, with full UTF-8 support for accents, emoji and other scripts. Supports URL-safe Base64.",
  howItWorks: [
    "Base64 represents binary data using 64 printable characters (A–Z, a–z, 0–9, + and /), so it can travel through systems that only handle text, such as JSON, email and HTTP headers.",
    "To encode, the tool first converts your text to UTF-8 bytes and then encodes those bytes. This means accented letters, emoji and non-Latin scripts work correctly, unlike the browser's built-in `btoa`, which fails on them.",
    "To decode, paste Base64 and select Decode. Spaces and line breaks are ignored, missing `=` padding is accepted, and both standard and URL-safe Base64 (with - and _) are recognized automatically.",
  ],
  notes: [
    "This tool encodes and decodes text. If decoded data is not valid UTF-8 text, for example an image or a ZIP file, you get an error instead of garbled output.",
    "URL-safe output replaces + and / with - and _ and drops the = padding, as used in JWTs and URLs (RFC 4648, section 5).",
    "Base64 is an encoding, not encryption. Anyone can decode it, so it does not protect sensitive data.",
  ],
  example: {
    description: "Encoding a string that contains a non-ASCII character:",
    input: "Grüße!",
    output: "R3LDvMOfZSE=",
  },
  faqs: [
    {
      question: "Why does Base64 output end with = or ==?",
      answer:
        "Base64 encodes 3 bytes as 4 characters. When the input length is not a multiple of 3, = characters pad the output to a multiple of 4. URL-safe Base64 often leaves the padding out.",
    },
    {
      question: "Why do I get an \"invalid character\" error?",
      answer:
        "The input contains a character that is not part of Base64, such as *, % or a quotation mark. The error shows its position. Check that you copied only the encoded value.",
    },
    {
      question: "Can I decode an image or file?",
      answer:
        "Not with this tool. It decodes Base64 to text only and tells you when the data is binary. Base64 data URIs for images can be opened directly in a browser's address bar instead.",
    },
    {
      question: "How much larger does Base64 make data?",
      answer: "About 33%: every 3 bytes become 4 characters, plus up to two padding characters.",
    },
  ],
  related: ["url-encoder-decoder", "json-formatter", "uuid-generator"],
};

export const metadata = toolMetadata(slug, content);

export default function Base64Page() {
  return (
    <ToolPage slug={slug} content={content}>
      <Base64EncoderDecoder />
    </ToolPage>
  );
}
