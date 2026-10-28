/**
 * JavaScript micro-benchmarks, run in isolation:
 *
 * - The code runs in a Web Worker created inside an iframe with
 *   sandbox="allow-scripts" and without allow-same-origin. The frame has an
 *   opaque origin, so the code cannot reach this page's DOM, cookies,
 *   localStorage or IndexedDB, and the worker has no DOM at all.
 * - The frame's Content-Security-Policy is default-src 'none', which the
 *   worker inherits: fetch, XMLHttpRequest, WebSocket, importScripts from the
 *   network and similar requests are blocked.
 * - The frame terminates the worker when the time limit passes, and the page
 *   removes the frame if it stops responding, so an endless loop cannot
 *   freeze the page.
 *
 * Measurement: each case is calibrated to run long enough to time reliably,
 * warmed up, then sampled repeatedly, alternating between cases to spread out
 * background noise. Results are operations per second with a 95% margin of
 * error. Microbenchmarks measure small, isolated pieces of code; the JIT
 * compiler, garbage collector and real data often make production code behave
 * differently.
 */

export type BenchmarkCase = { id: string; name: string; code: string };

export type BenchmarkSpec = {
  setup: string;
  cases: BenchmarkCase[];
  /** Samples per case. */
  samples: number;
  /** Minimum duration of one timed batch, in milliseconds. */
  minSampleMs: number;
  /** Total time limit, in milliseconds. */
  maxTimeMs: number;
};

export type CaseOutcome = { id: string; samples: number[]; count: number; error?: string };

export type RunnerOutput = { cases: CaseOutcome[]; partial: boolean };

export type RunnerMessage = { type: "progress"; done: number; total: number };

export const LIMITS = {
  maxCases: 8,
  maxCodeLength: 20_000,
  minSamples: 5,
  maxSamples: 100,
  minTimeLimitMs: 1000,
  maxTimeLimitMs: 60_000,
};

/**
 * Runs the benchmark. This function is serialized into the worker, so it must
 * not use anything from outside its own body except its parameters and
 * standard globals.
 */
