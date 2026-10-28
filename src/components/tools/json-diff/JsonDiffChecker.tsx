"use client";

import { useId, useRef, useState } from "react";
import { ErrorContext, selectPosition } from "@/components/tools/ErrorContext";
import { ActionBar, ShortcutScope, ToolColumns, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Textarea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import { diffJson, type JsonChangeKind, type JsonDiffResult } from "@/lib/tools/json-diff";

const SAMPLE_ORIGINAL = `{
  "name": "web-app",
  "version": "1.4.0",
  "private": true,
  "build": { "target": "es2019", "sourcemap": true },
  "dependencies": { "react": "18.2.0", "lodash": "4.17.21" },
  "ports": [3000, 3001],
  "maxUploadBytes": 9007199254740993
}`;

const SAMPLE_CHANGED = `{
  "name": "web-app",
  "version": "1.5.0",
  "private": true,
  "build": { "target": "es2022", "sourcemap": "hidden" },
  "dependencies": { "react": "19.0.0", "zod": "3.23.8" },
  "ports": [3000],
  "maxUploadBytes": 9007199254740995
}`;

type Filter = "all" | JsonChangeKind;

const kindStyle: Record<JsonChangeKind, { label: string; badge: string }> = {
  added: { label: "Added", badge: "border-success/40 bg-success/10 text-success" },
  removed: { label: "Removed", badge: "border-danger/40 bg-danger/10 text-danger" },
  changed: { label: "Changed", badge: "border-accent/40 bg-accent/10 text-accent" },
};

export function JsonDiffChecker() {
  const [original, setOriginal] = useState("");
  const [changed, setChanged] = useState("");
  const [exactNumbers, setExactNumbers] = useState(false);
  const [result, setResult] = useState<JsonDiffResult | null>(null);
  const [compared, setCompared] = useState<{ original: string; changed: string } | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const originalRef = useRef<HTMLTextAreaElement>(null);
  const changedRef = useRef<HTMLTextAreaElement>(null);
  const originalId = useId();
  const changedId = useId();

  function compare(a = original, b = changed, exact = exactNumbers) {
    setResult(diffJson(a, b, { exactNumbers: exact }));
    setCompared({ original: a, changed: b });
    setFilter("all");
  }

  function reset() {
    setResult(null);
    setCompared(null);
  }

  const stale = compared !== null && (compared.original !== original || compared.changed !== changed);
  const shown = result?.ok ? result.changes.filter((c) => filter === "all" || c.kind === filter) : [];
  const report = result?.ok
    ? result.changes
        .map((c) => `${c.kind === "added" ? "+" : c.kind === "removed" ? "-" : "~"} ${c.path}${c.kind === "changed" ? `: ${c.before} → ${c.after}` : `: ${c.after ?? c.before}`}`)
        .join("\n")
    : "";

  return (
    <ShortcutScope onSubmit={() => compare()} disabled={!original.trim() || !changed.trim()} className="flex flex-col gap-4">
      <ToolToolbar>
        <Checkbox
          label="Treat 1.0 and 1 as different numbers"
          checked={exactNumbers}
          onChange={(e) => {
            setExactNumbers(e.target.checked);
            if (result) compare(original, changed, e.target.checked);
          }}
          className="h-9"
        />
      </ToolToolbar>

      <ToolColumns>
        <ToolPanel
          label="Original JSON"
          htmlFor={originalId}
          actions={
            <Button size="sm" variant="ghost" onClick={() => { setOriginal(SAMPLE_ORIGINAL); setChanged(SAMPLE_CHANGED); reset(); }}>
              Sample
            </Button>
          }
        >
          <Textarea ref={originalRef} id={originalId} value={original} onChange={(e) => setOriginal(e.target.value)} placeholder='{"name": "before"}' className="min-h-72" wrap="off" />
        </ToolPanel>
        <ToolPanel label="Changed JSON" htmlFor={changedId}>
          <Textarea ref={changedRef} id={changedId} value={changed} onChange={(e) => setChanged(e.target.value)} placeholder='{"name": "after"}' className="min-h-72" wrap="off" />
        </ToolPanel>
      </ToolColumns>

      <ActionBar
        shortcut
        primary={
          <Button variant="primary" onClick={() => compare()} disabled={!original.trim() || !changed.trim()}>
            Compare
          </Button>
        }
        secondary={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setOriginal(changed);
                setChanged(original);
                if (result) compare(changed, original);
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

      {result && !result.ok ? (
        <Alert title={`Invalid JSON in the ${result.side} document: line ${result.error.line}, column ${result.error.column}`}>
          <p>{result.error.message}.</p>
          <ErrorContext input={result.side === "original" ? original : changed} line={result.error.line} column={result.error.column} />
          <Button
            size="sm"
            variant="ghost"
            className="mt-1 -ml-3"
            onClick={() => selectPosition(result.side === "original" ? originalRef.current : changedRef.current, result.error.line, result.error.column)}
          >
            Show in input
          </Button>
        </Alert>
      ) : null}

      {result?.ok ? (
        <section aria-labelledby="json-diff-heading" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="json-diff-heading" role="status" className="flex flex-wrap items-baseline gap-x-3 text-sm">
              {result.changes.length === 0 ? (
                <span className="font-medium">No differences. The documents are equivalent.</span>
              ) : (
                <>
                  <span className="font-medium text-success">{result.added} added</span>
                  <span className="font-medium text-danger">{result.removed} removed</span>
                  <span className="font-medium text-accent">{result.changed} changed</span>
                </>
              )}
            </h2>
            {result.changes.length ? <CopyButton text={report} label="Copy changes" /> : null}
          </div>
          {stale ? (
            <Alert tone="warning" title="The JSON has changed since this comparison.">
              Select Compare to update the result.
            </Alert>
          ) : null}
          {result.warnings.length ? <p className="text-sm text-muted-foreground">{result.warnings.join(" ")}</p> : null}
          {result.truncated ? <p className="text-sm text-muted-foreground">Only the first {result.changes.length.toLocaleString()} changes are listed.</p> : null}

          {result.changes.length ? (
            <>
              <SegmentedControl
                label="Show"
                hideLabel
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "added", label: "Added" },
                  { value: "removed", label: "Removed" },
                  { value: "changed", label: "Changed" },
                ]}
              />
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-subtle text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">Change</th>
                      <th scope="col" className="px-3 py-2 font-medium">Path</th>
                      <th scope="col" className="px-3 py-2 font-medium">Before</th>
                      <th scope="col" className="px-3 py-2 font-medium">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((c, i) => (
                      <tr key={`${c.path}-${i}`} className="border-t border-border align-top">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={cn("inline-block rounded-sm border px-1.5 py-0.5 text-xs font-medium", kindStyle[c.kind].badge)}>
                            {kindStyle[c.kind].label}
                          </span>
                          {c.typeChange ? (
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {c.typeChange.from} → {c.typeChange.to}
                            </span>
                          ) : null}
                        </td>
                        <td className="min-w-40 px-3 py-2 font-mono break-all">{c.path}</td>
                        <td className="min-w-32 px-3 py-2 font-mono break-all text-muted-foreground">{c.before ?? "—"}</td>
                        <td className="min-w-32 px-3 py-2 font-mono break-all">{c.after ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

    </ShortcutScope>
  );
}
