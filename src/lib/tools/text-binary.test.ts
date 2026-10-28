import { describe, expect, it } from "vitest";
import { binaryToText, breakdown, findInvalidUtf8, textToBinary } from "@/lib/tools/text-binary";

const bin = (text: string, sep?: "space" | "none" | "newline") => {
  const result = textToBinary(text, sep);
  if (!result.ok) throw new Error(result.error);
  return result.output;
};

describe("textToBinary", () => {
  it("writes each UTF-8 byte as 8 bits", () => {
    expect(bin("Hi")).toBe("01001000 01101001");
    expect(bin("Hi", "none")).toBe("0100100001101001");
    expect(bin("Hi", "newline")).toBe("01001000\n01101001");
  });

  it("uses multiple bytes for non-ASCII characters", () => {
    expect(bin("é")).toBe("11000011 10101001");
    expect(bin("€").split(" ")).toHaveLength(3);
    expect(bin("😀")).toBe("11110000 10011111 10011000 10000000");
  });

  it("encodes empty text as empty output", () => {
    expect(textToBinary("")).toEqual({ ok: true, output: "", bytes: 0 });
  });

  it("rejects lone surrogates", () => {
    expect(textToBinary("\uD83D").ok).toBe(false);
  });
});

describe("binaryToText", () => {
  it("round-trips Unicode text with every separator", () => {
    const text = "Hello, 世界! Grüße 😀\n\ttab";
    for (const sep of ["space", "none", "newline"] as const) {
      expect(binaryToText(bin(text, sep))).toMatchObject({ ok: true, output: text });
    }
  });

  it("accepts commas and mixed whitespace between bytes", () => {
    expect(binaryToText("01001000,01101001")).toMatchObject({ output: "Hi" });
    expect(binaryToText("  01001000 \n\t 01101001  ")).toMatchObject({ output: "Hi" });
  });

  it("rejects characters other than 0 and 1 with their position", () => {
    expect(binaryToText("01001000 01102001")).toMatchObject({ ok: false, error: expect.stringContaining('"2" at position 14') });
  });

  it("rejects bytes that are not exactly 8 bits", () => {
    expect(binaryToText("1001000 01101001")).toMatchObject({ ok: false, error: expect.stringContaining("Byte 1") });
    expect(binaryToText("010010000")).toMatchObject({ ok: false, error: expect.stringContaining("9 bits") });
  });

  it("rejects invalid or truncated UTF-8", () => {
    expect(binaryToText("11000011")).toMatchObject({ ok: false, error: expect.stringContaining("Byte 1") });
    expect(binaryToText("01000001 11111111")).toMatchObject({ ok: false, error: expect.stringContaining("Byte 2") });
    // Latin-1 é is not UTF-8.
    expect(binaryToText("11101001").ok).toBe(false);
  });

  it("requires some input", () => {
    expect(binaryToText("   ").ok).toBe(false);
  });
});

describe("findInvalidUtf8", () => {
  const bytes = (...b: number[]) => new Uint8Array(b);
  it("rejects overlong forms, surrogates and code points above U+10FFFF", () => {
    expect(findInvalidUtf8(bytes(0xc0, 0x80))).toBe(0);
    expect(findInvalidUtf8(bytes(0xe0, 0x80, 0x80))).toBe(0);
    expect(findInvalidUtf8(bytes(0xed, 0xa0, 0x80))).toBe(0);
    expect(findInvalidUtf8(bytes(0xf4, 0x90, 0x80, 0x80))).toBe(0);
    expect(findInvalidUtf8(bytes(0x41, 0xf0, 0x9f, 0x98, 0x80))).toBe(-1);
  });
});

describe("breakdown", () => {
  it("lists code points and bytes per character", () => {
    expect(breakdown("aé")).toEqual([
      { char: "a", codePoint: "U+0061", bytes: ["01100001"] },
      { char: "é", codePoint: "U+00E9", bytes: ["11000011", "10101001"] },
    ]);
  });
});
