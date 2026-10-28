/**
 * bcrypt password hashing and verification with bcryptjs, a maintained
 * pure-JavaScript implementation loaded only on this tool's page. Salts come
 * from crypto.getRandomValues; bcryptjs refuses to run without it.
 *
 * bcrypt is a one-way, deliberately slow function: a hash cannot be decrypted,
 * only checked by hashing a candidate password with the same salt and cost.
 * Each cost step doubles the work. Only the first 72 bytes of the password
 * (as UTF-8) are used.
 *
 * bcryptjs reports a malformed hash as "no match" and silently raises a cost
 * below 4, so both are validated here first and reported clearly.
 */

export const MIN_COST = 4;
/** Higher costs are valid bcrypt but take minutes in a browser. */
export const MAX_COST = 15;
export const DEFAULT_COST = 10;
/** Costs above this take several seconds in a typical browser. */
export const SLOW_COST = 12;
export const MAX_PASSWORD_BYTES = 72;

type Bcrypt = typeof import("bcryptjs");

export function loadBcrypt(): Promise<Bcrypt> {
  return import("bcryptjs").then((m) => ("default" in m && m.default ? (m.default as Bcrypt) : m));
}

export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

export type PasswordCheck = { ok: true; warnings: string[] } | { ok: false; error: string };

export function checkPassword(password: string): PasswordCheck {
  if (password === "") return { ok: false, error: "Enter a password." };
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(password)) {
    return { ok: false, error: "The password contains an incomplete Unicode character, which cannot be encoded as UTF-8." };
  }
  if (password.includes("\u0000")) {
    return { ok: false, error: "The password contains a null character. Many bcrypt implementations stop reading at it, so hashes would not be portable." };
  }
  const warnings: string[] = [];
  const bytes = utf8Bytes(password);
  if (bytes > MAX_PASSWORD_BYTES) {
    warnings.push(`The password is ${bytes} bytes as UTF-8. bcrypt uses only the first ${MAX_PASSWORD_BYTES} bytes, so anything after that does not affect the hash.`);
  }
  if (password !== password.trim()) warnings.push("The password starts or ends with whitespace, which is part of the hash. Check that this is intended.");
  return { ok: true, warnings };
}

export function checkCost(cost: number): string | null {
  if (!Number.isInteger(cost) || cost < MIN_COST || cost > MAX_COST) {
    return `The cost must be a whole number from ${MIN_COST} to ${MAX_COST}.`;
  }
  return null;
}

export type HashInfo = { ok: true; variant: "2a" | "2b" | "2y"; cost: number; salt: string } | { ok: false; error: string };

const BCRYPT_HASH = /^\$(2[aby])\$(\d{2})\$([./A-Za-z0-9]{22})([./A-Za-z0-9]{31})$/;

/** Checks the structure of a bcrypt hash: $2b$10$ + 22-character salt + 31-character hash. */
export function parseHash(input: string): HashInfo {
  const hash = input.trim();
  if (hash === "") return { ok: false, error: "Enter a bcrypt hash to verify against." };
  if (/^\$argon2/.test(hash)) return { ok: false, error: "This is an Argon2 hash, not bcrypt. It cannot be verified with this tool." };
  if (/^\$(1|5|6|sha1|md5)\$/.test(hash)) return { ok: false, error: "This looks like a Unix crypt hash (MD5 or SHA crypt), not bcrypt." };
  if (/^\$2x\$/.test(hash)) return { ok: false, error: "$2x$ hashes come from an old, buggy implementation and are not supported." };
  if (!/^\$2[aby]\$/.test(hash)) return { ok: false, error: "A bcrypt hash starts with $2a$, $2b$ or $2y$." };
  if (hash.length !== 60) return { ok: false, error: `A bcrypt hash is 60 characters long; this one has ${hash.length}. It may be truncated or contain extra characters.` };
  const match = BCRYPT_HASH.exec(hash);
  if (!match) return { ok: false, error: "The hash contains characters bcrypt does not use. bcrypt hashes use only A–Z, a–z, 0–9, . and /." };
  const cost = Number(match[2]);
  if (cost < 4 || cost > 31) return { ok: false, error: `The cost ${match[2]} is outside bcrypt's range of 04 to 31.` };
  return { ok: true, variant: match[1] as "2a" | "2b" | "2y", cost, salt: match[3] };
}

export type HashResult = { ok: true; hash: string; ms: number; warnings: string[] } | { ok: false; error: string };

export async function hashPassword(password: string, cost: number, lib?: Bcrypt): Promise<HashResult> {
  const check = checkPassword(password);
  if (!check.ok) return check;
  const costError = checkCost(cost);
  if (costError) return { ok: false, error: costError };
  try {
    const bcrypt = lib ?? (await loadBcrypt());
    const start = performance.now();
    const hash = await bcrypt.hash(password, cost);
    return { ok: true, hash, ms: performance.now() - start, warnings: check.warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/random/i.test(message)) return { ok: false, error: "This browser does not provide a secure random number generator, so a safe salt cannot be created." };
    return { ok: false, error: `The hash could not be created: ${message}` };
  }
}

export type VerifyResult = { ok: true; match: boolean; ms: number; cost: number; warnings: string[] } | { ok: false; error: string };

export async function verifyPassword(password: string, hash: string, lib?: Bcrypt): Promise<VerifyResult> {
  const check = checkPassword(password);
  if (!check.ok) return check;
  const info = parseHash(hash);
  if (!info.ok) return info;
  if (info.cost > MAX_COST) {
    return { ok: false, error: `This hash has cost ${info.cost}. Verifying it would take too long in a browser (the limit here is ${MAX_COST}).` };
  }
  try {
    const bcrypt = lib ?? (await loadBcrypt());
    const start = performance.now();
    const match = await bcrypt.compare(password, hash.trim());
    return { ok: true, match, ms: performance.now() - start, cost: info.cost, warnings: check.warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `The hash could not be verified: ${message}` };
  }
}

/** Rough time for another cost, from a measured one: each step doubles the work. */
export function estimateMs(measuredMs: number, measuredCost: number, cost: number): number {
  return measuredMs * 2 ** (cost - measuredCost);
}
