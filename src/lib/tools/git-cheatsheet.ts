/**
 * A reference of everyday Git commands. This is text only: nothing here runs
 * Git or touches a repository. Commands that discard work or rewrite shared
 * history carry a caution.
 */

export type GitCommand = {
  command: string;
  description: string;
  /** Shown for commands that can lose work or rewrite history others use. */
  caution?: string;
};

export type GitSection = { id: string; title: string; commands: GitCommand[] };

export type GitWorkflow = { id: string; title: string; description: string; steps: GitCommand[] };

export const GIT_SECTIONS: GitSection[] = [
  {
    id: "setup",
    title: "Set up",
    commands: [
      { command: 'git config --global user.name "Ada Lovelace"', description: "Set the name recorded in your commits." },
      { command: 'git config --global user.email "ada@example.com"', description: "Set the email recorded in your commits." },
      { command: "git config --global init.defaultBranch main", description: "Name the first branch of new repositories main." },
      { command: "git config --list --show-origin", description: "Show every setting and the file it comes from." },
      { command: "git init", description: "Create a new repository in the current folder." },
      { command: "git clone https://example.com/team/project.git", description: "Copy a remote repository, with its full history, into a new folder." },
      { command: "git clone --depth 1 https://example.com/team/project.git", description: "Clone only the latest commit, which is faster for large histories." },
    ],
  },
  {
    id: "changes",
    title: "Stage and review changes",
    commands: [
      { command: "git status", description: "Show which files are changed, staged or untracked." },
      { command: "git status -s", description: "Show the same in a compact, one-line-per-file form." },
      { command: "git diff", description: "Show changes that are not staged yet." },
      { command: "git diff --staged", description: "Show changes that are staged for the next commit." },
      { command: "git diff main...feature", description: "Show what a branch changed since it split from main." },
      { command: "git add src/app.ts", description: "Stage a file's changes for the next commit." },
      { command: "git add -p", description: "Choose which parts of your changes to stage, one hunk at a time." },
      { command: "git restore --staged src/app.ts", description: "Unstage a file, keeping its changes in the working tree." },
      { command: "git restore src/app.ts", description: "Discard uncommitted changes to a file.", caution: "The discarded changes cannot be recovered." },
      { command: "git rm src/old.ts", description: "Delete a file and stage the deletion." },
      { command: "git mv src/old.ts src/new.ts", description: "Rename or move a file and stage the change." },
    ],
  },
  {
    id: "commits",
    title: "Commit",
    commands: [
      { command: 'git commit -m "Add login form"', description: "Record the staged changes with a message." },
      { command: "git commit --amend --no-edit", description: "Add the staged changes to the last commit, keeping its message.", caution: "Rewrites the last commit; avoid it after pushing a shared branch." },
      { command: 'git commit --amend -m "Better message"', description: "Change the last commit's message.", caution: "Rewrites the last commit; avoid it after pushing a shared branch." },
      { command: "git commit --fixup 3f2a1c9", description: "Create a commit marked to be squashed into an earlier one by git rebase -i --autosquash." },
      { command: "git show 3f2a1c9", description: "Show a commit's message and changes." },
    ],
  },
  {
    id: "branches",
    title: "Branch and merge",
    commands: [
      { command: "git branch", description: "List local branches; the current one is marked with *." },
      { command: "git branch -a", description: "List local and remote-tracking branches." },
      { command: "git switch feature/login", description: "Switch to an existing branch." },
      { command: "git switch -c feature/login", description: "Create a branch from the current commit and switch to it." },
      { command: "git branch -m feature/sign-in", description: "Rename the current branch." },
      { command: "git branch -d feature/login", description: "Delete a branch that has been merged." },
      { command: "git branch -D feature/login", description: "Delete a branch even if it is not merged.", caution: "Unmerged commits are only recoverable through git reflog, and only for a while." },
      { command: "git merge feature/login", description: "Merge another branch into the current one." },
      { command: "git merge --no-ff feature/login", description: "Merge with a merge commit even if a fast-forward is possible, keeping the branch visible in history." },
      { command: "git rebase main", description: "Replay the current branch's commits on top of main.", caution: "Rewrites the branch's commits; avoid it on branches others have pulled." },
      { command: "git rebase -i HEAD~3", description: "Reorder, edit, squash or drop the last three commits in an editor.", caution: "Rewrites history; avoid it on commits others have pulled." },
      { command: "git cherry-pick 3f2a1c9", description: "Apply the changes of one commit onto the current branch as a new commit." },
    ],
  },
  {
    id: "remotes",
    title: "Share with a remote",
    commands: [
      { command: "git remote -v", description: "List remotes and their URLs." },
      { command: "git remote add origin https://example.com/team/project.git", description: "Connect the repository to a remote named origin." },
      { command: "git fetch --prune", description: "Download new commits and branches without changing your files, and remove deleted remote branches." },
      { command: "git pull", description: "Fetch and merge the upstream branch into the current one." },
      { command: "git pull --rebase", description: "Fetch and replay your local commits on top of the upstream branch." },
      { command: "git push -u origin feature/login", description: "Push a new branch and set it as the upstream for git push and git pull." },
      { command: "git push", description: "Push the current branch to its upstream." },
      { command: "git push --force-with-lease", description: "Overwrite the remote branch after rewriting history, but only if nobody else pushed in the meantime.", caution: "Replaces the remote branch; coordinate with anyone else using it." },
      { command: "git push origin --delete feature/login", description: "Delete a branch on the remote." },
    ],
  },
  {
    id: "history",
    title: "Explore history",
    commands: [
      { command: "git log --oneline --graph --decorate --all", description: "Show all branches as a compact graph." },
      { command: "git log -p -- src/app.ts", description: "Show the history of a file with its changes." },
      { command: 'git log -S "parseConfig"', description: "Find commits that added or removed a piece of text." },
      { command: 'git log --since="2 weeks ago" --author="Ada"', description: "Filter commits by date and author." },
      { command: "git blame src/app.ts", description: "Show which commit last changed each line of a file." },
      { command: "git shortlog -sn", description: "Count commits per author." },
      { command: "git reflog", description: "Show where HEAD and branches pointed recently; the way to find lost commits." },
      { command: 'git grep "TODO"', description: "Search tracked files for text." },
    ],
  },
  {
    id: "undo",
    title: "Undo",
    commands: [
      { command: "git revert 3f2a1c9", description: "Create a new commit that undoes an earlier one. Safe on shared branches." },
      { command: "git reset --soft HEAD~1", description: "Undo the last commit, keeping its changes staged." },
      { command: "git reset HEAD~1", description: "Undo the last commit, keeping its changes unstaged." },
      { command: "git reset --hard HEAD~1", description: "Undo the last commit and discard its changes and any uncommitted work.", caution: "Uncommitted changes are lost permanently; the commit can only be found again with git reflog." },
      { command: "git restore --source=3f2a1c9 src/app.ts", description: "Restore a file as it was in an earlier commit.", caution: "Overwrites the file's current, uncommitted content." },
      { command: "git clean -n", description: "List untracked files that git clean would delete." },
      { command: "git clean -fd", description: "Delete untracked files and folders.", caution: "Deleted files are not in Git and cannot be recovered. Run git clean -n first." },
      { command: "git merge --abort", description: "Stop a merge with conflicts and return to the state before it." },
      { command: "git rebase --abort", description: "Stop a rebase and return the branch to how it was before." },
    ],
  },
  {
    id: "stash",
    title: "Stash",
    commands: [
      { command: 'git stash push -m "half-done refactor"', description: "Put uncommitted changes aside and clean the working tree." },
      { command: "git stash push -u", description: "Stash untracked files as well." },
      { command: "git stash list", description: "List stashes." },
      { command: "git stash pop", description: "Re-apply the latest stash and remove it from the list." },
      { command: "git stash apply stash@{1}", description: "Re-apply a specific stash and keep it in the list." },
      { command: "git stash drop stash@{1}", description: "Delete a stash.", caution: "A dropped stash is hard to recover." },
    ],
  },
  {
    id: "tags",
    title: "Tag releases",
    commands: [
      { command: "git tag", description: "List tags." },
      { command: 'git tag -a v1.2.0 -m "Release 1.2.0"', description: "Create an annotated tag on the current commit." },
      { command: "git push origin v1.2.0", description: "Push a tag; git push does not push tags by default." },
      { command: "git tag -d v1.2.0", description: "Delete a local tag." },
    ],
  },
  {
    id: "debug",
    title: "Debug and more",
    commands: [
      { command: "git bisect start", description: "Start a binary search for the commit that introduced a bug." },
      { command: "git bisect bad", description: "Mark the current commit as having the bug." },
      { command: "git bisect good v1.1.0", description: "Mark a commit known to be fine; Git checks out the commit halfway between." },
      { command: "git bisect reset", description: "End the search and return to where you started." },
      { command: "git worktree add ../hotfix main", description: "Check out another branch in a second folder, without stashing current work." },
      { command: "git switch --detach 3f2a1c9", description: "Look at an old commit without being on a branch." },
    ],
  },
];

