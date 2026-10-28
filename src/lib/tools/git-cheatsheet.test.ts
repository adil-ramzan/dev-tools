import { describe, expect, it } from "vitest";
import { GIT_SECTIONS, GIT_WORKFLOWS, filterGit } from "@/lib/tools/git-cheatsheet";

const allCommands = [...GIT_SECTIONS.flatMap((s) => s.commands), ...GIT_WORKFLOWS.flatMap((w) => w.steps)];

describe("Git reference data", () => {
  it("has unique section and workflow ids and no empty groups", () => {
    const ids = [...GIT_SECTIONS.map((s) => s.id), ...GIT_WORKFLOWS.map((w) => w.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of GIT_SECTIONS) expect(s.commands.length, s.id).toBeGreaterThan(0);
    for (const w of GIT_WORKFLOWS) expect(w.steps.length, w.id).toBeGreaterThan(0);
  });

  it("only contains git commands with descriptions", () => {
    for (const c of allCommands) {
      expect(c.command, c.command).toMatch(/^git [a-z]/);
      expect(c.description.length, c.command).toBeGreaterThan(5);
      expect(c.command).not.toMatch(/[\n;|&]/);
    }
  });

  it("marks commands that lose work or rewrite shared history", () => {
    const cautious = (cmd: string) => allCommands.filter((c) => c.command.startsWith(cmd)).every((c) => c.caution);
    for (const cmd of ["git reset --hard", "git clean -fd", "git push --force-with-lease", "git branch -D", "git rebase -i", "git commit --amend", "git restore src", "git stash drop"]) {
      expect(cautious(cmd), cmd).toBe(true);
    }
    expect(allCommands.some((c) => /--force(\s|$)/.test(c.command))).toBe(false);
  });

  it("uses switch and restore rather than the overloaded checkout", () => {
    expect(allCommands.some((c) => c.command.startsWith("git checkout"))).toBe(false);
  });
});

describe("filterGit", () => {
  it("returns every section for an empty query", () => {
    expect(filterGit("")).toHaveLength(GIT_SECTIONS.length);
  });

  it("matches all words in commands, descriptions and section titles", () => {
    const found = filterGit("undo commit");
    expect(found.flatMap((s) => s.commands.map((c) => c.command))).toEqual(expect.arrayContaining(["git reset --soft HEAD~1", "git revert 3f2a1c9"]));
    expect(filterGit("STASH").map((s) => s.id)).toContain("stash");
    expect(filterGit("nothing-matches-this")).toEqual([]);
  });

  it("limits results to one section", () => {
    const found = filterGit("", "tags");
    expect(found.map((s) => s.id)).toEqual(["tags"]);
    expect(found[0].matches).toBe(GIT_SECTIONS.find((s) => s.id === "tags")!.commands.length);
  });
});
