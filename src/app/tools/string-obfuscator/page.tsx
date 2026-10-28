import { StringObfuscator } from "@/components/tools/string-obfuscator/StringObfuscator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "string-obfuscator";

const content: ToolPageContent = {
  metaDescription:
    "Mask API keys, emails, card numbers and other values so they stay recognizable without being shown in full. Predictable rules, processed in your browser.",
  howItWorks: [
    "Paste one or more values, one per line. The tool keeps the first and last few characters visible and replaces the rest with a mask character, for example `sk_live_4eC39HqLyjWDarjtT1zdp7dc` becomes `sk****************************dc`.",
    "Choose how many characters to keep at each end and which mask character to use. Optionally keep spaces and punctuation (useful for card numbers), keep the domain of email addresses, or use a fixed number of mask characters so the original length is hidden.",
    "The rules are predictable: characters are counted as you see them, so an emoji is one character, and a value too short to keep that many characters visible while hiding at least one is masked completely.",
  ],
  notes: [
    "Masking is not encryption, hashing or anonymization. The visible characters, the length and the format still reveal information, and short or predictable values can be guessed.",
    "Treat any secret that was exposed, even partly, as compromised: rotate it.",
    "Input is processed in your browser and is never sent, saved or put in the URL.",
  ],
  example: {
    description: "Masking an email address while keeping its domain:",
    input: "ada.lovelace@example.com",
    output: "ad********ce@example.com",
  },
  faqs: [
    {
      question: "Is masked text safe to share publicly?",
      answer:
        "Not necessarily. Masking hides most characters, but what remains can still identify a person or narrow down a secret. Share masked values only where showing the real value would be acceptable if it were guessed.",
    },
    {
      question: "Can masked text be reversed?",
      answer: "The tool cannot reverse it, because the hidden characters are discarded. But short values, or values with a known format, can often be guessed from the characters that remain.",
    },
    {
      question: "How many characters should I keep visible?",
      answer: "As few as you need to recognize the value: usually the last 4 characters for card numbers and keys. Many API keys start with a fixed prefix like sk_live_ that reveals nothing secret.",
    },
    {
      question: "Why was my value masked completely?",
      answer: "It was too short to keep the requested characters visible and still hide anything. Reduce the number of characters to keep, or accept the full mask.",
    },
  ],
  related: ["token-generator", "hash-generator", "slug-generator", "list-converter"],
};

export const metadata = toolMetadata(slug, content);

export default function StringObfuscatorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <StringObfuscator />
    </ToolPage>
  );
}
