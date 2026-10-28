import { MacLookup } from "@/components/tools/mac-address-lookup/MacLookup";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "mac-address-lookup";

const content: ToolPageContent = {
  metaDescription:
    "Look up the registered vendor of a MAC address from the IEEE OUI registry, bundled in the page, and convert it between colon, hyphen and Cisco formats. No online lookup.",
  howItWorks: [
    "Enter one MAC address per line, written with colons (`00:1A:2B:3C:4D:5E`), hyphens, Cisco dots (`001a.2b3c.4d5e`), spaces or no separators. You can also enter just the first six digits (the OUI).",
    "Each address is matched against the IEEE Registration Authority's public registries, bundled with this page: MA-S (36-bit) blocks first, then MA-M (28-bit), then MA-L (24-bit), so the most specific assignment wins.",
    "The result shows the organization the block is registered to, its country, and what the address's own bits say: unicast or multicast, globally unique or locally administered. For a single address you also get every notation, ready to copy.",
  ],
  notes: [
    "The vendor is the organization the prefix is registered to. A device may contain a network chip from another company, so it is not always the brand on the box.",
    "Locally administered addresses, including the random Wi-Fi addresses phones and laptops use for privacy, have no vendor. The tool says so instead of guessing.",
    "If a prefix is not in the registry, the tool reports that it is unregistered or newer than the bundled data. It never invents a vendor.",
    "Lookups run in your browser against the bundled list; addresses are not sent anywhere.",
  ],
  example: {
    description: "A Raspberry Pi network interface:",
    input: "B8-27-EB-AA-BB-CC",
    output: "B8:27:EB:AA:BB:CC  Raspberry Pi Foundation (MA-L block B827EB, United States)",
  },
  faqs: [
    {
      question: "What is an OUI?",
      answer: "An Organizationally Unique Identifier: the first 24 bits of a MAC address, assigned to an organization by the IEEE. MA-M and MA-S assignments are smaller blocks that use 28 or 36 bits.",
    },
    {
      question: "Why does my phone's address have no vendor?",
      answer: "Modern phones and laptops use a random, locally administered MAC address on each Wi-Fi network for privacy. The second-lowest bit of the first byte marks it (addresses starting x2, x6, xA or xE), and such addresses are not registered to anyone.",
    },
    {
      question: "How current is the vendor list?",
      answer: "It is the IEEE public registry as packaged in oui-data, bundled when this site was built. New assignments made afterwards show as not found until the data is updated.",
    },
    {
      question: "Can a MAC address identify a specific device?",
      answer: "Only within a local network, and it can be changed in software. The registry tells you who a block was assigned to, nothing about the owner of an individual device.",
    },
  ],
  related: ["ipv6-ula-generator", "ipv4-subnet-calculator", "integer-base-converter", "device-information"],
};

export const metadata = toolMetadata(slug, content);

export default function MacAddressLookupPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <MacLookup />
    </ToolPage>
  );
}
