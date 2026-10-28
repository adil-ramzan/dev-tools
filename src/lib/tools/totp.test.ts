import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  base32Decode,
  base32Encode,
  buildOtpauthUri,
  generateSecret,
  hotp,
  parseOtpauthUri,
  totp,
  verifyTotp,
  type OtpAlgorithm,
} from "@/lib/tools/totp";

const ascii = (s: string) => base32Encode(new TextEncoder().encode(s));

// RFC 6238 Appendix B: seeds are ASCII "1234567890" repeated to the hash's key length.
const SEEDS: Record<OtpAlgorithm, string> = {
  "SHA-1": ascii("12345678901234567890"),
  "SHA-256": ascii("12345678901234567890123456789012"),
  "SHA-512": ascii("1234567890123456789012345678901234567890123456789012345678901234"),
};

const VECTORS: [number, string, string, string][] = [
  [59, "94287082", "46119246", "90693936"],
  [1111111109, "07081804", "68084774", "25091201"],
  [1111111111, "14050471", "67062674", "99943326"],
  [1234567890, "89005924", "91819424", "93441116"],
  [2000000000, "69279037", "90698825", "38618901"],
  [20000000000, "65353130", "77737706", "47863826"],
];

describe("RFC 6238 test vectors", () => {
  it.each(VECTORS)("T = %i", async (seconds, sha1, sha256, sha512) => {
    for (const [algorithm, expected] of [["SHA-1", sha1], ["SHA-256", sha256], ["SHA-512", sha512]] as const) {
      const result = await totp(SEEDS[algorithm], { algorithm, digits: 8, period: 30 }, seconds * 1000);
      expect(result.ok && result.code, `${algorithm} at ${seconds}`).toBe(expected);
    }
  });
});

describe("RFC 4226 HOTP test vectors", () => {
  const expected = ["755224", "287082", "359152", "969429", "338314", "254676", "287922", "162583", "399871", "520489"];
  it("matches counters 0–9", async () => {
    const secret = new TextEncoder().encode("12345678901234567890");
    for (let counter = 0; counter < 10; counter++) {
      expect(await hotp(secret, counter, 6, "SHA-1", crypto.subtle)).toBe(expected[counter]);
    }
  });
});

describe("totp", () => {
  it("reports the seconds remaining in the period", async () => {
    const result = await totp(SEEDS["SHA-1"], DEFAULT_SETTINGS, 1_000_000_007_000);
    expect(result.ok && result.remaining).toBe(30 - (1_000_000_007 % 30));
  });

  it("keeps leading zeros", async () => {
    const result = await totp(SEEDS["SHA-1"], { algorithm: "SHA-1", digits: 8, period: 30 }, 1111111109_000);
    expect(result.ok && result.code).toBe("07081804");
  });

  it("validates settings and secrets", async () => {
    expect(await totp(SEEDS["SHA-1"], { ...DEFAULT_SETTINGS, digits: 5 }, 0)).toMatchObject({ ok: false });
    expect(await totp(SEEDS["SHA-1"], { ...DEFAULT_SETTINGS, period: 5 }, 0)).toMatchObject({ ok: false });
    expect(await totp(SEEDS["SHA-1"], { ...DEFAULT_SETTINGS, algorithm: "MD5" as OtpAlgorithm }, 0)).toMatchObject({ ok: false });
    expect(await totp("JBSWY3DP", DEFAULT_SETTINGS, 0)).toMatchObject({ ok: false, error: expect.stringContaining("80 bits") });
    expect(await totp(SEEDS["SHA-1"], DEFAULT_SETTINGS, 0, null)).toMatchObject({ ok: false, error: expect.stringContaining("Web Crypto") });
  });
});

describe("verifyTotp", () => {
  const settings = { algorithm: "SHA-1" as const, digits: 8, period: 30 };
  const t = 1111111111_000;

  it("accepts the current code and reports offset 0", async () => {
    expect(await verifyTotp("14050471", SEEDS["SHA-1"], settings, t, 1)).toEqual({ ok: true, valid: true, offset: 0 });
  });

  it("accepts the previous period only within the window", async () => {
    // 07081804 is the code at T = 1111111109, which is in the previous period.
    expect(await verifyTotp("07081804", SEEDS["SHA-1"], settings, t, 1)).toEqual({ ok: true, valid: true, offset: -1 });
    expect(await verifyTotp("07081804", SEEDS["SHA-1"], settings, t, 0)).toEqual({ ok: true, valid: false });
  });

  it("rejects wrong codes and malformed input", async () => {
    expect(await verifyTotp("00000000", SEEDS["SHA-1"], settings, t, 1)).toEqual({ ok: true, valid: false });
    expect(await verifyTotp("1405047", SEEDS["SHA-1"], settings, t, 1)).toMatchObject({ ok: false });
    expect(await verifyTotp("abcdefgh", SEEDS["SHA-1"], settings, t, 1)).toMatchObject({ ok: false });
    expect(await verifyTotp("14050471", SEEDS["SHA-1"], settings, t, 11)).toMatchObject({ ok: false });
  });

  it("ignores spaces in the code", async () => {
    expect(await verifyTotp("1405 0471", SEEDS["SHA-1"], settings, t, 0)).toMatchObject({ valid: true });
  });
});

