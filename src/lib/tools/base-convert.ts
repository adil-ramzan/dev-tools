/**
 * Integer conversion between binary, octal, decimal and hexadecimal using
 * BigInt, so values of any size convert exactly. Floating-point numbers are
 * never involved: 9007199254740993 stays 9007199254740993.
 *
 * Input may have a sign, a prefix matching its base (0b, 0o, 0x), and
 * underscores or spaces between digits as separators.
 */

export type Base = 2 | 8 | 10 | 16;

export const bases: { base: Base; label: string; prefix: string; digits: string }[] = [
  { base: 2, label: "Binary", prefix: "0b", digits: "0–1" },
  { base: 8, label: "Octal", prefix: "0o", digits: "0–7" },
  { base: 10, label: "Decimal", prefix: "", digits: "0–9" },
  { base: 16, label: "Hexadecimal", prefix: "0x", digits: "0–9 and A–F" },
];

/** Generous, but stops a pasted megabyte of digits from freezing the page. */
export const MAX_DIGITS = 10_000;

export const BIT_WIDTHS = [8, 16, 32, 64, 128] as const;
export type BitWidth = (typeof BIT_WIDTHS)[number];

const PREFIXES: Record<string, Base> = { "0b": 2, "0o": 8, "0x": 16 };

export type ParseIntegerResult = { ok: true; value: bigint } | { ok: false; error: string; position?: number };

function digitValue(char: string): number {
  const code = char.toLowerCase().charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 97 && code <= 122) return code - 87;
  return Infinity;
}

export function parseInteger(input: string, base: Base): ParseIntegerResult {
  const text = input.trim();
  if (text === "") return { ok: false, error: "Enter an integer." };
  const offset = input.indexOf(text);

  let i = 0;
  let negative = false;
  if (text[0] === "-" || text[0] === "+") {
    negative = text[0] === "-";
    i = 1;
  }
  const prefix = text.slice(i, i + 2).toLowerCase();
  // In hex, "0b" is two digits (0xB…), not a binary prefix.
  if (prefix in PREFIXES && digitValue(prefix[1]) >= base) {
    if (PREFIXES[prefix] !== base) {
      const name = bases.find((b) => b.base === PREFIXES[prefix])!.label.toLowerCase();
      return { ok: false, error: `The prefix ${text.slice(i, i + 2)} marks a ${name} number, but the input base is ${base}. Choose ${name} as the input base or remove the prefix.`, position: offset + i + 1 };
    }
    i += 2;
  }

  const label = bases.find((b) => b.base === base)!;
  let digits = "";
  let lastWasSeparator = true;
  for (; i < text.length; i++) {
    const char = text[i];
    if (char === "_" || char === " ") {
      if (lastWasSeparator) {
        return { ok: false, error: `Unexpected "${char === " " ? "space" : "_"}" at position ${offset + i + 1}. Separators are only allowed between digits.`, position: offset + i + 1 };
      }
      lastWasSeparator = true;
      continue;
    }
    if (digitValue(char) >= base) {
      const hint = char === "." || char === "," ? " Only whole numbers can be converted." : ` ${label.label} uses only the digits ${label.digits}.`;
      return { ok: false, error: `Invalid ${label.label.toLowerCase()} digit "${char}" at position ${offset + i + 1}.${hint}`, position: offset + i + 1 };
    }
    digits += char;
    lastWasSeparator = false;
  }
  if (digits === "") return { ok: false, error: "Enter at least one digit after the sign or prefix." };
  if (lastWasSeparator) return { ok: false, error: "The number cannot end with a separator." };
  if (digits.length > MAX_DIGITS) {
    return { ok: false, error: `The number has ${digits.length.toLocaleString("en-US")} digits. The limit is ${MAX_DIGITS.toLocaleString("en-US")}.` };
  }

  // BigInt parses 0b/0o/0x literals of any length exactly; it rejects a sign before the prefix, so the sign is applied after.
  const magnitude = BigInt(base === 10 ? digits : `${bases.find((b) => b.base === base)!.prefix}${digits}`);
  return { ok: true, value: negative ? -magnitude : magnitude };
}

export type FormatOptions = { prefix: boolean; uppercase: boolean; group: boolean };

function groupDigits(digits: string, size: number, separator: string): string {
  const parts: string[] = [];
  for (let end = digits.length; end > 0; end -= size) parts.unshift(digits.slice(Math.max(0, end - size), end));
  return parts.join(separator);
}

/** Sign and magnitude, e.g. -0xff. Grouping uses 4 digits for binary and hex, 3 for octal, and thousands for decimal. */
export function formatInteger(value: bigint, base: Base, { prefix, uppercase, group }: FormatOptions): string {
  const negative = value < BigInt(0);
  let digits = (negative ? -value : value).toString(base);
  if (uppercase) digits = digits.toUpperCase();
  if (group) digits = base === 10 ? groupDigits(digits, 3, ",") : groupDigits(digits, base === 8 ? 3 : 4, "_");
  const marker = prefix ? bases.find((b) => b.base === base)!.prefix : "";
  return `${negative ? "-" : ""}${marker}${digits}`;
}

export type TwosComplementResult = { ok: true; binary: string; hex: string; unsigned: bigint } | { ok: false; error: string };

/** The bit pattern of `value` as a signed two's complement integer of `bits` bits. */
export function twosComplement(value: bigint, bits: BitWidth): TwosComplementResult {
  const width = BigInt(bits);
  const one = BigInt(1);
  const min = -(one << (width - one));
  const max = (one << (width - one)) - one;
  if (value < min || value > max) {
    return { ok: false, error: `${value} does not fit in a signed ${bits}-bit integer (${min} to ${max}).` };
  }
  const unsigned = value < BigInt(0) ? (one << width) + value : value;
  return {
    ok: true,
    unsigned,
    binary: groupDigits(unsigned.toString(2).padStart(bits, "0"), 4, " "),
    hex: unsigned.toString(16).toUpperCase().padStart(bits / 4, "0"),
  };
}

/** Number of bits needed for the magnitude, e.g. 255 → 8. */
export function bitLength(value: bigint): number {
  const magnitude = value < BigInt(0) ? -value : value;
  return magnitude === BigInt(0) ? 0 : magnitude.toString(2).length;
}
