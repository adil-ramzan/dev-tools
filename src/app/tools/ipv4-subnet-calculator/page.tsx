import { SubnetCalculator } from "@/components/tools/ipv4-subnet-calculator/SubnetCalculator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "ipv4-subnet-calculator";

const content: ToolPageContent = {
  metaDescription:
    "Calculate an IPv4 subnet's network and broadcast address, subnet and wildcard mask, usable host range and host count from an address and CIDR prefix.",
  howItWorks: [
    "Enter an IPv4 address with a prefix, such as `192.168.10.77/26`, or type the address and choose the prefix from the list. You can also write a subnet mask after the slash, as in `10.0.0.1/255.255.255.0`.",
    "The calculator shows the network address, subnet mask, wildcard mask, broadcast address, first and last usable addresses, and the number of usable hosts and total addresses, each with a copy button. It also shows the address and mask in binary and what kind of address it is: public, private (RFC 1918), CGNAT, loopback, link-local, multicast or another special-purpose range.",
    "Small subnets follow the standards: a `/31` has two usable addresses and no broadcast address, for point-to-point links (RFC 3021), and a `/32` is a single host.",
  ],
  notes: [
    "Usable hosts are the total minus the network and broadcast addresses, except for /31 and /32.",
    "Addresses with leading zeros, such as 010.0.0.1, are rejected because some systems read them as octal.",
    "Address classes (A to E) are shown for reference only; networks have used CIDR prefixes instead of classes since 1993.",
    "Everything is calculated in your browser; the address is not sent anywhere.",
  ],
  example: {
    description: "A /26 subnet:",
    input: "192.168.10.77/26",
    output: `Network      192.168.10.64/26
Subnet mask  255.255.255.192
Broadcast    192.168.10.127
Usable       192.168.10.65 – 192.168.10.126
Hosts        62`,
  },
  faqs: [
    {
      question: "How many hosts are in a /24?",
      answer: "256 addresses, of which 254 can be assigned to hosts: the first is the network address and the last is the broadcast address.",
    },
    {
      question: "What is a wildcard mask?",
      answer: "The inverse of the subnet mask (0.0.0.255 for a /24). Cisco access lists and OSPF configuration use it to match ranges of addresses.",
    },
    {
      question: "Why does a /31 have two usable hosts?",
      answer: "RFC 3021 allows /31 networks on point-to-point links, where no broadcast address is needed, so both addresses are assigned to the two ends of the link.",
    },
    {
      question: "Which IPv4 ranges are private?",
      answer: "10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16 (RFC 1918). They are not routed on the internet and are reused in many local networks.",
    },
  ],
  related: ["ipv4-address-converter", "ipv4-range-expander", "ipv6-ula-generator", "integer-base-converter"],
};

export const metadata = toolMetadata(slug, content);

export default function Ipv4SubnetCalculatorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <SubnetCalculator />
    </ToolPage>
  );
}
