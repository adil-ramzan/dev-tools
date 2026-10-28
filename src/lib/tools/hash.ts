import { findLoneSurrogate } from "@/lib/tools/unicode";

/**
 * Message digests of UTF-8 text. SHA-1 and the SHA-2 family use the browser's
 * Web Crypto API (crypto.subtle). Algorithms Web Crypto does not offer (MD5,
 * SHA-224, SHA-3 and RIPEMD-160) come from @noble/hashes, an audited library
 * loaded only when one of them is selected. If crypto.subtle is unavailable
 * (it only exists in secure contexts), @noble/hashes is used for all of them.
 *
 * These are fast, unsalted digests for checksums and identifiers. They are
 * not password hashes: use a slow, salted algorithm such as Argon2id, scrypt
 * or bcrypt to store passwords.
 */

export type HashAlgorithm =
  | "md5"
  | "sha1"
  | "sha224"
  | "sha256"
  | "sha384"
  | "sha512"
  | "sha3-224"
  | "sha3-256"
  | "sha3-384"
  | "sha3-512"
  | "ripemd160";

export type HashAlgorithmInfo = {
  id: HashAlgorithm;
  label: string;
  bits: number;
  /** Web Crypto name, when the browser implements it natively. */
  webCrypto?: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
  /** Broken for collision resistance: fine for checksums, not for security. */
  weak?: boolean;
};

export const hashAlgorithms: HashAlgorithmInfo[] = [
  { id: "md5", label: "MD5", bits: 128, weak: true },
  { id: "sha1", label: "SHA-1", bits: 160, webCrypto: "SHA-1", weak: true },
  { id: "sha224", label: "SHA-224", bits: 224 },
  { id: "sha256", label: "SHA-256", bits: 256, webCrypto: "SHA-256" },
  { id: "sha384", label: "SHA-384", bits: 384, webCrypto: "SHA-384" },
  { id: "sha512", label: "SHA-512", bits: 512, webCrypto: "SHA-512" },
  { id: "sha3-224", label: "SHA3-224", bits: 224 },
  { id: "sha3-256", label: "SHA3-256", bits: 256 },
  { id: "sha3-384", label: "SHA3-384", bits: 384 },
  { id: "sha3-512", label: "SHA3-512", bits: 512 },
  { id: "ripemd160", label: "RIPEMD-160", bits: 160 },
];

export const DEFAULT_ALGORITHMS: HashAlgorithm[] = ["md5", "sha1", "sha256", "sha512"];

export function algorithmInfo(id: HashAlgorithm): HashAlgorithmInfo {
  return hashAlgorithms.find((a) => a.id === id)!;
}

type Subtle = Pick<SubtleCrypto, "digest">;

function defaultSubtle(): Subtle | null {
  const subtle = globalThis.crypto?.subtle;
  return subtle && typeof subtle.digest === "function" ? subtle : null;
}

async function libraryDigest(id: HashAlgorithm, bytes: Uint8Array): Promise<Uint8Array> {
  switch (id) {
    case "md5":
    case "sha1":
    case "ripemd160": {
      const legacy = await import("@noble/hashes/legacy.js");
      return legacy[id](bytes);
    }
    case "sha224":
    case "sha256":
    case "sha384":
    case "sha512": {
      const sha2 = await import("@noble/hashes/sha2.js");
      return sha2[id](bytes);
    }
    default: {
      const sha3 = await import("@noble/hashes/sha3.js");
      const fn = { "sha3-224": sha3.sha3_224, "sha3-256": sha3.sha3_256, "sha3-384": sha3.sha3_384, "sha3-512": sha3.sha3_512 }[id];
      return fn(bytes);
    }
  }
}

/** Digest of `bytes`, preferring Web Crypto. Pass `subtle: null` to force the library. */
export async function digest(id: HashAlgorithm, bytes: Uint8Array, subtle: Subtle | null = defaultSubtle()): Promise<Uint8Array> {
  const native = algorithmInfo(id).webCrypto;
  if (native && subtle) {
    try {
      // Copy into a fresh ArrayBuffer-backed view, as Web Crypto requires.
      return new Uint8Array(await subtle.digest(native, new Uint8Array(bytes)));
    } catch {
      // Fall through to the library implementation.
    }
  }
  return libraryDigest(id, bytes);
}

export type HashOutputFormat = "hex" | "HEX" | "base64";

export function formatDigest(bytes: Uint8Array, format: HashOutputFormat): string {
  if (format === "base64") {
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return format === "HEX" ? hex.toUpperCase() : hex;
}

export type HashTextResult =
  | { ok: true; bytes: number; digests: { id: HashAlgorithm; value: Uint8Array }[] }
  | { ok: false; error: string };

/** Hashes the UTF-8 encoding of `text` with each algorithm, in the order given. */
export async function hashText(text: string, algorithms: HashAlgorithm[], subtle: Subtle | null = defaultSubtle()): Promise<HashTextResult> {
  const bad = findLoneSurrogate(text);
  if (bad !== -1) {
    return {
      ok: false,
      error: `The text contains an incomplete Unicode character at position ${bad + 1}, which cannot be encoded as UTF-8. Hashing it would give a misleading result.`,
    };
  }
  if (algorithms.length === 0) return { ok: false, error: "Select at least one algorithm." };
  const bytes = new TextEncoder().encode(text);
  try {
    const digests = await Promise.all(algorithms.map(async (id) => ({ id, value: await digest(id, bytes, subtle) })));
    return { ok: true, bytes: bytes.length, digests };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `The hash could not be computed: ${message}` };
  }
}
