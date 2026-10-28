/**
 * Random token generation from the browser's cryptographically secure
 * generator (crypto.getRandomValues). Math.random is never used.
 *
 * Length is set in bytes of randomness; the encoded token is longer:
 * hex uses 2 characters per byte, Base64URL (unpadded) about 4 per 3 bytes.
 */

export type TokenFormat = "hex" | "base64url";

export const TOKEN_PRESETS = [16, 32, 64, 128] as const;
export const MIN_TOKEN_BYTES = 8;
export const MAX_TOKEN_BYTES = 1024;
export const MAX_TOKENS = 100;
/** Below this, tokens are too short for most secrets (128 bits). */
export const RECOMMENDED_MIN_BYTES = 16;

/** getRandomValues fills at most 65,536 bytes per call. */
const CHUNK = 65536;

type RandomSource = Pick<Crypto, "getRandomValues">;

export type TokenSettings = { bytes: number; count: number; format: TokenFormat };

export type TokenResult = { ok: true; tokens: Uint8Array[] } | { ok: false; error: string };

export function validateSettings({ bytes, count, format }: TokenSettings): string | null {
  if (!Number.isInteger(bytes) || bytes < MIN_TOKEN_BYTES || bytes > MAX_TOKEN_BYTES) {
    return `Length must be a whole number of bytes from ${MIN_TOKEN_BYTES} to ${MAX_TOKEN_BYTES}.`;
  }
  if (!Number.isInteger(count) || count < 1 || count > MAX_TOKENS) {
    return `The number of tokens must be a whole number from 1 to ${MAX_TOKENS}.`;
  }
  if (format !== "hex" && format !== "base64url") return "Choose hex or Base64URL as the format.";
  return null;
}

function defaultSource(): RandomSource | null {
  const source = globalThis.crypto;
  return source && typeof source.getRandomValues === "function" ? source : null;
}

/** Generates `count` independent random byte arrays of `bytes` length each. */
export function generateTokenBytes(settings: TokenSettings, source: RandomSource | null = defaultSource()): TokenResult {
  const invalid = validateSettings(settings);
  if (invalid) return { ok: false, error: invalid };
  if (!source) {
    return { ok: false, error: "This browser does not provide a secure random number generator (crypto.getRandomValues), so tokens cannot be generated safely." };
  }
  try {
    const tokens: Uint8Array[] = [];
    for (let i = 0; i < settings.count; i++) {
      const bytes = new Uint8Array(settings.bytes);
      for (let offset = 0; offset < bytes.length; offset += CHUNK) source.getRandomValues(bytes.subarray(offset, offset + CHUNK));
      tokens.push(bytes);
    }
    return { ok: true, tokens };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `The secure random number generator failed: ${message}` };
  }
}

export function encodeToken(bytes: Uint8Array, format: TokenFormat): string {
  if (format === "hex") return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Characters in the encoded token for a given number of bytes. */
export function encodedLength(bytes: number, format: TokenFormat): number {
  return format === "hex" ? bytes * 2 : Math.ceil((bytes * 4) / 3);
}

// --- Character tokens ---------------------------------------------------------

export const CHARACTER_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
} as const;

export type CharacterSet = keyof typeof CHARACTER_SETS;

export const MIN_TOKEN_CHARS = 1;
export const MAX_TOKEN_CHARS = 512;

export type CharacterSettings = { length: number; count: number; sets: CharacterSet[] };

export type CharacterResult = { ok: true; tokens: string[]; alphabet: string } | { ok: false; error: string };

export function alphabetFor(sets: CharacterSet[]): string {
  return (Object.keys(CHARACTER_SETS) as CharacterSet[])
    .filter((set) => sets.includes(set))
    .map((set) => CHARACTER_SETS[set])
    .join("");
}

/** Bits of entropy in a token of `length` characters drawn uniformly from `alphabetSize`. */
export function entropyBits(length: number, alphabetSize: number): number {
  return alphabetSize > 1 ? length * Math.log2(alphabetSize) : 0;
}

export function validateCharacterSettings({ length, count, sets }: CharacterSettings): string | null {
  if (sets.length === 0) return "Choose at least one set of characters.";
  if (!Number.isInteger(length) || length < MIN_TOKEN_CHARS || length > MAX_TOKEN_CHARS) {
    return `Length must be a whole number of characters from ${MIN_TOKEN_CHARS} to ${MAX_TOKEN_CHARS}.`;
  }
  if (!Number.isInteger(count) || count < 1 || count > MAX_TOKENS) {
    return `The number of tokens must be a whole number from 1 to ${MAX_TOKENS}.`;
  }
  return null;
}

/**
 * A random string of `length` characters from `alphabet`. Uses rejection
 * sampling so every character is equally likely: random bytes at or above
 * the largest multiple of the alphabet size are discarded rather than
 * folded in with %, which would favour some characters.
 */
export function randomString(length: number, alphabet: string, source: RandomSource): string {
  const n = alphabet.length;
  const limit = 256 - (256 % n);
  let out = "";
  const buffer = new Uint8Array(Math.min(CHUNK, Math.max(16, Math.ceil(length * 1.25))));
  while (out.length < length) {
    source.getRandomValues(buffer);
    for (let i = 0; i < buffer.length && out.length < length; i++) {
      if (buffer[i] < limit) out += alphabet[buffer[i] % n];
    }
  }
  buffer.fill(0);
  return out;
}

export function generateCharacterTokens(settings: CharacterSettings, source: RandomSource | null = defaultSource()): CharacterResult {
  const invalid = validateCharacterSettings(settings);
  if (invalid) return { ok: false, error: invalid };
  if (!source) {
    return { ok: false, error: "This browser does not provide a secure random number generator (crypto.getRandomValues), so tokens cannot be generated safely." };
  }
  const alphabet = alphabetFor(settings.sets);
  try {
    return { ok: true, alphabet, tokens: Array.from({ length: settings.count }, () => randomString(settings.length, alphabet, source)) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `The secure random number generator failed: ${message}` };
  }
}
