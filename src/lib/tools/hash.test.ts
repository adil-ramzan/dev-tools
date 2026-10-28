import { createHash, getHashes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { digest, formatDigest, hashAlgorithms, hashText, type HashAlgorithm } from "@/lib/tools/hash";

const hex = (bytes: Uint8Array) => formatDigest(bytes, "hex");
const utf8 = (text: string) => new TextEncoder().encode(text);

// Published test vectors for "abc".
const ABC: Record<HashAlgorithm, string> = {
  md5: "900150983cd24fb0d6963f7d28e17f72",
  sha1: "a9993e364706816aba3e25717850c26c9cd0d89d",
  sha224: "23097d223405d8228642a477bda255b32aadbce4bda0b3f7e36c9da7",
  sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  sha384: "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7",
  sha512:
    "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
  "sha3-224": "e642824c3f8cf24ad09234ee7d3c766fc9a3a5168d0c94ad73b46fdf",
  "sha3-256": "3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532",
  "sha3-384": "ec01498288516fc926459f58e2c6ad8df9b473cb0fc08c2596da7cf0e49be4b298d88cea927ac7f539f1edf228376d25",
  "sha3-512":
    "b751850b1a57168a5693cd924b6b096e08f621827444f70d884f5d0240d2712e10e116e9192af3c91a7ec57647e3934057340b4cf408d5a56592f8274eec53f0",
  ripemd160: "8eb208f7e05d987a9b044a8e98c6b087f15a0bfc",
};

const nodeNames: Partial<Record<HashAlgorithm, string>> = {
  md5: "md5",
  sha1: "sha1",
  sha224: "sha224",
  sha256: "sha256",
  sha384: "sha384",
  sha512: "sha512",
  "sha3-224": "sha3-224",
  "sha3-256": "sha3-256",
  "sha3-384": "sha3-384",
  "sha3-512": "sha3-512",
  ripemd160: "ripemd160",
};

describe("digest", () => {
  it.each(hashAlgorithms.map((a) => a.id))("matches the published vector for %s", async (id) => {
    expect(hex(await digest(id, utf8("abc")))).toBe(ABC[id]);
  });

  it.each(hashAlgorithms.map((a) => a.id))("gives the same %s digest with and without Web Crypto", async (id) => {
    const bytes = utf8("The quick brown fox jumps over the lazy dog");
    expect(hex(await digest(id, bytes, null))).toBe(hex(await digest(id, bytes)));
  });

  it("hashes the empty string", async () => {
    expect(hex(await digest("md5", utf8("")))).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(hex(await digest("sha256", utf8("")))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("falls back to the library when Web Crypto rejects the algorithm", async () => {
    const failing = { digest: () => Promise.reject(new Error("not supported")) };
    expect(hex(await digest("sha256", utf8("abc"), failing))).toBe(ABC.sha256);
  });

  it("agrees with Node's OpenSSL implementation for Unicode text", async () => {
    const available = new Set(getHashes());
    const text = "Grüße 👋 日本語\nline two\r\n";
    for (const { id } of hashAlgorithms) {
      const name = nodeNames[id];
      if (!name || !available.has(name)) continue;
      expect(hex(await digest(id, utf8(text))), id).toBe(createHash(name).update(text, "utf8").digest("hex"));
    }
  });
});

describe("hashText", () => {
  it("returns digests in the requested order with the UTF-8 byte count", async () => {
    const result = await hashText("é", ["sha256", "md5"]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bytes).toBe(2);
    expect(result.digests.map((d) => d.id)).toEqual(["sha256", "md5"]);
  });

  it("rejects lone surrogates instead of hashing a replacement character", async () => {
    const result = await hashText("ab\uD800c", ["sha256"]);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("position 3") });
  });

  it("requires at least one algorithm", async () => {
    expect((await hashText("abc", [])).ok).toBe(false);
  });

  it("distinguishes line endings, which are part of the input bytes", async () => {
    const lf = await hashText("a\nb", ["sha256"]);
    const crlf = await hashText("a\r\nb", ["sha256"]);
    if (!lf.ok || !crlf.ok) throw new Error("hash failed");
    expect(hex(lf.digests[0].value)).not.toBe(hex(crlf.digests[0].value));
  });
});

describe("formatDigest", () => {
  const bytes = new Uint8Array([0, 15, 171, 255]);
  it("formats lowercase and uppercase hex and Base64", () => {
    expect(formatDigest(bytes, "hex")).toBe("000fabff");
    expect(formatDigest(bytes, "HEX")).toBe("000FABFF");
    expect(formatDigest(bytes, "base64")).toBe("AA+r/w==");
  });
});

describe("hashAlgorithms", () => {
  it("flags only MD5 and SHA-1 as weak", () => {
    expect(hashAlgorithms.filter((a) => a.weak).map((a) => a.id)).toEqual(["md5", "sha1"]);
  });
});
