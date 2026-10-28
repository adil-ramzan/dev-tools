import { decodeBase64Bytes } from "@/lib/tools/base64";
import { formatDigest, type HashOutputFormat } from "@/lib/tools/hash";
import { findLoneSurrogate } from "@/lib/tools/unicode";

/**
 * HMAC (RFC 2104) with SHA-256, SHA-384 or SHA-512 through the browser's Web
 * Crypto API. The key and message can be given as UTF-8 text, hex or Base64,
 * and the encoding is always explicit: the text "00ff" and the hex bytes
 * 00 ff are different keys.
 */

export type HmacAlgorithm = "SHA-256" | "SHA-384" | "SHA-512";
export type InputEncoding = "text" | "hex" | "base64";

export const hmacAlgorithms: { value: HmacAlgorithm; label: string; bytes: number }[] = [
  { value: "SHA-256", label: "HMAC-SHA256", bytes: 32 },
  { value: "SHA-384", label: "HMAC-SHA384", bytes: 48 },
  { value: "SHA-512", label: "HMAC-SHA512", bytes: 64 },
];

/** 5 MB of message keeps memory use predictable. */
export const MAX_MESSAGE_BYTES = 5 * 1024 * 1024;

export type BytesResult = { ok: true; bytes: Uint8Array } | { ok: false; error: string };

/** Hex bytes, with optional 0x prefix and whitespace between bytes. */
export function parseHex(input: string): BytesResult {
  const text = input.trim().replace(/^0x/i, "");
  const compact = text.replace(/\s+/g, "");
  const bad = /[^0-9a-f]/i.exec(compact);
  if (bad) return { ok: false, error: `"${bad[0]}" is not a hexadecimal digit. Use 0–9 and a–f.` };
  if (compact.length % 2 !== 0) return { ok: false, error: `Hex input needs two digits per byte, but it has ${compact.length} digits.` };
  const bytes = new Uint8Array(compact.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(compact.slice(i * 2, i * 2 + 2), 16);
  return { ok: true, bytes };
}

export function toBytes(input: string, encoding: InputEncoding): BytesResult {
  if (encoding === "hex") return parseHex(input);
  if (encoding === "base64") {
    const result = decodeBase64Bytes(input);
    return result.ok ? result : { ok: false, error: result.error };
  }
  const bad = findLoneSurrogate(input);
  if (bad !== -1) return { ok: false, error: `The text contains an incomplete Unicode character at position ${bad + 1}.` };
  return { ok: true, bytes: new TextEncoder().encode(input) };
}

type Subtle = Pick<SubtleCrypto, "importKey" | "sign">;

function defaultSubtle(): Subtle | null {
  const subtle = globalThis.crypto?.subtle;
  return subtle && typeof subtle.sign === "function" ? subtle : null;
}

export type HmacInput = {
  key: string;
  keyEncoding: InputEncoding;
  message: string;
  messageEncoding: InputEncoding;
  algorithm: HmacAlgorithm;
};

export type HmacResult = { ok: true; signature: Uint8Array; keyBytes: number; messageBytes: number; warnings: string[] } | { ok: false; error: string; field?: "key" | "message" };

export async function computeHmac(input: HmacInput, subtle: Subtle | null = defaultSubtle()): Promise<HmacResult> {
  if (input.key === "") return { ok: false, error: "Enter a secret key.", field: "key" };
  const key = toBytes(input.key, input.keyEncoding);
  if (!key.ok) return { ok: false, error: `Key: ${key.error}`, field: "key" };
  if (key.bytes.length === 0) return { ok: false, error: "The key is empty after decoding.", field: "key" };
  const message = toBytes(input.message, input.messageEncoding);
  if (!message.ok) return { ok: false, error: `Message: ${message.error}`, field: "message" };
  if (message.bytes.length > MAX_MESSAGE_BYTES) return { ok: false, error: "The message is larger than 5 MB, the limit for this tool.", field: "message" };
  if (!subtle) {
    return { ok: false, error: "This browser does not provide Web Crypto (crypto.subtle). It is only available on secure (HTTPS) pages in up-to-date browsers." };
  }

  const warnings: string[] = [];
  const outputBytes = hmacAlgorithms.find((a) => a.value === input.algorithm)!.bytes;
  if (key.bytes.length < outputBytes) {
    warnings.push(`The key is ${key.bytes.length} ${key.bytes.length === 1 ? "byte" : "bytes"}. RFC 2104 recommends at least ${outputBytes} bytes (the hash output length) of random key for ${input.algorithm}.`);
  }
  try {
    const cryptoKey = await subtle.importKey("raw", new Uint8Array(key.bytes), { name: "HMAC", hash: input.algorithm }, false, ["sign"]);
    const signature = new Uint8Array(await subtle.sign("HMAC", cryptoKey, new Uint8Array(message.bytes)));
    return { ok: true, signature, keyBytes: key.bytes.length, messageBytes: message.bytes.length, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `The HMAC could not be computed: ${message}` };
  }
}

export function formatSignature(signature: Uint8Array, format: HashOutputFormat | "base64url"): string {
  if (format === "base64url") return formatDigest(signature, "base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return formatDigest(signature, format);
}

/**
 * Compares an expected signature (hex, Base64 or Base64URL) with the computed
 * one. Formatting differences such as case and padding are ignored.
 */
export function compareSignature(expected: string, signature: Uint8Array): "match" | "mismatch" | "invalid" {
  const text = expected.trim();
  if (text === "") return "invalid";
  let bytes: BytesResult;
  if (/^(0x)?[0-9a-f\s]+$/i.test(text) && text.replace(/^0x|\s/gi, "").length === signature.length * 2) bytes = parseHex(text);
  else bytes = decodeBase64Bytes(text);
  if (!bytes.ok) return "invalid";
  if (bytes.bytes.length !== signature.length) return "mismatch";
  let diff = 0;
  for (let i = 0; i < signature.length; i++) diff |= bytes.bytes[i] ^ signature[i];
  return diff === 0 ? "match" : "mismatch";
}
