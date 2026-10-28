import { describe, expect, it } from "vitest";
import { ALPHABET, MAX_TIME, decodeUlid, encodeRandom, encodeTime, generateUlids } from "@/lib/tools/ulid";

const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;
const options = { count: 1, monotonic: false, lowercase: false };

describe("encodeTime", () => {
  it("matches the specification example", () => {
    // From github.com/ulid/spec: 1469918176385 → 01ARYZ6S41.
    expect(encodeTime(1469918176385)).toBe("01ARYZ6S41");
    expect(encodeTime(0)).toBe("0000000000");
    expect(encodeTime(MAX_TIME)).toBe("7ZZZZZZZZZ");
  });

  it("rejects timestamps outside 48 bits", () => {
    expect(() => encodeTime(MAX_TIME + 1)).toThrow(RangeError);
    expect(() => encodeTime(-1)).toThrow(RangeError);
    expect(() => encodeTime(1.5)).toThrow(RangeError);
  });
});

describe("encodeRandom", () => {
  it("encodes 80 bits as 16 characters", () => {
    expect(encodeRandom(BigInt(0))).toBe("0".repeat(16));
    expect(encodeRandom((BigInt(1) << BigInt(80)) - BigInt(1))).toBe("Z".repeat(16));
  });
});

describe("generateUlids", () => {
  it("generates valid 26-character ULIDs with the current time", () => {
    const before = Date.now();
    const result = generateUlids({ ...options, count: 50 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const id of result.ulids) {
      expect(id).toMatch(ULID);
      const decoded = decodeUlid(id);
      expect(decoded.ok && decoded.time).toBeGreaterThanOrEqual(before);
    }
    expect(new Set(result.ulids).size).toBe(50);
  });

  it("uses crypto.getRandomValues for the random part", () => {
    let calls = 0;
    const source = { getRandomValues: <T extends ArrayBufferView | null>(array: T) => { calls++; (array as unknown as Uint8Array).fill(0xff); return array; } };
    const result = generateUlids({ ...options, count: 2 }, () => 0, source);
    expect(calls).toBe(2);
    expect(result.ok && result.ulids[0]).toBe("0000000000ZZZZZZZZZZZZZZZZ");
  });

  it("increments the random part within one millisecond in monotonic mode", () => {
    let n = 0;
    const source = { getRandomValues: <T extends ArrayBufferView | null>(array: T) => { (array as unknown as Uint8Array).fill(0); (array as unknown as Uint8Array)[9] = n++; return array; } };
    const result = generateUlids({ ...options, count: 3, monotonic: true }, () => 1469918176385, source);
    expect(result.ok && result.ulids).toEqual(["01ARYZ6S410000000000000000", "01ARYZ6S410000000000000001", "01ARYZ6S410000000000000002"]);
  });

  it("keeps monotonic ULIDs sorted even if the clock goes backwards", () => {
    const times = [1000, 999, 1001];
    const result = generateUlids({ ...options, count: 3, monotonic: true }, () => times.shift()!);
    expect(result.ok && [...result.ulids].sort()).toEqual(result.ok && result.ulids);
  });

  it("reports overflow of the random part instead of wrapping", () => {
    const source = { getRandomValues: <T extends ArrayBufferView | null>(array: T) => { (array as unknown as Uint8Array).fill(0xff); return array; } };
    expect(generateUlids({ ...options, count: 2, monotonic: true }, () => 5, source)).toMatchObject({ ok: false, error: expect.stringContaining("overflowed") });
  });

  it("outputs lowercase on request", () => {
    const result = generateUlids({ ...options, lowercase: true });
    expect(result.ok && result.ulids[0]).toMatch(/^[0-7][0-9a-hjkmnp-tv-z]{25}$/);
  });

  it("fails safely without a secure random source or when it throws", () => {
    expect(generateUlids(options, Date.now, null)).toMatchObject({ ok: false, error: expect.stringContaining("getRandomValues") });
    const failing = { getRandomValues: () => { throw new Error("quota exceeded"); } };
    expect(generateUlids(options, Date.now, failing)).toMatchObject({ ok: false, error: expect.stringContaining("quota exceeded") });
  });

  it("validates the count", () => {
    expect(generateUlids({ ...options, count: 0 }).ok).toBe(false);
    expect(generateUlids({ ...options, count: 1001 }).ok).toBe(false);
    expect(generateUlids({ ...options, count: 2.5 }).ok).toBe(false);
  });
});

describe("decodeUlid", () => {
  it("reads the timestamp and randomness, ignoring case", () => {
    expect(decodeUlid("01ARYZ6S41TSV4RRFFQ69G5FAV")).toMatchObject({ ok: true, time: 1469918176385 });
    expect(decodeUlid(" 01aryz6s41tsv4rrffq69g5fav ")).toMatchObject({ ok: true, time: 1469918176385 });
    expect(decodeUlid("0000000000ZZZZZZZZZZZZZZZZ")).toMatchObject({ ok: true, time: 0, random: "F".repeat(20) });
  });

  it("rejects invalid ULIDs", () => {
    expect(decodeUlid("01ARYZ6S41")).toMatchObject({ ok: false, error: expect.stringContaining("26 characters") });
    expect(decodeUlid("01ARYZ6S41TSV4RRFFQ69G5FAU")).toMatchObject({ ok: false, error: expect.stringContaining("position 26") });
    expect(decodeUlid("8ZZZZZZZZZZZZZZZZZZZZZZZZZ")).toMatchObject({ ok: false, error: expect.stringContaining("0–7") });
  });

  it("uses an alphabet without I, L, O and U", () => {
    expect(ALPHABET).toHaveLength(32);
    expect(ALPHABET).not.toMatch(/[ILOU]/);
  });
});
