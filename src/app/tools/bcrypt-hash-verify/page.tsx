import { BcryptHashVerify } from "@/components/tools/bcrypt-hash-verify/BcryptHashVerify";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "bcrypt-hash-verify";

const content: ToolPageContent = {
  metaDescription:
    "Generate bcrypt password hashes with a chosen cost factor and verify passwords against existing $2a$, $2b$ or $2y$ hashes, entirely in your browser.",
  howItWorks: [
    "bcrypt is a password hashing function designed to be slow. It combines the password with a random 16-byte salt and runs a key setup 2^cost times, so each guess costs an attacker the same effort it costs your server.",
    "To hash, enter a password, choose a cost factor and select Generate hash. The result contains everything needed to check a password later: the version (`$2b$`), the cost, the 22-character salt and the 31-character hash. The tool shows how long hashing took in your browser and estimates the time for the next cost.",
    "To verify, paste a hash and the password to check. The tool reads the salt and cost from the hash, hashes the password the same way and compares the results. Malformed hashes are explained rather than reported as a mismatch.",
    "Hashing uses `bcryptjs`, a maintained JavaScript implementation that gets its salt from your browser's secure random number generator. It is loaded only on this page.",
  ],
  notes: [
    "bcrypt uses only the first 72 bytes of a password, counted as UTF-8. Characters beyond that do not change the hash, and the tool warns you when a password is longer.",
    "The cost is limited to 4–15 here, because each step doubles the time and higher costs take minutes in a browser. OWASP recommends a cost of at least 10.",
    "`$2a$`, `$2b$` and `$2y$` hashes are compatible and can all be verified. `$2x$` hashes from an old, buggy implementation are not supported.",
    "Passwords and hashes stay in this page's memory. They are never sent, logged, saved or put in the URL.",
  ],
  example: {
    description: "Hashing a password with cost 10. The salt is random, so the hash is different every time:",
    input: "correct horse battery staple",
    output: "$2b$10$9bJkuiYm6aLpfNRLN2u9Ce1quSQXpLonRdDg0eGsTL8YtPokKSe4y",
  },
  faqs: [
    {
      question: "Can a bcrypt hash be decrypted?",
      answer:
        "No. bcrypt is a one-way hash, not encryption, so there is no key to reverse it. The only way to find a password from its hash is to guess candidates and hash each one, which bcrypt makes deliberately slow.",
    },
    {
      question: "Why does the same password give a different hash each time?",
      answer:
        "Each hash uses a new random salt, which is stored inside the hash. That stops attackers from using precomputed tables, and verification still works because the salt is read back from the hash.",
    },
    {
      question: "Which cost factor should I use?",
      answer:
        "The highest your server can afford for each login, typically aiming for 100–500 ms per hash on your hardware. Cost 10 to 12 is common today. Increase it over time as hardware gets faster.",
    },
    {
      question: "Should I use bcrypt or Argon2?",
      answer:
        "OWASP currently recommends Argon2id for new systems, with scrypt or bcrypt as alternatives. bcrypt is still a sound choice and is widely supported, but note its 72-byte password limit.",
    },
  ],
  related: ["password-strength-analyzer", "hash-generator", "hmac-generator", "token-generator"],
};

export const metadata = toolMetadata(slug, content);

export default function BcryptHashVerifyPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <BcryptHashVerify />
    </ToolPage>
  );
}
