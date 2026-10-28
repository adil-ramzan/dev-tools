import { createPrivateKey, createPublicKey, privateDecrypt, publicEncrypt, constants } from "node:crypto";
import { describe, expect, it } from "vitest";
import { fromPem, generateRsaKeyPair, toPem } from "@/lib/tools/rsa";

describe("generateRsaKeyPair", () => {
  it("generates a 2048-bit RSA-OAEP key pair as SPKI and PKCS#8 PEM", async () => {
    const result = await generateRsaKeyPair(2048);
    if (!result.ok) throw new Error(result.error);
    expect(result.publicPem).toMatch(/^-----BEGIN PUBLIC KEY-----\n([A-Za-z0-9+/=]{1,64}\n)+-----END PUBLIC KEY-----\n$/);
    expect(result.privatePem).toMatch(/^-----BEGIN PRIVATE KEY-----\n([A-Za-z0-9+/=]{1,64}\n)+-----END PRIVATE KEY-----\n$/);

    // OpenSSL (through Node) reads both keys and they work together.
    const publicKey = createPublicKey(result.publicPem);
    const privateKey = createPrivateKey(result.privatePem);
    expect(publicKey.asymmetricKeyType).toBe("rsa");
    expect(publicKey.asymmetricKeyDetails).toMatchObject({ modulusLength: 2048, publicExponent: BigInt(65537) });
    const secret = Buffer.from("round trip");
    const encrypted = publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, secret);
    expect(privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, encrypted).toString()).toBe("round trip");
  });

  it("generates 4096-bit keys", { timeout: 60_000 }, async () => {
    const result = await generateRsaKeyPair(4096);
    if (!result.ok) throw new Error(result.error);
    expect(createPublicKey(result.publicPem).asymmetricKeyDetails?.modulusLength).toBe(4096);
  });

  it("generates a different key pair every time, with a matching fingerprint", async () => {
    const a = await generateRsaKeyPair(2048);
    const b = await generateRsaKeyPair(2048);
    if (!a.ok || !b.ok) throw new Error("generation failed");
    expect(a.privatePem).not.toBe(b.privatePem);
    expect(a.fingerprint).not.toBe(b.fingerprint);
    const spki = createPublicKey(a.publicPem).export({ type: "spki", format: "der" });
    const { createHash } = await import("node:crypto");
    expect(a.fingerprint).toBe(createHash("sha256").update(spki).digest("base64").replace(/=+$/, ""));
  });

  it("rejects unsupported key sizes", async () => {
    expect(await generateRsaKeyPair(1024 as 2048)).toMatchObject({ ok: false });
  });

  it("explains when Web Crypto is unavailable", async () => {
    expect(await generateRsaKeyPair(2048, null)).toMatchObject({ ok: false, error: expect.stringContaining("Web Crypto") });
  });

  it("reports generation failures", async () => {
    const failing = { generateKey: () => Promise.reject(new Error("OperationError")), exportKey: () => Promise.reject(new Error()), digest: () => Promise.reject(new Error()) };
    expect(await generateRsaKeyPair(2048, failing as never)).toMatchObject({ ok: false, error: expect.stringContaining("OperationError") });
  });
});

describe("PEM helpers", () => {
  it("wraps at 64 characters and round-trips", () => {
    const der = Uint8Array.from({ length: 100 }, (_, i) => i);
    const pem = toPem(der, "TEST");
    expect(pem.split("\n")[1]).toHaveLength(64);
    expect(Array.from(fromPem(pem, "TEST")!)).toEqual(Array.from(der));
    expect(fromPem(pem, "OTHER")).toBeNull();
  });
});
