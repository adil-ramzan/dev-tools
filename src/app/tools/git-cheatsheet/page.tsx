import { GitCheatsheet } from "@/components/tools/git-cheatsheet/GitCheatsheet";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "git-cheatsheet";

const content: ToolPageContent = {
  metaDescription:
    "A practical Git cheat sheet: everyday commands for branching, committing, undoing, stashing and sharing work, with warnings for destructive commands.",
  howItWorks: [
    "Commands are grouped by task: setting up, staging and reviewing changes, committing, branching and merging, working with remotes, exploring history, undoing mistakes, stashing, tagging and debugging. Each has a short explanation and a copy button.",
    "Filter by typing words such as \"undo commit\" or \"stash\", or pick a section. Below the reference, common workflows, such as updating a branch with the latest main or recovering a lost commit, list the commands in order.",
    "Commands that can lose work or rewrite history other people use, such as `git reset --hard`, `git clean -fd` and `git push --force-with-lease`, are marked with a caution.",
  ],
  notes: [
    "This is a reference only. The page never runs Git or touches a repository.",
    "Commands use the modern `git switch` and `git restore` rather than the older, overloaded `git checkout`.",
    "Branch names, file names and the commit 3f2a1c9 are placeholders; replace them with your own.",
    "Prefer `git push --force-with-lease` over `--force`: it refuses to overwrite commits someone else pushed.",
  ],
  example: {
    description: "Undo the last commit but keep its changes, before pushing:",
    input: "undo the last commit",
    output: "git reset --soft HEAD~1",
  },
  faqs: [
    {
      question: "What is the difference between git reset and git revert?",
      answer:
        "git revert adds a new commit that undoes an earlier one, so history is kept and it is safe on shared branches. git reset moves the branch back, removing commits from it, which is fine for local work but rewrites history others may have pulled.",
    },
    {
      question: "Should I merge or rebase?",
      answer:
        "Both combine work. Merging keeps history as it happened, with merge commits. Rebasing replays your commits on top of the other branch for a linear history, but rewrites them, so only rebase commits nobody else is using.",
    },
    {
      question: "How do I get back a commit I lost?",
      answer: "Run git reflog to see where HEAD has recently been, find the commit's hash, and create a branch at it with git branch rescue <hash>. Unreferenced commits are eventually garbage-collected, so act soon.",
    },
    {
      question: "Why git switch instead of git checkout?",
      answer: "git checkout does several unrelated things (switching branches and restoring files). git switch and git restore split those jobs, which makes mistakes less likely.",
    },
  ],
  related: ["diff-checker", "docker-run-to-compose", "regex-tester", "cron-expression-helper"],
};

export const metadata = toolMetadata(slug, content);

export default function GitCheatsheetPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <GitCheatsheet />
    </ToolPage>
  );
}
