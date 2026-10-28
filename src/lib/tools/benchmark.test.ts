import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import {
  BLOCKED_APIS,
  LIMITS,
  SANDBOX_CSP,
  formatOps,
  parseSandboxMessage,
  rank,
  runBenchmarks,
  sandboxDocument,
  summarize,
  tCritical,
  validateSpec,
  type BenchmarkSpec,
} from "@/lib/tools/benchmark";

const spec = (over: Partial<BenchmarkSpec>): BenchmarkSpec => ({
  setup: "const data = Array.from({ length: 1000 }, (_, i) => i);",
  cases: [],
  samples: 5,
  minSampleMs: 5,
  maxTimeMs: 5000,
  ...over,
});
const run = (s: BenchmarkSpec) => runBenchmarks(s, () => performance.now(), () => {});

describe("runBenchmarks", () => {
  it("measures each case with the requested number of samples", () => {
    const output = run(spec({ cases: [{ id: "a", name: "for", code: "let s = 0; for (let j = 0; j < data.length; j++) s += data[j];" }, { id: "b", name: "reduce", code: "data.reduce((x, y) => x + y, 0);" }] }));
    expect(output.partial).toBe(false);
    for (const c of output.cases) {
      expect(c.error).toBeUndefined();
      expect(c.samples).toHaveLength(5);
      expect(c.samples.every((ops) => ops > 0 && Number.isFinite(ops))).toBe(true);
      expect(c.count).toBeGreaterThan(0);
    }
  });

  it("detects a clearly slower case", () => {
    const output = run(spec({ samples: 8, cases: [{ id: "fast", name: "fast", code: "data[0];" }, { id: "slow", name: "slow", code: "JSON.parse(JSON.stringify(data));" }] }));
    const [fastest] = rank(output.cases.map((c) => ({ id: c.id, summary: summarize(c.samples) })));
    expect(fastest.id).toBe("fast");
  });

  it("reports syntax and runtime errors per case and keeps measuring the others", () => {
    const output = run(spec({ cases: [{ id: "bad", name: "bad", code: "let = ;" }, { id: "throws", name: "throws", code: "throw new Error('boom');" }, { id: "ok", name: "ok", code: "data[1];" }] }));
    expect(output.cases[0].error).toMatch(/^Syntax error/);
    expect(output.cases[1].error).toBe("Error: boom");
    expect(output.cases[2].samples).toHaveLength(5);
  });

  it("stops at the time limit and marks the result as partial", () => {
    const output = run(spec({ maxTimeMs: 200, samples: 100, minSampleMs: 20, cases: [{ id: "a", name: "a", code: "data.slice();" }] }));
    expect(output.partial).toBe(true);
    expect(output.cases[0].samples.length).toBeLessThan(100);
  });

  it("reports progress", () => {
    const progress: number[] = [];
    runBenchmarks(spec({ cases: [{ id: "a", name: "a", code: "data[0];" }] }), () => performance.now(), (m) => progress.push(m.done));
    expect(progress.at(-1)).toBe(5);
  });

  it("is self-contained, so it can be serialized into the worker", () => {
    const rebuilt = new Function(`return ${runBenchmarks.toString()}`)() as typeof runBenchmarks;
    const output = rebuilt(spec({ cases: [{ id: "a", name: "a", code: "data[0];" }] }), () => performance.now(), () => {});
    expect(output.cases[0].samples).toHaveLength(5);
  });
});

