import { describe, expect, it } from "vitest";
import { MAX_DIGITS, bitLength, formatInteger, parseInteger, twosComplement, type Base } from "@/lib/tools/base-convert";

const plain = { prefix: false, uppercase: false, group: false };

function value(input: string, base: Base): bigint {
  const result = parseInteger(input, base);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe("parseInteger", () => {
  it("parses each base", () => {
    expect(value("1010", 2)).toBe(BigInt(10));
    expect(value("755", 8)).toBe(BigInt(493));
    expect(value("255", 10)).toBe(BigInt(255));
    expect(value("fF", 16)).toBe(BigInt(255));
  });

  it("accepts matching prefixes, signs and digit separators", () => {
    expect(value("0b1111_0000", 2)).toBe(BigInt(240));
    expect(value("0O17", 8)).toBe(BigInt(15));
    expect(value("-0xFF", 16)).toBe(BigInt(-255));
    expect(value("+42", 10)).toBe(BigInt(42));
    expect(value("  1 000 000  ", 10)).toBe(BigInt(1000000));
  });

  it("keeps integers beyond Number.MAX_SAFE_INTEGER exact", () => {
    expect(value("9007199254740993", 10).toString()).toBe("9007199254740993");
    const big = "123456789012345678901234567890123456789";
    expect(formatInteger(value(formatInteger(value(big, 10), 16, plain), 16), 10, plain)).toBe(big);
    expect(formatInteger(value("-" + big, 10), 2, plain)).toBe("-" + value(big, 10).toString(2));
  });

  it("reports the first invalid digit with its position", () => {
    expect(parseInteger("1021", 2)).toEqual({ ok: false, error: expect.stringContaining('digit "2" at position 3'), position: 3 });
    expect(parseInteger("78", 8)).toMatchObject({ ok: false, position: 2 });
    expect(parseInteger("12a", 10)).toMatchObject({ ok: false, position: 3 });
    expect(parseInteger("ffg", 16)).toMatchObject({ ok: false, position: 3 });
  });

  it("rejects decimals, empty input and misplaced separators", () => {
    expect(parseInteger("1.5", 10)).toMatchObject({ ok: false, error: expect.stringContaining("whole numbers") });
    expect(parseInteger("", 10).ok).toBe(false);
    expect(parseInteger("-", 10).ok).toBe(false);
    expect(parseInteger("0x", 16).ok).toBe(false);
    expect(parseInteger("1__0", 10).ok).toBe(false);
    expect(parseInteger("_10", 10).ok).toBe(false);
    expect(parseInteger("10_", 10).ok).toBe(false);
    expect(parseInteger("--1", 10).ok).toBe(false);
  });

  it("rejects a prefix that does not match the input base", () => {
    expect(parseInteger("0x1F", 10)).toMatchObject({ ok: false, error: expect.stringContaining("hexadecimal") });
    expect(parseInteger("0b101", 16).ok).toBe(true); // b is a hex digit: 0x0b101
    expect(parseInteger("0o7", 2)).toMatchObject({ ok: false, error: expect.stringContaining("octal") });
  });

  it("rejects input over the digit limit", () => {
    expect(parseInteger("1".repeat(MAX_DIGITS + 1), 10).ok).toBe(false);
    expect(parseInteger("1".repeat(MAX_DIGITS), 2).ok).toBe(true);
  });

  it("does not accept non-ASCII digits or letters", () => {
    expect(parseInteger("١٢", 10).ok).toBe(false);
    expect(parseInteger("ｆｆ", 16).ok).toBe(false);
  });
});

describe("formatInteger", () => {
  it("formats sign and magnitude with optional prefix, case and grouping", () => {
    expect(formatInteger(BigInt(-255), 16, { prefix: true, uppercase: true, group: false })).toBe("-0xFF");
    expect(formatInteger(BigInt(1234567), 10, { prefix: false, uppercase: false, group: true })).toBe("1,234,567");
    expect(formatInteger(BigInt(255), 2, { prefix: true, uppercase: false, group: true })).toBe("0b1111_1111");
    expect(formatInteger(BigInt(511), 8, { prefix: true, uppercase: false, group: true })).toBe("0o777");
    expect(formatInteger(BigInt(0), 2, plain)).toBe("0");
  });
});

describe("twosComplement", () => {
  it("encodes negative numbers in the chosen width", () => {
    expect(twosComplement(BigInt(-1), 8)).toMatchObject({ ok: true, hex: "FF", binary: "1111 1111", unsigned: BigInt(255) });
    expect(twosComplement(BigInt(-128), 8)).toMatchObject({ ok: true, hex: "80" });
    expect(twosComplement(BigInt(5), 16)).toMatchObject({ ok: true, hex: "0005" });
    expect(twosComplement(BigInt(-1), 64)).toMatchObject({ ok: true, hex: "F".repeat(16) });
  });

  it("rejects values outside the signed range", () => {
    expect(twosComplement(BigInt(128), 8).ok).toBe(false);
    expect(twosComplement(BigInt(-129), 8).ok).toBe(false);
  });
});

describe("bitLength", () => {
  it("counts the bits of the magnitude", () => {
    expect(bitLength(BigInt(0))).toBe(0);
    expect(bitLength(BigInt(255))).toBe(8);
    expect(bitLength(BigInt(-256))).toBe(9);
  });
});
