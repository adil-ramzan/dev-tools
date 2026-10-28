import { UrlParser } from "@/components/tools/url-parser/UrlParser";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "url-parser";

const content: ToolPageContent = {
  metaDescription:
    "Parse a URL into protocol, host, port, path, query parameters and fragment with the browser's URL parser, edit repeated query parameters, and rebuild the URL.",
  howItWorks: [
    "Paste a URL and the tool splits it into its parts as you type: protocol, username and password, host name, port, path and path segments, query string and fragment. It uses the WHATWG URL API that browsers use, so the result matches what a browser would request.",
    "Query parameters are listed in order and decoded, with repeated keys such as `tag=a&tag=b` kept as separate entries. Edit, add or remove parameters, and the tool rebuilds the URL with correct encoding. You can also copy the parameters as JSON.",
    "Relative URLs such as `/docs?page=2` have no meaning on their own; enter a base URL to resolve them.",
  ],
  notes: [
    "The URL is never requested; it is only parsed in your browser.",
    "Parsing normalizes the URL like a browser: the scheme and host are lowercased, default ports are dropped, `.` and `..` path segments are resolved, and non-ASCII characters are percent-encoded.",
    "Query values are decoded with form rules, so `+` is a space. In a path, `+` is a literal plus sign.",
    "Warnings point out credentials in the URL, IP addresses, internationalized domains in Punycode and `javascript:` or `data:` URLs.",
    "For encoding or decoding a single piece of text, use the URL Encoder & Decoder.",
  ],
  example: {
    description: "A URL with a port, repeated parameters and a fragment:",
    input: "https://shop.example.com:8443/products?tag=organic&tag=fair+trade#reviews",
    output: `Protocol  https:
Hostname  shop.example.com
Port      8443
Path      /products
Query     tag = organic
          tag = fair trade
Fragment  #reviews`,
  },
  faqs: [
    {
      question: "Why is my URL reported as relative?",
      answer:
        "It has no scheme such as https://. Without one, a browser resolves it against the current page. Add the scheme, or enter a base URL to see what it resolves to.",
    },
    {
      question: "How are repeated query parameters handled?",
      answer: "Each occurrence is kept, in order. In JSON output, repeated keys become arrays. How a server treats repeated keys depends on its framework.",
    },
    {
      question: "Why does the hostname look different from what I typed?",
      answer: "Host names are lowercased, and internationalized domain names are converted to Punycode (xn--…), the ASCII form used in DNS.",
    },
    {
      question: "What is the difference between the origin and the host?",
      answer: "The host is the host name plus any non-default port. The origin adds the scheme: https://example.com:8443. Browsers use the origin for security boundaries.",
    },
  ],
  related: ["url-encoder-decoder", "curl-to-code", "http-status-codes", "slug-generator"],
};

export const metadata = toolMetadata(slug, content);

export default function UrlParserPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <UrlParser />
    </ToolPage>
  );
}
