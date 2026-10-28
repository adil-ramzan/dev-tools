"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import {
  MAX_MATCHES,
  MAX_TEST_LENGTH,
  REGEX_FLAGS,
  REGEX_TIMEOUT_MS,
  type RegexMatch,
  type RegexRunResult,
} from "@/lib/tools/regex";

const SAMPLE = {
  pattern: String.raw`(?<user>[\w.+-]+)@(?<domain>[\w-]+(?:\.[\w-]+)+)`,
  flags: "g",
  text: `Contact sales@example.com or support@help.example.org.
Invalid: user@localhost, @example.com
Personal: jane.doe+news@mail.example.co.uk`,
};

/** Rows shown in the match table; the highlight shows every collected match. */
const TABLE_LIMIT = 200;

type Outcome =
  | { status: "idle" }
  | { status: "running" }
  | { status: "timeout" }
  | { status: "crashed" }
  | { status: "done"; result: RegexRunResult; text: string };

export function RegexTester() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("");
  const [outcome, setOutcome] = useState<Outcome>({ status: "idle" });
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<number | null>(null);
  const runId = useRef(0);
  const patternId = useId();
  const textId = useId();
  const flagsLabelId = useId();

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      if (pendingRef.current) window.clearTimeout(pendingRef.current);
    },
    [],
  );

  // Match in a Web Worker, shortly after typing stops. A run that takes longer
  // than REGEX_TIMEOUT_MS (for example catastrophic backtracking) is stopped by
  // terminating the worker, so the page itself never freezes.
  useEffect(() => {
    if (pattern === "") return;
    const debounce = window.setTimeout(() => {
      if (pendingRef.current !== null) {
        // The previous run is still going and may be stuck: stop it.
        window.clearTimeout(pendingRef.current);
        workerRef.current?.terminate();
        workerRef.current = null;
      }
      const worker = workerRef.current ?? new Worker(new URL("./regex.worker.ts", import.meta.url));
      workerRef.current = worker;
      const id = ++runId.current;
      setOutcome({ status: "running" });

      const finish = (next: Outcome) => {
        if (id !== runId.current) return;
        if (pendingRef.current !== null) window.clearTimeout(pendingRef.current);
        pendingRef.current = null;
        setOutcome(next);
      };

      pendingRef.current = window.setTimeout(() => {
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
        finish({ status: "timeout" });
      }, REGEX_TIMEOUT_MS);

      worker.onmessage = (event: MessageEvent<{ id: number; result: RegexRunResult }>) => {
        if (event.data.id === id) finish({ status: "done", result: event.data.result, text });
      };
      worker.onerror = () => {
        worker.terminate();
        if (workerRef.current === worker) workerRef.current = null;
        finish({ status: "crashed" });
      };
      worker.postMessage({ id, pattern, flags, text });
    }, 200);
    return () => window.clearTimeout(debounce);
  }, [pattern, flags, text]);

  function toggleFlag(flag: string) {
    setFlags((current) =>
      current.includes(flag)
        ? current.replace(flag, "")
        : REGEX_FLAGS.map((f) => f.flag)
            .filter((f) => f === flag || current.includes(f))
            .join(""),
    );
  }

  const literal = pattern ? `/${pattern.replace(/(?<!\\)\//g, "\\/")}/${flags}` : "";
  const shown: Outcome = pattern === "" ? { status: "idle" } : outcome;
  const matches = shown.status === "done" && shown.result.ok ? shown.result.matches : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={patternId} className="text-sm font-medium">
            Regular expression
          </label>
          <div className="flex items-center rounded-sm border border-input bg-surface font-mono focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent hover:border-foreground/50">
            <span aria-hidden="true" className="pl-3 text-muted-foreground">/</span>
            <input
              id={patternId}
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="[A-Z]\w+"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="h-10 min-w-0 flex-1 bg-transparent px-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <span aria-hidden="true" className="pr-3 text-muted-foreground">
              /{flags}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-labelledby={flagsLabelId} className="flex flex-wrap items-center gap-1.5">
            <span id={flagsLabelId} className="mr-1.5 text-sm font-medium">
              Flags
            </span>
            {REGEX_FLAGS.map(({ flag, name, description }) => (
              <label key={flag} title={`${name}: ${description}`} className="relative">
                <input
                  type="checkbox"
                  checked={flags.includes(flag)}
                  onChange={() => toggleFlag(flag)}
                  className="peer sr-only"
                />
                <span className="flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-border px-2.5 text-sm text-muted-foreground transition-colors duration-150 peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-accent hover:text-foreground peer-checked:hover:text-background">
                  <span className="font-mono">{flag}</span>
                  <span className="hidden text-xs sm:inline">{name}</span>
                  <span className="sr-only">: {description}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setPattern(SAMPLE.pattern); setFlags(SAMPLE.flags); setText(SAMPLE.text); }}>
              Sample
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setPattern(""); setText(""); setFlags("g"); }} disabled={!pattern && !text}>
              Clear
            </Button>
            <CopyButton text={literal} label="Copy regex" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ToolPanel
          label="Test text"
          htmlFor={textId}
          footer={`${text.length.toLocaleString()} / ${MAX_TEST_LENGTH.toLocaleString()} characters`}
        >
          <Textarea
            id={textId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_TEST_LENGTH}
            placeholder="Paste the text to search"
            className="min-h-72"
          />
        </ToolPanel>

        <ToolPanel
          label="Matches"
          labelId={`${textId}-matches`}
          actions={<CopyButton text={matches.map((m) => m.text).join("\n")} label="Copy matches" />}
        >
          <ResultSummary outcome={shown} flags={flags} />
          {shown.status === "done" && shown.result.ok ? (
            <pre
              aria-label="Test text with matches highlighted"
              className="max-h-72 min-h-24 overflow-auto rounded-sm border border-border bg-subtle p-3 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap"
            >
              <Highlighted text={shown.text} matches={shown.result.matches} />
            </pre>
          ) : null}
        </ToolPanel>
      </div>

      {matches.length > 0 ? <MatchTable matches={matches} /> : null}
    </div>
  );
}

