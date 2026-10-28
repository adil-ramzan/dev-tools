import { SlugGenerator } from "@/components/tools/slug-generator/SlugGenerator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "slug-generator";

const content: ToolPageContent = {
  metaDescription:
    "Turn titles into URL slugs, safe file names or code identifiers. Removes accents, transliterates Greek and Cyrillic, and lets you choose separator and case.",
  howItWorks: [
    "Type or paste one or more titles; each line becomes a slug. Choose URL slug, File name or Identifier, a separator and a case, and the slugs update as you type.",
    "The text is normalized in a fixed order. First, Unicode NFKC turns compatibility characters into ordinary ones (full-width ｆｕｌｌ becomes full, the ligature ﬁ becomes fi). Next, & becomes \"and\" and letters that do not decompose are spelled out (ß → ss, æ → ae, ø → o, ł → l). Then accents are removed (é → e), Greek and Cyrillic are transliterated, and apostrophes inside words are dropped (don't → dont).",
    "Finally, each run of spaces and punctuation becomes a single separator, with none at the start or end. A maximum length cuts at a word boundary when possible.",
  ],
  notes: [
    "Scripts without a standard Latin spelling, such as Chinese, Japanese or Arabic, are removed and listed in a warning. Turn on \"Keep non-Latin letters\" for Unicode slugs; browsers display them, but they are percent-encoded in the underlying URL.",
    "File name mode keeps the last extension (lowercased), removes path separators and characters Windows does not allow, and renames reserved names such as CON or NUL.",
    "Identifier mode uses underscores, is always ASCII, and adds a leading underscore when the result would start with a digit. It does not check language keywords such as class or for.",
    "Transliteration follows simple, predictable rules, not the official standard of each language.",
  ],
  example: {
    description: "A title with accents, an ampersand and punctuation:",
    input: "Crème Brûlée & Café: 10 Tips!",
    output: "creme-brulee-and-cafe-10-tips",
  },
  faqs: [
    {
      question: "What is a slug?",
      answer: "The readable part of a URL that identifies a page, such as my-first-post in example.com/blog/my-first-post. Good slugs are short, lowercase and use hyphens between words.",
    },
    {
      question: "Hyphens or underscores?",
      answer: "Use hyphens in URLs: search engines treat them as word separators, and underscores can be hidden by link underlines. Underscores are common in file names and code identifiers.",
    },
    {
      question: "Why did some characters disappear?",
      answer:
        "In ASCII mode, only the letters A–Z and digits 0–9 are kept. Accented letters and Greek and Cyrillic are converted, but scripts like Chinese have no simple Latin spelling, so they are removed and listed. Use Unicode mode to keep them.",
    },
    {
      question: "Are slugs unique?",
      answer: "No. Different titles can produce the same slug, such as Café and Cafe. Check for duplicates in your system and add a number if needed.",
    },
  ],
  related: ["text-case-converter", "url-encoder-decoder", "list-converter", "string-obfuscator"],
};

export const metadata = toolMetadata(slug, content);

export default function SlugGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <SlugGenerator />
    </ToolPage>
  );
}
