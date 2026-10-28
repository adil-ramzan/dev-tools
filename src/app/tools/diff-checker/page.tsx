import { DiffChecker } from "@/components/tools/diff-checker/DiffChecker";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "diff-checker";

const content: ToolPageContent = {
  metaDescription:
    "Compare two texts or code files line by line in your browser. See added, removed and unchanged lines, with changed words highlighted, and copy a unified diff.",
  howItWorks: [
    "Paste the original text on the left and the changed text on the right, then select Compare. The tool finds the smallest set of added and removed lines that turns one into the other, the same approach used by `diff` and Git.",
    "Added lines are marked with + and removed lines with −. When a line was edited rather than added or removed, it appears as a removed line followed by an added line, and the words that changed are highlighted.",
    "Long stretches of unchanged lines are collapsed to keep the changes in view; select a collapsed section to show it. Copy as unified diff gives you the result in the standard patch format used by `git apply` and code review tools.",
  ],
  notes: [
    "Windows (CRLF) and Unix (LF) line endings are treated as the same, so files from different systems compare cleanly. A difference in the final line break is mentioned separately.",
    "Ignore leading and trailing spaces is useful when indentation changed. Spaces inside a line still count.",
    "Very different inputs with many thousands of changes may take too long to compare; the tool stops after a few seconds and tells you.",
  ],
  example: {
    description: "Comparing two versions of a short configuration file:",
    input: `Original:
port = 8080
host = localhost
debug = true

Changed:
port = 8080
host = 0.0.0.0
debug = true
workers = 4`,
    output: `  port = 8080
− host = localhost
+ host = 0.0.0.0
  debug = true
+ workers = 4

+2 added, −1 removed, 2 unchanged`,
  },
  faqs: [
    {
      question: "Is my text uploaded to compare it?",
      answer:
        "No. The comparison runs in your browser, so the text you paste stays on your device. This makes the tool suitable for configuration files and code you cannot share.",
    },
    {
      question: "Why is a changed line shown as removed and added?",
      answer:
        "Line diffs work with whole lines, so an edited line is a removal of the old version plus an addition of the new one. The words that changed are highlighted so you can see the edit itself.",
    },
    {
      question: "Can I compare files with different line endings?",
      answer:
        "Yes. Windows line endings (CRLF) are converted to Unix line endings (LF) before comparing, so they do not show up as changes.",
    },
    {
      question: "What is a unified diff?",
      answer:
        "It is the standard text format for describing changes, with --- and +++ headers and lines starting with -, + or a space. Tools such as git apply and patch can apply it to a file.",
    },
  ],
  related: ["text-case-converter", "json-formatter", "regex-tester", "word-counter"],
};

export const metadata = toolMetadata(slug, content);

export default function DiffCheckerPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <DiffChecker />
    </ToolPage>
  );
}
