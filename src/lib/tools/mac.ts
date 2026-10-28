/**
 * MAC address parsing, formatting and vendor lookup.
 *
 * Vendors come from the IEEE Registration Authority's public registries:
 * MA-L (24-bit prefixes), MA-M (28-bit) and MA-S (36-bit), matched by the
 * longest prefix. The data is bundled (src/data/oui-vendors.json, generated
 * from the oui-data package by `npm run data:oui`) and loaded only on this
 * tool's page; nothing is looked up online.
 *
 * The vendor is who the prefix was assigned to, not necessarily who made the
 * device, and locally administered addresses (such as the random addresses
 * phones use for Wi-Fi privacy) have no vendor at all.
 */

export type MacFormat = "colon" | "hyphen" | "dot" | "bare";

export const MAC_FORMATS: { value: MacFormat; label: string; example: string }[] = [
  { value: "colon", label: "Colons", example: "00:1A:2B:3C:4D:5E" },
  { value: "hyphen", label: "Hyphens", example: "00-1A-2B-3C-4D-5E" },
  { value: "dot", label: "Cisco dots", example: "001a.2b3c.4d5e" },
  { value: "bare", label: "No separators", example: "001A2B3C4D5E" },
];

export type ParsedMac =
  | { ok: true; hex: string; complete: boolean }
  | { ok: false; error: string };

/**
 * Reads a full MAC address (12 hex digits) or just its OUI (6 hex digits),
 * written with colons, hyphens, dots, spaces or no separators.
 */
export function parseMac(input: string): ParsedMac {
  const text = input.trim();
  if (text === "") return { ok: false, error: "Enter a MAC address, e.g. 00:1A:2B:3C:4D:5E." };
  if (/[^0-9a-f:.\-\s]/i.test(text)) {
    const bad = /[^0-9a-f:.\-\s]/i.exec(text)![0];
    return { ok: false, error: `"${bad}" is not a hexadecimal digit or separator. MAC addresses use 0–9 and A–F.` };
  }
  const groups = text.split(/[:.\-\s]+/).filter(Boolean);
  const hex = groups.join("").toUpperCase();
  if (groups.length > 1) {
    const sizes = new Set(groups.map((g) => g.length));
    const valid = (sizes.size === 1 && (sizes.has(2) || sizes.has(4))) || groups.every((g) => g.length === 1 || g.length === 2);
    if (!valid) return { ok: false, error: "The groups have unexpected lengths. Write pairs (00:1A:2B…) or groups of four (001a.2b3c.4d5e)." };
    // Pad single digits in forms like 0:1a:2b:3c:4d:5e.
    if (groups.some((g) => g.length === 1) && groups.length === 6) {
      return finish(groups.map((g) => g.padStart(2, "0")).join("").toUpperCase());
    }
  }
  return finish(hex);
}

function finish(hex: string): ParsedMac {
  if (hex.length === 12) return { ok: true, hex, complete: true };
  if (hex.length === 6) return { ok: true, hex, complete: false };
  return { ok: false, error: `A MAC address has 12 hexadecimal digits (or 6 for just the vendor prefix); this has ${hex.length}.` };
}

export function formatMac(hex: string, format: MacFormat, lowercase = false): string {
  const h = lowercase ? hex.toLowerCase() : hex.toUpperCase();
  if (format === "bare") return h;
  if (format === "dot") return (h.match(/.{1,4}/g) ?? []).join(".").toLowerCase();
  return (h.match(/.{2}/g) ?? []).join(format === "colon" ? ":" : "-");
}

export type MacBits = {
  multicast: boolean;
  local: boolean;
  /** A well-known special address, if any. */
  special: string | null;
};

export function macBits(hex: string): MacBits {
  const first = parseInt(hex.slice(0, 2), 16);
  let special: string | null = null;
  if (hex === "FFFFFFFFFFFF") special = "Broadcast address: every device on the local network";
  else if (hex === "000000000000") special = "All zeros: not a valid device address";
  else if (hex.startsWith("01005E")) special = "IPv4 multicast (01:00:5E prefix)";
  else if (hex.startsWith("3333")) special = "IPv6 multicast (33:33 prefix)";
  else if (hex.startsWith("0180C2")) special = "IEEE 802.1 protocol address, e.g. spanning tree or LLDP";
  else if (hex.startsWith("00005E00")) special = "IANA virtual router address (VRRP or similar)";
  return { multicast: (first & 1) === 1, local: (first & 2) === 2, special };
}

export type VendorDb = { prefixes: Map<string, number>; names: string[]; source: string; package: string; generated: string; license: string };

type VendorFile = { names: string[]; entries: string; source: string; package: string; generated: string; license: string };

export function buildVendorDb(file: VendorFile): VendorDb {
  const prefixes = new Map<string, number>();
  for (const entry of file.entries.split("|")) {
    const colon = entry.indexOf(":");
    prefixes.set(entry.slice(0, colon), parseInt(entry.slice(colon + 1), 36));
  }
  return { prefixes, names: file.names, source: file.source, package: file.package, generated: file.generated, license: file.license };
}

let loading: Promise<VendorDb> | null = null;

/** Loads the bundled vendor data (about 600 KB compressed) once. */
export function loadVendorDb(): Promise<VendorDb> {
  loading ??= import("@/data/oui-vendors.json")
    .then((m) => buildVendorDb((m.default ?? m) as VendorFile))
    .catch((error) => {
      loading = null;
      throw error;
    });
  return loading;
}

export type Registry = "MA-L" | "MA-M" | "MA-S";

export type Vendor = { name: string; country: string; prefix: string; registry: Registry };

/** Longest-prefix match: MA-S (9 digits), then MA-M (7), then MA-L (6). */
export function lookupVendor(hex: string, db: VendorDb): Vendor | null {
  for (const [length, registry] of [[9, "MA-S"], [7, "MA-M"], [6, "MA-L"]] as const) {
    if (hex.length < length) continue;
    const prefix = hex.slice(0, length);
    const index = db.prefixes.get(prefix);
    if (index !== undefined) {
      const [name, country = ""] = db.names[index].split("\t");
      return { name, country, prefix, registry };
    }
  }
  return null;
}

export type LookupRow =
  | { ok: true; input: string; hex: string; complete: boolean; bits: MacBits; vendor: Vendor | null; note: string | null }
  | { ok: false; input: string; error: string };

export const MAX_LINES = 1000;

export function lookupLines(input: string, db: VendorDb): LookupRow[] {
  return input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_LINES)
    .map((line) => {
      const parsed = parseMac(line);
      if (!parsed.ok) return { ok: false, input: line, error: parsed.error };
      const bits = macBits(parsed.hex);
      let note: string | null = null;
      let vendor: Vendor | null = null;
      if (bits.special) note = bits.special;
      if (bits.local) {
        note ??= "Locally administered: set by software, not by a manufacturer (for example a random Wi-Fi address on a phone), so it has no vendor.";
      } else {
        vendor = lookupVendor(parsed.hex, db);
        if (!vendor && !bits.special) note = "This prefix is not in the IEEE registry: it may be unassigned or assigned after the data was updated.";
        if (vendor?.name === "IEEE Registration Authority" && vendor.registry === "MA-L") {
          note = "This prefix is divided into smaller MA-M or MA-S blocks; the block for this address is not listed.";
        }
      }
      return { ok: true, input: line, hex: parsed.hex, complete: parsed.complete, bits, vendor, note };
    });
}
