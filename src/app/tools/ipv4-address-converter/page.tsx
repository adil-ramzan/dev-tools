import { Ipv4Converter } from "@/components/tools/ipv4-address-converter/Ipv4Converter";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "ipv4-address-converter";

const content: ToolPageContent = {
  metaDescription:
    "Convert IPv4 addresses between dotted decimal, binary, hexadecimal and unsigned integer form, in either direction, with strict validation.",
  howItWorks: [
    "Enter an IPv4 address in any common form: dotted decimal (`192.168.1.1`), an unsigned 32-bit integer (`3232235777`), hexadecimal (`0xC0A80101`) or 32 binary digits, optionally grouped in bytes. The tool detects the form and shows all four, each ready to copy.",
    "If the input is ambiguous, for example `10101010` could be decimal or binary, choose the form under Read as.",
    "Every value is checked: integers must be from 0 to 4,294,967,295, hex values at most FFFFFFFF, binary exactly 32 bits, and dotted decimal four parts from 0 to 255 without leading zeros.",
  ],
  notes: [
    "Integers are the unsigned, big-endian value of the address, as stored by databases and used by functions such as MySQL's INET_ATON.",
    "Some tools accept shorthand forms such as 127.1 or 0x7f.1; they are rejected here because their meaning varies between systems.",
    "The address type (public, private and so on) is shown below the input.",
  ],
  example: {
    description: "One address in all four forms:",
    input: "192.168.1.1",
    output: `Integer      3232235777
Hexadecimal  0xC0A80101
Binary       11000000.10101000.00000001.00000001`,
  },
  faqs: [
    {
      question: "How is an IP address converted to an integer?",
      answer: "Each part is one byte: 192.168.1.1 = 192×256³ + 168×256² + 1×256 + 1 = 3,232,235,777.",
    },
    {
      question: "Why store IP addresses as integers?",
      answer: "Integers take 4 bytes instead of up to 15 characters and can be compared and range-checked directly, which makes lookups such as \"is this address in this network?\" fast.",
    },
    {
      question: "Why are leading zeros rejected?",
      answer: "Some systems read 010 as octal (8) and others as decimal (10), so an address like 010.0.0.1 can mean two different hosts.",
    },
    {
      question: "Can it convert IPv6 addresses?",
      answer: "No, this tool handles IPv4 only. The IPv6 ULA Generator works with IPv6 prefixes.",
    },
  ],
  related: ["ipv4-subnet-calculator", "integer-base-converter", "ipv4-range-expander", "text-to-binary-converter"],
};

export const metadata = toolMetadata(slug, content);

export default function Ipv4AddressConverterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <Ipv4Converter />
    </ToolPage>
  );
}
