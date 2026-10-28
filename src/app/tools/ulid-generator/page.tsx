import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import { UlidGenerator } from "@/components/tools/ulid-generator/UlidGenerator";
import type { ToolPageContent } from "@/types/tool";

const slug = "ulid-generator";

const content: ToolPageContent = {
  metaDescription:
    "Generate ULIDs, unique IDs that sort by creation time, one at a time or in bulk with a secure random source. Decode the timestamp inside any ULID.",
  howItWorks: [
    "A ULID is a 26-character identifier written in Crockford Base32. The first 10 characters encode the time it was created, in milliseconds since 1970 (48 bits), and the last 16 characters are random (80 bits). Because the time comes first, ULIDs sort in creation order as plain strings.",
    "Choose how many ULIDs you need and select Generate. The random part comes from your browser's cryptographically secure generator (`crypto.getRandomValues`), never `Math.random`. If it is unavailable, the tool shows an error instead of producing weaker IDs.",
    "With Monotonic on, ULIDs created in the same millisecond reuse the previous random part plus one, so a batch stays in exact order. Paste any ULID under \"Inspect a ULID\" to read its timestamp and random part.",
  ],
  notes: [
    "ULIDs expose their creation time to anyone who sees them, and monotonic ULIDs from the same millisecond can be predicted from each other. Do not use them as secrets.",
    "Crockford Base32 leaves out I, L, O and U to avoid confusion with 1, 0 and V. Decoding is case-insensitive, as the specification requires.",
    "The timestamp supports dates up to the year 10889, so the first character is always 0 to 7.",
  ],
  example: {
    description: "A ULID and its two parts:",
    input: "01ARYZ6S41TSV4RRFFQ69G5FAV",
    output: `Timestamp   01ARYZ6S41  → 2016-07-30T22:36:16.385Z
Randomness  TSV4RRFFQ69G5FAV`,
  },
  faqs: [
    {
      question: "ULID or UUID?",
      answer:
        "Both are 128-bit unique IDs. ULIDs sort by creation time and are shorter to write (26 characters instead of 36), which helps database indexes. UUID v4 is fully random and more widely supported. UUID v7 offers the same time ordering in UUID format.",
    },
    {
      question: "Can two ULIDs collide?",
      answer: "In practice, no. Two ULIDs created in the same millisecond share their first 10 characters, but the 80-bit random parts would have to match as well.",
    },
    {
      question: "What does monotonic mean?",
      answer: "That each ULID is greater than the previous one, even within the same millisecond, because the random part is incremented instead of regenerated.",
    },
    {
      question: "Are ULIDs case-sensitive?",
      answer: "No. The canonical form is uppercase, but lowercase ULIDs are equal and decode to the same value.",
    },
  ],
  related: ["uuid-generator", "token-generator", "unix-timestamp-converter", "hash-generator"],
};

export const metadata = toolMetadata(slug, content);

export default function UlidGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <UlidGenerator />
    </ToolPage>
  );
}