export function runBenchmarks(spec: BenchmarkSpec, now: () => number, report: (message: RunnerMessage) => void): RunnerOutput {
  const deadline = now() + spec.maxTimeMs;
  const outcomes: CaseOutcome[] = [];
  const timers: ((count: number) => number)[] = [];

  for (const c of spec.cases) {
    const outcome: CaseOutcome = { id: c.id, samples: [], count: 0 };
    outcomes.push(outcome);
    try {
      const body = `${spec.setup}\n;const __start = __now();\nfor (let __i = 0; __i < __count; __i++) {\n${c.code}\n}\nreturn __now() - __start;`;
      const fn = new Function("__count", "__now", body) as (count: number, clock: () => number) => number;
      timers.push((count) => fn(count, now));
    } catch (error) {
      outcome.error = `Syntax error: ${error instanceof Error ? error.message : String(error)}`;
      timers.push(() => 0);
    }
  }

  const active = () => outcomes.filter((o) => !o.error);

  // Calibrate: find an iteration count whose batch takes at least minSampleMs, then warm up.
  outcomes.forEach((outcome, index) => {
    if (outcome.error) return;
    try {
      let count = 1;
      for (;;) {
        const elapsed = timers[index](count);
        if (elapsed >= spec.minSampleMs || count >= 1 << 30 || now() > deadline) break;
        count = elapsed <= 0 ? count * 10 : Math.min(1 << 30, Math.max(count * 2, Math.ceil((count * spec.minSampleMs * 1.2) / elapsed)));
      }
      outcome.count = count;
      timers[index](count);
    } catch (error) {
      outcome.error = `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  });

  let partial = false;
  const total = spec.samples * active().length;
  let done = 0;
  for (let round = 0; round < spec.samples && !partial; round++) {
    outcomes.forEach((outcome, index) => {
      if (outcome.error || partial) return;
      if (now() > deadline) {
        partial = true;
        return;
      }
      try {
        const elapsed = timers[index](outcome.count);
        if (elapsed > 0) outcome.samples.push(outcome.count / (elapsed / 1000));
      } catch (error) {
        outcome.error = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
      done++;
    });
    report({ type: "progress", done, total });
  }
  return { cases: outcomes, partial };
}

/** Two-sided 95% critical values of Student's t distribution, by degrees of freedom. */
const T_95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042];

export function tCritical(df: number): number {
  if (df < 1) return Infinity;
  return df <= T_95.length ? T_95[df - 1] : 1.96;
}

export type Summary = {
  n: number;
  mean: number;
  median: number;
  stddev: number;
  /** Relative margin of error at 95% confidence, in percent. */
  rme: number;
  min: number;
  max: number;
};

/** Summary statistics for samples of operations per second. */
export function summarize(samples: number[]): Summary | null {
  const n = samples.length;
  if (n === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? samples.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  const stddev = Math.sqrt(variance);
  const rme = n > 1 ? ((tCritical(n - 1) * stddev) / Math.sqrt(n) / mean) * 100 : Infinity;
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return { n, mean, median, stddev, rme, min: sorted[0], max: sorted[n - 1] };
}

export type Ranked = { id: string; summary: Summary; relative: number; fastest: boolean; overlapsFastest: boolean };

/**
 * Orders cases by mean speed. `relative` is each case's speed as a fraction
 * of the fastest. `overlapsFastest` is true when the confidence intervals
 * overlap, meaning the difference may be noise.
 */
export function rank(results: { id: string; summary: Summary | null }[]): Ranked[] {
  const valid = results.filter((r): r is { id: string; summary: Summary } => r.summary !== null).sort((a, b) => b.summary.mean - a.summary.mean);
  if (valid.length === 0) return [];
  const best = valid[0].summary;
  const bestLow = best.mean * (1 - best.rme / 100);
  return valid.map((r, i) => ({
    id: r.id,
    summary: r.summary,
    relative: r.summary.mean / best.mean,
    fastest: i === 0,
    overlapsFastest: i > 0 && r.summary.mean * (1 + r.summary.rme / 100) >= bestLow,
  }));
}

export function formatOps(ops: number): string {
  if (!Number.isFinite(ops)) return "–";
  if (ops >= 1e9) return `${(ops / 1e9).toFixed(2)} billion`;
  if (ops >= 1e6) return `${(ops / 1e6).toFixed(2)} million`;
  if (ops >= 1e3) return Math.round(ops).toLocaleString("en-US");
  return ops.toFixed(ops >= 100 ? 0 : 2);
}

export function validateSpec(spec: BenchmarkSpec): string | null {
  if (spec.cases.length === 0) return "Add at least one test case.";
  if (spec.cases.length > LIMITS.maxCases) return `Use at most ${LIMITS.maxCases} test cases.`;
  for (const c of [{ name: "Setup", code: spec.setup }, ...spec.cases]) {
    if (c.code.length > LIMITS.maxCodeLength) return `${c.name} is longer than ${LIMITS.maxCodeLength.toLocaleString("en-US")} characters.`;
  }
  const empty = spec.cases.find((c) => c.code.trim() === "");
  if (empty) return `${empty.name} has no code.`;
  if (!Number.isInteger(spec.samples) || spec.samples < LIMITS.minSamples || spec.samples > LIMITS.maxSamples) return `Samples must be from ${LIMITS.minSamples} to ${LIMITS.maxSamples}.`;
  if (!Number.isFinite(spec.maxTimeMs) || spec.maxTimeMs < LIMITS.minTimeLimitMs || spec.maxTimeMs > LIMITS.maxTimeLimitMs) return `The time limit must be from ${LIMITS.minTimeLimitMs / 1000} to ${LIMITS.maxTimeLimitMs / 1000} seconds.`;
  return null;
}

/** Worker APIs that can reach the network or storage. */
export const BLOCKED_APIS = ["fetch", "XMLHttpRequest", "WebSocket", "WebSocketStream", "WebTransport", "EventSource", "importScripts", "Worker", "SharedWorker", "FontFace", "fonts", "caches", "indexedDB", "BroadcastChannel", "RTCPeerConnection", "Notification"];

/**
 * Runs in the worker before the benchmark code: replaces the network and
 * storage APIs with undefined wherever they are defined on the global object
 * and its prototypes, so they cannot be recovered from a prototype. This is a
 * second layer behind the frame's Content-Security-Policy.
 */
const LOCKDOWN = `for (const name of ${JSON.stringify(BLOCKED_APIS)}) {
  for (let target = self; target; target = Object.getPrototypeOf(target)) {
    if (target === Object.prototype) break;
    if (target === self || Object.prototype.hasOwnProperty.call(target, name)) {
      try { Object.defineProperty(target, name, { value: undefined, writable: false, configurable: false }); } catch (e) {}
    }
  }
}`;

/** No network access, no plugins; scripts only from this document and the worker it creates. */
export const SANDBOX_CSP = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:";

/**
 * The document for the sandboxed frame. It accepts a "run" message from its
 * parent, runs the benchmark in a worker, enforces the time limit and
 * forwards only numbers and error strings back.
 */
export function sandboxDocument(): string {
  const worker = `"use strict";\n${LOCKDOWN}\nconst runBenchmarks = ${runBenchmarks.toString()};\nself.onmessage = (event) => {\n  const output = runBenchmarks(event.data, () => performance.now(), (m) => self.postMessage(m));\n  self.postMessage({ type: "result", output });\n};`;
  const script = `
"use strict";
const WORKER = ${JSON.stringify(worker).replace(/</g, "\\u003c")};
let current = null;
const send = (message) => parent.postMessage(message, "*");
const number = (n) => (typeof n === "number" && Number.isFinite(n) ? n : 0);
function stop() {
  if (!current) return;
  clearTimeout(current.timer);
  current.worker.terminate();
  current = null;
}
addEventListener("message", (event) => {
  if (event.source !== parent || !event.data) return;
  if (event.data.type === "ping") {
    send({ type: "ready" });
    return;
  }
  if (event.data.type !== "run") return;
  stop();
  const { runId, spec } = event.data;
  let worker;
  try {
    const url = URL.createObjectURL(new Blob([WORKER], { type: "text/javascript" }));
    worker = new Worker(url);
    URL.revokeObjectURL(url);
  } catch (error) {
    send({ type: "crash", runId, message: "The browser could not start an isolated worker: " + String(error && error.message || error) });
    return;
  }
  current = { worker, timer: setTimeout(() => { stop(); send({ type: "timeout", runId }); }, number(spec.maxTimeMs) + 1500) };
  worker.onmessage = (e) => {
    const data = e.data || {};
    if (data.type === "progress") send({ type: "progress", runId, done: number(data.done), total: number(data.total) });
    if (data.type === "result" && data.output && Array.isArray(data.output.cases)) {
      const cases = data.output.cases.slice(0, 16).map((c) => ({
        id: String(c && c.id).slice(0, 40),
        count: number(c && c.count),
        samples: Array.isArray(c && c.samples) ? c.samples.slice(0, 200).map(number).filter((n) => n > 0) : [],
        error: c && typeof c.error === "string" ? c.error.slice(0, 500) : undefined,
      }));
      stop();
      send({ type: "result", runId, cases, partial: Boolean(data.output.partial) });
    }
  };
  worker.onerror = (e) => {
    e.preventDefault();
    stop();
    send({ type: "crash", runId, message: String(e.message || "The benchmark stopped with an error.").slice(0, 500) });
  };
  worker.postMessage(spec);
});
send({ type: "ready" });
`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${SANDBOX_CSP}"></head><body><script>${script}</script></body></html>`;
}

export type SandboxMessage =
  | { type: "ready" }
  | { type: "progress"; runId: number; done: number; total: number }
  | { type: "result"; runId: number; cases: CaseOutcome[]; partial: boolean }
  | { type: "timeout"; runId: number }
  | { type: "crash"; runId: number; message: string };

/** Checks the shape of a message from the sandbox before the page uses it. */
export function parseSandboxMessage(data: unknown): SandboxMessage | null {
  if (!data || typeof data !== "object") return null;
  const m = data as Record<string, unknown>;
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  switch (m.type) {
    case "ready":
      return { type: "ready" };
    case "progress":
      return num(m.runId) && num(m.done) && num(m.total) ? { type: "progress", runId: m.runId as number, done: m.done as number, total: m.total as number } : null;
    case "timeout":
      return num(m.runId) ? { type: "timeout", runId: m.runId as number } : null;
    case "crash":
      return num(m.runId) && typeof m.message === "string" ? { type: "crash", runId: m.runId as number, message: m.message } : null;
    case "result": {
      if (!num(m.runId) || !Array.isArray(m.cases)) return null;
      const cases: CaseOutcome[] = [];
      for (const c of m.cases as unknown[]) {
        if (!c || typeof c !== "object") return null;
        const r = c as Record<string, unknown>;
        if (typeof r.id !== "string" || !num(r.count) || !Array.isArray(r.samples) || !(r.samples as unknown[]).every(num)) return null;
        cases.push({ id: r.id, count: r.count as number, samples: r.samples as number[], error: typeof r.error === "string" ? r.error : undefined });
      }
      return { type: "result", runId: m.runId as number, cases, partial: Boolean(m.partial) };
    }
    default:
      return null;
  }
}
