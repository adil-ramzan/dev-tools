import { TextCaseConverter } from "@/components/tools/text-case-converter/TextCaseConverter";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "text-case-converter";

const content: ToolPageContent = {
  metaDescription:
    "Convert text to camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, Title Case, Sentence case, UPPERCASE or lowercase, all at once as you type.",
  howItWorks: [
    "Type or paste text and every case is shown at once, ready to copy. Conversion happens in your browser as you type.",
    "The prose cases (UPPERCASE, lowercase, Title Case and Sentence case) only change letters and keep your punctuation and spacing. Title Case capitalizes the first letter of every word and lowercases the rest. Sentence case capitalizes the first letter of each sentence.",
    "The code cases (camelCase, PascalCase, snake_case, kebab-case and CONSTANT_CASE) first split the text into words, then join them in the chosen style. Words are split at spaces, punctuation, underscores, hyphens and changes in letter case, so `XMLHttpRequest` becomes `xml_http_request`.",
  ],
  notes: [
    "Each line is converted separately in the code cases, so you can convert a list of names in one go.",
    "Digits stay attached to the word before them: version2Beta becomes version2_beta.",
    "Apostrophes inside words are removed in code cases (don't → dont). Other punctuation acts as a word separator and is removed.",
    "Title Case lowercases the rest of each word, so acronyms such as NASA become Nasa. Small words such as \"of\" and \"the\" are capitalized too.",
    "Letters from all scripts are supported. Scripts without letter case, such as Chinese, are kept as they are.",
  ],
  example: {
    description: "Converting a phrase to the code cases:",
    input: "user account ID",
    output: `camelCase      userAccountId
PascalCase     UserAccountId
snake_case     user_account_id
kebab-case     user-account-id
CONSTANT_CASE  USER_ACCOUNT_ID`,
  },
  faqs: [
    {
      question: "What is the difference between camelCase and PascalCase?",
      answer:
        "Both join words without separators and capitalize each word. camelCase starts with a lowercase letter (userName) and is common for variables and functions. PascalCase starts with an uppercase letter (UserName) and is common for classes and types.",
    },
    {
      question: "When should I use snake_case or kebab-case?",
      answer:
        "snake_case is common in Python, Ruby and database column names. kebab-case is used in URLs, CSS class names and command-line options. CONSTANT_CASE is used for constants and environment variables.",
    },
    {
      question: "How are acronyms like ID or HTTP handled?",
      answer:
        "An acronym is treated as one word. In camelCase and PascalCase only its first letter stays uppercase (userId, HttpRequest), which is the style most code style guides recommend.",
    },
    {
      question: "Why did my punctuation disappear?",
      answer:
        "Code cases can only contain letters, digits and the separator, so other punctuation is treated as a break between words. Use a prose case such as Sentence case to keep punctuation.",
    },
  ],
  related: ["word-counter", "regex-tester", "json-formatter"],
};

export const metadata = toolMetadata(slug, content);

export default function TextCaseConverterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <TextCaseConverter />
    </ToolPage>
  );
}
