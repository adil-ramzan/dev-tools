import { beforeAll, describe, expect, it } from "vitest";
import { MAX_ANALYZED, analyzePassword, loadEstimator } from "@/lib/tools/password-strength";

let estimator: Awaited<ReturnType<typeof loadEstimator>>;
beforeAll(async () => {
  estimator = await loadEstimator();
});
const analyze = (password: string, inputs: string[] = []) => analyzePassword(password, inputs, estimator)!;

describe("analyzePassword", () => {
  it("rates common passwords as very weak with a warning", () => {
    for (const password of ["password", "123456", "qwertyuiop", "iloveyou"]) {
      const report = analyze(password);
      expect(report.score, password).toBe(0);
      expect(report.label).toBe("Very weak");
      expect(report.warning).toBeTruthy();
    }
  });

  it("sees through predictable substitutions", () => {
    const report = analyze("P@ssw0rd");
    expect(report.score).toBeLessThanOrEqual(1);
    expect(report.patterns).toContain("dictionary word or common password");
  });

  it("rates long random or multi-word passwords as very strong", () => {
    expect(analyze("x7#Kp9$mQ2vL!nB4").score).toBe(4);
    expect(analyze("correct horse battery staple").score).toBe(4);
  });

  it("detects keyboard patterns, sequences, repeats and years", () => {
    // asdfghjkl is itself a common password, so it matches the dictionary first; this walk does not.
    expect(analyze("zxcvbnm,./").patterns).toContain("keyboard pattern");
    expect(analyze("abcdefgh").patterns).toContain("sequence (abc, 123)");
    expect(analyze("aaaaaaaaaa").patterns).toContain("repeated characters");
    expect(analyze("summer2021").patterns).toContain("recent year");
  });

  it("penalizes passwords containing the user's own details", () => {
    const without = analyze("adalovelace1815");
    const withInputs = analyze("adalovelace1815", ["Ada", "Lovelace"]);
    expect(withInputs.guessesLog10).toBeLessThan(without.guessesLog10);
  });

  it("gives actionable suggestions for short passwords", () => {
    expect(analyze("Xk9!").suggestions.join(" ")).toMatch(/at least 12 characters/);
  });

  it("orders crack-time scenarios from slowest to fastest attacker", () => {
    const { scenarios } = analyze("Tr0ub4dour&3");
    expect(scenarios.map((s) => s.id)).toEqual(["online-throttled", "online", "offline-slow", "offline-fast"]);
    expect(scenarios[0].seconds).toBeGreaterThan(scenarios[3].seconds);
  });

  it("reports character classes and counts emoji as one character", () => {
    const report = analyze("aB3$ 🔒");
    expect(report.classes).toEqual({ lowercase: true, uppercase: true, digits: true, symbols: true, other: true });
    expect(report.length).toBe(6);
  });

  it("warns about leading and trailing spaces", () => {
    expect(analyze(" hunter2 ").suggestions.join(" ")).toMatch(/spaces/);
  });

  it("analyzes only the first characters of very long input and says so", () => {
    const report = analyze("a1B!".repeat(100));
    expect(report.truncated).toBe(true);
    expect(analyze("a".repeat(MAX_ANALYZED)).truncated).toBe(false);
  });

  it("returns nothing for an empty password", () => {
    expect(analyzePassword("", [], estimator)).toBeNull();
  });

  it("does not keep the password in the report", () => {
    const secret = "Unique-Secret-9417!";
    expect(JSON.stringify(analyze(secret))).not.toContain(secret);
  });

  it("loads the estimator once", async () => {
    expect(await loadEstimator()).toBe(estimator);
  });
});
