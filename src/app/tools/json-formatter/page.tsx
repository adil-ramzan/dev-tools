import { JsonFormatter } from "@/components/tools/json-formatter/JsonFormatter";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "json-formatter";

const content: ToolPageContent = {
  metaDescription:
    "Format, validate and minify JSON online. Get the exact line and column of syntax errors, choose your indentation and keep large numbers intact.",
  howItWorks: [
    "Paste JSON into the input and choose Format, Minify or Validate. The tool parses your input with a strict JSON parser that follows RFC 8259, the JSON standard, and processes it in your browser.",
    "If the JSON is invalid, nothing is changed. You get the line and column of the first error, a short explanation such as a missing comma or a trailing comma, and a button that selects the problem in the input.",
    "Formatting reproduces your values exactly as written. Long numbers such as `12345678901234567890` and escape sequences such as `\\u00e9` are kept, rather than being rounded or rewritten the way `JSON.parse` and `JSON.stringify` would.",
  ],
  notes: [
    "JSON does not allow comments, trailing commas, single-quoted strings or unquoted keys. These are reported as errors rather than fixed silently.",
    "Duplicate keys are valid syntax but usually a mistake. They are listed as warnings, and both entries are kept in the output.",
    "Sort keys A–Z orders keys by Unicode code point, so uppercase letters sort before lowercase.",
  ],
  example: {
    description: "Formatting a compact API response with 2-space indentation:",
    input: `{"id":1024,"name":"Ada","roles":["admin","editor"],"active":true}`,
    output: `{
  "id": 1024,
  "name": "Ada",
  "roles": [
    "admin",
    "editor"
  ],
  "active": true
}`,
  },
  faqs: [
    {
      question: "What is the difference between Format and Validate?",
      answer:
        "Both check that the input is valid JSON. Format also writes an indented copy to the result panel, while Validate only reports whether the JSON is valid and leaves the result untouched.",
    },
    {
      question: "Why does my JSON fail with a trailing comma error?",
      answer:
        "JSON does not allow a comma after the last item in an object or array, even though JavaScript does. Remove the comma before the closing } or ] and run the tool again.",
    },
    {
      question: "Can I format JSON with comments (JSONC or JSON5)?",
      answer:
        "No. This tool accepts standard JSON only and reports comments as errors, so you know the file will be accepted by strict parsers. Remove the comments first if you need standard JSON.",
    },
    {
      question: "Will formatting change my numbers?",
      answer:
        "No. Numbers are copied exactly as written, so very large integers and values like 1.10 or 1E+3 keep their original form.",
    },
    {
      question: "Is there a size limit?",
      answer:
        "There is no fixed limit, but very large files (tens of megabytes) depend on your device's memory and may take a few seconds. Objects and arrays can be nested up to 500 levels deep.",
    },
  ],
};

export const metadata = toolMetadata(slug, content);

export default function JsonFormatterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <JsonFormatter />
    </ToolPage>
  );
}
