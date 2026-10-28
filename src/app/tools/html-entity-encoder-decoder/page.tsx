import { HtmlEntityEncoderDecoder } from "@/components/tools/html-entity-encoder-decoder/HtmlEntityEncoderDecoder";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "html-entity-encoder-decoder";

const content: ToolPageContent = {
  metaDescription:
    "Escape &, <, >, quotes and apostrophes as HTML entities, or decode named and numeric character references. Avoids double encoding. Runs in your browser.",
  howItWorks: [
    "Encode turns the characters that have special meaning in HTML into character references: `&` becomes `&amp;`, `<` becomes `&lt;`, `>` becomes `&gt;`, `\"` becomes `&quot;` and `'` becomes `&#39;`. Optionally, non-ASCII characters are encoded too, as named references such as `&eacute;` or numeric ones such as `&#xE9;`.",
    "References already in your text are left alone, so encoding twice does not turn `&amp;` into `&amp;amp;`. Turn on \"Encode existing entities again\" when you really want that, for example to show entity code on a web page.",
    "Decode converts all 2,231 named references defined by the HTML standard, plus decimal (`&#169;`) and hex (`&#xA9;`) references, exactly as browsers do, including their replacements for invalid code points.",
  ],
  notes: [
    "Entity encoding is not an HTML sanitizer. It is correct for text between tags and inside quoted attribute values, but not inside `<script>`, `<style>`, unquoted attributes, event handlers or `javascript:` URLs. Use a sanitizer such as DOMPurify to accept HTML from users.",
    "Browsers decode some legacy references without a semicolon, such as `&copy`. Turn on \"require semicolons\" to decode only complete references.",
    "Unknown references such as `&foo;` are left as written and listed after decoding.",
    "UTF-8 pages do not need non-ASCII characters encoded. Encode them only for systems that are not Unicode-safe.",
  ],
  example: {
    description: "Encoding a snippet of HTML so it displays as text:",
    input: `<a href="/?q=1&r=2">Tom's</a>`,
    output: "&lt;a href=&quot;/?q=1&amp;r=2&quot;&gt;Tom&#39;s&lt;/a&gt;",
  },
  faqs: [
    {
      question: "Does encoding entities prevent XSS?",
      answer:
        "Only when the text goes between tags or in a quoted attribute value. In other places, such as script blocks, URLs and event handler attributes, escaped text can still run as code. Use your framework's context-aware escaping and a sanitizer for user-supplied HTML.",
    },
    {
      question: "Why is the apostrophe encoded as &#39; and not &apos;?",
      answer: "&apos; is not defined in HTML 4, so older parsers and some email clients do not understand it. &#39; works everywhere.",
    },
    {
      question: "What is double encoding?",
      answer:
        "Encoding text that is already encoded, which turns &amp; into &amp;amp; and makes pages show the entity code instead of the character. This tool avoids it by default.",
    },
    {
      question: "What is the difference between named and numeric references?",
      answer:
        "Named references (&eacute;) are easier to read but exist only for some characters. Numeric references (&#xE9; or &#233;) work for every Unicode character.",
    },
  ],
  related: ["url-encoder-decoder", "base64-encoder-decoder", "markdown-editor", "html-css-js-minifier"],
};

export const metadata = toolMetadata(slug, content);

export default function HtmlEntityEncoderDecoderPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <HtmlEntityEncoderDecoder />
    </ToolPage>
  );
}
