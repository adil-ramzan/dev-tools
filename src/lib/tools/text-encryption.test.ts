import { createDecipheriv, pbkdf2Sync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DECRYPT_FAILED, MIN_ITERATIONS, decryptText, encryptText, parsePayload } from "@/lib/tools/text-encryption";

// The minimum accepted count keeps tests fast; the default is 600,000.
const FAST = { iterations: MIN_ITERATIONS };

async function encrypt(text: string, password: string) {
  const result = await encryptText(text, password, FAST);
  if (!result.ok) throw new Error(result.error);
  return result.payload;
}
const b64url = (s: string) => Buffer.from(s, "base64url");

describe("round trip", () => {
  it("decrypts what it encrypts, including Unicode and empty text", async () => {
    for (const text of ["Hello, world!", "Grüße 👋 日本語\nline 2", ""]) {
      const payload = await encrypt(text, "correct horse battery staple");
      expect(await decryptText(payload, "correct horse battery staple")).toEqual({ ok: true, plaintext: text });
    }
  });

  it("uses the documented format and default parameters", async () => {
    const result = await encryptText("x", "a long enough password");
    if (!result.ok) throw new Error(result.error);
    expect(result.payload).toMatch(/^v1\.pbkdf2-sha256\.600000\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]+$/);
  });

  it("can be decrypted by an independent AES-GCM implementation", async () => {
    const payload = await encrypt("interoperable", "p4ssword-for-node");
    const [v, kdf, iterations, salt, iv, data] = payload.split(".");
    const key = pbkdf2Sync("p4ssword-for-node", b64url(salt), Number(iterations), 32, "sha256");
    const bytes = b64url(data);
    const decipher = createDecipheriv("aes-256-gcm", key, b64url(iv));
    decipher.setAAD(Buffer.from(`${v}.${kdf}.${iterations}`));
    decipher.setAuthTag(bytes.subarray(-16));
    expect(Buffer.concat([decipher.update(bytes.subarray(0, -16)), decipher.final()]).toString()).toBe("interoperable");
  });

  it("uses a fresh salt and IV every time", async () => {
    const payloads = await Promise.all(Array.from({ length: 5 }, () => encrypt("same text", "same password")));
    const salts = new Set(payloads.map((p) => p.split(".")[3]));
    const ivs = new Set(payloads.map((p) => p.split(".")[4]));
    expect(salts.size).toBe(5);
    expect(ivs.size).toBe(5);
  });

  it("ignores whitespace and line breaks added when the payload was copied", async () => {
    const payload = await encrypt("wrapped", "password1234");
    const wrapped = payload.match(/.{1,20}/g)!.join("\n  ");
    expect(await decryptText(wrapped, "password1234")).toMatchObject({ ok: true, plaintext: "wrapped" });
  });
});

describe("authentication", () => {
  it("gives the same generic error for a wrong password and for tampering", async () => {
    const payload = await encrypt("secret message", "right password");
    expect(await decryptText(payload, "wrong password")).toEqual({ ok: false, error: DECRYPT_FAILED });

    const parts = payload.split(".");
    const data = b64url(parts[5]);
    data[0] ^= 1;
    const flipped = [...parts.slice(0, 5), data.toString("base64url")].join(".");
    expect(await decryptText(flipped, "right password")).toEqual({ ok: false, error: DECRYPT_FAILED });

    const iv = b64url(parts[4]);
    iv[0] ^= 1;
    expect(await decryptText([...parts.slice(0, 4), iv.toString("base64url"), parts[5]].join("."), "right password")).toEqual({ ok: false, error: DECRYPT_FAILED });

    const tag = b64url(parts[5]);
    tag[tag.length - 1] ^= 1;
    expect(await decryptText([...parts.slice(0, 5), tag.toString("base64url")].join("."), "right password")).toEqual({ ok: false, error: DECRYPT_FAILED });
  });

  it("detects a changed iteration count through the authenticated header", async () => {
    const payload = await encrypt("bound header", "right password");
    const changed = payload.replace(`.${MIN_ITERATIONS}.`, `.${MIN_ITERATIONS + 1}.`);
    expect(await decryptText(changed, "right password")).toEqual({ ok: false, error: DECRYPT_FAILED });
  });
});

describe("validation", () => {
  it("explains structural problems before deriving a key", () => {
    expect(parsePayload("")).toMatchObject({ ok: false });
    expect(parsePayload("hello")).toMatchObject({ error: expect.stringContaining("not encrypted text from this tool") });
    expect(parsePayload("v2.pbkdf2-sha256.1.a.b.c")).toMatchObject({ error: expect.stringContaining("version v2") });
    expect(parsePayload("v1.pbkdf2-sha256.600000.abc")).toMatchObject({ error: expect.stringContaining("6 parts") });
    expect(parsePayload("v1.scrypt.600000.a.b.c")).toMatchObject({ error: expect.stringContaining("scrypt") });
    expect(parsePayload("v1.pbkdf2-sha256.1000.AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA")).toMatchObject({ error: expect.stringContaining("outside the accepted range") });
    expect(parsePayload("v1.pbkdf2-sha256.99999999.AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA")).toMatchObject({ error: expect.stringContaining("outside") });
    expect(parsePayload("v1.pbkdf2-sha256.600000.AAAA.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA")).toMatchObject({ error: expect.stringContaining("salt") });
    expect(parsePayload("v1.pbkdf2-sha256.600000.AAAAAAAAAAAAAAAAAAAAAA.AAAA.AAAAAAAAAAAAAAAAAAAAAA")).toMatchObject({ error: expect.stringContaining("IV") });
    expect(parsePayload("v1.pbkdf2-sha256.600000.AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAA.AAAA")).toMatchObject({ error: expect.stringContaining("ciphertext") });
    expect(parsePayload("v1.pbkdf2-sha256.600000.AAAAAAAAAAAAAAAAAAAAA+.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA")).toMatchObject({ error: expect.stringContaining("salt") });
  });

  it("requires a password and valid text", async () => {
    expect(await encryptText("x", "")).toMatchObject({ ok: false });
    expect(await encryptText("a\uD800", "password")).toMatchObject({ ok: false });
    expect(await decryptText("v1.x", "")).toMatchObject({ ok: false, error: "Enter a password." });
  });

  it("rejects text over the size limit", async () => {
    expect(await encryptText("a".repeat(5 * 1024 * 1024 + 1), "password", FAST)).toMatchObject({ ok: false, error: expect.stringContaining("5 MB") });
  });

  it("rejects iteration counts outside the range", async () => {
    expect(await encryptText("x", "password", { iterations: 1000 })).toMatchObject({ ok: false });
  });

  it("warns about short passwords", async () => {
    const result = await encryptText("x", "short", FAST);
    expect(result.ok && result.warnings[0]).toMatch(/shorter than 12/);
  });

  it("explains when Web Crypto is unavailable", async () => {
    expect(await encryptText("x", "password", { subtle: null })).toMatchObject({ ok: false, error: expect.stringContaining("Web Crypto") });
    expect(await encryptText("x", "password", { random: null })).toMatchObject({ ok: false, error: expect.stringContaining("Web Crypto") });
  });

  it("never includes the password or plaintext in the payload", async () => {
    const payload = await encrypt("visible plaintext", "visible password");
    expect(payload).not.toContain("visible");
    expect(Buffer.from(payload.split(".")[5], "base64url").toString("latin1")).not.toContain("visible");
  });
});
