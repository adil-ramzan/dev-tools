import { PxRemConverter } from "@/components/tools/px-to-rem-converter/PxRemConverter";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "px-to-rem-converter";

const content: ToolPageContent = {
  metaDescription:
    "Convert px to rem and rem to px with a custom root font size. Paste single values, lists or whole CSS rules and copy the converted result.",
  howItWorks: [
    "rem is relative to the font size of the root element, `html`. Browsers set it to 16px by default, so 1rem = 16px, 24px = 1.5rem and 0.5rem = 8px. Enter a different root size if your site changes it.",
    "Paste values one per line or separated by commas, or paste whole CSS rules. In CSS, every value with the source unit is converted where it appears and everything else, including other units, colors and formatting, is left exactly as it was.",
    "Using rem for font sizes and spacing lets your layout scale when people increase their browser's default font size, which is an important accessibility setting.",
  ],
  notes: [
    "The root font size is an assumption: if your CSS sets html { font-size: 62.5% }, the root is 10px; if it is left alone, it is usually 16px.",
    "Keep 1px values is useful for hairline borders, which should usually stay 1px.",
    "Results are rounded to the number of decimal places you choose, with trailing zeros removed.",
  ],
  example: {
    description: "Converting a CSS rule from px to rem at a 16px root:",
    input: `.card {
  padding: 24px 32px;
  font-size: 18px;
}`,
    output: `.card {
  padding: 1.5rem 2rem;
  font-size: 1.125rem;
}`,
  },
  faqs: [
    {
      question: "How many pixels is 1rem?",
      answer: "16px by default in all major browsers. It changes if your CSS sets a different font size on the html element, or if the user changes their browser's default font size.",
    },
    {
      question: "What is the difference between rem and em?",
      answer:
        "rem is relative to the root html element, so it is the same everywhere on the page. em is relative to the font size of the current element, so it compounds when elements are nested.",
    },
    {
      question: "Should I use rem for everything?",
      answer:
        "rem is a good choice for font sizes, spacing and widths that should grow with text size. Borders and small details such as 1px dividers are often better left in px.",
    },
    {
      question: "Why does my value have so many decimals?",
      answer: "Some pixel values do not divide evenly by the root size, such as 10px at 16px (0.625rem). Choose fewer decimal places to round the result.",
    },
  ],
  related: ["flexbox-playground", "css-box-shadow-generator", "color-converter", "css-gradient-generator"],
};

export const metadata = toolMetadata(slug, content);

export default function PxRemConverterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <PxRemConverter />
    </ToolPage>
  );
}
