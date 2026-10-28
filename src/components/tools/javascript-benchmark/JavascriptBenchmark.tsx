"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import {
  LIMITS,
  formatOps,
  parseSandboxMessage,
  rank,
  sandboxDocument,
  summarize,
  validateSpec,
  type BenchmarkCase,
  type CaseOutcome,
} from "@/lib/tools/benchmark";

const SAMPLE_SETUP = "const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, active: i % 3 === 0 }));";
const SAMPLE_CASES: BenchmarkCase[] = [
  { id: "c1", name: "for loop", code: "let count = 0;\nfor (let i = 0; i < items.length; i++) if (items[i].active) count++;" },
  { id: "c2", name: "filter().length", code: "const count = items.filter((item) => item.active).length;" },
  { id: "c3", name: "reduce", code: "const count = items.reduce((n, item) => n + (item.active ? 1 : 0), 0);" },
];

type Status = { kind: "idle" | "running" | "done" } | { kind: "error"; message: string };

let nextId = 4;

export function JavascriptBenchmark() {
  const [setup, setSetup] = useState(SAMPLE_SETUP);
  const [cases, setCases] = useState<BenchmarkCase[]>(SAMPLE_CASES);
  const [samplesText, setSamplesText] = useState("20");
  const [limitText, setLimitText] = useState("10");
  const [ready, setReady] = useState(false);
  // The sandbox is created after hydration, once this page is listening for its messages.
  const [mounted, setMounted] = useState(false);
  const [sandboxKey, setSandboxKey] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [outcomes, setOutcomes] = useState<{ cases: CaseOutcome[]; partial: boolean; names: Record<string, string> } | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const runId = useRef(0);
  const watchdog = useRef<number | undefined>(undefined);
  const names = useRef<Record<string, string>>({});
  const ids = { setup: useId(), samples: useId(), limit: useId() };
  const srcDoc = useMemo(() => sandboxDocument(), []);

  const resetSandbox = useCallback(() => {
    setReady(false);
    setSandboxKey((k) => k + 1);
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      // Only the sandbox frame may talk to this page, and only in the expected shapes.
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) return;
      const message = parseSandboxMessage(event.data);
      if (!message) return;
      if (message.type === "ready") {
        setReady(true);
        return;
      }
      if (message.runId !== runId.current) return;
      if (message.type === "progress") setProgress({ done: message.done, total: message.total });
      if (message.type === "result") {
        window.clearTimeout(watchdog.current);
        setOutcomes({ cases: message.cases, partial: message.partial, names: { ...names.current } });
        setStatus({ kind: "done" });
      }
      if (message.type === "timeout" || message.type === "crash") {
        window.clearTimeout(watchdog.current);
        setStatus({ kind: "error", message: message.type === "timeout" ? "The benchmark did not finish within the time limit, so it was stopped. Check for endless loops, or raise the limit." : message.message });
        resetSandbox();
      }
    }
    window.addEventListener("message", onMessage);
    const handle = window.setTimeout(() => setMounted(true), 0);
    return () => {
      window.clearTimeout(handle);
      window.removeEventListener("message", onMessage);
      window.clearTimeout(watchdog.current);
    };
  }, [resetSandbox]);

  const samples = Number(samplesText);
  const maxTimeMs = Number(limitText) * 1000;
  const spec = { setup, cases, samples, minSampleMs: 20, maxTimeMs };
  const invalid = validateSpec(spec);

  function run() {
    const frame = frameRef.current?.contentWindow;
    if (invalid || !frame) return;
    const id = ++runId.current;
    names.current = Object.fromEntries(cases.map((c, i) => [c.id, c.name.trim() || `Case ${i + 1}`]));
    setStatus({ kind: "running" });
    setProgress(null);
    setOutcomes(null);
    // The frame has an opaque origin, so "*" is the only possible target; the data is the user's own code.
    frame.postMessage({ type: "run", runId: id, spec }, "*");
    window.clearTimeout(watchdog.current);
    watchdog.current = window.setTimeout(() => {
      if (runId.current !== id) return;
      setStatus({ kind: "error", message: "The sandbox stopped responding and was restarted." });
      resetSandbox();
    }, maxTimeMs + 5000);
  }

  function stop() {
    runId.current++;
    window.clearTimeout(watchdog.current);
    setStatus({ kind: "idle" });
    setProgress(null);
    resetSandbox();
  }

  const updateCase = (id: string, field: "name" | "code", value: string) => setCases((cs) => cs.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const ranked = outcomes ? rank(outcomes.cases.map((c) => ({ id: c.id, summary: summarize(c.samples) }))) : [];
  const failed = outcomes?.cases.filter((c) => c.error) ?? [];
  const summaryText = ranked
    .map((r) => `${outcomes!.names[r.id]}: ${formatOps(r.summary.mean)} ops/s ±${r.summary.rme.toFixed(1)}% (${r.fastest ? "fastest" : `${Math.round((1 - r.relative) * 100)}% slower`})`)
    .join("\n");
  const running = status.kind === "running";

  return (
    <div className="flex flex-col gap-6">
      {mounted ? (
        <iframe
          key={sandboxKey}
          ref={frameRef}
          title="Benchmark sandbox"
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          // Ask for "ready" once loaded, in case the frame's own announcement came first.
          onLoad={(e) => e.currentTarget.contentWindow?.postMessage({ type: "ping" }, "*")}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.setup}>Setup (runs before each timed batch, not timed)</Label>
        <Textarea id={ids.setup} value={setup} onChange={(e) => setSetup(e.target.value)} className="min-h-20" wrap="off" disabled={running} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cases.map((c, i) => (
          <div key={c.id} className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
            <div className="flex items-center gap-2">
              <Input aria-label={`Name of case ${i + 1}`} value={c.name} onChange={(e) => updateCase(c.id, "name", e.target.value)} placeholder={`Case ${i + 1}`} className="h-8" disabled={running} />
              <Button size="sm" variant="ghost" aria-label={`Remove case ${i + 1}`} onClick={() => setCases((cs) => cs.filter((x) => x.id !== c.id))} disabled={running || cases.length <= 1}>
                Remove
              </Button>
            </div>
            <Textarea aria-label={`Code for case ${i + 1}`} value={c.code} onChange={(e) => updateCase(c.id, "code", e.target.value)} className="min-h-24" wrap="off" disabled={running} />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 rounded-md border border-border bg-surface p-4">
        <div className="flex flex-wrap items-end gap-4">
          <Button onClick={() => setCases((cs) => [...cs, { id: `c${nextId++}`, name: "", code: "" }])} disabled={running || cases.length >= LIMITS.maxCases}>
            Add case
          </Button>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.samples}>Samples per case</Label>
            <Input id={ids.samples} type="number" min={LIMITS.minSamples} max={LIMITS.maxSamples} value={samplesText} onChange={(e) => setSamplesText(e.target.value)} className="h-9 w-28" disabled={running} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.limit}>Time limit (seconds)</Label>
            <Input id={ids.limit} type="number" min={1} max={60} value={limitText} onChange={(e) => setLimitText(e.target.value)} className="h-9 w-28" disabled={running} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {running ? (
            <Button onClick={stop}>Stop</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => { setSetup(SAMPLE_SETUP); setCases(SAMPLE_CASES); setOutcomes(null); setStatus({ kind: "idle" }); }}>
                Restore example
              </Button>
              <Button variant="ghost" onClick={() => { setSetup(""); setCases([{ id: `c${nextId++}`, name: "", code: "" }]); setOutcomes(null); setStatus({ kind: "idle" }); }}>
                Clear
              </Button>
            </>
          )}
          <Button variant="primary" onClick={run} disabled={!ready || running || invalid !== null} aria-busy={running}>
            {running ? "Running…" : ready ? "Run benchmark" : "Starting sandbox…"}
          </Button>
        </div>
      </div>

      {invalid ? <Alert tone="warning" title="Check the benchmark">{invalid}</Alert> : null}
      {running ? (
        <p role="status" className="text-sm text-muted-foreground">
          Running{progress ? `: ${progress.done} of ${progress.total} samples` : ": calibrating and warming up"}…
        </p>
      ) : null}
      {status.kind === "error" ? <Alert title="The benchmark stopped">{status.message}</Alert> : null}

      {outcomes ? (
        <section aria-labelledby="bench-results" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="bench-results" className="text-sm font-medium">Results</h2>
            <CopyButton text={summaryText} label="Copy results" ariaLabel="Copy benchmark results" />
          </div>
          {outcomes.partial ? <Alert tone="warning">The time limit was reached before all samples were taken, so the results are less precise.</Alert> : null}
          <ol className="flex flex-col gap-2" data-bench-results>
            {ranked.map((r) => (
              <li key={r.id} className="flex flex-col gap-1.5 rounded-md border border-border bg-surface p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">
                    {outcomes.names[r.id]}
                    {r.fastest ? <span className="ml-2 text-sm font-normal text-success">Fastest</span> : <span className="ml-2 text-sm font-normal text-muted-foreground">{Math.round((1 - r.relative) * 100)}% slower{r.overlapsFastest ? " (within the margin of error)" : ""}</span>}
                  </p>
                  <p className="font-mono text-sm" data-ops={r.id}>
                    {formatOps(r.summary.mean)} ops/s ±{r.summary.rme.toFixed(1)}%
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
                  <div className={cn("h-full rounded-full", r.fastest ? "bg-success" : "bg-accent")} style={{ width: `${Math.max(2, r.relative * 100)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.summary.n} samples · median {formatOps(r.summary.median)} ops/s · {formatOps(r.summary.min)}–{formatOps(r.summary.max)}
                </p>
              </li>
            ))}
          </ol>
          {failed.map((c) => (
            <Alert key={c.id} title={`${outcomes.names[c.id]} failed`}>
              {c.error}
            </Alert>
          ))}
        </section>
      ) : null}

      <Notice title="Read microbenchmarks with care">
        Results depend on the browser, the machine, other open tabs and the JIT compiler, which may optimize away code whose
        result is never used. Small differences, especially within the margin of error, rarely matter in real applications;
        measure your actual workload before optimizing. Code runs in an isolated sandbox with no access to this page, your
        data or the network, and is stopped at the time limit.
      </Notice>
    </div>
  );
}
