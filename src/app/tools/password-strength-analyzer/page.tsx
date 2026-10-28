import { PasswordStrengthAnalyzer } from "@/components/tools/password-strength-analyzer/PasswordStrengthAnalyzer";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "password-strength-analyzer";

const content: ToolPageContent = {
  metaDescription:
    "Check how hard a password is to guess, see which patterns weaken it, and get specific suggestions. Analyzed in your browser with zxcvbn; never sent anywhere.",
  howItWorks: [
    "Type a password and the analysis updates as you type. The tool uses zxcvbn-ts, the maintained version of the zxcvbn estimator created at Dropbox, to find the patterns the password is built from: common passwords, dictionary words and names, keyboard walks, dates, repeats and sequences, including l33t substitutions like @ for a.",
    "From those patterns it estimates how many guesses an attacker would need, and shows a score from 0 (very weak) to 4 (very strong), the likely time to guess it in four attack scenarios, what weakens it and how to improve it.",
    "Add words about yourself, such as your name or username, to see how much weaker a password becomes when an attacker knows them.",
  ],
  notes: [
    "The score is an estimate of guessability, not a guarantee. A password that has leaked in a data breach, or that you reuse on other sites, is weak whatever its score.",
    "The estimator and its dictionaries (about 1.7 MB, roughly 850 KB compressed) are loaded only on this page. The optional breach-lookup feature of zxcvbn-ts, which makes network requests, is not used.",
    "Only the first 256 characters are analyzed, to keep the page responsive.",
    "Your password is never sent, logged, saved or put in the URL. Even so, avoid typing a password you currently use into any website.",
  ],
  example: {
    description: "A password that looks complex but follows a common pattern:",
    input: "P@ssw0rd2024!",
    output: `Fair (score 2/4)
Warning: This is similar to a commonly used password.
Stolen bcrypt hashes: about 17 minutes`,
  },
  faqs: [
    {
      question: "What makes a password strong?",
      answer:
        "Length and unpredictability. Four or more random, unrelated words, or a long random string from a password manager, beat short passwords with symbol substitutions, which attackers try early.",
    },
    {
      question: "Why does P@ssw0rd score low even with symbols and numbers?",
      answer:
        "Because attackers try common words with predictable substitutions first. Character variety only helps when it is random; a capital first letter and a number or year at the end add very little.",
    },
    {
      question: "Is my password sent anywhere?",
      answer:
        "No. The analysis runs in your browser. Nothing is sent, logged or stored, and the password never appears in the address bar. The breach-checking add-on, which would contact an external service, is not included.",
    },
    {
      question: "How should I create a strong password?",
      answer: "Use a password manager to generate a unique random password for every account, or the Token Generator for a random string of the length you need.",
    },
  ],
  related: ["token-generator", "bcrypt-hash-verify", "hash-generator", "string-obfuscator"],
};

export const metadata = toolMetadata(slug, content);

export default function PasswordStrengthAnalyzerPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <PasswordStrengthAnalyzer />
    </ToolPage>
  );
}
