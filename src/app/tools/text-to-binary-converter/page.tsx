import { TextToBinaryConverter } from "@/components/tools/text-to-binary-converter/TextToBinaryConverter";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "text-to-binary-converter";

const content: ToolPageContent = {
  metaDescription:
    "Convert text to binary using UTF-8, with every byte as 8 bits, and decode binary back to text. Supports emoji and all languages, with clear errors.",
  howItWorks: [
    "Encode converts your text to UTF-8 bytes and writes each byte as exactly 8 bits, most significant bit first. Choose whether bytes are separated by spaces, new lines or nothing.",
    "UTF-8 uses one byte for ASCII characters and two to four for others: `é` is 2 bytes, `€` is 3 and `😀` is 4. The table under the tool shows each character, its Unicode code point and its bytes, so you can see how they map.",
    "Decode reads bytes separated by spaces, line breaks or commas, or one continuous string of bits. Each byte must have exactly 8 bits and the bytes must form valid UTF-8; otherwise the tool says which byte is wrong.",
  ],
  notes: [
    "Binary here means bytes of UTF-8 text, the encoding used by the web. Other encodings, such as Latin-1 or UTF-16, give different bits for the same text.",
    "Missing leading zeros are not added for you: `1010` is rejected rather than read as `00001010`, because a dropped bit would shift every following byte.",
    "Input is limited to 1 MB.",
  ],
  example: {
    description: "Two ASCII characters and one two-byte character:",
    input: "Hi é",
    output: "01001000 01101001 00100000 11000011 10101001",
  },
  faqs: [
    {
      question: "Why does one character produce several bytes?",
      answer:
        "Characters outside ASCII need more than 8 bits in UTF-8. Accented letters usually take 2 bytes, most other scripts 3, and emoji 4.",
    },
    {
      question: "Why does decoding say a byte starts an invalid UTF-8 sequence?",
      answer:
        "The bits are not valid UTF-8: a multibyte character may be cut off, a bit may be missing, or the data may use another encoding, such as Latin-1, where é is the single byte 11101001.",
    },
    {
      question: "Can I decode binary without spaces?",
      answer: "Yes, as long as the total number of bits is a multiple of 8. The tool splits it into bytes from the start.",
    },
    {
      question: "How do I convert a number to binary?",
      answer: "Use the Integer Base Converter. This tool converts text characters, so the digit 5 becomes its character code 00110101, not 101.",
    },
  ],
  related: ["integer-base-converter", "base64-encoder-decoder", "hash-generator", "url-encoder-decoder"],
};

export const metadata = toolMetadata(slug, content);

export default function TextToBinaryConverterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <TextToBinaryConverter />
    </ToolPage>
  );
}
