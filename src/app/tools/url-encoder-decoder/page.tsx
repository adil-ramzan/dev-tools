import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import { UrlEncoderDecoder } from "@/components/tools/url-encoder-decoder/UrlEncoderDecoder";
import type { ToolPageContent } from "@/types/tool";

const slug = "url-encoder-decoder";

const content: ToolPageContent = {
  metaDescription:
    "Percent-encode and decode URLs and query string values online. Choose between encoding a single URL component or a complete URL, with clear errors for bad escapes.",
  howItWorks: [
    "URLs can only contain a limited set of characters. Everything else, including spaces, accented letters and emoji, is written as percent-escapes: the character's UTF-8 bytes in hexadecimal, each preceded by %. A space becomes `%20` and é becomes `%C3%A9`.",
    "Choose URL component to encode a single value, such as a query parameter or a path segment. This uses `encodeURIComponent` and also escapes characters that have a meaning in URLs, such as `/ ? # & =`, so a value cannot break the URL around it.",
    "Choose Full URL to encode a complete address. This uses `encodeURI`, which keeps the URL's structure (`:// / ? & = #`) and only escapes characters that are never allowed in a URL.",
  ],
  notes: [
    "When decoding in Full URL mode, escapes for reserved characters such as %2F (/) are left as they are, because decoding them could change the meaning of the URL.",
    "HTML forms encode spaces as +. Turn on Decode + as a space to decode form data and query strings created that way.",
  ],
  example: {
    description: "Encoding a search term as a query parameter value (URL component mode):",
    input: "coffee & tea / 50% off",
    output: "coffee%20%26%20tea%20%2F%2050%25%20off",
  },
  faqs: [
    {
      question: "When should I use URL component instead of Full URL?",
      answer:
        "Use URL component for anything you insert into a URL, such as a query parameter value or a file name in a path. Use Full URL only when you have a complete address with spaces or non-ASCII characters and want to keep its structure intact.",
    },
    {
      question: "Why does decoding fail with an invalid percent-escape?",
      answer:
        "Every % must be followed by two hexadecimal digits. A literal percent sign in a URL has to be written as %25. The error message shows the position of the first invalid escape.",
    },
    {
      question: "What does \"do not form valid UTF-8\" mean?",
      answer:
        "The escapes are well formed but the bytes they describe are not valid UTF-8, often because the text was cut off in the middle of a character or was encoded with an older character set such as Latin-1.",
    },
    {
      question: "Is %20 or + correct for a space?",
      answer:
        "%20 is correct everywhere in a URL. The + form is only used in query strings submitted by HTML forms (application/x-www-form-urlencoded).",
    },
  ],
  related: ["base64-encoder-decoder", "json-formatter", "regex-tester"],
};

export const metadata = toolMetadata(slug, content);

export default function UrlEncoderDecoderPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <UrlEncoderDecoder />
    </ToolPage>
  );
}
