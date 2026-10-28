import { decodeBase64Bytes, encodeBytesBase64 } from "@/lib/tools/base64";
import { findLoneSurrogate } from "@/lib/tools/unicode";

/**
 * Password-based text encryption using only Web Crypto primitives:
 *
 * - Key: PBKDF2-HMAC-SHA256 over the UTF-8 password, with a fresh random
 *   16-byte salt and 600,000 iterations (OWASP's 2023 recommendation),
 *   producing a 256-bit AES key.
 * - Cipher: AES-256-GCM with a fresh random 12-byte IV for every encryption,
 *   so an IV is never reused with the same key. GCM authenticates the data:
 *   any change to the ciphertext, IV or salt makes decryption fail.
 * - The payload header (version, KDF and iteration count) is passed as
 *   additional authenticated data, so changing the parameters is detected too.
 *
 * Payload format, all binary parts Base64URL without padding:
 *
 *   v1.pbkdf2-sha256.<iterations>.<salt>.<iv>.<ciphertext and 16-byte tag>
 *
 * A wrong password and tampered data fail in the same way and get the same
 * message, so an attacker learns nothing from the error.
 */

export const VERSION = "v1";
export const KDF = "pbkdf2-sha256";
export const DEFAULT_ITERATIONS = 600_000;
/** Decryption accepts this range: lower is too weak to trust, higher could freeze the page. */
export const MIN_ITERATIONS = 100_000;
export const MAX_ITERATIONS = 10_000_000;
export const SALT_BYTES = 16;
export const IV_BYTES = 12;
const TAG_BYTES = 16;
export const MAX_PLAINTEXT_BYTES = 5 * 1024 * 1024;

export const DECRYPT_FAILED = "Decryption failed. The password is wrong, or the encrypted text has been changed or corrupted.";

type Subtle = Pick<SubtleCrypto, "importKey" | "deriveKey" | "encrypt" | "decrypt">;
type RandomSource = Pick<Crypto, "getRandomValues">;

function defaultSubtle(): Subtle | null {
  const subtle = globalThis.crypto?.subtle;
  return subtle && typeof subtle.deriveKey === "function" ? subtle : null;
}

function defaultRandom(): RandomSource | null {
  const source = globalThis.crypto;
  return source && typeof source.getRandomValues === "function" ? source : null;
}

const NO_CRYPTO =
  "This browser does not provide Web Crypto (crypto.subtle), which is needed to encrypt safely. It is only available on secure (HTTPS) pages in up-to-date browsers.";

const toBase64Url = (bytes: Uint8Array) => encodeBytesBase64(bytes, { urlSafe: true });

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  const result = decodeBase64Bytes(text);
  return result.ok ? result.bytes : null;
}

function checkPassword(password: string): string | null {
  if (password === "") return "Enter a password.";
  if (findLoneSurrogate(password) !== -1) return "The password contains an incomplete Unicode character.";
  return null;
}

async function deriveKey(subtle: Subtle, password: string, salt: Uint8Array, iterations: number, usage: KeyUsage): Promise<CryptoKey> {
  const material = await subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: new Uint8Array(salt), iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

export type EncryptResult = { ok: true; payload: string; warnings: string[] } | { ok: false; error: string };

export async function encryptText(
  plaintext: string,
  password: string,
  { iterations = DEFAULT_ITERATIONS, subtle = defaultSubtle(), random = defaultRandom() }: { iterations?: number; subtle?: Subtle | null; random?: RandomSource | null } = {},
): Promise<EncryptResult> {
  const passwordError = checkPassword(password);
  if (passwordError) return { ok: false, error: passwordError };
  if (findLoneSurrogate(plaintext) !== -1) return { ok: false, error: "The text contains an incomplete Unicode character, which cannot be encoded as UTF-8." };
  const data = new TextEncoder().encode(plaintext);
  if (data.length > MAX_PLAINTEXT_BYTES) return { ok: false, error: "The text is larger than 5 MB, the limit for this tool." };
  if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
    return { ok: false, error: `The iteration count must be from ${MIN_ITERATIONS.toLocaleString("en-US")} to ${MAX_ITERATIONS.toLocaleString("en-US")}.` };
  }
  if (!subtle || !random) return { ok: false, error: NO_CRYPTO };

  const warnings: string[] = [];
  if (Array.from(password).length < 12) warnings.push("The password is shorter than 12 characters. The encryption is only as strong as the password: anyone with the encrypted text can try to guess it offline.");
  try {
    const salt = random.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv = random.getRandomValues(new Uint8Array(IV_BYTES));
    const header = `${VERSION}.${KDF}.${iterations}`;
    const key = await deriveKey(subtle, password, salt, iterations, "encrypt");
    const ciphertext = new Uint8Array(
      await subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(header), tagLength: 128 }, key, data),
    );
    return { ok: true, payload: `${header}.${toBase64Url(salt)}.${toBase64Url(iv)}.${toBase64Url(ciphertext)}`, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `The text could not be encrypted: ${message}` };
  }
}

