"use client";

import { useId, useRef, useState } from "react";
import { ActionBar, ShortcutScope, ToolColumns, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { computeDiff, unifiedPatch, type DiffLine, type DiffOptions, type DiffResult } from "@/lib/tools/diff";

const SAMPLE_ORIGINAL = `function greet(name) {
  console.log("Hello, " + name);
  return true;
}

greet("world");`;

const SAMPLE_CHANGED = `function greet(name, greeting = "Hello") {
  console.log(\`\${greeting}, \${name}!\`);
  return true;
}

greet("world");
greet("team", "Welcome");`;

/** Unchanged lines kept around each change when unchanged lines are hidden. */
const CONTEXT = 3;

type Row = { kind: "line"; line: DiffLine } | { kind: "gap"; count: number; start: number };

function buildRows(lines: DiffLine[], hideUnchanged: boolean, expanded: Set<number>): Row[] {
  if (!hideUnchanged) return lines.map((line) => ({ kind: "line", line }));
  const keep = lines.map(() => false);
  lines.forEach((line, i) => {
    if (line.type === "equal") return;
    for (let j = Math.max(0, i - CONTEXT); j <= Math.min(lines.length - 1, i + CONTEXT); j++) keep[j] = true;
  });
  const rows: Row[] = [];
  for (let i = 0; i < lines.length; ) {
    if (keep[i]) {
      rows.push({ kind: "line", line: lines[i] });
      i++;
      continue;
    }
    // A run of hidden unchanged lines, shown in full once expanded.
    const start = i;
    while (i < lines.length && !keep[i]) i++;
    if (expanded.has(start)) {
      for (let j = start; j < i; j++) rows.push({ kind: "line", line: lines[j] });
    } else {
      rows.push({ kind: "gap", count: i - start, start });
    }
  }
  return rows;
}

export function DiffChecker() {
  const [original, setOriginal] = useState("");
  const [changed, setChanged] = useState("");
  const [options, setOptions] = useState<DiffOptions>({ ignoreWhitespace: false, ignoreCase: false });
  const [hideUnchanged, setHideUnchanged] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<DiffResult | null>(null);
  const [compared, setCompared] = useState<{ original: string; changed: string } | null>(null);
  const [patch, setPatch] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const originalId = useId();
  const changedId = useId();

  async function compare(next: DiffOptions = options, a = original, b = changed) {
    const id = ++request.current;
    setBusy(true);
    const [diff, unified] = await Promise.all([computeDiff(a, b, next), unifiedPatch(a, b)]);
    if (id !== request.current) return;
    setResult(diff);
    setPatch(unified);
    setCompared({ original: a, changed: b });
    setExpanded(new Set());
    setBusy(false);
  }

  function setOption(key: keyof DiffOptions, value: boolean) {
    const next = { ...options, [key]: value };
    setOptions(next);
    if (result) void compare(next);
  }

  function reset() {
    request.current++;
    setResult(null);
    setCompared(null);
    setPatch("");
    setBusy(false);
  }

  const stale = compared !== null && (compared.original !== original || compared.changed !== changed);
  const rows = result?.ok ? buildRows(result.lines, hideUnchanged, expanded) : [];

  return (
    <ShortcutScope onSubmit={() => compare()} disabled={(!original && !changed) || busy} className="flex flex-col gap-4">
      <ToolToolbar>
        <div className="flex flex-wrap gap-x-5 gap-y-2 pb-2">
          <Checkbox label="Ignore leading and trailing spaces" checked={options.ignoreWhitespace} onChange={(e) => setOption("ignoreWhitespace", e.target.checked)} />
          <Checkbox label="Ignore case" checked={options.ignoreCase} onChange={(e) => setOption("ignoreCase", e.target.checked)} />
          <Checkbox label="Hide unchanged lines" checked={hideUnchanged} onChange={(e) => setHideUnchanged(e.target.checked)} />
        </div>
      </ToolToolbar>

      <ToolColumns>
        <ToolPanel
          label="Original"
          htmlFor={originalId}
          actions={
            <Button size="sm" variant="ghost" onClick={() => { setOriginal(SAMPLE_ORIGINAL); setChanged(SAMPLE_CHANGED); reset(); }}>
              Sample
            </Button>
          }
        >
          <Textarea id={originalId} value={original} onChange={(e) => setOriginal(e.target.value)} placeholder="Paste the original text" className="min-h-56" wrap="off" />
        </ToolPanel>
        <ToolPanel label="Changed" htmlFor={changedId}>
          <Textarea id={changedId} value={changed} onChange={(e) => setChanged(e.target.value)} placeholder="Paste the changed text" className="min-h-56" wrap="off" />
        </ToolPanel>
      </ToolColumns>

      <ActionBar
        shortcut
        primary={
          <Button variant="primary" onClick={() => compare()} disabled={(!original && !changed) || busy}>
            {busy ? "Comparing…" : "Compare"}
          </Button>
        }
        secondary={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setOriginal(changed);
                setChanged(original);
                if (result) void compare(options, changed, original);
              }}
              disabled={!original && !changed}
            >
              Swap
            </Button>
            <Button variant="ghost" onClick={() => { setOriginal(""); setChanged(""); reset(); }} disabled={!original && !changed}>
              Clear
            </Button>
          </>
        }
      />

      {result && !result.ok ? <Alert title="Could not compare">{result.error}</Alert> : null}

      {result?.ok ? (
        <section aria-labelledby="diff-result-heading" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="diff-result-heading" role="status" className="flex flex-wrap items-baseline gap-x-3 text-sm">
              {result.added === 0 && result.removed === 0 ? (
                <span className="font-medium">No differences{options.ignoreWhitespace || options.ignoreCase ? " with the selected options" : ""}</span>
              ) : (
                <>
                  <span className="font-medium text-success">+{result.added} added</span>
                  <span className="font-medium text-danger">−{result.removed} removed</span>
                  <span className="text-muted-foreground">{result.unchanged} unchanged</span>
                </>
              )}
            </h2>
            <CopyButton text={patch} label="Copy as unified diff" />
          </div>
          {stale ? (
            <Alert tone="warning" title="The texts have changed since this comparison.">
              Select Compare to update the result.
            </Alert>
          ) : null}
          {result.trailingNewlineNote ? <p className="text-sm text-muted-foreground">{result.trailingNewlineNote}</p> : null}

          <div className="overflow-x-auto rounded-md border border-border bg-surface">
            <table className="w-full border-collapse font-mono text-[0.8125rem] leading-relaxed">
              <caption className="sr-only">Line-by-line differences. Lines marked + were added, − were removed.</caption>
              <tbody>
                {rows.map((row) =>
                  row.kind === "gap" ? (
                    <tr key={`gap-${row.start}`} className="border-y border-border bg-subtle">
                      <td colSpan={4} className="px-3 py-1">
                        <button
                          type="button"
                          onClick={() => setExpanded((s) => new Set(s).add(row.start))}
                          className="font-sans text-xs text-accent hover:underline"
                        >
                          Show {row.count} unchanged {row.count === 1 ? "line" : "lines"}
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <DiffRow key={`${row.line.oldNumber}-${row.line.newNumber}`} line={row.line} />
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </ShortcutScope>
  );
}

function DiffRow({ line }: { line: DiffLine }) {
  const tone =
    line.type === "insert" ? "bg-success/10" : line.type === "delete" ? "bg-danger/10" : "";
  const marker = line.type === "insert" ? "+" : line.type === "delete" ? "−" : " ";
  return (
    <tr className={tone}>
      <td className="w-px px-2 text-right text-muted-foreground select-none">{line.oldNumber ?? ""}</td>
      <td className="w-px border-r border-border px-2 text-right text-muted-foreground select-none">{line.newNumber ?? ""}</td>
      <td
        className={cn(
          "w-px pl-2 select-none",
          line.type === "insert" ? "text-success" : line.type === "delete" ? "text-danger" : "text-muted-foreground",
        )}
      >
        <span aria-hidden="true">{marker}</span>
        <span className="sr-only">{line.type === "insert" ? "added" : line.type === "delete" ? "removed" : "unchanged"}</span>
      </td>
      <td className="px-2 break-all whitespace-pre-wrap">
        {line.segments
          ? line.segments.map((segment, i) =>
              segment.changed ? (
                <mark
                  key={i}
                  className={cn("rounded-xs text-foreground", line.type === "insert" ? "bg-success/30" : "bg-danger/30")}
                >
                  {segment.text}
                </mark>
              ) : (
                <span key={i}>{segment.text}</span>
              ),
            )
          : line.text || " "}
      </td>
    </tr>
  );
}
