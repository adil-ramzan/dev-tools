import { describe, expect, it } from "vitest";
import {
  MAX_EXPAND_LIMIT,
  addressClass,
  addressType,
  calculateSubnet,
  expandRange,
  formatIpv4,
  maskToPrefix,
  parseAnyIpv4,
  parseCidr,
  parseIpv4,
  parseRange,
  prefixToMask,
  toBinary,
  toHex,
} from "@/lib/tools/ipv4";

const ip = (s: string) => {
  const r = parseIpv4(s);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

describe("parseIpv4 and formatIpv4", () => {
  it("round-trips addresses across the whole range", () => {
    for (const a of ["0.0.0.0", "1.2.3.4", "10.0.0.1", "192.168.1.255", "255.255.255.255"]) expect(formatIpv4(ip(a))).toBe(a);
    expect(ip("255.255.255.255")).toBe(4294967295);
    expect(ip("192.168.1.1")).toBe(3232235777);
  });

  it("rejects malformed addresses with specific messages", () => {
    expect(parseIpv4("")).toMatchObject({ ok: false });
    expect(parseIpv4("1.2.3")).toMatchObject({ error: expect.stringContaining("has 3") });
    expect(parseIpv4("1.2.3.4.5")).toMatchObject({ ok: false });
    expect(parseIpv4("256.1.1.1")).toMatchObject({ error: expect.stringContaining("larger than 255") });
    expect(parseIpv4("1.2.3.-4")).toMatchObject({ ok: false });
    expect(parseIpv4("1.2.3.4a")).toMatchObject({ ok: false });
    expect(parseIpv4("1..3.4")).toMatchObject({ ok: false });
    expect(parseIpv4("010.0.0.1")).toMatchObject({ error: expect.stringContaining("octal") });
    expect(parseIpv4("1.2.3.4 ")).toMatchObject({ ok: true });
    expect(parseIpv4("１.２.３.４")).toMatchObject({ ok: false });
  });
});

describe("masks and prefixes", () => {
  it("converts every prefix to a mask and back", () => {
    for (let p = 0; p <= 32; p++) expect(maskToPrefix(prefixToMask(p))).toBe(p);
    expect(formatIpv4(prefixToMask(24))).toBe("255.255.255.0");
    expect(formatIpv4(prefixToMask(0))).toBe("0.0.0.0");
    expect(formatIpv4(prefixToMask(32))).toBe("255.255.255.255");
  });

  it("rejects masks with gaps", () => {
    expect(maskToPrefix(ip("255.0.255.0"))).toBeNull();
    expect(maskToPrefix(ip("0.255.255.255"))).toBeNull();
  });

  it("reads CIDR notation, separate prefixes and masks", () => {
    expect(parseCidr("10.1.2.3/8")).toEqual({ ok: true, address: ip("10.1.2.3"), prefix: 8 });
    expect(parseCidr("10.1.2.3", "/16")).toMatchObject({ prefix: 16 });
    expect(parseCidr("10.1.2.3", "255.255.255.192")).toMatchObject({ prefix: 26 });
    expect(parseCidr("10.1.2.3/33")).toMatchObject({ ok: false });
    expect(parseCidr("10.1.2.3/-1")).toMatchObject({ ok: false });
    expect(parseCidr("10.1.2.3")).toMatchObject({ ok: false, error: expect.stringContaining("prefix") });
    expect(parseCidr("10.1.2.3", "255.0.255.0")).toMatchObject({ error: expect.stringContaining("contiguous") });
  });
});

describe("calculateSubnet", () => {
  it("calculates a /24", () => {
    const s = calculateSubnet(ip("192.168.1.130"), 24);
    expect([s.network, s.broadcast, s.firstUsable, s.lastUsable].map(formatIpv4)).toEqual(["192.168.1.0", "192.168.1.255", "192.168.1.1", "192.168.1.254"]);
    expect(formatIpv4(s.mask)).toBe("255.255.255.0");
    expect(formatIpv4(s.wildcard)).toBe("0.0.0.255");
    expect([s.total, s.usable, s.special]).toEqual([256, 254, null]);
  });

  it("handles a /30, /31 and /32", () => {
    const s30 = calculateSubnet(ip("10.0.0.5"), 30);
    expect([s30.network, s30.firstUsable, s30.lastUsable, s30.broadcast].map(formatIpv4)).toEqual(["10.0.0.4", "10.0.0.5", "10.0.0.6", "10.0.0.7"]);
    expect(s30.usable).toBe(2);
    const s31 = calculateSubnet(ip("10.0.0.5"), 31);
    expect([s31.firstUsable, s31.lastUsable].map(formatIpv4)).toEqual(["10.0.0.4", "10.0.0.5"]);
    expect([s31.total, s31.usable, s31.special]).toEqual([2, 2, "point-to-point"]);
    const s32 = calculateSubnet(ip("10.0.0.5"), 32);
    expect([s32.network, s32.broadcast, s32.firstUsable].map(formatIpv4)).toEqual(["10.0.0.5", "10.0.0.5", "10.0.0.5"]);
    expect([s32.total, s32.usable, s32.special]).toEqual([1, 1, "single-host"]);
  });

  it("handles /0 and the top of the address space without overflow", () => {
    const s0 = calculateSubnet(ip("8.8.8.8"), 0);
    expect([s0.network, s0.broadcast].map(formatIpv4)).toEqual(["0.0.0.0", "255.255.255.255"]);
    expect([s0.total, s0.usable]).toEqual([4294967296, 4294967294]);
    const top = calculateSubnet(ip("255.255.255.200"), 25);
    expect([top.network, top.broadcast, top.lastUsable].map(formatIpv4)).toEqual(["255.255.255.128", "255.255.255.255", "255.255.255.254"]);
  });
});

describe("address types and classes", () => {
  it("identifies special-purpose ranges", () => {
    expect(addressType(ip("10.5.5.5")).label).toBe("Private");
    expect(addressType(ip("172.31.255.255")).label).toBe("Private");
    expect(addressType(ip("172.32.0.0")).label).toBe("Public");
    expect(addressType(ip("192.168.0.1")).label).toBe("Private");
    expect(addressType(ip("100.64.0.1")).label).toMatch(/CGNAT/);
    expect(addressType(ip("127.0.0.1")).label).toBe("Loopback");
    expect(addressType(ip("169.254.1.1")).label).toBe("Link-local");
    expect(addressType(ip("192.0.2.1")).label).toMatch(/Documentation/);
    expect(addressType(ip("224.0.0.251")).label).toBe("Multicast");
    expect(addressType(ip("255.255.255.255")).label).toBe("Limited broadcast");
    expect(addressType(ip("240.0.0.1")).label).toBe("Reserved");
    expect(addressType(ip("8.8.8.8")).label).toBe("Public");
  });

  it("reports historical classes", () => {
    expect(["1.0.0.0", "128.0.0.0", "192.0.0.0", "224.0.0.0", "240.0.0.0"].map((a) => addressClass(ip(a)))).toEqual(["A", "B", "C", "D", "E"]);
  });
});

describe("conversion", () => {
  it("formats binary and hexadecimal", () => {
    expect(toBinary(ip("192.168.1.1"))).toBe("11000000.10101000.00000001.00000001");
    expect(toBinary(ip("0.0.0.1"), false)).toBe("0".repeat(31) + "1");
    expect(toHex(ip("192.168.1.1"))).toBe("0xC0A80101");
    expect(toHex(0)).toBe("0x00000000");
  });

  it("detects and reads every representation", () => {
    expect(parseAnyIpv4("192.168.1.1")).toEqual({ ok: true, value: 3232235777, detected: "dotted" });
    expect(parseAnyIpv4("3232235777")).toEqual({ ok: true, value: 3232235777, detected: "integer" });
    expect(parseAnyIpv4("0xc0a80101")).toEqual({ ok: true, value: 3232235777, detected: "hex" });
    expect(parseAnyIpv4("C0A80101")).toEqual({ ok: true, value: 3232235777, detected: "hex" });
    expect(parseAnyIpv4("11000000.10101000.00000001.00000001")).toEqual({ ok: true, value: 3232235777, detected: "binary" });
    expect(parseAnyIpv4("11000000 10101000 00000001 00000001")).toMatchObject({ value: 3232235777 });
    expect(parseAnyIpv4("0")).toMatchObject({ value: 0, detected: "integer" });
    expect(parseAnyIpv4("4294967295")).toMatchObject({ value: 4294967295 });
  });

  it("rejects out-of-range and malformed values", () => {
    expect(parseAnyIpv4("4294967296")).toMatchObject({ ok: false, error: expect.stringContaining("larger") });
    expect(parseAnyIpv4("99999999999")).toMatchObject({ ok: false });
    expect(parseAnyIpv4("0x1FFFFFFFF")).toMatchObject({ ok: false });
    expect(parseAnyIpv4("0x00000000FF")).toMatchObject({ ok: true, value: 255 });
    expect(parseAnyIpv4("0xGG")).toMatchObject({ ok: false });
    expect(parseAnyIpv4("0101", "binary")).toMatchObject({ ok: false, error: expect.stringContaining("32 bits") });
    expect(parseAnyIpv4("0042")).toMatchObject({ ok: false });
    expect(parseAnyIpv4("-1")).toMatchObject({ ok: false });
    expect(parseAnyIpv4("1.2.3.4.5")).toMatchObject({ ok: false });
    expect(parseAnyIpv4("")).toMatchObject({ ok: false });
  });
});

describe("ranges", () => {
  it("reads CIDR blocks and start–end ranges", () => {
    expect(parseRange("192.168.1.0/30")).toEqual({ ok: true, start: ip("192.168.1.0"), end: ip("192.168.1.3"), source: "cidr" });
    expect(parseRange("10.0.0.250 - 10.0.1.5")).toMatchObject({ start: ip("10.0.0.250"), end: ip("10.0.1.5") });
    expect(parseRange("10.0.0.1 to 10.0.0.1")).toMatchObject({ ok: true });
    expect(parseRange("10.0.0.1,10.0.0.3")).toMatchObject({ ok: true });
  });

  it("rejects reversed and malformed ranges", () => {
    expect(parseRange("10.0.0.9 - 10.0.0.1")).toMatchObject({ ok: false, error: expect.stringContaining("before") });
    expect(parseRange("10.0.0.1 - 10.0.0")).toMatchObject({ ok: false, error: expect.stringContaining("End address") });
    expect(parseRange("10.0.0.1")).toMatchObject({ ok: false });
    expect(parseRange("10.0.0.0/40")).toMatchObject({ ok: false });
  });

  it("expands ranges across octet boundaries", () => {
    expect(expandRange(ip("10.0.0.254"), ip("10.0.1.1"), 100)).toEqual({ addresses: ["10.0.0.254", "10.0.0.255", "10.0.1.0", "10.0.1.1"], count: 4, truncated: false });
  });

  it("caps the output and reports truncation without allocating the full range", () => {
    const r = parseRange("10.0.0.0/8");
    if (!r.ok) throw new Error(r.error);
    const start = performance.now();
    const e = expandRange(r.start, r.end, 1024);
    expect(performance.now() - start).toBeLessThan(200);
    expect([e.addresses.length, e.count, e.truncated]).toEqual([1024, 16777216, true]);
    expect(e.addresses.at(-1)).toBe("10.0.3.255");
    expect(expandRange(0, 0xffffffff, 10_000_000).addresses).toHaveLength(MAX_EXPAND_LIMIT);
    expect(expandRange(5, 5, 1)).toMatchObject({ count: 1, truncated: false });
  });
});
