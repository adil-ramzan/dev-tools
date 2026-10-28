import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  AMBIGUOUS,
  DEFAULT_PASSWORD_SETTINGS,
  effectiveSets,
  generatePasswords,
  passwordEntropy,
  strengthFor,
  validatePasswordSettings,
  type PasswordSettings,
} from "@/lib/tools/password";
import { CHARACTER_SETS } from "@/lib/tools/token";

const settings = (overrides: Partial<PasswordSettings>): PasswordSettings => ({ ...DEFAULT_PASSWORD_SETTINGS, ...overrides });
const crypto = webcrypto as unknown as Pick<Crypto, "getRandomValues">;

describe("character sets", () => {
  it("removes ambiguous and custom characters from each set", () => {
    const sets = effectiveSets(settings({ excludeAmbiguous: true, exclude: "\"'`" }));
    const all = sets.map((s) => s.chars).join("");
    for (const c of AMBIGUOUS + "\"'`") expect(all).not.toContain(c);
    expect(sets.find((s) => s.set === "numbers")!.chars).toBe("23456789");
    expect(sets.find((s) => s.set === "uppercase")!.chars).toHaveLength(24);
  });

  it("keeps a fixed set order", () => {
    expect(effectiveSets(settings({ sets: ["symbols", "uppercase"] })).map((s) => s.set)).toEqual(["uppercase", "symbols"]);
  });
});

describe("validation", () => {
  it("accepts the defaults", () => expect(validatePasswordSettings(DEFAULT_PASSWORD_SETTINGS)).toBeNull());

  it("rejects bad lengths, counts and sets", () => {
    expect(validatePasswordSettings(settings({ sets: [] }))).toMatch(/at least one set/);
    expect(validatePasswordSettings(settings({ length: 3 }))).toMatch(/from 4 to 128/);
    expect(validatePasswordSettings(settings({ length: 129 }))).toMatch(/from 4 to 128/);
    expect(validatePasswordSettings(settings({ length: 10.5 }))).toMatch(/whole number/);
    expect(validatePasswordSettings(settings({ count: 0 }))).toMatch(/number of passwords/);
    expect(validatePasswordSettings(settings({ count: 51 }))).toMatch(/number of passwords/);
    expect(validatePasswordSettings(settings({ exclude: "x".repeat(101) }))).toMatch(/at most 100/);
  });

  it("explains when a set is fully excluded or cannot fit", () => {
    expect(validatePasswordSettings(settings({ sets: ["numbers"], exclude: "0123456789" }))).toMatch(/numbers set is excluded/);
    expect(validatePasswordSettings(settings({ length: 4, sets: ["uppercase", "lowercase", "numbers", "symbols"] }))).toBeNull();
    expect(validatePasswordSettings(settings({ length: 4, sets: ["uppercase", "lowercase", "numbers"], requireEach: true }))).toBeNull();
  });
});

describe("generation", () => {
  it("generates the requested number and length from the allowed characters only", () => {
    const result = generatePasswords(settings({ length: 32, count: 20, excludeAmbiguous: true, exclude: "{}" }), crypto);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.passwords).toHaveLength(20);
    for (const p of result.passwords) {
      expect(p).toHaveLength(32);
      for (const c of p) {
        expect(result.alphabet).toContain(c);
        expect(AMBIGUOUS + "{}").not.toContain(c);
      }
    }
  });

  it("includes every selected set when required, even at the minimum length", () => {
    const result = generatePasswords(settings({ length: 4, count: 50 }), crypto);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const p of result.passwords) {
      for (const set of Object.values(CHARACTER_SETS)) expect([...p].some((c) => set.includes(c)), p).toBe(true);
    }
  });

  it("draws characters without bias", () => {
    // 10 digits, 5,000 characters: each digit should appear about 500 times (standard deviation about 21).
    const result = generatePasswords(settings({ sets: ["numbers"], length: 100, count: 50, requireEach: false }), crypto);
    if (!result.ok) throw new Error(result.error);
    const counts = new Map<string, number>();
    for (const c of result.passwords.join("")) counts.set(c, (counts.get(c) ?? 0) + 1);
    expect(counts.size).toBe(10);
    for (const n of counts.values()) expect(Math.abs(n - 500)).toBeLessThan(120);
  });

  it("reports a missing or failing random source", () => {
    expect(generatePasswords(DEFAULT_PASSWORD_SETTINGS, null)).toMatchObject({ ok: false, error: expect.stringContaining("secure random") });
    const broken = { getRandomValues: () => { throw new Error("boom"); } } as unknown as Pick<Crypto, "getRandomValues">;
    expect(generatePasswords(DEFAULT_PASSWORD_SETTINGS, broken)).toMatchObject({ ok: false, error: expect.stringContaining("boom") });
  });

  it("returns errors for invalid settings without generating", () => {
    expect(generatePasswords(settings({ sets: [] }), crypto)).toMatchObject({ ok: false });
  });
});

describe("entropy and strength", () => {
  it("is length × log2(alphabet) without requirements", () => {
    expect(passwordEntropy(settings({ sets: ["numbers"], length: 10, requireEach: false }))).toBeCloseTo(10 * Math.log2(10));
    expect(passwordEntropy(settings({ length: 20, requireEach: false }))).toBeCloseTo(20 * Math.log2(94));
  });

  it("subtracts the passwords ruled out by requiring each set", () => {
    // Uppercase + numbers, length 2: 36² strings, minus 26² all-letter and 10² all-digit ones = 520.
    expect(passwordEntropy(settings({ sets: ["uppercase", "numbers"], length: 2, requireEach: true }))).toBeCloseTo(Math.log2(520));
    const free = passwordEntropy(settings({ length: 16, requireEach: false }));
    const required = passwordEntropy(settings({ length: 16, requireEach: true }));
    expect(required).toBeLessThan(free);
    expect(free - required).toBeLessThan(1);
  });

  it("gives guidance by entropy", () => {
    expect(strengthFor(30).label).toBe("Very weak");
    expect(strengthFor(50).label).toBe("Weak");
    expect(strengthFor(70).label).toBe("Fair");
    expect(strengthFor(100).label).toBe("Strong");
    expect(strengthFor(130).label).toBe("Very strong");
  });
});
