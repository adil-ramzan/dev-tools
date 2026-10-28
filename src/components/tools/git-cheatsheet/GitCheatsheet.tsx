"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { GIT_SECTIONS, GIT_WORKFLOWS, filterGit, type GitCommand } from "@/lib/tools/git-cheatsheet";

function CommandRow({ command }: { command: GitCommand }) {
  return (
    <li className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <code className="font-mono text-sm font-medium break-all text-foreground">{command.command}</code>
        <p className="text-sm text-muted-foreground">{command.description}</p>
        {command.caution ? (
          <p className="text-sm text-danger">
            <span className="font-medium">Caution:</span> {command.caution}
          </p>
        ) : null}
      </div>
      <CopyButton text={command.command} ariaLabel={`Copy ${command.command}`} variant="ghost" />
    </li>
  );
}

export function GitCheatsheet() {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<string | null>(null);
  const deferred = useDeferredValue(query);
  const queryId = useId();
  const sections = useMemo(() => filterGit(deferred, section), [deferred, section]);
  const count = sections.reduce((n, s) => n + s.commands.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={queryId}>Filter commands</Label>
          <Input id={queryId} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. undo commit, stash, rebase" autoComplete="off" spellCheck={false} className="max-w-md" />
        </div>
        <div role="group" aria-label="Sections" className="flex flex-wrap gap-2">
          {GIT_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={section === s.id}
              onClick={() => setSection(section === s.id ? null : s.id)}
              className={cn(
                "inline-flex h-8 items-center rounded-sm border px-3 text-sm transition-colors duration-150",
                section === s.id ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-border-strong hover:bg-subtle",
              )}
            >
              {s.title}
            </button>
          ))}
          {query || section ? (
            <Button size="sm" variant="ghost" onClick={() => { setQuery(""); setSection(null); }}>
              Clear
            </Button>
          ) : null}
        </div>
        <p role="status" className="text-xs text-muted-foreground">
          {count} {count === 1 ? "command" : "commands"}
        </p>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No command matches. Try a word such as branch, undo or remote.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sections.map((s) => (
            <section key={s.id} aria-labelledby={`git-${s.id}`} data-git-section={s.id} className="flex flex-col rounded-md border border-border bg-surface px-4 py-3">
              <h2 id={`git-${s.id}`} className="font-semibold tracking-tight">{s.title}</h2>
              <ul className="flex flex-col divide-y divide-border">
                {s.commands.map((c) => (
                  <CommandRow key={c.command} command={c} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {!query && !section ? (
        <section aria-labelledby="git-workflows" className="flex flex-col gap-4">
          <h2 id="git-workflows" className="text-xl font-semibold tracking-tight">Common workflows</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {GIT_WORKFLOWS.map((w) => (
              <section key={w.id} aria-labelledby={`workflow-${w.id}`} className="flex flex-col gap-2 rounded-md border border-border bg-surface px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 id={`workflow-${w.id}`} className="font-semibold tracking-tight">{w.title}</h3>
                    <p className="text-sm text-muted-foreground">{w.description}</p>
                  </div>
                  <CopyButton text={w.steps.map((s) => s.command).join("\n")} label="Copy all" ariaLabel={`Copy all commands for ${w.title}`} variant="ghost" />
                </div>
                <ol className="flex list-decimal flex-col divide-y divide-border pl-5 marker:text-muted-foreground">
                  {w.steps.map((step, i) => (
                    <CommandRow key={i} command={step} />
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </section>
      ) : null}

      <Notice title="A reference, not a Git client">
        This page only shows commands for you to copy; it does not run Git or access any repository. Examples use placeholder
        names such as feature/login and the commit 3f2a1c9: replace them with your own.
      </Notice>
    </div>
  );
}