export const GIT_WORKFLOWS: GitWorkflow[] = [
  {
    id: "feature",
    title: "Start a feature branch and share it",
    description: "Branch from an up-to-date main, commit your work and push it to open a pull request.",
    steps: [
      { command: "git switch main", description: "Go to main." },
      { command: "git pull", description: "Bring it up to date." },
      { command: "git switch -c feature/login", description: "Create your branch." },
      { command: "git add -p", description: "Stage your changes, reviewing each part." },
      { command: 'git commit -m "Add login form"', description: "Commit them." },
      { command: "git push -u origin feature/login", description: "Push the branch, then open a pull request." },
    ],
  },
  {
    id: "update",
    title: "Update your branch with the latest main",
    description: "Replay your work on top of main so the pull request merges cleanly.",
    steps: [
      { command: "git fetch", description: "Get the latest commits." },
      { command: "git rebase origin/main", description: "Replay your commits on top of main." },
      { command: "git add src/app.ts", description: "If there are conflicts: fix them, then stage the files." },
      { command: "git rebase --continue", description: "Continue the rebase after each conflict." },
      { command: "git push --force-with-lease", description: "Update the remote branch.", caution: "Only on your own branch." },
    ],
  },
  {
    id: "undo-commit",
    title: "Undo the last commit but keep the work",
    description: "For a commit you have not pushed yet.",
    steps: [
      { command: "git reset --soft HEAD~1", description: "The changes stay staged; edit them and commit again." },
    ],
  },
  {
    id: "conflict",
    title: "Resolve a merge conflict",
    description: "When git merge or git pull stops with conflicts.",
    steps: [
      { command: "git status", description: "See which files conflict." },
      { command: "git diff", description: "Review the conflict markers (<<<<<<<, =======, >>>>>>>)." },
      { command: "git add src/app.ts", description: "After editing each file to the right result, stage it." },
      { command: "git commit", description: "Finish the merge. Or run git merge --abort to start over." },
    ],
  },
  {
    id: "recover",
    title: "Recover a lost commit or branch",
    description: "After a reset, a deleted branch or a rebase gone wrong.",
    steps: [
      { command: "git reflog", description: "Find the commit's hash in the recent history of HEAD." },
      { command: "git branch rescue 3f2a1c9", description: "Create a branch pointing at it to keep it safe." },
    ],
  },
];

export type FoundSection = GitSection & { matches: number };

/** Sections and commands whose command or description contains every word of the query. */
export function filterGit(query: string, sectionId: string | null = null): FoundSection[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return GIT_SECTIONS.filter((s) => sectionId === null || s.id === sectionId)
    .map((section) => {
      const commands = section.commands.filter((c) => {
        const haystack = `${c.command} ${c.description} ${section.title}`.toLowerCase();
        return words.every((w) => haystack.includes(w));
      });
      return { ...section, commands, matches: commands.length };
    })
    .filter((s) => s.commands.length > 0);
}
