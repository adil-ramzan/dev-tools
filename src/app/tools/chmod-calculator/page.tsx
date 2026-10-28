import { ChmodCalculator } from "@/components/tools/chmod-calculator/ChmodCalculator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "chmod-calculator";

const content: ToolPageContent = {
  metaDescription:
    "Convert Unix file permissions between octal (755, 644) and symbolic (rwxr-xr-x) notation, see what each class can do, and copy the chmod command.",
  howItWorks: [
    "Type an octal mode such as `755`, symbolic permissions such as `rwxr-xr-x` (or a full `ls -l` string such as `drwxr-x---`), tick the read, write and execute boxes, or pick a common preset. Every view stays in sync.",
    "Each octal digit is the sum of read (4), write (2) and execute (1) for the owner, the group and everyone else. An optional first digit adds the special bits: setuid (4), setgid (2) and sticky (1), shown in symbolic notation as `s`, `s` and `t`.",
    "The tool writes the matching `chmod` commands in octal and symbolic form, explains in plain words what each class can do with a file or a directory, and warns about risky modes such as world-writable files.",
  ],
  notes: [
    "On a directory, read lets you list its contents, write lets you create and delete entries, and execute lets you enter it and access files inside.",
    "A capital `S` or `T` means a special bit is set without the matching execute permission, which usually has no effect.",
    "Avoid 777: anyone on the system can change the file. Use a group and 775 or 664 to share files instead.",
    "This calculator only explains permissions; it does not change any files.",
  ],
  example: {
    description: "A script that everyone can run but only the owner can change:",
    input: "755",
    output: `Symbolic  rwxr-xr-x
chmod     chmod 755 file
          chmod u=rwx,g=rx,o=rx file`,
  },
  faqs: [
    {
      question: "What does chmod 755 mean?",
      answer: "The owner can read, write and execute (7 = 4+2+1); the group and everyone else can read and execute (5 = 4+1). It is the usual mode for programs, scripts and directories.",
    },
    {
      question: "What permissions should an SSH private key have?",
      answer: "600 (or 400): only the owner can read it. SSH refuses to use private keys that other users can read. The ~/.ssh directory should be 700.",
    },
    {
      question: "What is the sticky bit?",
      answer: "On a directory, it lets users delete only their own files, even if everyone can write to the directory. /tmp uses mode 1777 for this reason.",
    },
    {
      question: "What does setgid do on a directory?",
      answer: "New files and subdirectories inherit the directory's group instead of the creator's primary group, which keeps shared project folders consistent.",
    },
  ],
  related: ["integer-base-converter", "ipv4-subnet-calculator", "git-cheatsheet", "docker-run-to-compose"],
};

export const metadata = toolMetadata(slug, content);

export default function ChmodCalculatorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <ChmodCalculator />
    </ToolPage>
  );
}
