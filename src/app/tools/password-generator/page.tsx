import { PasswordGenerator } from "@/components/tools/password-generator/PasswordGenerator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "password-generator";

const content: ToolPageContent = {
  metaDescription:
    "Generate strong random passwords in your browser: choose length and character sets, exclude ambiguous or unwanted characters, and see the entropy.",
  howItWorks: [
    "Set the length and the characters to use, and a new password appears straight away; select Generate new for another. Every character comes from `crypto.getRandomValues()`, your browser's cryptographically secure random number generator, and is picked without bias, so each allowed character is exactly as likely as any other. `Math.random()` is never used.",
    "With At least one of each, the password contains every selected set. Passwords that miss a set are thrown away and drawn again, rather than forcing characters into fixed positions, so all valid passwords stay equally likely.",
    "Strength is shown as entropy: the number of bits an attacker would have to guess. It is exact for these settings, because the password is random. Each extra character adds about 6.5 bits with all four sets.",
  ],
  notes: [
    "Passwords exist only on this page while it is open. They are not sent anywhere, written to browser storage or put in the address bar.",
    "Exclude ambiguous removes I, l, 1, |, O, 0 and o, which look alike in many fonts. This helps when a password must be read aloud or typed from paper.",
    "Entropy describes how hard a random password is to guess. It does not protect a password that is reused, phished or stored in plain text.",
    "To test a password you made yourself, use the Password Strength Analyzer, which also looks for words and patterns. For API keys and other secrets in hex or Base64URL, use the Token Generator.",
  ],
  example: {
    description: "A password from the default settings, and one for a system that does not accept quotes:",
    input: `Length 20, all four sets, at least one of each
Length 16, ambiguous and "'\` excluded`,
    inputLabel: "Settings",
    output: `q7#Vt2]mWb!ePz4&Kd9r
Very strong · 130 bits of entropy

X8p}Hsa3?Wd%nKe7
Strong · 101 bits of entropy`,
    outputLabel: "Passwords",
  },
  faqs: [
    {
      question: "How long should a password be?",
      answer:
        "For accounts protected by a password manager, 16 to 20 random characters is plenty: that is over 100 bits with all four sets. For a master password you have to type, prefer a long passphrase you can remember.",
    },
    {
      question: "Should I include symbols?",
      answer:
        "Symbols add strength per character, but length matters more. If a site rejects some symbols, exclude them or turn symbols off and add a few characters instead: 20 letters and digits are stronger than 14 characters with symbols.",
    },
    {
      question: "Does requiring every character set make passwords weaker?",
      answer:
        "Slightly: passwords that miss a set are no longer possible. The entropy shown accounts for this, and the difference is less than one bit for passwords of 12 characters or more.",
    },
    {
      question: "How is this different from the Token Generator?",
      answer:
        "Both use the same secure, unbiased random source. This tool adds password-specific options (excluding ambiguous or chosen characters and requiring every set) and strength guidance. The Token Generator also produces hex and Base64URL keys of a given number of bytes.",
    },
  ],
  related: ["password-strength-analyzer", "token-generator", "bcrypt-hash-verify", "basic-auth-header-generator"],
};

export const metadata = toolMetadata(slug, content);

export default function PasswordGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <PasswordGenerator />
    </ToolPage>
  );
}
