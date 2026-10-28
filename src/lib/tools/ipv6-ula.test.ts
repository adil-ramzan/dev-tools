import { describe, expect, it } from "vitest";
import { expandIpv6, formatIpv6, parseGlobalId, parseSubnetId, randomGlobalId, ulaGroups, ulaPlan } from "@/lib/tools/ipv6-ula";

const id = (hex: string) => {
  const r = parseGlobalId(hex);
  if (!r.ok) throw new Error(r.error);
  return r.globalId;
};

describe("formatIpv6 (RFC 5952)", () => {
  it("compresses the longest zero run and drops leading zeros", () => {
    expect(formatIpv6([0x2001, 0xdb8, 0, 0, 0, 0, 0, 1])).toBe("2001:db8::1");
    expect(formatIpv6([0, 0, 0, 0, 0, 0, 0, 0])).toBe("::");
    expect(formatIpv6([0, 0, 0, 0, 0, 0, 0, 1])).toBe("::1");
    expect(formatIpv6([0xfd12, 0x3456, 0x789a, 0, 0, 0, 0, 0])).toBe("fd12:3456:789a::");
  });

  it("does not compress a single zero group and picks the first of equal runs", () => {
    expect(formatIpv6([0x2001, 0xdb8, 0, 1, 1, 1, 1, 1])).toBe("2001:db8:0:1:1:1:1:1");
    expect(formatIpv6([0x2001, 0, 0, 1, 0, 0, 1, 1])).toBe("2001::1:0:0:1:1");
    expect(formatIpv6([1, 0, 0, 1, 0, 0, 0, 1])).toBe("1:0:0:1::1");
  });

  it("writes the expanded form", () => {
    expect(expandIpv6([0xfd00, 1, 0, 0, 0, 0, 0, 0])).toBe("fd00:0001:0000:0000:0000:0000:0000:0000");
  });
});

describe("randomGlobalId", () => {
  it("draws 40 bits from the secure generator", () => {
    const calls: number[] = [];
    const result = randomGlobalId({
      getRandomValues: <T extends ArrayBufferView | null>(array: T) => {
        const bytes = array as unknown as Uint8Array;
        calls.push(bytes.length);
        bytes.set([0xab, 0xcd, 0xef, 0x01, 0x23]);
        return array;
      },
    } as Pick<Crypto, "getRandomValues">);
    expect(calls).toEqual([5]);
    expect(result.ok && ulaPlan(result.globalId).prefix).toBe("fdab:cdef:123::/48");
  });

  it("uses the real Web Crypto generator and gives different prefixes", () => {
    const a = randomGlobalId();
    const b = randomGlobalId();
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(Buffer.from(a.globalId).equals(Buffer.from(b.globalId))).toBe(false);
  });

  it("fails safely without a generator or when it throws", () => {
    expect(randomGlobalId(null)).toMatchObject({ ok: false, error: expect.stringContaining("getRandomValues") });
    const broken = { getRandomValues: () => { throw new Error("boom"); } } as unknown as Pick<Crypto, "getRandomValues">;
    expect(randomGlobalId(broken)).toMatchObject({ ok: false, error: expect.stringContaining("boom") });
  });
});

describe("ulaPlan", () => {
  it("builds the /48, subnets and an example address", () => {
    const plan = ulaPlan(id("3c4d5e6f70"), 3);
    expect(plan.prefix).toBe("fd3c:4d5e:6f70::/48");
    expect(plan.globalId).toBe("3c4d5e6f70");
    expect(plan.expanded).toBe("fd3c:4d5e:6f70:0000:0000:0000:0000:0000/48");
    expect(plan.subnets).toEqual([
      { id: "0000", prefix: "fd3c:4d5e:6f70::/64" },
      { id: "0001", prefix: "fd3c:4d5e:6f70:1::/64" },
      { id: "0002", prefix: "fd3c:4d5e:6f70:2::/64" },
    ]);
    expect(plan.example).toBe("fd3c:4d5e:6f70::1");
  });

  it("starts at a chosen subnet and stops at ffff", () => {
    const plan = ulaPlan(id("0000010000"), 10, 0xfffe);
    expect(plan.prefix).toBe("fd00:1::/48");
    expect(plan.subnets.map((s) => s.prefix)).toEqual(["fd00:1:0:fffe::/64", "fd00:1:0:ffff::/64"]);
    expect(plan.example).toBe("fd00:1:0:fffe::1");
  });

  it("always starts with fd (fc00::/7 with the L bit set)", () => {
    for (let i = 0; i < 50; i++) {
      const r = randomGlobalId();
      if (!r.ok) throw new Error(r.error);
      expect(ulaGroups(r.globalId)[0] >> 8).toBe(0xfd);
      expect(ulaPlan(r.globalId).prefix).toMatch(/^fd[0-9a-f]{2}:[0-9a-f]{1,4}:[0-9a-f]{1,4}::\/48$|^fd[0-9a-f]{2}:[0-9a-f:]+\/48$/);
    }
  });
});

describe("parsing", () => {
  it("reads Global IDs and subnet IDs", () => {
    expect(parseGlobalId("3c:4d:5e:6f:70")).toMatchObject({ ok: true });
    expect(parseGlobalId("3c4d5e6f7")).toMatchObject({ ok: false });
    expect(parseGlobalId("3c4d5e6f7g")).toMatchObject({ ok: false });
    expect(parseSubnetId("ff")).toEqual({ ok: true, value: 255 });
    expect(parseSubnetId("0x10")).toEqual({ ok: true, value: 16 });
    expect(parseSubnetId("10000")).toMatchObject({ ok: false });
    expect(parseSubnetId("")).toMatchObject({ ok: false });
  });
});
