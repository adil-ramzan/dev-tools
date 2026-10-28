import { TotpGeneratorValidator } from "@/components/tools/totp-generator-validator/TotpGeneratorValidator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "totp-generator-validator";

const content: ToolPageContent = {
  metaDescription:
    "Generate and validate TOTP two-factor codes (RFC 6238) from a Base32 secret or otpauth:// URI, with SHA-1, SHA-256 or SHA-512 and a live countdown.",
  howItWorks: [
    "A time-based one-time password (TOTP, RFC 6238) is the 6-digit code an authenticator app shows. The app and the server share a secret; both compute an HMAC of the secret and the number of 30-second periods since 1970, and shorten it to a few digits.",
    "Enter a Base32 secret, generate a new one, or import an `otpauth://totp/` setup URI. The current code is shown with a countdown to the next one. Codes are computed with your browser's Web Crypto API, with HMAC-SHA1 (the standard), SHA-256 or SHA-512.",
    "To check a code, enter it under Validate a code. Because phone and server clocks can differ, you can accept codes from a few periods before or after the current one; the result says which period matched.",
  ],
  notes: [
    "Most authenticator apps support only SHA-1, 6 digits and a 30-second period. Other settings work only if both sides use them.",
    "New secrets are 160 bits (32 Base32 characters) from the browser's secure random number generator, as RFC 4226 recommends. Secrets shorter than 80 bits are rejected.",
    "Only TOTP is supported; counter-based HOTP URIs are rejected with an explanation. The tool does not draw or read QR codes.",
    "Secrets and codes are never sent, logged, saved or put in the URL. Use test secrets here, not secrets that protect real accounts.",
  ],
  example: {
    description: "RFC 6238 test vector: SHA-1, 8 digits, at Unix time 1111111111:",
    input: "Secret: GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
    output: "Code: 14050471",
  },
  faqs: [
    {
      question: "Why does my code differ from my authenticator app?",
      answer:
        "Check that the secret, algorithm, digits and period match the app's, and that your device clock is correct: TOTP depends on the time. Most apps assume SHA-1, 6 digits and 30 seconds even when a URI asks for something else.",
    },
    {
      question: "How large should the validation window be?",
      answer:
        "±1 period (30 seconds either way) is the common choice. Larger windows tolerate worse clocks but give attackers more valid codes to try, so combine them with rate limiting and reject codes that were already used.",
    },
    {
      question: "Is it safe to paste my real 2FA secret here?",
      answer:
        "The secret never leaves your browser, but anyone who sees it can generate your codes forever. Avoid pasting secrets for real accounts into any website; use this tool to test your own TOTP implementation.",
    },
    {
      question: "What is an otpauth:// URI?",
      answer:
        "The setup link encoded in the QR code you scan when enabling two-factor authentication. It contains the secret, the issuer, the account name and, optionally, the algorithm, digits and period.",
    },
  ],
  related: ["hmac-generator", "token-generator", "base64-encoder-decoder", "unix-timestamp-converter"],
};

export const metadata = toolMetadata(slug, content);

export default function TotpGeneratorValidatorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <TotpGeneratorValidator />
    </ToolPage>
  );
}
