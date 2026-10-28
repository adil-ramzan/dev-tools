import { describe, expect, it } from "vitest";
import {
  MAX_BASE64_CHARS,
  MAX_FILE_BYTES,
  checkFileSize,
  decodeBase64File,
  encodeFileBytes,
  safeMimeType,
  sanitizeFileName,
  sniffType,
  suggestFileName,
  wrapLines,
} from "@/lib/tools/base64-file";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0xff, 0x00, 0x80]);
const plain = { dataUri: false, wrap: false, urlSafe: false };

describe("encodeFileBytes", () => {
  it("encodes binary bytes exactly", () => {
    expect(encodeFileBytes(PNG, "image/png", plain)).toBe(Buffer.from(PNG).toString("base64"));
  });

  it("builds a data URI with a sanitized type", () => {
    expect(encodeFileBytes(new Uint8Array([104, 105]), "text/plain", { ...plain, dataUri: true })).toBe("data:text/plain;base64,aGk=");
    expect(encodeFileBytes(new Uint8Array([1]), 'text/html"><script>', { ...plain, dataUri: true })).toBe("data:application/octet-stream;base64,AQ==");
    expect(encodeFileBytes(new Uint8Array([1]), "", { ...plain, dataUri: true })).toMatch(/^data:application\/octet-stream;/);
  });

  it("wraps at 76 characters with CRLF for MIME", () => {
    const bytes = new Uint8Array(100).fill(65);
    const wrapped = encodeFileBytes(bytes, "", { ...plain, wrap: true });
    const lines = wrapped.split("\r\n");
    expect(lines[0]).toHaveLength(76);
    expect(lines.join("")).toBe(Buffer.from(bytes).toString("base64"));
  });

  it("uses URL-safe characters only when asked, and never inside a data URI", () => {
    const bytes = new Uint8Array([0xfb, 0xff]);
    expect(encodeFileBytes(bytes, "", { ...plain, urlSafe: true })).toBe("-_8");
    expect(encodeFileBytes(bytes, "", { ...plain, urlSafe: true, dataUri: true })).toBe("data:application/octet-stream;base64,+/8=");
  });

  it("encodes an empty file as an empty string", () => {
    expect(encodeFileBytes(new Uint8Array(0), "", plain)).toBe("");
  });
});

describe("decodeBase64File", () => {
  it("round-trips binary data without corrupting bytes", () => {
    const result = decodeBase64File(encodeFileBytes(PNG, "image/png", { ...plain, wrap: true }));
    expect(result.ok && Array.from(result.bytes)).toEqual(Array.from(PNG));
  });

  it("reads the type from a data URI", () => {
    const result = decodeBase64File(`data:image/png;base64,${Buffer.from(PNG).toString("base64")}`);
    expect(result).toMatchObject({ ok: true, mimeType: "image/png", fromDataUri: true });
  });

  it("accepts data URI parameters before ;base64", () => {
    expect(decodeBase64File("data:text/plain;charset=utf-8;base64,aGk=")).toMatchObject({ ok: true, mimeType: "text/plain" });
  });

  it("rejects data URIs that are not Base64", () => {
    expect(decodeBase64File("data:text/plain,hello")).toMatchObject({ ok: false, error: expect.stringContaining("not Base64-encoded") });
    expect(decodeBase64File("data:text/plain;base64")).toMatchObject({ ok: false, error: expect.stringContaining("comma") });
  });

  it("rejects invalid Base64 instead of skipping characters", () => {
    expect(decodeBase64File("aGVsbG8*")).toMatchObject({ ok: false, error: expect.stringContaining("Invalid character") });
    expect(decodeBase64File("")).toMatchObject({ ok: false });
    expect(decodeBase64File("====")).toMatchObject({ ok: false });
  });

  it("enforces the size limit before decoding", () => {
    expect(decodeBase64File("A".repeat(MAX_BASE64_CHARS + 4))).toMatchObject({ ok: false, error: expect.stringContaining("limit") });
  });
});

describe("checkFileSize", () => {
  it("allows files up to the limit", () => {
    expect(checkFileSize(MAX_FILE_BYTES).ok).toBe(true);
    expect(checkFileSize(MAX_FILE_BYTES + 1)).toMatchObject({ ok: false, error: expect.stringContaining("10 MB") });
  });
});

describe("sniffType and file names", () => {
  it("recognizes common signatures", () => {
    expect(sniffType(PNG)?.type).toBe("image/png");
    expect(sniffType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))?.type).toBe("application/pdf");
    expect(sniffType(new TextEncoder().encode("plain text é"))?.type).toBe("text/plain");
    expect(sniffType(new Uint8Array([0xff, 0xfe, 0x00, 0x01, 0x80]))).toBeNull();
  });

  it("treats long UTF-8 text cut mid-character at the sample boundary as text", () => {
    const text = "a".repeat(4095) + "é".repeat(10);
    expect(sniffType(new TextEncoder().encode(text))?.type).toBe("text/plain");
  });

  it("suggests a file name from the data URI type, then the detected content", () => {
    expect(suggestFileName("application/json", null)).toBe("decoded.json");
    expect(suggestFileName(null, sniffType(PNG))).toBe("decoded.png");
    expect(suggestFileName(null, null)).toBe("decoded.bin");
  });

  it("sanitizes file names", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("_.._etc_passwd");
    expect(sanitizeFileName('a<b>:"c|?*.txt')).toBe("a_b___c___.txt");
    expect(sanitizeFileName("   ")).toBe("decoded.bin");
  });

  it("accepts only well-formed MIME types", () => {
    expect(safeMimeType("Image/PNG")).toBe("image/png");
    expect(safeMimeType("image/svg+xml")).toBe("image/svg+xml");
    expect(safeMimeType("text/html; charset=utf-8")).toBe("application/octet-stream");
  });

  it("wraps lines at a custom width", () => {
    expect(wrapLines("abcdef", 4)).toBe("abcd\r\nef");
  });
});