function ResultSummary({ outcome, flags }: { outcome: Outcome; flags: string }) {
  switch (outcome.status) {
    case "idle":
      return <p className="text-sm text-muted-foreground">Enter a regular expression to see matches.</p>;
    case "running":
      return <p className="text-sm text-muted-foreground">Matching…</p>;
    case "timeout":
      return (
        <Alert title={`Stopped after ${REGEX_TIMEOUT_MS / 1000} second`}>
          This pattern took too long on this text, which usually means catastrophic backtracking (for example
          nested quantifiers such as <code className="font-mono">(a+)+</code>). Matching was stopped so the page
          stays responsive. Try a more specific pattern or a shorter text.
        </Alert>
      );
    case "crashed":
      return <Alert title="Matching failed">The pattern could not be run in this browser. Try again or simplify it.</Alert>;
    case "done": {
      const { result } = outcome;
      if (!result.ok) return <Alert title="Invalid regular expression">{result.error}</Alert>;
      const count = result.matches.length;
      return (
        <p role="status" className="text-sm">
          <span className="font-medium">
            {count === 0 ? "No matches" : `${count.toLocaleString()}${result.truncated ? "+" : ""} ${count === 1 ? "match" : "matches"}`}
          </span>
          <span className="text-muted-foreground">
            {result.truncated ? ` (stopped after the first ${MAX_MATCHES.toLocaleString()})` : ""}
            {!flags.includes("g") && count > 0 ? ". Without the g flag only the first match is found" : ""}
          </span>
        </p>
      );
    }
  }
}

function Highlighted({ text, matches }: { text: string; matches: RegexMatch[] }) {
  const parts: ReactNode[] = [];
  let last = 0;
  matches.forEach((m, i) => {
    if (m.index < last) return;
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      m.text === "" ? (
        <mark key={i} aria-label="empty match" className="inline-block h-[1.1em] w-0.5 bg-accent align-text-bottom" />
      ) : (
        <mark key={i} className={cn("rounded-xs px-px text-foreground", i % 2 ? "bg-accent/30" : "bg-accent/20")}>
          {m.text}
        </mark>
      ),
    );
    last = m.end;
  });
  parts.push(text.slice(last));
  return <>{parts}</>;
}

function MatchTable({ matches }: { matches: RegexMatch[] }) {
  const groupCount = Math.max(...matches.map((m) => m.groups.length));
  const names = Object.keys(matches.find((m) => m.named)?.named ?? {});
  const shown = matches.slice(0, TABLE_LIMIT);
  return (
    <section aria-labelledby="match-details-heading" className="flex flex-col gap-3">
      <h2 id="match-details-heading" className="text-sm font-medium">
        Match details
        {matches.length > TABLE_LIMIT ? (
          <span className="font-normal text-muted-foreground"> (first {TABLE_LIMIT} shown)</span>
        ) : null}
      </h2>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-subtle text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">#</th>
              <th scope="col" className="px-3 py-2 font-medium">Match</th>
              <th scope="col" className="px-3 py-2 font-medium">Position</th>
              {Array.from({ length: groupCount }, (_, g) => (
                <th key={g} scope="col" className="px-3 py-2 font-medium whitespace-nowrap">
                  Group {g + 1}
                  {names[g] ? <span className="font-mono"> ({names[g]})</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono">
            {shown.map((m, i) => (
              <tr key={i} className="border-t border-border align-top">
                <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                <td className="max-w-96 min-w-32 px-3 py-2 break-all">{m.text === "" ? <Empty /> : m.text}</td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                  {m.index}–{m.end}
                </td>
                {Array.from({ length: groupCount }, (_, g) => (
                  <td key={g} className="max-w-96 min-w-32 px-3 py-2 break-all">
                    {m.groups[g] === undefined ? <Empty label="not matched" /> : m.groups[g] === "" ? <Empty /> : m.groups[g]}
                    {m.groupIndices?.[g] ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        @{m.groupIndices[g]![0]}–{m.groupIndices[g]![1]}
                      </span>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Empty({ label = "empty" }: { label?: string }) {
  return <span className="font-sans text-xs text-muted-foreground italic">{label}</span>;
}
