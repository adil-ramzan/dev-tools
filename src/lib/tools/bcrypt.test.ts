import { describe, expect, it } from "vitest";
import { checkCost, checkPassword, estimateMs, hashPassword, loadBcrypt, parseHash, verifyPassword } from "@/lib/tools/bcrypt";

// Known hash from the OpenBSD bcrypt test vectors: "U*U" with cost 5.
const VECTOR = { password: "U*U", hash: "$2a$05$CCCCCCCCCCCCCCCCCCCCC.E5YPO9kmyuRGyh0XouQYb4YMJKvyOeW" };

describe("hashPassword and verifyPassword", () => {
  it("creates a hash that verifies, and rejects other passwords", async () => {
    const result = await hashPassword("correct horse", 4);
    if (!result.ok) throw new Error(result.error);
    expect(result.hash).toMatch(/^\$2b\$04\$[./A-Za-z0-9]{53}$/);
    expect(await verifyPassword("correct horse", result.hash)).toMatchObject({ ok: true, match: true, cost: 4 });
    expect(await verifyPassword("correct horsE", result.hash)).toMatchObject({ ok: true, match: false });
  });

  it("uses a fresh random salt each time", async () => {
    const a = await hashPassword("same", 4);
    const b = await hashPassword("same", 4);
    expect(a.ok && b.ok && a.hash !== b.hash).toBe(true);
  });

  it("verifies a published test vector", async () => {
    expect(await verifyPassword(VECTOR.password, VECTOR.hash)).toMatchObject({ ok: true, match: true });
  });

  it("verifies $2y$ hashes, which are identical to $2b$", async () => {
    const result = await hashPassword("pässwörd", 4);
    if (!result.ok) throw new Error(result.error);
    expect(await verifyPassword("pässwörd", result.hash.replace("$2b$", "$2y$"))).toMatchObject({ match: true });
  });

  it("hashes passwords as UTF-8", async () => {
    const result = await hashPassword("🔒 Grüße", 4);
    expect(result.ok && (await verifyPassword("🔒 Grüße", result.hash))).toMatchObject({ match: true });
  });

  it("warns that bytes after 72 are ignored, and they really are", async () => {
    const long = "a".repeat(72);
    const result = await hashPassword(long + "SUFFIX", 4);
    if (!result.ok) throw new Error(result.error);
    expect(result.warnings[0]).toMatch(/78 bytes/);
    expect(await verifyPassword(long + "OTHER", result.hash)).toMatchObject({ match: true });
  });

  it("counts multibyte characters toward the 72-byte limit", () => {
    const check = checkPassword("é".repeat(37));
    expect(check.ok && check.warnings[0]).toMatch(/74 bytes/);
  });

  it("measures how long hashing took", async () => {
    const result = await hashPassword("x", 4);
    expect(result.ok && result.ms).toBeGreaterThanOrEqual(0);
  });
});

describe("input validation", () => {
  it("rejects empty passwords, lone surrogates and null characters", () => {
    expect(checkPassword("").ok).toBe(false);
    expect(checkPassword("a\uD800").ok).toBe(false);
    expect(checkPassword("a\u0000b").ok).toBe(false);
  });

  it("warns about leading or trailing whitespace", () => {
    const check = checkPassword(" secret");
    expect(check.ok && check.warnings[0]).toMatch(/whitespace/);
  });

  it("enforces the cost range instead of letting the library adjust it", async () => {
    expect(checkCost(3)).toMatch(/4 to 15/);
    expect(checkCost(16)).toMatch(/4 to 15/);
    expect(checkCost(10.5)).toMatch(/whole number/);
    expect(checkCost(4)).toBeNull();
    expect(await hashPassword("x", 3)).toMatchObject({ ok: false });
  });

  it("refuses to verify hashes too expensive for a browser", async () => {
    expect(await verifyPassword("x", "$2b$20$" + "a".repeat(53))).toMatchObject({ ok: false, error: expect.stringContaining("cost 20") });
  });
});

describe("parseHash", () => {
  it("reads the variant, cost and salt", () => {
    expect(parseHash(VECTOR.hash)).toEqual({ ok: true, variant: "2a", cost: 5, salt: "CCCCCCCCCCCCCCCCCCCCC." });
    expect(parseHash(`  ${VECTOR.hash}\n`).ok).toBe(true);
  });

  it("explains what is wrong with malformed hashes", () => {
    expect(parseHash("")).toMatchObject({ ok: false });
    expect(parseHash("$argon2id$v=19$m=65536,t=3,p=4$abc$def")).toMatchObject({ error: expect.stringContaining("Argon2") });
    expect(parseHash("$6$salt$hash")).toMatchObject({ error: expect.stringContaining("Unix crypt") });
    expect(parseHash("$2x$10$" + "a".repeat(53))).toMatchObject({ error: expect.stringContaining("$2x$") });
    expect(parseHash("5f4dcc3b5aa765d61d8327deb882cf99")).toMatchObject({ error: expect.stringContaining("starts with") });
    expect(parseHash(VECTOR.hash.slice(0, -1))).toMatchObject({ error: expect.stringContaining("59") });
    expect(parseHash(VECTOR.hash.slice(0, -1) + "!")).toMatchObject({ error: expect.stringContaining("characters") });
    expect(parseHash("$2b$03$" + "a".repeat(53))).toMatchObject({ error: expect.stringContaining("04 to 31") });
  });

  it("reports malformed hashes from verifyPassword instead of a silent mismatch", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toMatchObject({ ok: false });
  });
});

describe("estimateMs", () => {
  it("doubles per cost step", () => {
    expect(estimateMs(100, 10, 12)).toBe(400);
    expect(estimateMs(100, 10, 9)).toBe(50);
  });
});

describe("loadBcrypt", () => {
  it("loads the library", async () => {
    const lib = await loadBcrypt();
    expect(typeof lib.hash).toBe("function");
  });
});
