import { decodeBase64Bytes, encodeBytesBase64 } from "@/lib/tools/base64";
import { formatBytes } from "@/lib/format";

/**
 * Base64 for files. Files are read in the browser with File.arrayBuffer and
 * never leave the device. Bytes are encoded and decoded exactly, so binary
 * files such as images and archives survive a round trip unchanged.
 *
 * The size limit keeps memory use predictable: a 10 MB file becomes a
 * 13.3 MB Base64 string, and the page briefly holds both.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Base64 for MAX_FILE_BYTES, plus room for line breaks and a data URI header. */
export const MAX_BASE64_CHARS = Math.ceil(MAX_FILE_BYTES / 3) * 4 * 1.05 + 1024;

export type EncodeFileOptions = { dataUri: boolean; wrap: boolean; urlSafe: boolean };

/** Wraps Base64 at 76 characters per line with CRLF, as MIME (RFC 2045) requires. */
export function wrapLines(base64: string, width = 76): string {
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += width) lines.push(base64.slice(i, i + width));
  return lines.join("\r\n");
}

/** A MIME type safe to put in a data URI, or application/octet-stream. */
export function safeMimeType(type: string): string {
  return /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i.test(type) ? type.toLowerCase() : "application/octet-stream";
}

export function encodeFileBytes(bytes: Uint8Array, mimeType: string, { dataUri, wrap, urlSafe }: EncodeFileOptions): string {
  const base64 = encodeBytesBase64(bytes, { urlSafe: urlSafe && !dataUri });
  if (dataUri) return `data:${safeMimeType(mimeType)};base64,${base64}`;
  return wrap ? wrapLines(base64) : base64;
}

export type FileCheck = { ok: true } | { ok: false; error: string };

export function checkFileSize(size: number): FileCheck {
  if (size > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `The file is ${formatBytes(size)}. The limit is ${formatBytes(MAX_FILE_BYTES)}, because larger files make the page slow and can run out of memory. Use a command-line tool such as base64 for large files.`,
    };
  }
  return { ok: true };
}

export type DecodedFile =
  | { ok: true; bytes: Uint8Array; mimeType: string | null; fromDataUri: boolean }
  | { ok: false; error: string };

const DATA_URI = /^data:([^,]*?),/i;

/** Decodes plain Base64 or a data URI with ;base64 to bytes. */
export function decodeBase64File(input: string): DecodedFile {
  const text = input.trim();
  if (text === "") return { ok: false, error: "Paste Base64 or a data URI to decode." };
  if (text.length > MAX_BASE64_CHARS) {
    return { ok: false, error: `The input is ${text.length.toLocaleString("en-US")} characters, which decodes to more than ${formatBytes(MAX_FILE_BYTES)}, the limit for this tool.` };
  }

  let payload = text;
  let mimeType: string | null = null;
  const header = DATA_URI.exec(text);
  if (header) {
    const parts = header[1].split(";").map((p) => p.trim());
    if (!parts.some((p) => p.toLowerCase() === "base64")) {
      return { ok: false, error: "This data URI is not Base64-encoded (it has no ;base64 marker), so its content is plain or percent-encoded text, not Base64." };
    }
    mimeType = parts[0] ? safeMimeType(parts[0]) : null;
    payload = text.slice(header[0].length);
  } else if (/^data:/i.test(text)) {
    return { ok: false, error: "The data URI is missing the comma that separates its header from the data." };
  }

  const result = decodeBase64Bytes(payload);
  if (!result.ok) {
    return { ok: false, error: header ? `${result.error} (Positions count from the start of the data, after the comma.)` : result.error };
  }
  if (result.bytes.length === 0) return { ok: false, error: "The input contains no data to decode." };
  return { ok: true, bytes: result.bytes, mimeType, fromDataUri: Boolean(header) };
}

type Signature = { type: string; extension: string; label: string; test: (b: Uint8Array) => boolean };

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) => signature.every((value, i) => bytes[offset + i] === value);
const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

/** Common file signatures ("magic numbers"). A match suggests a type; it does not prove the file is valid. */
const SIGNATURES: Signature[] = [
  { type: "image/png", extension: "png", label: "PNG image", test: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { type: "image/jpeg", extension: "jpg", label: "JPEG image", test: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  { type: "image/gif", extension: "gif", label: "GIF image", test: (b) => startsWith(b, ascii("GIF87a")) || startsWith(b, ascii("GIF89a")) },
  { type: "image/webp", extension: "webp", label: "WebP image", test: (b) => startsWith(b, ascii("RIFF")) && startsWith(b, ascii("WEBP"), 8) },
  { type: "application/pdf", extension: "pdf", label: "PDF document", test: (b) => startsWith(b, ascii("%PDF-")) },
  { type: "application/zip", extension: "zip", label: "ZIP archive (also DOCX, XLSX, JAR…)", test: (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]) || startsWith(b, [0x50, 0x4b, 0x05, 0x06]) },
  { type: "application/gzip", extension: "gz", label: "Gzip archive", test: (b) => startsWith(b, [0x1f, 0x8b]) },
  { type: "font/woff2", extension: "woff2", label: "WOFF2 font", test: (b) => startsWith(b, ascii("wOF2")) },
  { type: "font/woff", extension: "woff", label: "WOFF font", test: (b) => startsWith(b, ascii("wOFF")) },
  { type: "audio/mpeg", extension: "mp3", label: "MP3 audio", test: (b) => startsWith(b, ascii("ID3")) },
  { type: "application/wasm", extension: "wasm", label: "WebAssembly module", test: (b) => startsWith(b, [0x00, 0x61, 0x73, 0x6d]) },
];

export type Sniffed = { type: string; extension: string; label: string };

export function sniffType(bytes: Uint8Array): Sniffed | null {
  const match = SIGNATURES.find((s) => s.test(bytes));
  if (match) return { type: match.type, extension: match.extension, label: match.label };
  const sample = bytes.subarray(0, 4096);
  try {
    // stream: true tolerates a multibyte character cut off at the end of the sample.
    new TextDecoder("utf-8", { fatal: true }).decode(sample, { stream: true });
    if (!sample.some((b) => b === 0)) return { type: "text/plain", extension: "txt", label: "UTF-8 text" };
  } catch {
    // Not UTF-8 text.
  }
  return null;
}

const EXTENSIONS: Record<string, string> = Object.fromEntries(SIGNATURES.map((s) => [s.type, s.extension]));
Object.assign(EXTENSIONS, { "text/plain": "txt", "application/json": "json", "image/svg+xml": "svg", "text/html": "html", "text/css": "css", "text/csv": "csv" });

/** A download name for decoded data, from the data URI type or the detected content. */
export function suggestFileName(mimeType: string | null, sniffed: Sniffed | null): string {
  const extension = (mimeType && EXTENSIONS[mimeType]) || sniffed?.extension || "bin";
  return `decoded.${extension}`;
}

/** Removes characters that are invalid in file names on common systems. */
export function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, "_")
    .replace(/^[\s.]+|[\s.]+$/g, "")
    .slice(0, 200);
  return cleaned || "decoded.bin";
}
