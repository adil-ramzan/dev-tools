import { RegexTester } from "@/components/tools/regex-tester/RegexTester";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "regex-tester";

const content: ToolPageContent = {
  metaDescription:
    "Test JavaScript regular expressions online. See every match highlighted, with positions, numbered and named groups, and protection against patterns that hang.",
  howItWorks: [
    "Enter a regular expression, choose flags and paste the text to search. Matches are highlighted as you type, and the table lists each match with its position and capture groups, including named groups such as `(?<year>\\d{4})`.",
    "Patterns run with your browser's own JavaScript regular expression engine, so results match what `String.prototype.matchAll` and `RegExp.prototype.exec` return in your code. Syntax from other languages, such as possessive quantifiers or lookbehind in older browsers, may not be supported.",
    "Matching runs in a background worker. Some patterns, such as `(a+)+$`, can take exponentially long on certain text (catastrophic backtracking). If matching takes longer than one second, it is stopped and you see an explanation instead of a frozen page.",
  ],
  notes: [
    "Safety limits: matching stops after 1 second, at most 1,000 matches are collected, and the test text can be up to 100,000 characters.",
    "Without the g (global) flag, only the first match is found, just as with exec in JavaScript.",
    "Turn on the d flag to see the start and end position of each capture group.",
  ],
  example: {
    description: "Extracting dates with named groups, using the g flag:",
    input: `Pattern: (?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})
Text:    Released 2024-03-15, patched 2024-04-02.`,
    output: `Match 1: 2024-03-15  year=2024 month=03 day=15
Match 2: 2024-04-02  year=2024 month=04 day=02`,
  },
  faqs: [
    {
      question: "Which regex flavor does this tester use?",
      answer:
        "JavaScript (ECMAScript), as implemented by your browser. It is close to PCRE for everyday patterns, but some features differ, such as possessive quantifiers and recursion, which JavaScript does not support.",
    },
    {
      question: "Why was matching stopped after one second?",
      answer:
        "The pattern took too long on this text, usually because of catastrophic backtracking: nested or overlapping quantifiers such as (a+)+ or (.*)* that try a huge number of combinations. Make the pattern more specific, for example by replacing .* with [^,]*.",
    },
    {
      question: "What do the u and v flags do?",
      answer:
        "Both make the pattern treat text as Unicode code points, so emoji match as one character and \\p{...} property escapes work. The newer v flag adds set operations such as [\\p{L}--[a-z]]. They cannot be used together, and older browsers do not support v.",
    },
    {
      question: "Why does my pattern find a match of length zero?",
      answer:
        "Patterns that can match an empty string, such as a* or \\b, match between characters. Empty matches are shown as a thin marker in the highlighted text and as \"empty\" in the table.",
    },
  ],
  related: ["text-case-converter", "word-counter", "json-formatter"],
};

export const metadata = toolMetadata(slug, content);

export default function RegexTesterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <RegexTester />
    </ToolPage>
  );
}
