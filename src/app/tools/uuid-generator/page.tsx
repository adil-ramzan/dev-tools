import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import { UuidGenerator } from "@/components/tools/uuid-generator/UuidGenerator";
import type { ToolPageContent } from "@/types/tool";

const slug = "uuid-generator";

const content: ToolPageContent = {
  metaDescription:
    "Generate random version 4 UUIDs (GUIDs) online, up to 1,000 at a time, using your browser's cryptographically secure random number generator.",
  howItWorks: [
    "A UUID (universally unique identifier, also called a GUID) is a 128-bit value written as 32 hexadecimal digits in five groups, such as `3f2b8c1e-9d4a-4e6f-b1c7-2a5d8e9f0b13`. Version 4 UUIDs are random, so they can be created anywhere without coordinating with a central server.",
    "UUIDs are generated in your browser with `crypto.randomUUID()`, or with `crypto.getRandomValues()` where that is not available. Both use the operating system's cryptographically secure random number generator, not `Math.random()`.",
    "Choose how many you need, from 1 to 1,000, and select Generate. Uppercase, hyphens and braces only change how the UUIDs are displayed, so you can switch formats without generating new values.",
  ],
  notes: [
    "Each version 4 UUID has 122 random bits. The chance of generating the same UUID twice is so small that it can be ignored in practice.",
    "Random UUIDs are not sorted by creation time. If you need identifiers that sort in time order, for example as database keys, consider UUID version 7.",
  ],
  example: {
    description: "Two UUIDs in the default format and with uppercase, no hyphens and braces:",
    input: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    inputLabel: "Default",
    output: "{9B1DEB4D3B7D4BAD9BDD2B0D7B3DCB6D}",
    outputLabel: "Uppercase, no hyphens, braces",
  },
  faqs: [
    {
      question: "Is a UUID the same as a GUID?",
      answer:
        "Yes. GUID (globally unique identifier) is Microsoft's name for the same format. GUIDs are often shown in uppercase and wrapped in braces, which you can switch on here.",
    },
    {
      question: "Are these UUIDs safe to use as secret tokens?",
      answer:
        "They come from a cryptographically secure generator, but UUIDs are designed to be unique, not secret. For session tokens or API keys, use a purpose-built token with more randomness, such as 256 random bits.",
    },
    {
      question: "How can I tell that a UUID is version 4?",
      answer:
        "The first digit of the third group is always 4, and the first digit of the fourth group is 8, 9, a or b. For example, in 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d, the third group starts with 4 and the fourth with 9.",
    },
    {
      question: "Why is there a limit of 1,000?",
      answer:
        "It keeps the page responsive and the result easy to copy. Generate again if you need more; each batch is independent.",
    },
  ],
  related: ["base64-encoder-decoder", "json-formatter", "text-case-converter"],
};

export const metadata = toolMetadata(slug, content);

export default function UuidGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <UuidGenerator />
    </ToolPage>
  );
}
