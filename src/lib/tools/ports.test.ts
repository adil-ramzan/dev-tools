import { describe, expect, it } from "vitest";
import {
  COMMON_PORTS,
  DEFAULT_SETTINGS,
  allowedIntervals,
  generatePorts,
  mergeIntervals,
  parsePortList,
  planPorts,
  portAt,
  secureIndex,
  type PortSettings,
} from "@/lib/tools/ports";

const settings = (overrides: Partial<PortSettings>): PortSettings => ({ ...DEFAULT_SETTINGS, ...overrides });

/** A fake generator that returns the given 32-bit values in order. */
function sequence(values: number[]) {
  let i = 0;
  return {
    getRandomValues: <T extends ArrayBufferView | null>(array: T) => {
      const view = array as unknown as Uint32Array;
      for (let k = 0; k < view.length; k++) view[k] = values[i++ % values.length];
      return array;
    },
  } as Pick<Crypto, "getRandomValues">;
}

describe("port lists and intervals", () => {
  it("parses ports and ranges", () => {
    expect(parsePortList("80, 443 8000-8002")).toEqual({ ok: true, intervals: [[80, 80], [443, 443], [8000, 8002]] });
    expect(parsePortList("")).toEqual({ ok: true, intervals: [] });
    expect(parsePortList("70000")).toMatchObject({ ok: false, error: expect.stringContaining("outside") });
    expect(parsePortList("9-3")).toMatchObject({ ok: false, error: expect.stringContaining("ends before") });
    expect(parsePortList("http")).toMatchObject({ ok: false });
  });

  it("merges and subtracts intervals", () => {
    expect(mergeIntervals([[5, 9], [1, 3], [4, 4], [20, 30]])).toEqual([[1, 9], [20, 30]]);
    expect(allowedIntervals(0, 20, [[0, 4], [10, 12], [19, 40]])).toEqual([[5, 9], [13, 18]]);
    expect(allowedIntervals(5, 5, [])).toEqual([[5, 5]]);
    expect(allowedIntervals(5, 9, [[0, 100]])).toEqual([]);
    expect(portAt([[5, 9], [13, 18]], 5)).toBe(13);
  });
});

describe("secureIndex", () => {
  it("rejects values that would bias the result", () => {
    // For n = 3, 2^32 mod 3 = 1, so 4294967295 must be rejected.
    expect(secureIndex(3, sequence([4294967295, 7]))).toBe(1);
    expect(secureIndex(1, sequence([123]))).toBe(0);
    expect(() => secureIndex(0, sequence([0]))).toThrow();
  });

  it("is roughly uniform with the real generator", () => {
    const counts = new Array(6).fill(0);
    for (let i = 0; i < 60000; i++) counts[secureIndex(6, crypto)]++;
    for (const c of counts) expect(Math.abs(c - 10000)).toBeLessThan(600);
  });
});

describe("planPorts", () => {
  it("validates the range and count", () => {
    expect(planPorts(settings({ min: 9000, max: 8000 }))).toMatchObject({ ok: false, error: expect.stringContaining("greater") });
    expect(planPorts(settings({ max: 70000 }))).toMatchObject({ ok: false });
    expect(planPorts(settings({ count: 0 }))).toMatchObject({ ok: false });
    expect(planPorts(settings({ count: 1001 }))).toMatchObject({ ok: false });
    expect(planPorts(settings({ custom: "abc" }))).toMatchObject({ ok: false });
  });

  it("applies the exclusion presets", () => {
    const all = planPorts(settings({ min: 0, max: 65535, excludeWellKnown: false, excludeCommon: false }));
    expect(all.ok && all.size).toBe(65536);
    const plan = planPorts(settings({ min: 0, max: 65535, excludeWellKnown: true, excludeCommon: true, excludeDynamic: true }));
    expect(plan.ok && plan.size).toBe(49151 - 1024 + 1 - COMMON_PORTS.filter((p) => p.port >= 1024 && p.port <= 49151).length);
  });

  it("reports an empty or too small set", () => {
    expect(planPorts(settings({ min: 0, max: 1023, excludeWellKnown: true }))).toMatchObject({ ok: false, error: expect.stringContaining("Every port") });
    expect(planPorts(settings({ min: 3000, max: 3002, excludeCommon: true, count: 2, unique: true }))).toMatchObject({ ok: false, error: expect.stringContaining("Only 1 port is") });
    expect(planPorts(settings({ min: 3000, max: 3002, excludeCommon: true, count: 2, unique: false }))).toMatchObject({ ok: true, size: 1 });
  });
});

describe("generatePorts", () => {
  it("draws distinct allowed ports", () => {
    // 8000 is a common port, so 8001–8004 and 8011–8020 remain: 14 ports.
    const s = settings({ min: 8000, max: 8020, custom: "8005-8010", count: 14, unique: true });
    const result = generatePorts(s);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.size).toBe(14);
    expect([...result.ports].sort((a, b) => a - b)).toEqual([8001, 8002, 8003, 8004, 8011, 8012, 8013, 8014, 8015, 8016, 8017, 8018, 8019, 8020]);
    expect(generatePorts({ ...s, count: 15 })).toMatchObject({ ok: false, error: expect.stringContaining("Only 14") });
  });

  it("can draw every allowed port exactly once", () => {
    const result = generatePorts(settings({ min: 40000, max: 40099, count: 100, unique: true }));
    expect(result.ok && [...result.ports].sort((a, b) => a - b)).toEqual(Array.from({ length: 100 }, (_, i) => 40000 + i));
  });

  it("allows repeats when asked", () => {
    const result = generatePorts(settings({ min: 50000, max: 50000, excludeDynamic: false, count: 3, unique: false }));
    expect(result).toEqual({ ok: true, ports: [50000, 50000, 50000], size: 1 });
  });

  it("never excludes a common port that is not in the presets", () => {
    const result = generatePorts(settings({ min: 3000, max: 3000, excludeCommon: false, count: 1 }));
    expect(result).toMatchObject({ ok: true, ports: [3000] });
  });

  it("fails safely without a secure generator", () => {
    expect(generatePorts(DEFAULT_SETTINGS, null)).toMatchObject({ ok: false, error: expect.stringContaining("getRandomValues") });
    const broken = { getRandomValues: () => { throw new Error("boom"); } } as unknown as Pick<Crypto, "getRandomValues">;
    expect(generatePorts(DEFAULT_SETTINGS, broken)).toMatchObject({ ok: false, error: expect.stringContaining("boom") });
  });
});
