import { describe, expect, it } from "vitest";
import { buildBasicAuth, decodeBasicAuth } from "@/lib/tools/basic-auth";

describe("buildBasicAuth", () => {
  it("matches the RFC 7617 examples", () => {
    // RFC 7617 section 2: Aladdin / open sesame.
    expect(buildBasicAuth("Aladdin", "open sesame")).toMatchObject({ ok: true, header: "Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==", token: "QWxhZGRpbjpvcGVuIHNlc2FtZQ==" });
    // RFC 7617 section 2.1: "test" / "123£" in UTF-8.
    const result = buildBasicAuth("test", "123£");
    expect(result).toMatchObject({ ok: true, token: "dGVzdDoxMjPCow==" });
    expect(result.ok && result.warnings[0]).toMatch(/UTF-8/);
  });

  it("matches Node's encoding for Unicode credentials", () => {
    const result = buildBasicAuth("José", "pässwörd 🔑");
    expect(result.ok && result.token).toBe(Buffer.from("José:pässwörd 🔑", "utf8").toString("base64"));
  });

  it("allows colons in the password but not the username", () => {
    expect(buildBasicAuth("user", "pa:ss")).toMatchObject({ ok: true, token: Buffer.from("user:pa:ss").toString("base64") });
    expect(buildBasicAuth("us:er", "pass")).toMatchObject({ ok: false, field: "username" });
  });

  it("rejects control characters and empty usernames", () => {
    expect(buildBasicAuth("", "pass")).toMatchObject({ ok: false, field: "username" });
    expect(buildBasicAuth("user\n", "pass")).toMatchObject({ ok: false, field: "username" });
    expect(buildBasicAuth("user", "pa\tss")).toMatchObject({ ok: false, field: "password" });
    expect(buildBasicAuth("user", "pa\u007fss")).toMatchObject({ ok: false, field: "password" });
    expect(buildBasicAuth("user", "a\uD800")).toMatchObject({ ok: false, field: "password" });
  });

  it("warns about an empty password", () => {
    const result = buildBasicAuth("user", "");
    expect(result).toMatchObject({ ok: true, token: "dXNlcjo=" });
    expect(result.ok && result.warnings).toContain("The password is empty.");
  });

  it("handles long credentials", () => {
    const result = buildBasicAuth("u".repeat(1000), "p".repeat(10_000));
    expect(result.ok && decodeBasicAuth(result.header)).toMatchObject({ ok: true, password: "p".repeat(10_000) });
  });
});

describe("decodeBasicAuth", () => {
  it("reads a full header, a Basic value or a bare token", () => {
    const expected = { ok: true, username: "Aladdin", password: "open sesame" };
    expect(decodeBasicAuth("Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==")).toEqual(expected);
    expect(decodeBasicAuth("basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==")).toEqual(expected);
    expect(decodeBasicAuth("  QWxhZGRpbjpvcGVuIHNlc2FtZQ==  ")).toEqual(expected);
  });

  it("splits at the first colon", () => {
    expect(decodeBasicAuth(Buffer.from("user:pa:ss").toString("base64"))).toMatchObject({ username: "user", password: "pa:ss" });
  });

  it("rejects bearer tokens, invalid Base64 and values without a colon", () => {
    expect(decodeBasicAuth("Bearer eyJhbGciOi")).toMatchObject({ ok: false, error: expect.stringContaining("Bearer") });
    expect(decodeBasicAuth("Basic ***")).toMatchObject({ ok: false });
    expect(decodeBasicAuth(Buffer.from("nocolon").toString("base64"))).toMatchObject({ ok: false, error: expect.stringContaining("colon") });
    expect(decodeBasicAuth("Basic /w==")).toMatchObject({ ok: false });
  });
});
