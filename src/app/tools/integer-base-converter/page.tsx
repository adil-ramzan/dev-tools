import { IntegerBaseConverter } from "@/components/tools/integer-base-converter/IntegerBaseConverter";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "integer-base-converter";

const content: ToolPageContent = {
  metaDescription:
    "Convert integers between binary, octal, decimal and hex with exact BigInt arithmetic. Supports negative and very large numbers and two's complement.",
  howItWorks: [
    "Choose the base of your number, then type it. The tool shows the same integer in binary (base 2), octal (base 8), decimal (base 10) and hexadecimal (base 16) as you type.",
    "Conversion uses JavaScript's `BigInt`, so numbers of any size are exact. Ordinary JavaScript numbers lose precision above 9,007,199,254,740,991; here `9007199254740993` stays exactly that.",
    "Input may start with a sign and a prefix that matches its base (`0b`, `0o` or `0x`), and may use underscores or spaces between digits, as in `0b1111_0000`. Every digit is checked against the chosen base, and the first invalid one is reported with its position.",
  ],
  notes: [
    "Negative numbers are shown with a minus sign in every base, such as `-0xFF`. To see the bit pattern a computer stores, choose a two's complement width (8 to 128 bits).",
    "Only whole numbers are converted. Fractions and exponent notation such as `1e6` are rejected rather than rounded.",
    "In hexadecimal, `0b` is read as two hex digits (`0x0B…`), not as a binary prefix.",
    "Inputs are limited to 10,000 digits so the page stays responsive.",
  ],
  example: {
    description: "A 64-bit value that ordinary JavaScript numbers cannot hold exactly:",
    input: "18446744073709551617",
    output: `Binary       10000000000000000000000000000000000000000000000000000000000000001
Octal        2000000000000000000001
Hexadecimal  10000000000000001`,
  },
  faqs: [
    {
      question: "How do I convert a negative number to hex?",
      answer:
        "Enter it with a minus sign, for example -255, to get -FF. If you need the two's complement form used by computers (FF for -1 in 8 bits), choose a bit width under Two's complement.",
    },
    {
      question: "Why do other converters give wrong results for large numbers?",
      answer:
        "Many use JavaScript's Number type, which stores integers exactly only up to 2^53 − 1. Beyond that, digits are rounded. This tool uses BigInt, which has no such limit.",
    },
    {
      question: "Are letters in hexadecimal case-sensitive?",
      answer: "No. Input accepts a–f and A–F. Choose Uppercase hex to control the output.",
    },
    {
      question: "Can I convert to base 36 or other bases?",
      answer: "Not currently. The tool covers the four bases used most in programming: 2, 8, 10 and 16.",
    },
  ],
  related: ["text-to-binary-converter", "color-converter", "hash-generator", "unix-timestamp-converter"],
};

export const metadata = toolMetadata(slug, content);

export default function IntegerBaseConverterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <IntegerBaseConverter />
    </ToolPage>
  );
}
