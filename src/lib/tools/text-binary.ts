import { findLoneSurrogate } from "@/lib/tools/unicode";

/**
 * Text ↔ binary using UTF-8. Every byte is written as exactly 8 bits, most
 * significant bit first. ASCII characters take one byte; others take two to
 * four (é = 2 bytes, € = 3, 😀 = 4), so the output is a list of bytes, not
 * one group per character.
 *
 * Decoding accepts bytes separated by any whitespace, commas or nothing at
 * all. Each byte must be exactly 8 bits, and the bytes must form valid UTF-8.
 */

export type ByteSeparator = "space" | "none" | "newline";

const SEPARATORS: Record<ByteSeparator, string> = { space: " ", none: "", newline: "\n" };

/** Generous limit for the encoded output, which is 8–9× the input size. */
export const MAX_INPUT_BYTES = 1024 * 1024;

export type BinaryResult = { ok: true; output: string; bytes: number } | { ok: false; error: string };

export function textToBinary(text: string, separator: ByteSeparator = "space"): BinaryResult {
  const bad = findLoneSurrogate(text);
  if (bad !== -1) {
    return { ok: false, error: `The text contains an incomplete Unicode character at position ${bad + 1}, which cannot be encoded as UTF-8.` };
  }
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > MAX_INPUT_BYTES) return { ok: false, error: "The text is larger than 1 MB, the limit for this tool." };
  const output = Array.from(bytes, (b) => b.toString(2).padStart(8, "0")).join(SEPARATORS[separator]);
  return { ok: true, output, bytes: bytes.length };
}

export type CharacterBreakdown = { char: string; codePoint: string; bytes: string[] };

/** Each character with its code point and UTF-8 bytes in binary, for showing how characters map to bytes. */
export function breakdown(text: string, limit = 64): CharacterBreakdown[] {
  const encoder = new TextEncoder();
  return Array.from(text)
    .slice(0, limit)
    .map((char) => ({
      char,
      codePoint: `U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`,
      bytes: Array.from(encoder.encode(char), (b) => b.toString(2).padStart(8, "0")),
    }));
}

/** Bytes in a UTF-8 sequence that starts with `lead`, or 0 if `lead` cannot start one. */
function sequenceLength(lead: number): number {
  if (lead < 0x80) return 1;
  if (lead >= 0xc2 && lead <= 0xdf) return 2;
  if (lead >= 0xe0 && lead <= 0xef) return 3;
  if (lead >= 0xf0 && lead <= 0xf4) return 4;
  return 0;
}

/** Index of the first byte where `bytes` stops being valid UTF-8, or -1. */
export function findInvalidUtf8(bytes: Uint8Array): number {
  for (let i = 0; i < bytes.length; ) {
    const length = sequenceLength(bytes[i]);
    if (length === 0 || i + length > bytes.length) return i;
    for (let j = 1; j < length; j++) {
      let min = 0x80;
      let max = 0xbf;
      // Reject overlong forms, UTF-16 surrogates and code points above U+10FFFF.
      if (j === 1) {
        if (bytes[i] === 0xe0) min = 0xa0;
        if (bytes[i] === 0xed) max = 0x9f;
        if (bytes[i] === 0xf0) min = 0x90;
        if (bytes[i] === 0xf4) max = 0x8f;
      }
      if (bytes[i + j] < min || bytes[i + j] > max) return i;
    }
    i += length;
  }
  return -1;
}

const ordinal = (n: number) => `${n.toLocaleString("en-US")}`;

export function binaryToText(input: string): BinaryResult {
  const groups: { bits: string; position: number }[] = [];
  const pattern = /[^\s,]+/g;
  for (let match = pattern.exec(input); match; match = pattern.exec(input)) {
    groups.push({ bits: match[0], position: match.index + 1 });
  }
  if (groups.length === 0) return { ok: false, error: "Enter binary bytes such as 01001000 01101001." };

  for (const group of groups) {
    const invalid = /[^01]/.exec(group.bits);
    if (invalid) {
      return { ok: false, error: `Invalid character "${invalid[0]}" at position ${group.position + invalid.index}. Binary uses only 0 and 1, with spaces, line breaks or commas between bytes.` };
    }
  }

  let bitStrings: string[];
  if (groups.length === 1) {
    const bits = groups[0].bits;
    if (bits.length % 8 !== 0) {
      return { ok: false, error: `The input has ${ordinal(bits.length)} bits, which is not a whole number of bytes. Each byte needs exactly 8 bits; add leading zeros if any are missing.` };
    }
    bitStrings = bits.match(/.{8}/g) ?? [];
  } else {
    const wrong = groups.findIndex((g) => g.bits.length !== 8);
    if (wrong !== -1) {
      const g = groups[wrong];
      return {
        ok: false,
        error: `Byte ${ordinal(wrong + 1)} ("${g.bits}", at position ${g.position}) has ${g.bits.length} ${g.bits.length === 1 ? "bit" : "bits"}. Each byte must have exactly 8, e.g. 00001010 rather than 1010.`,
      };
    }
    bitStrings = groups.map((g) => g.bits);
  }
  if (bitStrings.length > MAX_INPUT_BYTES) return { ok: false, error: "The input decodes to more than 1 MB, the limit for this tool." };

  const bytes = Uint8Array.from(bitStrings, (b) => parseInt(b, 2));
  const invalid = findInvalidUtf8(bytes);
  if (invalid !== -1) {
    const shown = Array.from(bytes.subarray(invalid, invalid + 4), (b) => b.toString(2).padStart(8, "0")).join(" ");
    return {
      ok: false,
      error: `Byte ${ordinal(invalid + 1)} starts an invalid or incomplete UTF-8 sequence (${shown}). The bytes may be cut off, in another encoding such as Latin-1, or not text at all.`,
    };
  }
  return { ok: true, output: new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes), bytes: bytes.length };
}
