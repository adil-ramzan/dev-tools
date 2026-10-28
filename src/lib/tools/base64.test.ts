import { describe, expect, it } from "vitest";
import { decodeBase64, decodeBase64Bytes, encodeBase64, encodeBytesBase64 } from "@/lib/tools/base64";
import { decodeJwt } from "@/lib/tools/jwt";

// Regression tests for the Base64 text tool and JWT decoder, which share this module with the Base64 File Converter.
describe("encodeBase64 (text)", () => {
  it("encodes UTF-8 text", () => {
    expect(encodeBase64("Grüße!")).toEqual({ ok: true, output: "R3LDvMOfZSE=", bytes: 8 });
    expect(encodeBase64("")).toEqual({ ok: true, output: "", bytes: 0 });
  });

  it("produces URL-safe output without padding", () => {
    expect(encodeBase64("??>", { urlSafe: true })).toMatchObject({ output: "Pz8-" });
    expect(encodeBase64("a", { urlSafe: true })).toMatchObject({ output: "YQ" });
  });

  it("rejects lone surrogates", () => {
    expect(encodeBase64("a\uDC00").ok).toBe(false);
  });
});

describe("decodeBase64 (text)", () => {
  it("decodes standard and URL-safe Base64, ignoring whitespace and missing padding", () => {
    expect(decodeBase64("R3LDvMOfZSE=")).toEqual({ ok: true, output: "Grüße!", bytes: 8 });
    expect(decodeBase64("R3LD\nvMOf ZSE")).toMatchObject({ ok: true, output: "Grüße!" });
    expect(decodeBase64("Pz8-")).toMatchObject({ ok: true, output: "??>" });
  });

  it("keeps its error messages", () => {
    expect(decodeBase64("ab*c")).toMatchObject({ ok: false, error: expect.stringContaining('Invalid character "*" at position 3') });
    expect(decodeBase64("ab+_")).toMatchObject({ ok: false, error: expect.stringContaining("mixes") });
    expect(decodeBase64("ab=c")).toMatchObject({ ok: false, error: expect.stringContaining("Padding can only appear at the end") });
    expect(decodeBase64("abcde")).toMatchObject({ ok: false, error: expect.stringContaining("invalid length") });
    expect(decodeBase64("abc==")).toMatchObject({ ok: false, error: expect.stringContaining("padding") });
    expect(decodeBase64("/w==")).toMatchObject({ ok: false, error: expect.stringContaining("not UTF-8 text") });
  });
});

describe("byte-level Base64", () => {
  it("round-trips every byte value", () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    const decoded = decodeBase64Bytes(encodeBytesBase64(bytes));
    expect(decoded.ok && Array.from(decoded.bytes)).toEqual(Array.from(bytes));
  });

  it("round-trips data larger than one encode and decode chunk", () => {
    const bytes = new Uint8Array(300_001);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 7919) % 256;
    const encoded = encodeBytesBase64(bytes);
    expect(encoded).toBe(Buffer.from(bytes).toString("base64"));
    const decoded = decodeBase64Bytes(encoded);
    expect(decoded.ok && Buffer.from(decoded.bytes).equals(Buffer.from(bytes))).toBe(true);
  });

  it("matches Node's encoder for every length up to 10", () => {
    for (let n = 0; n <= 10; n++) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => 250 - i);
      expect(encodeBytesBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
      expect(encodeBytesBase64(bytes, { urlSafe: true })).toBe(Buffer.from(bytes).toString("base64url"));
    }
  });
});

describe("decodeJwt (shares decodeBase64)", () => {
  it("still decodes a token", () => {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    const result = decodeJwt(token);
    expect(result.ok).toBe(true);
  });
});
