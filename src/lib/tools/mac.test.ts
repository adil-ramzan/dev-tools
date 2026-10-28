import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { buildVendorDb, formatMac, loadVendorDb, lookupLines, lookupVendor, macBits, parseMac, type VendorDb } from "@/lib/tools/mac";

let db: VendorDb;
beforeAll(async () => {
  db = await loadVendorDb();
});

const hex = (s: string) => {
  const r = parseMac(s);
  if (!r.ok) throw new Error(r.error);
  return r.hex;
};

describe("parseMac", () => {
  it("reads every common notation", () => {
    for (const s of ["00:1A:2B:3C:4D:5E", "00-1a-2b-3c-4d-5e", "001a.2b3c.4d5e", "001A2B3C4D5E", "00 1A 2B 3C 4D 5E", "0:1a:2b:3c:4d:5e"]) {
      expect(hex(s), s).toBe("001A2B3C4D5E");
    }
  });

  it("accepts a bare OUI", () => {
    expect(parseMac("00:1A:2B")).toEqual({ ok: true, hex: "001A2B", complete: false });
  });

  it("rejects malformed input with specific messages", () => {
    expect(parseMac("")).toMatchObject({ ok: false });
    expect(parseMac("00:1A:2B:3C:4D:5G")).toMatchObject({ error: expect.stringContaining('"G"') });
    expect(parseMac("00:1A:2B:3C:4D")).toMatchObject({ error: expect.stringContaining("has 10") });
    expect(parseMac("00:1A:2B:3C:4D:5E:6F")).toMatchObject({ ok: false });
    expect(parseMac("001:A2B:3C4:D5E")).toMatchObject({ error: expect.stringContaining("unexpected lengths") });
  });
});

describe("formatMac", () => {
  it("writes each notation", () => {
    expect(formatMac("001A2B3C4D5E", "colon")).toBe("00:1A:2B:3C:4D:5E");
    expect(formatMac("001A2B3C4D5E", "hyphen", true)).toBe("00-1a-2b-3c-4d-5e");
    expect(formatMac("001A2B3C4D5E", "dot")).toBe("001a.2b3c.4d5e");
    expect(formatMac("001A2B3C4D5E", "bare")).toBe("001A2B3C4D5E");
  });
});

describe("macBits", () => {
  it("reads the multicast and locally administered bits", () => {
    expect(macBits("001A2B3C4D5E")).toMatchObject({ multicast: false, local: false, special: null });
    expect(macBits("02005E000001")).toMatchObject({ local: true, multicast: false });
    expect(macBits("DAA119000000")).toMatchObject({ local: true });
    expect(macBits("01005E000001")).toMatchObject({ multicast: true, special: expect.stringContaining("IPv4 multicast") });
    expect(macBits("333300000001").special).toMatch(/IPv6 multicast/);
    expect(macBits("FFFFFFFFFFFF").special).toMatch(/Broadcast/);
  });
});

describe("vendor lookup with the bundled IEEE data", () => {
  it("contains all three registries", () => {
    const lengths = new Set([...db.prefixes.keys()].map((k) => k.length));
    expect([...lengths].sort()).toEqual([6, 7, 9]);
    expect(db.prefixes.size).toBeGreaterThan(50_000);
    expect(db.license).toMatch(/Redistribution and use/);
    expect(db.package).toMatch(/^oui-data@/);
  });

  it("matches the data in the source package exactly", () => {
    const source = JSON.parse(readFileSync("node_modules/oui-data/index.json", "utf8")) as Record<string, string>;
    const keys = Object.keys(source);
    expect(db.prefixes.size).toBe(keys.length);
    for (const key of [keys[0], keys[Math.floor(keys.length / 2)], keys[keys.length - 1], "000000"]) {
      const expected = source[key].split("\n")[0].trim();
      const vendor = lookupVendor(key.padEnd(12, "0"), db);
      expect(vendor?.name, key).toBe(expected);
    }
  });

  it("finds well-known MA-L assignments", () => {
    expect(lookupVendor("000000123456", db)).toMatchObject({ name: "XEROX CORPORATION", registry: "MA-L", prefix: "000000" });
  });

  it("prefers the longest prefix for MA-M and MA-S blocks", () => {
    const maS = [...db.prefixes.keys()].find((k) => k.length === 9)!;
    const vendor = lookupVendor(maS + "123", db);
    expect(vendor).toMatchObject({ registry: "MA-S", prefix: maS });
    const maM = [...db.prefixes.keys()].find((k) => k.length === 7)!;
    expect(lookupVendor(maM + "12345", db)).toMatchObject({ registry: "MA-M", prefix: maM });
  });

  it("builds a database from the compact file format", () => {
    const small = buildVendorDb({ names: ["Acme\tUS", "Beta\t"], entries: "ABCDEF:0|ABCDEF1:1", source: "", package: "", generated: "", license: "" });
    expect(lookupVendor("ABCDEF100000", small)).toEqual({ name: "Beta", country: "", prefix: "ABCDEF1", registry: "MA-M" });
    expect(lookupVendor("ABCDEF200000", small)).toEqual({ name: "Acme", country: "US", prefix: "ABCDEF", registry: "MA-L" });
  });
});

describe("lookupLines", () => {
  it("looks up several addresses and explains the ones without a vendor", () => {
    const rows = lookupLines("00:00:00:12:34:56\n\nda:a1:19:00:00:01\nnot a mac\nFF:FF:FF:FF:FF:FF", db);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ ok: true, vendor: { name: "XEROX CORPORATION" } });
    expect(rows[1]).toMatchObject({ ok: true, vendor: null, note: expect.stringContaining("Locally administered") });
    expect(rows[2]).toMatchObject({ ok: false });
    expect(rows[3]).toMatchObject({ ok: true, note: expect.stringContaining("Broadcast") });
  });

  it("never invents a vendor for unknown prefixes", () => {
    const unknown = [...Array(4096).keys()].map((i) => (0x0c0000 + i * 4).toString(16).toUpperCase().padStart(6, "0")).find((p) => !db.prefixes.has(p) && !(parseInt(p.slice(0, 2), 16) & 3));
    const [row] = lookupLines(`${unknown}000000`, db);
    expect(row).toMatchObject({ ok: true, vendor: null, note: expect.stringContaining("not in the IEEE registry") });
  });
});
