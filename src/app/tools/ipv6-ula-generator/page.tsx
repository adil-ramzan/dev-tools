import { UlaGenerator } from "@/components/tools/ipv6-ula-generator/UlaGenerator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "ipv6-ula-generator";

const content: ToolPageContent = {
  metaDescription:
    "Generate a random IPv6 Unique Local Address prefix (RFC 4193, fd00::/8) with a secure 40-bit Global ID, and list its /64 subnets.",
  howItWorks: [
    "A prefix is generated as soon as the page opens: `fd` followed by a 40-bit Global ID from your browser's secure random number generator (`crypto.getRandomValues`), giving a /48 such as `fd3c:4d5e:6f70::/48`.",
    "Choose how many /64 subnets to list and the first subnet ID (in hex). The 16 bits after the /48 number up to 65,536 subnets, so `fd3c:4d5e:6f70:1::/64` is subnet 1.",
    "Copy the prefix, its full notation or the subnet list, or download them. Select Generate new prefix only when you need one for another site; Reset restores the subnet settings without changing the prefix.",
  ],
  notes: [
    "Addresses are written in the canonical form of RFC 5952: lowercase, no leading zeros, and the longest run of zero groups shortened to ::.",
    "RFC 4193 suggests deriving the Global ID from a hash of the time and a hardware address, but allows any method that is sufficiently random. Drawing 40 bits from a secure generator meets that.",
    "ULAs are for use inside a site or between cooperating sites. They are not routed on the public internet.",
    "Nothing is sent anywhere; the prefix exists only on this page until you copy it.",
  ],
  example: {
    description: "A generated prefix and its first subnets:",
    input: "Global ID 3c4d5e6f70",
    output: `fd3c:4d5e:6f70::/48
fd3c:4d5e:6f70::/64
fd3c:4d5e:6f70:1::/64
fd3c:4d5e:6f70:2::/64`,
  },
  faqs: [
    {
      question: "Why fd and not fc?",
      answer: "ULAs live in fc00::/7. The eighth bit (L) must be 1 for locally assigned prefixes, which gives fd00::/8. The fc00::/8 half is reserved for a central registry that was never created.",
    },
    {
      question: "Why should the Global ID be random?",
      answer: "So that two networks that later connect, through a merger or a VPN, are very unlikely to use the same prefix. With 40 random bits, the chance of a collision between two sites is about one in a trillion.",
    },
    {
      question: "Do I need a ULA if I have a global IPv6 prefix?",
      answer: "Not necessarily. ULAs are useful for stable internal addresses that do not change when your ISP changes your global prefix, and for networks with no internet connection.",
    },
    {
      question: "Is fd00::/64 a good prefix to use?",
      answer: "No. Using all zeros, or another made-up value, defeats the purpose of the random Global ID and makes collisions likely when networks are joined.",
    },
  ],
  related: ["ipv4-subnet-calculator", "mac-address-lookup", "uuid-generator", "random-port-generator"],
};

export const metadata = toolMetadata(slug, content);

export default function Ipv6UlaGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <UlaGenerator />
    </ToolPage>
  );
}
