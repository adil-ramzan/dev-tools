import type { ZxcvbnFactory, ZxcvbnResult } from "@zxcvbn-ts/core";

/**
 * Password strength estimation with zxcvbn-ts, the maintained TypeScript
 * port of Dropbox's zxcvbn. It estimates how many guesses an attacker would
 * need by finding the patterns a password is built from: dictionary words,
 * names, keyboard walks, dates, repeats and sequences, including l33t
 * substitutions and reversed words. It runs entirely in the browser; the
 * optional "Have I Been Pwned" matcher, which makes network requests, is not
 * used.
 *
 * The score is an estimate of guessability against known patterns, not a
 * guarantee: a password that scores 4 is still weak if it has been leaked or
 * reused.
 */

export const MAX_ANALYZED = 256;

export const SCORE_LABELS = ["Very weak", "Weak", "Fair", "Strong", "Very strong"] as const;

let factory: Promise<ZxcvbnFactory> | null = null;

/** Loads zxcvbn-ts with the common and English dictionaries (about 1.7 MB, roughly 850 KB compressed). */
export function loadEstimator(): Promise<ZxcvbnFactory> {
  factory ??= Promise.all([import("@zxcvbn-ts/core"), import("@zxcvbn-ts/language-common"), import("@zxcvbn-ts/language-en")])
    .then(([core, common, en]) => new core.ZxcvbnFactory({
      translations: en.translations,
      graphs: common.adjacencyGraphs,
      dictionary: { ...common.dictionary, ...en.dictionary },
      maxLength: MAX_ANALYZED,
    }))
    .catch((error) => {
      factory = null;
      throw error;
    });
  return factory;
}

export type CrackScenario = { id: string; label: string; display: string; seconds: number };

export type StrengthReport = {
  score: 0 | 1 | 2 | 3 | 4;
  label: (typeof SCORE_LABELS)[number];
  guessesLog10: number;
  scenarios: CrackScenario[];
  warning: string | null;
  suggestions: string[];
  /** Kinds of patterns found, e.g. "dictionary word", "keyboard pattern". */
  patterns: string[];
  length: number;
  classes: { lowercase: boolean; uppercase: boolean; digits: boolean; symbols: boolean; other: boolean };
  truncated: boolean;
};

const PATTERN_LABELS: Record<string, string> = {
  dictionary: "dictionary word or common password",
  spatial: "keyboard pattern",
  repeat: "repeated characters",
  sequence: "sequence (abc, 123)",
  regex: "recent year",
  date: "date",
  separator: "separator",
};

/** Characters as people count them, so an emoji counts once. */
function characterCount(text: string): number {
  return "Segmenter" in Intl ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)).length : Array.from(text).length;
}

export function analyzePassword(password: string, userInputs: string[], estimator: ZxcvbnFactory): StrengthReport | null {
  if (password === "") return null;
  const result: ZxcvbnResult = estimator.check(password, userInputs.map((s) => s.trim()).filter(Boolean));
  const length = characterCount(password);
  const classes = {
    lowercase: /\p{Ll}/u.test(password),
    uppercase: /\p{Lu}/u.test(password),
    digits: /\p{Nd}/u.test(password),
    symbols: /[\p{P}\p{S}]/u.test(password),
    other: /[^\p{Ll}\p{Lu}\p{Nd}\p{P}\p{S}]/u.test(password),
  };

  const suggestions = [...result.feedback.suggestions];
  if (length < 12) suggestions.push("Use at least 12 characters; length adds more strength than symbols do.");
  if (password !== password.trim()) suggestions.push("Leading or trailing spaces are easy to lose when copying; some systems strip them.");
  if (/(.)\1{2,}/u.test(password) && !result.sequence.some((m) => m.pattern === "repeat")) suggestions.push("Avoid repeating the same character.");
  if (result.score >= 3 && suggestions.length === 0) suggestions.push("Use it for one account only, and store it in a password manager.");

  const c = result.crackTimes;
  return {
    score: result.score,
    label: SCORE_LABELS[result.score],
    guessesLog10: result.guessesLog10,
    scenarios: [
      { id: "online-throttled", label: "Online attack, rate-limited (100 guesses/hour)", display: c.onlineThrottlingXPerHour.display, seconds: c.onlineThrottlingXPerHour.seconds },
      { id: "online", label: "Online attack, not rate-limited (10/second)", display: c.onlineNoThrottlingXPerSecond.display, seconds: c.onlineNoThrottlingXPerSecond.seconds },
      { id: "offline-slow", label: "Stolen hashes, slow hash such as bcrypt (10,000/second)", display: c.offlineSlowHashingXPerSecond.display, seconds: c.offlineSlowHashingXPerSecond.seconds },
      { id: "offline-fast", label: "Stolen hashes, fast hash such as SHA-256 (10 billion/second)", display: c.offlineFastHashingXPerSecond.display, seconds: c.offlineFastHashingXPerSecond.seconds },
    ],
    warning: result.feedback.warning,
    suggestions: [...new Set(suggestions)],
    patterns: [...new Set(result.sequence.map((m) => PATTERN_LABELS[m.pattern]).filter((p): p is string => Boolean(p)))],
    length,
    classes,
    truncated: password.length > MAX_ANALYZED,
  };
}
