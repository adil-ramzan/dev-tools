import { TextEncryption } from "@/components/tools/text-encryption/TextEncryption";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "text-encryption";

const content: ToolPageContent = {
  metaDescription:
    "Encrypt and decrypt text with a password using AES-256-GCM and PBKDF2 (600,000 iterations) through Web Crypto. Nothing leaves your browser.",
  howItWorks: [
    "To encrypt, enter the text and a password, then select Encrypt. A 256-bit key is derived from the password with PBKDF2-HMAC-SHA256 (600,000 iterations, as OWASP recommends) and a fresh random salt. The text is then encrypted with AES-256-GCM and a fresh random IV, so encrypting the same text twice never gives the same result.",
    "AES-GCM is authenticated encryption: it detects any change. If the encrypted text is altered, or the wrong password is used, decryption fails instead of producing garbage. Both cases get the same message, so the error does not help an attacker.",
    "Everything needed to decrypt except the password is packed into one copyable string: `v1.pbkdf2-sha256.<iterations>.<salt>.<iv>.<ciphertext>`, with each binary part in Base64URL. The version and parameters are also authenticated, so they cannot be changed undetected.",
  ],
  notes: [
    "The encryption is only as strong as the password: anyone with the encrypted text can try passwords offline. Use a long, unique passphrase and share it through a different channel than the encrypted text.",
    "There is no recovery. If the password is lost, nobody can decrypt the text, including this site.",
    "All cryptography uses the browser's built-in Web Crypto API; no custom cryptographic code is involved. Text is limited to 5 MB.",
    "The format is specific to this tool, but uses only standard algorithms, so it can be decrypted with any AES-GCM library given the password (the header is the additional authenticated data).",
    "Plaintext, passwords and encrypted text are never sent, logged or saved.",
  ],
  example: {
    description: "Encrypting a short message. The salt and IV are random, so the output differs every time:",
    input: "Meet at the north entrance at 9:30.",
    output: "v1.pbkdf2-sha256.600000.q9Zt0Y1Jg6m3m1JxwE2bVA.Jt4o0Q8iGx7Z1y6K.3qk…",
  },
  faqs: [
    {
      question: "Is this secure enough for real secrets?",
      answer:
        "The algorithms are standard and widely trusted, and run in your browser's native cryptographic library. The weak point is usually the password: with a long, unique passphrase the encrypted text is impractical to break. For long-term or high-value secrets, use dedicated tools such as age, GPG or a password manager.",
    },
    {
      question: "Why does decryption say the password is wrong or the data was changed?",
      answer:
        "AES-GCM verifies the data before returning anything. A wrong password, a typo, or a missing or changed character in the encrypted text all fail the check, and the tool deliberately does not say which.",
    },
    {
      question: "Why does encrypting take a moment?",
      answer: "Deriving the key runs 600,000 rounds of HMAC-SHA256. That small delay for you makes every password guess just as slow for an attacker.",
    },
    {
      question: "Can I decrypt this with other software?",
      answer:
        "Yes. Derive a 32-byte key with PBKDF2-HMAC-SHA256 from the password, salt and iteration count, then decrypt with AES-256-GCM using the IV, the first three dot-separated fields as additional authenticated data, and the last 16 bytes of the ciphertext as the tag.",
    },
  ],
  related: ["password-strength-analyzer", "hmac-generator", "rsa-key-pair-generator", "base64-encoder-decoder"],
};

export const metadata = toolMetadata(slug, content);

export default function TextEncryptionPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <TextEncryption />
    </ToolPage>
  );
}
