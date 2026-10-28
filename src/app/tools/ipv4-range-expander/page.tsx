import { RangeExpander } from "@/components/tools/ipv4-range-expander/RangeExpander";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "ipv4-range-expander";

const content: ToolPageContent = {
  metaDescription:
    "Expand a CIDR block or IPv4 address range into a list of addresses, with a size estimate first and a safe output limit for large ranges.",
  howItWorks: [
    "Enter a CIDR block such as `192.168.1.0/28`, or a range such as `10.0.0.10 - 10.0.0.50`. Before anything is generated, the tool shows how many addresses the range contains.",
    "Select Expand to list them, one per line or separated by commas or spaces, then copy or download the list. Turn on Skip network and broadcast addresses to list only the usable hosts of a CIDR block.",
    "Large ranges are listed only up to the output limit (1,024 by default, at most 65,536), and the tool says when the list is incomplete. A /8 holds 16.7 million addresses; listing them all would freeze the browser.",
  ],
  notes: [
    "Ranges can cross octet boundaries, such as 10.0.0.250 - 10.0.1.5.",
    "Ranges can also be written with \"to\" or a comma between the two addresses.",
    "Addresses are generated in your browser; the range is not sent anywhere.",
  ],
  example: {
    description: "A small CIDR block:",
    input: "192.168.1.0/30",
    output: `192.168.1.0
192.168.1.1
192.168.1.2
192.168.1.3`,
  },
  faqs: [
    {
      question: "How many addresses are in a CIDR block?",
      answer: "2 to the power of (32 − prefix): a /24 has 256, a /16 has 65,536 and a /8 has 16,777,216. The tool shows the exact count before expanding.",
    },
    {
      question: "Why is the output limited?",
      answer: "Listing millions of addresses would use hundreds of megabytes of memory and freeze the page. For large ranges, work with the CIDR notation or split the range into smaller blocks.",
    },
    {
      question: "Should I include the network and broadcast addresses?",
      answer: "For lists of hosts to scan or configure, no: skip them. For firewall rules or documentation of the whole block, include them.",
    },
    {
      question: "Can I expand IPv6 ranges?",
      answer: "No. IPv6 blocks are far too large to list; even a /64 has 18 quintillion addresses.",
    },
  ],
  related: ["ipv4-subnet-calculator", "ipv4-address-converter", "list-converter", "random-port-generator"],
};

export const metadata = toolMetadata(slug, content);

export default function Ipv4RangeExpanderPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <RangeExpander />
    </ToolPage>
  );
}
