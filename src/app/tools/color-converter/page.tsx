import { ColorConverter } from "@/components/tools/color-converter/ColorConverter";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "color-converter";

const content: ToolPageContent = {
  metaDescription:
    "Convert colors between HEX, RGB and HSL, generate lighter and darker shades, and check text and background contrast against WCAG AA and AAA.",
  howItWorks: [
    "Enter a color in HEX (`#1f4fe0`), RGB (`rgb(31, 79, 224)`) or HSL (`hsl(225, 76%, 50%)`), or pick one, to see it in all three formats. Alpha is supported in every format, for example `#1f4fe080`, `rgb(31 79 224 / 50%)` or `hsla(225, 76%, 50%, 0.5)`.",
    "The shades are made by mixing your color with white and with black in steps, which gives a practical range of tints and shades for backgrounds, borders and hover states.",
    "The contrast checker calculates the WCAG 2 contrast ratio between a text color and a background, from 1:1 (no contrast) to 21:1 (black on white), and shows which WCAG levels it meets.",
  ],
  notes: [
    "Values outside their range, such as rgb(300, 0, 0) or 120% saturation, are rejected instead of being clamped, so mistakes are not hidden. Named colors such as red are not supported.",
    "Converted values are rounded: RGB to whole numbers and HSL to one decimal place, so converting back and forth can differ by one step.",
    "Contrast ratios are rounded down for display, so a ratio of 4.499 shows as 4.49:1 and fails AA, as WCAG requires.",
    "Translucent colors are blended before measuring contrast: the text onto the background, and a translucent background onto white.",
  ],
  example: {
    description: "Converting a HEX color and checking white text on it:",
    input: "#1f4fe0",
    output: `RGB  rgb(31, 79, 224)
HSL  hsl(225.1, 75.7%, 50%)
White text on it: 6.45:1, passes AA`,
  },
  faqs: [
    {
      question: "What contrast ratio does WCAG AA require?",
      answer:
        "At least 4.5:1 for normal text and 3:1 for large text (about 24px, or 19px bold) and for user interface components such as input borders. AAA requires 7:1 for normal text and 4.5:1 for large text.",
    },
    {
      question: "When should I use HSL instead of HEX?",
      answer:
        "HSL describes a color by hue, saturation and lightness, which makes it easy to create related colors by changing one value. HEX is compact and the most widely used in design tools. Browsers support both equally.",
    },
    {
      question: "What does the alpha value do?",
      answer:
        "Alpha sets transparency, from 0 (fully transparent) to 1 (opaque). In 8-digit HEX the last two digits are the alpha, so #1f4fe080 is about 50% opaque.",
    },
    {
      question: "Why does my color look different in another app?",
      answer:
        "This tool works in the sRGB color space used by CSS. Apps that use other color profiles, such as Display P3, can show the same numbers slightly differently.",
    },
  ],
  related: ["css-gradient-generator", "css-box-shadow-generator", "px-to-rem-converter", "flexbox-playground"],
};

export const metadata = toolMetadata(slug, content);

export default function ColorConverterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <ColorConverter />
    </ToolPage>
  );
}
