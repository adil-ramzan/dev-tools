import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { compareSignature, computeHmac, formatSignature, parseHex, toBytes, type HmacInput } from "@/lib/tools/hmac";

async function sign(input: Partial<HmacInput>) {
  const result = await computeHmac({ key: "", keyEncoding: "text", message: "", messageEncoding: "text", algorithm: "SHA-256", ...input });
  if (!result.ok) throw new Error(result.error);
  return result;
}
const hex = (bytes: Uint8Array) => formatSignature(bytes, "hex");

// RFC 4231 test vectors.
describe("RFC 4231", () => {
  it("test case 1: 20-byte key", async () => {
    const r = await sign({ key: "0b".repeat(20), keyEncoding: "hex", message: "Hi There" });
    expect(hex(r.signature)).toBe("b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7");
  });

  it("test case 2: short text key, SHA-384 and SHA-512", async () => {
    const base = { key: "Jefe", message: "what do ya want for nothing?" };
    expect(hex((await sign({ ...base, algorithm: "SHA-256" })).signature)).toBe("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
    expect(hex((await sign({ ...base, algorithm: "SHA-384" })).signature)).toBe(
      "af45d2e376484031617f78d2b58a6b1b9c7ef464f5a01b47e42ec3736322445e8e2240ca5e69e2c78b3239ecfab21649",
    );
    expect(hex((await sign({ ...base, algorithm: "SHA-512" })).signature)).toBe(
      "164b7a7bfcf819e2e395fbe73b56e0a387bd64222e831fd610270cd7ea2505549758bf75c05a994a6d034f65f8f0e6fdcaeab1a34d4a6b4b636e070a38bce737",
    );
  });

  it("test case 6: key longer than the block size", async () => {
    const r = await sign({ key: "aa".repeat(131), keyEncoding: "hex", message: "Test Using Larger Than Block-Size Key - Hash Key First" });
    expect(hex(r.signature)).toBe("60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54");
  });
});

describe("computeHmac", () => {
  it("matches Node's implementation for Unicode text and hex messages", async () => {
    const r = await sign({ key: "clé 🔑", message: "Grüße\n日本", algorithm: "SHA-512" });
    expect(hex(r.signature)).toBe(createHmac("sha512", "clé 🔑").update("Grüße\n日本").digest("hex"));
    const m = await sign({ key: "k", message: "00 ff 10", messageEncoding: "hex" });
    expect(hex(m.signature)).toBe(createHmac("sha256", "k").update(Buffer.from([0, 255, 16])).digest("hex"));
  });

  it("treats the same characters differently by encoding", async () => {
    const text = await sign({ key: "00ff", keyEncoding: "text", message: "m" });
    const bytes = await sign({ key: "00ff", keyEncoding: "hex", message: "m" });
    expect(hex(text.signature)).not.toBe(hex(bytes.signature));
  });

  it("accepts Base64 keys", async () => {
    const r = await sign({ key: Buffer.from("secret-key").toString("base64"), keyEncoding: "base64", message: "m" });
    expect(hex(r.signature)).toBe(createHmac("sha256", "secret-key").update("m").digest("hex"));
  });

  it("allows an empty message", async () => {
    const r = await sign({ key: "k".repeat(32), message: "" });
    expect(hex(r.signature)).toBe(createHmac("sha256", "k".repeat(32)).update("").digest("hex"));
    expect(r.warnings).toEqual([]);
  });

  it("warns about keys shorter than the hash output", async () => {
    expect((await sign({ key: "short", message: "m" })).warnings[0]).toMatch(/5 bytes.*at least 32/);
  });

  it("rejects empty and malformed keys and messages, naming the field", async () => {
    const run = (input: Partial<HmacInput>) => computeHmac({ key: "k", keyEncoding: "text", message: "m", messageEncoding: "text", algorithm: "SHA-256", ...input });
    expect(await run({ key: "" })).toMatchObject({ ok: false, field: "key" });
    expect(await run({ key: "abc", keyEncoding: "hex" })).toMatchObject({ ok: false, field: "key", error: expect.stringContaining("3 digits") });
    expect(await run({ key: "zz", keyEncoding: "hex" })).toMatchObject({ ok: false, field: "key" });
    expect(await run({ key: "a*b=", keyEncoding: "base64" })).toMatchObject({ ok: false, field: "key" });
    expect(await run({ key: "   ", keyEncoding: "hex" })).toMatchObject({ ok: false, error: expect.stringContaining("empty") });
    expect(await run({ message: "0g", messageEncoding: "hex" })).toMatchObject({ ok: false, field: "message" });
    expect(await run({ message: "a\uDC00" })).toMatchObject({ ok: false, field: "message" });
  });

  it("rejects messages over the size limit", async () => {
    const big = "a".repeat(5 * 1024 * 1024 + 1);
    expect(await computeHmac({ key: "k", keyEncoding: "text", message: big, messageEncoding: "text", algorithm: "SHA-256" })).toMatchObject({ ok: false, field: "message" });
  });

  it("explains when Web Crypto is unavailable", async () => {
    expect(await computeHmac({ key: "k", keyEncoding: "text", message: "m", messageEncoding: "text", algorithm: "SHA-256" }, null)).toMatchObject({
      ok: false,
      error: expect.stringContaining("Web Crypto"),
    });
  });
});

describe("parseHex and toBytes", () => {
  it("accepts a 0x prefix and spaces", () => {
    expect(parseHex("0xDE AD be ef")).toMatchObject({ ok: true, bytes: new Uint8Array([0xde, 0xad, 0xbe, 0xef]) });
  });

  it("encodes text as UTF-8", () => {
    expect(toBytes("é", "text")).toMatchObject({ ok: true, bytes: new Uint8Array([0xc3, 0xa9]) });
  });
});

describe("output and comparison", () => {
  const bytes = new Uint8Array([0xfb, 0xff, 0x01]);

  it("formats hex, Base64 and Base64URL", () => {
    expect(formatSignature(bytes, "hex")).toBe("fbff01");
    expect(formatSignature(bytes, "HEX")).toBe("FBFF01");
    expect(formatSignature(bytes, "base64")).toBe("+/8B");
    expect(formatSignature(new Uint8Array([0xfb, 0xff]), "base64url")).toBe("-_8");
  });

  it("compares expected signatures in any of those formats", () => {
    expect(compareSignature("FBFF01", bytes)).toBe("match");
    expect(compareSignature("+/8B", bytes)).toBe("match");
    expect(compareSignature("-_8B", bytes)).toBe("match");
    expect(compareSignature("fbff02", bytes)).toBe("mismatch");
    expect(compareSignature("fbff", bytes)).toBe("mismatch");
    expect(compareSignature("not base64!", bytes)).toBe("invalid");
    expect(compareSignature("", bytes)).toBe("invalid");
  });
});
