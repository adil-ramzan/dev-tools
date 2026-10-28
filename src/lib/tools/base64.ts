import { findLoneSurrogate } from "@/lib/tools/unicode";

export type Base64Result = { ok: true; output: string; bytes: number } | { ok: false; error: string };

export type Base64BytesResult = { ok: true; bytes: Uint8Array } | { ok: false; error: string };

/** Bytes per btoa call: a multiple of 3, so the encoded chunks join without padding in between. */
const ENCODE_CHUNK = 3 * 0x8000;
/** Characters per atob call: a multiple of 4. */
const DECODE_CHUNK = 4 * 0x8000;

/** Encodes bytes as Base64. `urlSafe` uses - and _ and drops padding (RFC 4648 §5). */
export function encodeBytesBase64(bytes: Uint8Array, { urlSafe = false } = {}): string {
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += ENCODE_CHUNK) {
    const chunk = bytes.subarray(i, i + ENCODE_CHUNK);
    let binary = "";
    for (let j = 0; j < chunk.length; j += 0x8000) binary += String.fromCharCode(...chunk.subarray(j, j + 0x8000));
    parts.push(btoa(binary));
  }
  const output = parts.join("");
  return urlSafe ? output.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : output;
}

/** Encodes text as UTF-8, then Base64. `urlSafe` uses - and _ and drops padding (RFC 4648 §5). */
export function encodeBase64(text: string, { urlSafe = false } = {}): Base64Result {
  const bad = findLoneSurrogate(text);
  if (bad !== -1) {
    return {
      ok: false,
      error: `The text contains an incomplete Unicode character at position ${bad + 1}, which cannot be encoded as UTF-8.`,
    };
  }
  const bytes = new TextEncoder().encode(text);
  return { ok: true, output: encodeBytesBase64(bytes, { urlSafe }), bytes: bytes.length };
}

/**
 * Decodes standard or URL-safe Base64 to bytes. Whitespace and line breaks
 * are ignored and missing padding is tolerated; anything else that is not
 * Base64 is reported with its position rather than skipped.
 */
export function decodeBase64Bytes(input: string): Base64BytesResult {
  const compact = input.replace(/\s+/g, "");
  if (compact === "") return { ok: true, bytes: new Uint8Array(0) };

  const invalid = /[^A-Za-z0-9+/\-_=]/.exec(compact);
  if (invalid) {
    const position = indexInOriginal(input, invalid.index);
    return { ok: false, error: `Invalid character "${invalid[0]}" at position ${position + 1}. Base64 uses only A–Z, a–z, 0–9, + and / (or - and _ in URL-safe Base64), with = as padding.` };
  }
  if (/[+/]/.test(compact) && /[-_]/.test(compact)) {
    return { ok: false, error: "The input mixes standard (+ /) and URL-safe (- _) Base64 characters." };
  }
  const padStart = compact.indexOf("=");
  if (padStart !== -1 && !/^=+$/.test(compact.slice(padStart))) {
    return { ok: false, error: `Unexpected "=" at position ${indexInOriginal(input, padStart) + 1}. Padding can only appear at the end.` };
  }
  const body = compact.slice(0, padStart === -1 ? undefined : padStart);
  if (body.length % 4 === 1) {
    return { ok: false, error: "The input has an invalid length. It may be truncated or have characters missing." };
  }
  const padding = padStart === -1 ? 0 : compact.length - padStart;
  if (padding > 0 && (body.length + padding) % 4 !== 0) {
    return { ok: false, error: "The padding (=) does not match the length of the data." };
  }

  const standard = body.replace(/-/g, "+").replace(/_/g, "/");
  const padded = standard + "=".repeat((4 - (standard.length % 4)) % 4);
  const length = (padded.length / 4) * 3 - (padded.endsWith("==") ? 2 : padded.endsWith("=") ? 1 : 0);
  const bytes = new Uint8Array(length);
  try {
    let offset = 0;
    for (let i = 0; i < padded.length; i += DECODE_CHUNK) {
      const binary = atob(padded.slice(i, i + DECODE_CHUNK));
      for (let j = 0; j < binary.length; j++) bytes[offset++] = binary.charCodeAt(j);
    }
  } catch {
    return { ok: false, error: "The input is not valid Base64." };
  }
  return { ok: true, bytes };
}

/**
 * Decodes standard or URL-safe Base64 to UTF-8 text. Whitespace and line
 * breaks are ignored and missing padding is tolerated. Data that does not
 * decode to valid UTF-8 (such as an image) is reported rather than shown.
 */
export function decodeBase64(input: string): Base64Result {
  const result = decodeBase64Bytes(input);
  if (!result.ok) return result;
  const { bytes } = result;
  try {
    const output = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    return { ok: true, output, bytes: bytes.length };
  } catch {
    return {
      ok: false,
      error: `The input is valid Base64 (${bytes.length} bytes), but the data is not UTF-8 text. It may be binary data such as an image or archive, which this tool does not decode.`,
    };
  }
}

/** Maps an index in the whitespace-stripped string back to the original input. */
function indexInOriginal(original: string, compactIndex: number): number {
  let seen = 0;
  for (let i = 0; i < original.length; i++) {
    if (/\s/.test(original[i])) continue;
    if (seen === compactIndex) return i;
    seen++;
  }
  return original.length;
}