export type ParsedPayload =
  | { ok: true; header: string; iterations: number; salt: Uint8Array; iv: Uint8Array; ciphertext: Uint8Array }
  | { ok: false; error: string };

/** Checks the payload's structure before any key derivation, with specific messages for format problems. */
export function parsePayload(input: string): ParsedPayload {
  const text = input.replace(/\s+/g, "");
  if (text === "") return { ok: false, error: "Paste the encrypted text to decrypt." };
  const parts = text.split(".");
  if (parts[0] !== VERSION) {
    return { ok: false, error: /^v\d+$/.test(parts[0]) ? `Payload version ${parts[0]} is not supported; this tool reads ${VERSION}.` : `This is not encrypted text from this tool. It should start with "${VERSION}.${KDF}."` };
  }
  if (parts.length !== 6) return { ok: false, error: `The encrypted text should have 6 parts separated by dots; this has ${parts.length}. It may be incomplete.` };
  const [, kdf, iterationsText, saltText, ivText, ciphertextText] = parts;
  if (kdf !== KDF) return { ok: false, error: `The key derivation "${kdf}" is not supported; this tool uses ${KDF}.` };
  if (!/^\d{1,9}$/.test(iterationsText)) return { ok: false, error: "The iteration count in the encrypted text is not valid." };
  const iterations = Number(iterationsText);
  if (iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
    return { ok: false, error: `The iteration count ${iterations.toLocaleString("en-US")} is outside the accepted range (${MIN_ITERATIONS.toLocaleString("en-US")} to ${MAX_ITERATIONS.toLocaleString("en-US")}).` };
  }
  const salt = fromBase64Url(saltText);
  const iv = fromBase64Url(ivText);
  const ciphertext = fromBase64Url(ciphertextText);
  if (!salt || salt.length !== SALT_BYTES) return { ok: false, error: "The salt in the encrypted text is damaged." };
  if (!iv || iv.length !== IV_BYTES) return { ok: false, error: "The IV in the encrypted text is damaged." };
  if (!ciphertext || ciphertext.length < TAG_BYTES) return { ok: false, error: "The ciphertext is damaged or incomplete." };
  return { ok: true, header: `${VERSION}.${KDF}.${iterationsText}`, iterations, salt, iv, ciphertext };
}

export type DecryptResult = { ok: true; plaintext: string } | { ok: false; error: string };

export async function decryptText(input: string, password: string, { subtle = defaultSubtle() }: { subtle?: Subtle | null } = {}): Promise<DecryptResult> {
  const passwordError = checkPassword(password);
  if (passwordError) return { ok: false, error: passwordError };
  const payload = parsePayload(input);
  if (!payload.ok) return payload;
  if (!subtle) return { ok: false, error: NO_CRYPTO };
  try {
    const key = await deriveKey(subtle, password, payload.salt, payload.iterations, "decrypt");
    const plaintext = await subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(payload.iv), additionalData: new TextEncoder().encode(payload.header), tagLength: 128 },
      key,
      new Uint8Array(payload.ciphertext),
    );
    return { ok: true, plaintext: new TextDecoder("utf-8", { fatal: true }).decode(plaintext) };
  } catch {
    // Wrong password, tampering and corruption are deliberately indistinguishable.
    return { ok: false, error: DECRYPT_FAILED };
  }
}
