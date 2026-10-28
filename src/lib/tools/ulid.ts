/**
 * ULIDs (Universally Unique Lexicographically Sortable Identifiers), per the
 * specification at github.com/ulid/spec:
 *
 *   01ARZ3NDEK TSV4RRFFQ69G5FAV
 *   |--------| |--------------|
 *   timestamp      randomness
 *   48 bits         80 bits
 *
 * 26 characters of Crockford Base32 (no I, L, O or U). The timestamp is Unix
 * time in milliseconds, so ULIDs sort by creation time as strings. The
 * randomness comes from crypto.getRandomValues; Math.random is never used.
 *
 * In monotonic mode, ULIDs created in the same millisecond reuse the previous
 * randomness plus one, so they still sort in creation order. That makes them
 * guessable from each other: anyone with one ID can predict its neighbours.
 */

export const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const MAX_TIME = 2 ** 48 - 1;
export const MAX_ULIDS = 1000;
const RANDOM_BYTES = 10;
const MAX_RANDOM = (BigInt(1) << BigInt(80)) - BigInt(1);

type RandomSource = Pick<Crypto, "getRandomValues">;

function defaultSource(): RandomSource | null {
  const source = globalThis.crypto;
  return source && typeof source.getRandomValues === "function" ? source : null;
}

export function encodeTime(ms: number): string {
  if (!Number.isInteger(ms) || ms < 0 || ms > MAX_TIME) {
    throw new RangeError(`The timestamp must be a whole number of milliseconds from 0 to ${MAX_TIME}.`);
  }
  let out = "";
  let t = ms;
  for (let i = 0; i < 10; i++) {
    out = ALPHABET[t % 32] + out;
    t = Math.floor(t / 32);
  }
  return out;
}

export function encodeRandom(value: bigint): string {
  let out = "";
  let v = value;
  for (let i = 0; i < 16; i++) {
    out = ALPHABET[Number(v & BigInt(31))] + out;
    v >>= BigInt(5);
  }
  return out;
}

function randomValue(source: RandomSource): bigint {
  const bytes = new Uint8Array(RANDOM_BYTES);
  source.getRandomValues(bytes);
  let value = BigInt(0);
  for (const b of bytes) value = (value << BigInt(8)) | BigInt(b);
  bytes.fill(0);
  return value;
}

export type UlidOptions = { count: number; monotonic: boolean; lowercase: boolean };

export type UlidResult = { ok: true; ulids: string[] } | { ok: false; error: string };

/** Generates ULIDs. `now` and `source` can be replaced for testing. */
export function generateUlids(
  { count, monotonic, lowercase }: UlidOptions,
  now: () => number = Date.now,
  source: RandomSource | null = defaultSource(),
): UlidResult {
  if (!Number.isInteger(count) || count < 1 || count > MAX_ULIDS) {
    return { ok: false, error: `Enter a whole number from 1 to ${MAX_ULIDS.toLocaleString("en-US")}.` };
  }
  if (!source) {
    return { ok: false, error: "This browser does not provide a secure random number generator (crypto.getRandomValues), so ULIDs cannot be generated safely." };
  }
  try {
    const ulids: string[] = [];
    let lastTime = -1;
    let lastRandom = BigInt(0);
    for (let i = 0; i < count; i++) {
      const time = now();
      let random: bigint;
      if (monotonic && time <= lastTime) {
        if (lastRandom === MAX_RANDOM) return { ok: false, error: "The random part overflowed within one millisecond. Try again." };
        random = lastRandom + BigInt(1);
      } else {
        random = randomValue(source);
      }
      const t = monotonic ? Math.max(time, lastTime) : time;
      const id = encodeTime(t) + encodeRandom(random);
      ulids.push(lowercase ? id.toLowerCase() : id);
      lastTime = t;
      lastRandom = random;
    }
    return { ok: true, ulids };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `ULIDs could not be generated: ${message}` };
  }
}

export type DecodedUlid = { ok: true; time: number; random: string } | { ok: false; error: string };

/** Reads the timestamp and randomness from a ULID. Case-insensitive, as the spec requires. */
export function decodeUlid(input: string): DecodedUlid {
  const text = input.trim().toUpperCase();
  if (text.length !== 26) return { ok: false, error: `A ULID has 26 characters; this has ${text.length}.` };
  for (let i = 0; i < text.length; i++) {
    if (!ALPHABET.includes(text[i])) {
      return { ok: false, error: `"${input.trim()[i]}" at position ${i + 1} is not a ULID character. ULIDs use Crockford Base32: 0–9 and A–Z without I, L, O and U.` };
    }
  }
  if (text[0] > "7") return { ok: false, error: "The first character must be 0–7: larger values exceed the 48-bit timestamp." };
  let time = 0;
  for (const c of text.slice(0, 10)) time = time * 32 + ALPHABET.indexOf(c);
  let random = BigInt(0);
  for (const c of text.slice(10)) random = (random << BigInt(5)) | BigInt(ALPHABET.indexOf(c));
  return { ok: true, time, random: random.toString(16).toUpperCase().padStart(20, "0") };
}
