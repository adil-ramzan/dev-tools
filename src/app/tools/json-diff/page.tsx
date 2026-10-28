import { JsonDiffChecker } from "@/components/tools/json-diff/JsonDiffChecker";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "json-diff";

const content: ToolPageContent = {
  metaDescription:
    "Compare two JSON documents by structure, not text. See added, removed and changed values with their JSON paths, regardless of key order or formatting.",
  howItWorks: [
    "Paste the original and changed JSON and select Compare. Instead of comparing lines of text, the tool compares the data itself, so differences in formatting, indentation or the order of keys in an object do not count as changes.",
    "Every difference is listed with its path, such as `$.dependencies.react` or `$.ports[1]`, and whether the value was added, removed or changed. If a value changed type, for example from a string to a number, that is shown too.",
    "Both documents are read with a strict JSON parser that keeps numbers exactly as written, so values beyond JavaScript's safe integer range, such as `9007199254740993`, are compared exactly instead of being rounded.",
  ],
  notes: [
    "Arrays are compared position by position. An item inserted at the start of an array makes every later item show as changed.",
    "Numbers are compared by value, so 1.0 equals 1 and 1e2 equals 100. Turn on the option to treat different spellings as changes.",
    "Strings are compared by their decoded text, so \"\\u00e9\" and \"é\" are equal.",
    "If an object has a duplicate key, its last value is compared, as JSON parsers do, and a warning is shown.",
  ],
  example: {
    description: "Comparing two versions of a package description:",
    input: `Original:
{ "name": "app", "version": "1.0.0", "tags": ["web"] }

Changed:
{ "name": "app", "version": "1.1.0", "tags": ["web", "api"], "private": true }`,
    output: `Changed  $.version   "1.0.0" → "1.1.0"
Added    $.tags[1]   "api"
Added    $.private   true`,
    outputLabel: "Changes",
  },
  faqs: [
    {
      question: "How is this different from a text diff?",
      answer:
        "A text diff compares lines, so reformatting or reordering keys shows up as changes. A JSON diff compares the data, so only real differences in values are reported, each with its exact path.",
    },
    {
      question: "What do the paths like $.tags[1] mean?",
      answer:
        "$ is the root of the document, .name selects a property and [1] selects the second item of an array (counting from 0). Property names with spaces or symbols are written in brackets, such as $[\"first-name\"].",
    },
    {
      question: "Can it compare large files?",
      answer:
        "Yes, documents with tens of thousands of values compare in well under a second on a typical computer. If there are more than 5,000 differences, the first 5,000 are listed and the totals are still shown.",
    },
    {
      question: "Why are array items shown as changed when I only inserted one?",
      answer:
        "Arrays are compared by position, because the order of items is part of the data. Inserting an item shifts every following item, so each one is reported as changed.",
    },
  ],
  related: ["diff-checker", "json-formatter", "json-schema-validator", "json-to-typescript"],
};

export const metadata = toolMetadata(slug, content);

export default function JsonDiffPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <JsonDiffChecker />
    </ToolPage>
  );
}
