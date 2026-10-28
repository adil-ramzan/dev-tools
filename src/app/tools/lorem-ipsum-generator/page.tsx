import { LoremIpsumGenerator } from "@/components/tools/lorem-ipsum-generator/LoremIpsumGenerator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "lorem-ipsum-generator";

const content: ToolPageContent = {
  metaDescription:
    "Generate lorem ipsum placeholder text as paragraphs, sentences, words or list items, in plain text or HTML, and copy it in one click.",
  howItWorks: [
    "Choose what to generate (paragraphs, sentences, words or list items) and how many, and the text appears immediately. Select Regenerate for a new variation.",
    "Choose HTML to wrap the text in `<p>` elements or a `<ul>` list, ready to paste into a template. Turn off the classic opening if you do not want the text to start with \"Lorem ipsum dolor sit amet\".",
    "The text is built from the traditional lorem ipsum vocabulary, scrambled Latin derived from Cicero's \"De finibus bonorum et malorum\", so it looks like natural text without drawing attention to its meaning.",
  ],
  notes: [
    "Limits: 100 paragraphs, 1,000 sentences, 10,000 words or 200 list items at a time.",
    "HTML output is escaped and well-formed.",
    "Text is generated in your browser. It is random filler, not meaningful Latin.",
    "Replace placeholder text before launch: lorem ipsum left on a live page is a common mistake, and search engines treat it as low-quality content.",
  ],
  example: {
    description: "Two list items as HTML:",
    input: "List items · 2 · HTML",
    output: `<ul>
  <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit</li>
  <li>Quis nostrud exercitation ullamco laboris nisi aliquip</li>
</ul>`,
  },
  faqs: [
    {
      question: "What does lorem ipsum mean?",
      answer: "Nothing, by design. It is scrambled Latin taken from a work by Cicero in 45 BC. Typesetters have used it since the 1500s so that readers focus on layout rather than content.",
    },
    {
      question: "Why use placeholder text instead of real copy?",
      answer: "It shows how a design handles text of realistic length before the real content is ready. Test with real content as early as possible, though, because headings and sentence lengths vary.",
    },
    {
      question: "Can I get the same text every time?",
      answer: "The text is random each time. With the classic opening turned on, the first sentence is always \"Lorem ipsum dolor sit amet, consectetur adipiscing elit.\"",
    },
    {
      question: "Is the HTML safe to paste?",
      answer: "Yes. The output contains only p, ul and li elements, and all text is escaped.",
    },
  ],
  related: ["html-wysiwyg-editor", "word-counter", "svg-placeholder-generator", "markdown-editor"],
};

export const metadata = toolMetadata(slug, content);

export default function LoremIpsumGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <LoremIpsumGenerator />
    </ToolPage>
  );
}
