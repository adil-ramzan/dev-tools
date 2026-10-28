import { HashGenerator } from "@/components/tools/hash-generator/HashGenerator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "hash-generator";

const content: ToolPageContent = {
  metaDescription:
    "Generate MD5, SHA-1, SHA-256, SHA-512, SHA-3 and RIPEMD-160 hashes of text in your browser, as hex or Base64. Free, with no upload.",
  howItWorks: [
    "A hash function turns input of any length into a fixed-length digest. The same input always gives the same digest, and changing a single character changes it completely, which makes hashes useful as checksums, cache keys and content identifiers.",
    "The tool encodes your text as UTF-8 and hashes the bytes. SHA-1, SHA-256, SHA-384 and SHA-512 use your browser's built-in Web Crypto API. MD5, SHA-224, SHA-3 and RIPEMD-160 are not part of Web Crypto, so they come from `@noble/hashes`, an audited library loaded only on this page.",
    "Choose the algorithms to show and the output format: lowercase hex, uppercase hex or Base64. Hashes update as you type, and each has its own copy button.",
  ],
  notes: [
    "MD5 and SHA-1 are broken for collision resistance: attackers can create two different inputs with the same hash. Use them only for non-security checksums or compatibility with existing systems.",
    "These are not password hashes. Fast, unsalted digests like SHA-256 can be guessed at billions per second; store passwords with Argon2id, scrypt or bcrypt.",
    "Line endings and trailing spaces are part of the input. Text typed in the browser uses LF (`\\n`) line endings, so a file saved with CRLF endings has a different hash.",
    "Your text is hashed in the browser and is never sent anywhere.",
  ],
  example: {
    description: "SHA-256 of a short string, in lowercase hex:",
    input: "abc",
    output: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  },
  faqs: [
    {
      question: "Can a hash be decrypted?",
      answer:
        "No. A hash is a one-way function, not encryption, and there is no key to reverse it. Short or common inputs can still be found by guessing and comparing hashes, which is why hashes alone do not protect secrets.",
    },
    {
      question: "Why does my hash differ from another tool's?",
      answer:
        "Usually the input bytes differ: a trailing newline, CRLF instead of LF line endings, or a different text encoding. This tool always hashes the exact text in the box as UTF-8.",
    },
    {
      question: "What is the difference between SHA-2 and SHA-3?",
      answer:
        "SHA-256 and SHA-512 belong to the SHA-2 family; SHA3-256 and SHA3-512 use a different internal design (Keccak). Both families are secure today. SHA-2 is more widely supported, and SHA-3 is a hedge against future weaknesses in SHA-2.",
    },
    {
      question: "Should I use this to hash passwords?",
      answer:
        "No. Password storage needs a deliberately slow algorithm with a unique salt per password, such as Argon2id, scrypt or bcrypt. A plain SHA-256 of a password is easy to crack.",
    },
  ],
  related: ["token-generator", "base64-encoder-decoder", "uuid-generator", "text-to-binary-converter"],
};

export const metadata = toolMetadata(slug, content);

export default function HashGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <HashGenerator />
    </ToolPage>
  );
}
