import { TokenGenerator } from "@/components/tools/token-generator/TokenGenerator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "token-generator";

const content: ToolPageContent = {
  metaDescription:
    "Generate cryptographically secure random tokens and strings from uppercase, lowercase, numbers and symbols, or as hex or Base64URL. Nothing is sent or saved.",
  howItWorks: [
    "Choose which characters to include and drag the slider to set the length. A new token appears as soon as you change a setting; select Refresh for another one. Every character comes from `crypto.getRandomValues()`, your browser's cryptographically secure random number generator; `Math.random()` is never used.",
    "Characters are picked so that each one in the alphabet is exactly as likely as any other. The strength of a token is its entropy: the length times the bits per character. With uppercase, lowercase and numbers (62 characters), each character adds about 5.95 bits, so 32 characters give about 190 bits.",
    "For keys that a system expects in a specific encoding, switch to Hex or Base64URL. There you choose the bytes of randomness, which is not the same as the length of the text: each byte is 8 bits, hex uses 2 characters per byte and Base64URL about 4 characters per 3 bytes, so 32 bytes become 64 hex or 43 Base64URL characters.",
  ],
  notes: [
    "Tokens exist only on this page while it is open. They are not sent anywhere, written to browser storage or put in the address bar.",
    "Symbols include all 32 ASCII punctuation characters. Leave them off if the token goes into a URL, a shell command or a config file where quoting is awkward.",
    "Aim for at least 128 bits of entropy for anything secret; the tool warns you below that.",
    "This tool creates random values only. It does not register, validate or activate keys with any service.",
  ],
  example: {
    description: "Two tokens with different character sets. The summary line shows the strength of each:",
    input: `Uppercase, lowercase, numbers, length 32
All four sets, length 20`,
    inputLabel: "Settings",
    output: `m0TOmwj0GAigv3rFnKJQnpIM6WHqCD20
62-character alphabet · 190 bits of entropy

\`=g*Nv)h>Bx\\G&U@9|Ro
94-character alphabet · 131 bits of entropy`,
    outputLabel: "Tokens",
  },
  faqs: [
    {
      question: "How long should a token be?",
      answer:
        "Aim for at least 128 bits of entropy for secrets such as API keys and session tokens, and 256 bits for long-lived keys. With letters and numbers that is about 22 and 43 characters; in hex, 32 and 64 characters.",
    },
    {
      question: "Should I use characters, hex or Base64URL?",
      answer:
        "Use characters for passwords and general secrets, choosing the sets the target system accepts. Use hex or Base64URL when a system asks for a key of a specific number of bytes in that encoding. Hex is easy to read; Base64URL is shorter and safe in URLs.",
    },
    {
      question: "Are these tokens safe to use?",
      answer:
        "They come from the same secure random source browsers use for encryption. Keep them safe after generating: store them in a secrets manager or environment variable, never in source code, and do not paste them into chats or tickets.",
    },
    {
      question: "How is this different from a UUID?",
      answer:
        "A version 4 UUID has 122 random bits in a fixed format and is meant as an identifier. A token from this tool can carry much more randomness and is meant to be kept secret.",
    },
  ],
  related: ["password-generator", "uuid-generator", "base64-encoder-decoder", "jwt-decoder"],
};

export const metadata = toolMetadata(slug, content);

export default function TokenGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <TokenGenerator />
    </ToolPage>
  );
}