describe("statistics", () => {
  it("summarizes samples", () => {
    const s = summarize([10, 12, 14, 16, 18])!;
    expect(s).toMatchObject({ n: 5, mean: 14, median: 14, min: 10, max: 18 });
    expect(s.stddev).toBeCloseTo(3.1623, 3);
    expect(s.rme).toBeCloseTo(((2.776 * s.stddev) / Math.sqrt(5) / 14) * 100, 6);
    expect(summarize([1, 2, 3, 4])!.median).toBe(2.5);
    expect(summarize([]) ).toBeNull();
    expect(summarize([5])!.rme).toBe(Infinity);
  });

  it("uses t critical values for small samples", () => {
    expect(tCritical(1)).toBe(12.706);
    expect(tCritical(30)).toBe(2.042);
    expect(tCritical(500)).toBe(1.96);
  });

  it("ranks by mean and flags differences within the noise", () => {
    const ranked = rank([
      { id: "a", summary: summarize([100, 101, 99, 100, 100]) },
      { id: "b", summary: summarize([200, 202, 198, 200, 200]) },
      { id: "c", summary: summarize([199, 201, 197, 199, 199]) },
      { id: "err", summary: null },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["b", "c", "a"]);
    expect(ranked[0].fastest).toBe(true);
    expect(ranked[1].overlapsFastest).toBe(true);
    expect(ranked[2].overlapsFastest).toBe(false);
    expect(ranked[2].relative).toBeCloseTo(0.5, 2);
  });

  it("formats operations per second", () => {
    expect(formatOps(1234567)).toBe("1.23 million");
    expect(formatOps(12345)).toBe("12,345");
    expect(formatOps(12.345)).toBe("12.35");
    expect(formatOps(Infinity)).toBe("–");
  });
});

describe("validateSpec", () => {
  const ok = spec({ cases: [{ id: "a", name: "Case 1", code: "1" }] });
  it("accepts a valid spec and rejects out-of-range settings", () => {
    expect(validateSpec(ok)).toBeNull();
    expect(validateSpec({ ...ok, cases: [] })).toMatch(/at least one/);
    expect(validateSpec({ ...ok, cases: Array.from({ length: 9 }, (_, i) => ({ id: String(i), name: `Case ${i}`, code: "1" })) })).toMatch(/at most 8/);
    expect(validateSpec({ ...ok, cases: [{ id: "a", name: "Case 1", code: "  " }] })).toMatch(/Case 1 has no code/);
    expect(validateSpec({ ...ok, setup: "x".repeat(LIMITS.maxCodeLength + 1) })).toMatch(/Setup is longer/);
    expect(validateSpec({ ...ok, samples: 2 })).toMatch(/Samples/);
    expect(validateSpec({ ...ok, maxTimeMs: 500 })).toMatch(/time limit/);
  });
});

describe("sandbox", () => {
  it("blocks every API that can reach the network or storage", () => {
    for (const api of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "Worker", "FontFace", "caches", "indexedDB"]) expect(BLOCKED_APIS).toContain(api);
  });

  it("blocks the network and contains no same-origin escape hatch", () => {
    const doc = sandboxDocument();
    expect(SANDBOX_CSP).toMatch(/^default-src 'none'/);
    expect(SANDBOX_CSP).not.toMatch(/connect-src|https?:|'self'/);
    expect(doc).toContain(`<meta http-equiv="Content-Security-Policy" content="${SANDBOX_CSP}">`);
    // The worker removes network and storage APIs before running any benchmark code.
    expect(doc).toContain('for (const name of [\\"fetch\\",\\"XMLHttpRequest\\"');
    expect(doc.indexOf("Object.defineProperty(target, name")).toBeLessThan(doc.indexOf("const runBenchmarks"));
    // The embedded worker source cannot close the script element early.
    expect(doc.match(/<\/script>/g)).toHaveLength(1);
  });

  it("accepts only well-formed messages from the sandbox", () => {
    expect(parseSandboxMessage({ type: "ready" })).toEqual({ type: "ready" });
    expect(parseSandboxMessage({ type: "result", runId: 1, partial: false, cases: [{ id: "a", count: 10, samples: [1, 2] }] })).toMatchObject({ type: "result", cases: [{ id: "a" }] });
    expect(parseSandboxMessage({ type: "result", runId: 1, cases: [{ id: "a", count: 10, samples: ["<img onerror=x>"] }] })).toBeNull();
    expect(parseSandboxMessage({ type: "result", runId: "1", cases: [] })).toBeNull();
    expect(parseSandboxMessage({ type: "progress", runId: 1, done: Infinity, total: 2 })).toBeNull();
    expect(parseSandboxMessage({ type: "eval", code: "alert(1)" })).toBeNull();
    expect(parseSandboxMessage("ready")).toBeNull();
    expect(parseSandboxMessage(null)).toBeNull();
  });
});