describe("Base32", () => {
  it("round-trips arbitrary bytes", () => {
    for (let n = 0; n < 40; n++) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + n) % 256);
      const decoded = base32Decode(base32Encode(bytes) || "AA");
      if (n > 0) expect(decoded.ok && Array.from(decoded.bytes)).toEqual(Array.from(bytes));
    }
  });

  it("matches RFC 4648 test vectors", () => {
    expect(base32Encode(new TextEncoder().encode("foobar"))).toBe("MZXW6YTBOI");
    expect(base32Decode("mzxw 6ytb-oi======")).toMatchObject({ ok: true, bytes: new TextEncoder().encode("foobar") });
  });

  it("rejects invalid characters with a hint about look-alikes", () => {
    expect(base32Decode("JBSWY3DP0")).toMatchObject({ ok: false, error: expect.stringContaining("letters O, I or B") });
    expect(base32Decode("JBSW!")).toMatchObject({ ok: false });
    expect(base32Decode("A")).toMatchObject({ ok: false, error: expect.stringContaining("length") });
    expect(base32Decode("")).toMatchObject({ ok: false });
  });
});

describe("generateSecret", () => {
  it("creates 160-bit secrets from the secure random generator", () => {
    const a = generateSecret();
    const b = generateSecret();
    expect(a.ok && a.base32).toMatch(/^[A-Z2-7]{32}$/);
    expect(a.base32).not.toBe(b.base32);
  });

  it("fails safely without a secure random source", () => {
    expect(generateSecret(null)).toMatchObject({ ok: false });
    expect(generateSecret({ getRandomValues: () => { throw new Error("broken"); } })).toMatchObject({ ok: false, error: expect.stringContaining("broken") });
  });
});

describe("otpauth URIs", () => {
  it("parses a standard URI", () => {
    const result = parseOtpauthUri("otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example");
    expect(result).toEqual({
      ok: true,
      value: { secret: "JBSWY3DPEHPK3PXP", issuer: "Example", account: "alice@google.com", algorithm: "SHA-1", digits: 6, period: 30 },
      warnings: [],
    });
  });

  it("reads non-default settings and warns about app support", () => {
    const result = parseOtpauthUri("otpauth://totp/ACME%20Co:john.doe%40email.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=ACME%20Co&algorithm=SHA512&digits=8&period=60");
    expect(result).toMatchObject({ ok: true, value: { issuer: "ACME Co", account: "john.doe@email.com", algorithm: "SHA-512", digits: 8, period: 60 } });
    expect(result.ok && result.warnings[0]).toMatch(/Many authenticator apps/);
  });

  it("rejects invalid URIs with specific messages", () => {
    expect(parseOtpauthUri("not a uri")).toMatchObject({ ok: false });
    expect(parseOtpauthUri("https://example.com/?secret=JBSWY3DP")).toMatchObject({ error: expect.stringContaining("otpauth://") });
    expect(parseOtpauthUri("otpauth://hotp/x?secret=JBSWY3DPEHPK3PXP&counter=1")).toMatchObject({ error: expect.stringContaining("HOTP") });
    expect(parseOtpauthUri("otpauth://totp/x")).toMatchObject({ error: expect.stringContaining("no secret") });
    expect(parseOtpauthUri("otpauth://totp/x?secret=JBSW1")).toMatchObject({ error: expect.stringContaining("Base32") });
    expect(parseOtpauthUri("otpauth://totp/x?secret=JBSWY3DPEHPK3PXP&algorithm=MD5")).toMatchObject({ error: expect.stringContaining("MD5") });
    expect(parseOtpauthUri("otpauth://totp/x?secret=JBSWY3DPEHPK3PXP&digits=4")).toMatchObject({ ok: false });
  });

  it("builds a URI that parses back to the same values", () => {
    const value = { secret: "JBSWY3DPEHPK3PXP", issuer: "My Co", account: "ada@example.com", algorithm: "SHA-256" as const, digits: 6, period: 30 };
    const uri = buildOtpauthUri(value);
    expect(uri).toBe("otpauth://totp/My%20Co:ada%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=My%20Co&algorithm=SHA256&digits=6&period=30");
    expect(parseOtpauthUri(uri)).toMatchObject({ ok: true, value });
  });
});
