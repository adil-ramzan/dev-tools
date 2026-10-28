import { HmacGenerator } from "@/components/tools/hmac-generator/HmacGenerator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "hmac-generator";

const content: ToolPageContent = {
  metaDescription:
    "Generate HMAC-SHA256, HMAC-SHA384 and HMAC-SHA512 signatures with text, hex or Base64 keys, and verify webhook signatures. Uses Web Crypto in your browser.",
  howItWorks: [
    "An HMAC (hash-based message authentication code, RFC 2104) proves that a message was created by someone who knows a secret key and has not been changed. APIs use it to sign webhooks and requests.",
    "Enter the secret key and the message, and choose the algorithm. The signature is computed as you type with your browser's Web Crypto API and shown as hex, Base64 or Base64URL.",
    "The key and the message each have an explicit encoding: UTF-8 text, hex or Base64. The text `00ff` and the hex bytes `00 ff` are different keys, so choose the encoding your API documentation uses. To check a signature you received, paste it under \"Compare with an expected signature\".",
  ],
  notes: [
    "Signatures depend on the exact bytes of the message. A webhook body that has been re-formatted, or has different line endings or a trailing newline, produces a different signature.",
    "RFC 2104 recommends a random key at least as long as the hash output: 32 bytes for SHA-256. Shorter keys get a warning.",
    "Hex input may include spaces and a `0x` prefix. Base64 input may be standard or URL-safe.",
    "Keys and messages are processed in your browser and are never sent, logged or saved.",
  ],
  example: {
    description: "RFC 4231 test case 2, HMAC-SHA256 with the text key `Jefe`:",
    input: "what do ya want for nothing?",
    output: "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
  },
  faqs: [
    {
      question: "What is the difference between a hash and an HMAC?",
      answer:
        "Anyone can compute a hash of a message. An HMAC also depends on a secret key, so only someone with the key can produce or check it. That makes it suitable for authenticating messages.",
    },
    {
      question: "Why doesn't my signature match the one from the API?",
      answer:
        "The usual causes are a different key encoding (text instead of hex or Base64), a message that is not byte-for-byte identical (re-serialized JSON, extra whitespace or a trailing newline), or a signature in a different output format. Many APIs also sign a timestamp together with the body.",
    },
    {
      question: "Is HMAC encryption?",
      answer: "No. The message stays readable; HMAC only proves who created it and that it was not changed. Use encryption to keep a message secret.",
    },
    {
      question: "Why are SHA-1 and MD5 not offered?",
      answer:
        "HMAC-SHA1 is still considered secure, but SHA-256 and stronger are the standard choice for new systems. Use the Hash Generator for unkeyed SHA-1 or MD5 digests.",
    },
  ],
  related: ["hash-generator", "token-generator", "bcrypt-hash-verify", "base64-encoder-decoder"],
};

export const metadata = toolMetadata(slug, content);

export default function HmacGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <HmacGenerator />
    </ToolPage>
  );
}
