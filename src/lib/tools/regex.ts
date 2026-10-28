/**
 * Regular expression matching, shared by the Regex Tester's Web Worker.
 * Runs inside the worker so that a slow pattern can be stopped without
 * freezing the page (see REGEX_TIMEOUT_MS).
 */

export const REGEX_FLAGS = [
  { flag: "g", name: "global", description: "Find all matches, not just the first" },
  { flag: "i", name: "ignore case", description: "Match letters regardless of case" },
  { flag: "m", name: "multiline", description: "^ and $ match at the start and end of each line" },
  { flag: "s", name: "dotAll", description: ". also matches line breaks" },
  { flag: "u", name: "unicode", description: "Treat the pattern as Unicode code points" },
  { flag: "v", name: "unicodeSets", description: "Unicode mode with set notation (cannot be combined with u)" },
  { flag: "y", name: "sticky", description: "Match only at the current position" },
  { flag: "d", name: "indices", description: "Report start and end positions of capture groups" },
] as const;

/** Matching stops after this long; the worker is then terminated. */
export const REGEX_TIMEOUT_MS = 1000;
/** At most this many matches are collected. */
export const MAX_MATCHES = 1000;
/** Longest test text accepted. */
export const MAX_TEST_LENGTH = 100_000;

export type RegexMatch = {
  index: number;
  end: number;
  text: string;
  groups: (string | undefined)[];
  named: Record<string, string | undefined> | null;
  /** Start/end of each capture group, when the d flag is set. */
  groupIndices: ([number, number] | undefined)[] | null;
};

export type RegexRunResult =
  | { ok: true; matches: RegexMatch[]; truncated: boolean }
  | { ok: false; error: string };

/** Compiles the pattern, returning a readable error instead of throwing. */
export function compileRegex(pattern: string, flags: string): { ok: true; regex: RegExp } | { ok: false; error: string } {
  const unknown = [...flags].find((f) => !REGEX_FLAGS.some((known) => known.flag === f));
  if (unknown) return { ok: false, error: `Unknown flag "${unknown}".` };
  if (new Set(flags).size !== flags.length) return { ok: false, error: "Each flag can only be used once." };
  if (flags.includes("u") && flags.includes("v")) return { ok: false, error: "The u and v flags cannot be used together." };
  try {
    return { ok: true, regex: new RegExp(pattern, flags) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/flag/i.test(message) && flags.includes("v")) {
      return { ok: false, error: "This browser does not support the v flag." };
    }
    return { ok: false, error: message.replace(/^Invalid regular expression: /, "") };
  }
}

export function runRegex(pattern: string, flags: string, text: string): RegexRunResult {
  const compiled = compileRegex(pattern, flags);
  if (!compiled.ok) return compiled;
  const { regex } = compiled;

  const toMatch = (m: RegExpExecArray): RegexMatch => ({
    index: m.index,
    end: m.index + m[0].length,
    text: m[0],
    groups: m.slice(1),
    named: m.groups ? { ...m.groups } : null,
    groupIndices: m.indices ? m.indices.slice(1).map((pair) => (pair ? [pair[0], pair[1]] : undefined)) : null,
  });

  if (!regex.global) {
    const m = regex.exec(text);
    return { ok: true, matches: m ? [toMatch(m)] : [], truncated: false };
  }

  const matches: RegexMatch[] = [];
  for (const m of text.matchAll(regex)) {
    if (matches.length === MAX_MATCHES) return { ok: true, matches, truncated: true };
    matches.push(toMatch(m));
  }
  return { ok: true, matches, truncated: false };
}
