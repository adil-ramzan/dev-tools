import { CHARACTER_SETS, randomString, type CharacterSet } from "@/lib/tools/token";

/**
 * Password generation from crypto.getRandomValues, reusing the Token
 * Generator's unbiased `randomString` (rejection sampling, no modulo bias).
 *
 * "At least one of each" is enforced by drawing whole passwords and
 * discarding those that miss a selected set. That keeps every valid
 * password exactly equally likely, which placing required characters first
 * would not. Passwords are returned to the caller only: never stored or sent.
 */

type RandomSource = Pick<Crypto, "getRandomValues">;

export const MIN_PASSWORD_LENGTH = 4;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_PASSWORDS = 50;
export const MAX_EXCLUDED = 100;
/** Characters easy to confuse in many fonts: I, l, 1 and |; O, o and 0. */
export const AMBIGUOUS = "Il1|O0o";
/** Give up instead of looping for ever if the requirements are almost never met. */
const MAX_ATTEMPTS = 10_000;

export const SET_ORDER: CharacterSet[] = ["uppercase", "lowercase", "numbers", "symbols"];

export type PasswordSettings = {
  length: number;
  count: number;
  sets: CharacterSet[];
  excludeAmbiguous: boolean;
  /** Extra characters to leave out, e.g. quotes a config file cannot hold. */
  exclude: string;
  /** Every selected set appears at least once. */
  requireEach: boolean;
};

export const DEFAULT_PASSWORD_SETTINGS: PasswordSettings = {
  length: 20,
  count: 1,
  sets: ["uppercase", "lowercase", "numbers", "symbols"],
  excludeAmbiguous: false,
  exclude: "",
  requireEach: true,
};

/** The characters left in each selected set after exclusions, in a fixed order. */
export function effectiveSets({ sets, excludeAmbiguous, exclude }: Pick<PasswordSettings, "sets" | "excludeAmbiguous" | "exclude">): { set: CharacterSet; chars: string }[] {
  const removed = new Set([...(excludeAmbiguous ? AMBIGUOUS : ""), ...exclude]);
  return SET_ORDER.filter((set) => sets.includes(set)).map((set) => ({ set, chars: [...CHARACTER_SETS[set]].filter((c) => !removed.has(c)).join("") }));
}

const SET_NAMES: Record<CharacterSet, string> = { uppercase: "uppercase letters", lowercase: "lowercase letters", numbers: "numbers", symbols: "symbols" };

export function validatePasswordSettings(settings: PasswordSettings): string | null {
  const { length, count, sets, exclude, requireEach } = settings;
  if (sets.length === 0) return "Choose at least one set of characters.";
  if (!Number.isInteger(length) || length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH) {
    return `Length must be a whole number of characters from ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH}.`;
  }
  if (!Number.isInteger(count) || count < 1 || count > MAX_PASSWORDS) return `The number of passwords must be a whole number from 1 to ${MAX_PASSWORDS}.`;
  if ([...exclude].length > MAX_EXCLUDED) return `List at most ${MAX_EXCLUDED} characters to exclude.`;
  const empty = effectiveSets(settings).find((s) => s.chars.length === 0);
  if (empty) return `Every character of the ${SET_NAMES[empty.set]} set is excluded. Remove some exclusions or turn the set off.`;
  if (requireEach && sets.length > length) return `A ${length}-character password cannot contain all ${sets.length} selected sets. Increase the length or turn off "At least one of each".`;
  return null;
}

/**
 * Bits of entropy of one password: log2 of the number of equally likely
 * passwords. With "at least one of each", passwords missing a set are not
 * possible, so the count is found by inclusion–exclusion over the sets.
 */
export function passwordEntropy(settings: PasswordSettings): number {
  const groups = effectiveSets(settings).map((s) => s.chars.length);
  const n = groups.reduce((a, b) => a + b, 0);
  if (n <= 1) return 0;
  const base = settings.length * Math.log2(n);
  if (!settings.requireEach || groups.length < 2) return base;
  // Fraction of all n^length strings that contain every set.
  let fraction = 0;
  for (let mask = 0; mask < 1 << groups.length; mask++) {
    let missing = 0;
    let bits = 0;
    groups.forEach((size, i) => {
      if (mask & (1 << i)) {
        missing += size;
        bits++;
      }
    });
    fraction += (bits % 2 ? -1 : 1) * ((n - missing) / n) ** settings.length;
  }
  return base + Math.log2(fraction);
}

export type Strength = { label: "Very weak" | "Weak" | "Fair" | "Strong" | "Very strong"; advice: string };

/** Guidance from entropy alone. It assumes the password is random and used only here, which this tool guarantees. */
export function strengthFor(bits: number): Strength {
  if (bits < 40) return { label: "Very weak", advice: "Guessable within seconds offline. Make it much longer." };
  if (bits < 60) return { label: "Weak", advice: "Only suitable where guesses are rate-limited, such as a PIN with lockout." };
  if (bits < 80) return { label: "Fair", advice: "Fine for most online accounts; use more for anything important." };
  if (bits < 128) return { label: "Strong", advice: "Strong for accounts and offline attacks on well-hashed passwords." };
  return { label: "Very strong", advice: "Beyond practical brute force, even offline." };
}

export type PasswordResult = { ok: true; passwords: string[]; alphabet: string; bits: number } | { ok: false; error: string };

function defaultSource(): RandomSource | null {
  const source = globalThis.crypto;
  return source && typeof source.getRandomValues === "function" ? source : null;
}

export function generatePasswords(settings: PasswordSettings, source: RandomSource | null = defaultSource()): PasswordResult {
  const invalid = validatePasswordSettings(settings);
  if (invalid) return { ok: false, error: invalid };
  if (!source) return { ok: false, error: "This browser does not provide a secure random number generator (crypto.getRandomValues), so passwords cannot be generated safely." };
  const groups = effectiveSets(settings);
  const alphabet = groups.map((g) => g.chars).join("");
  const hasEach = (password: string) => groups.every((g) => [...g.chars].some((c) => password.includes(c)));
  try {
    const passwords: string[] = [];
    for (let i = 0; i < settings.count; i++) {
      let password = randomString(settings.length, alphabet, source);
      let attempts = 1;
      while (settings.requireEach && !hasEach(password)) {
        if (++attempts > MAX_ATTEMPTS) return { ok: false, error: "These settings almost never produce a password with every selected set. Increase the length or turn off \"At least one of each\"." };
        password = randomString(settings.length, alphabet, source);
      }
      passwords.push(password);
    }
    return { ok: true, passwords, alphabet, bits: passwordEntropy(settings) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `The secure random number generator failed: ${message}` };
  }
}
