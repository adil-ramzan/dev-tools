import { PortGenerator } from "@/components/tools/random-port-generator/PortGenerator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "random-port-generator";

const content: ToolPageContent = {
  metaDescription:
    "Generate random TCP/UDP port numbers from any range in 0–65535, skipping well-known, common service and custom ports. Unbiased and secure; runs in your browser.",
  howItWorks: [
    "Set the lowest and highest port and how many ports you need. The presets select the registered (1024–49151), dynamic (49152–65535) or full range.",
    "Choose what to skip: well-known ports, a list of common service ports (databases, dev servers, Docker, Kubernetes and others), the dynamic range, and any ports or ranges of your own such as `8000-8100, 9229`. The tool shows how many ports remain.",
    "Each port is drawn with `crypto.getRandomValues` using rejection sampling, so every allowed port is equally likely. With No repeats on, the ports are all different.",
  ],
  notes: [
    "A generated port is not checked for availability: the page cannot see which ports are in use on your machine. Check before using it, or bind to port 0 to let the operating system choose a free one.",
    "Ports below 1024 usually need administrator rights to listen on.",
    "Ports in the dynamic range (49152–65535) are also used by the operating system for outgoing connections, so they can be taken at any moment.",
    "Port 0 is not a real port: binding to it asks the operating system to pick one. It is excluded with the well-known ports.",
  ],
  example: {
    description: "Five ports from the registered range, skipping common services:",
    input: "1024–49151, 5 ports, no repeats",
    output: `23817
41092
7314
30655
18240`,
  },
  faqs: [
    {
      question: "Which port range should I use for a development server?",
      answer: "The registered range (1024–49151), avoiding ports other software is likely to use. Excluding the common service ports and the dynamic range is a good default.",
    },
    {
      question: "How is the randomness unbiased?",
      answer: "Taking a 32-bit random value modulo the number of ports would make some ports slightly more likely. The tool discards values from the uneven top end of the 32-bit range and draws again, so each allowed port has exactly the same chance.",
    },
    {
      question: "Why is the tool saying not enough ports are allowed?",
      answer: "With No repeats on, you cannot draw more ports than remain after the exclusions. Widen the range, remove exclusions or allow repeats.",
    },
    {
      question: "Are TCP and UDP ports different?",
      answer: "They are separate number spaces, so the same number can be used by a TCP and a UDP service at once. Port number ranges and conventions are the same for both.",
    },
  ],
  related: ["ipv4-subnet-calculator", "token-generator", "uuid-generator", "docker-run-to-compose"],
};

export const metadata = toolMetadata(slug, content);

export default function RandomPortGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <PortGenerator />
    </ToolPage>
  );
}
