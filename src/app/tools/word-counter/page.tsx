import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import { WordCounter } from "@/components/tools/word-counter/WordCounter";
import type { ToolPageContent } from "@/types/tool";

const slug = "word-counter";

const content: ToolPageContent = {
  metaDescription:
    "Count words, characters, sentences, lines and paragraphs as you type. Handles emoji, accents and Chinese or Japanese text, and shows UTF-8 byte size.",
  howItWorks: [
    "Type or paste text and the counts update as you go. Counting happens in your browser using its built-in Unicode text segmentation (`Intl.Segmenter`), so results follow the same rules your browser uses for selecting words and characters.",
    "Besides the usual counts, the tool shows the UTF-8 byte size and the number of UTF-16 code units. These are useful for database column limits, HTTP headers, and checking what `string.length` returns in JavaScript.",
  ],
  notes: [
    "Characters are counted as you see them: an emoji like 👍🏽 or an accented letter counts as one character, even when it is stored as several code points.",
    "Words are separated by spaces. Hyphenated words (state-of-the-art) and contractions (don't) count as one word. Text in languages written without spaces, such as Chinese, Japanese and Thai, is split into words by your browser.",
    "Sentence counts are estimates: abbreviations such as \"e.g.\" or \"Dr.\" can be read as the end of a sentence.",
    "Lines count every line break, so text ending with a line break has one extra, empty line, just as a code editor shows it.",
  ],
  example: {
    description: "Counting a short text with an emoji. The emoji counts as one character but takes 4 bytes in UTF-8 and 2 UTF-16 code units, and it is not counted as a word:",
    input: "Ship it! 🚀\nThe release notes are ready.",
    inputLabel: "Text",
    output: `Words: 7
Characters: 39
Characters without spaces: 32
Sentences: 2
Lines: 2
UTF-8 bytes: 42
UTF-16 code units: 40`,
    outputLabel: "Counts",
  },
  faqs: [
    {
      question: "Why do the character count and string.length differ?",
      answer:
        "JavaScript's string.length counts UTF-16 code units, so an emoji can count as 2 or more. The character count here counts what you see on screen. Both numbers are shown so you can use whichever your system expects.",
    },
    {
      question: "Does the word count match Microsoft Word or Google Docs?",
      answer:
        "For English and other space-separated languages it follows the same convention, counting runs of text between spaces. Counts can differ slightly for text with unusual punctuation or for Chinese and Japanese, where each program uses its own segmentation rules.",
    },
    {
      question: "Do numbers count as words?",
      answer: "Yes. Any run of text containing a letter or a digit counts as a word, so \"2024\" and \"v2\" each count as one.",
    },
    {
      question: "Why is the UTF-8 byte count higher than the character count?",
      answer:
        "UTF-8 uses one byte for basic Latin letters but two to four bytes for accented letters, other scripts and emoji. Byte size matters when a system limits storage in bytes rather than characters.",
    },
  ],
  related: ["text-case-converter", "regex-tester", "base64-encoder-decoder", "url-encoder-decoder"],
};

export const metadata = toolMetadata(slug, content);

export default function WordCounterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <WordCounter />
    </ToolPage>
  );
}
