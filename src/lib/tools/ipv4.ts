/**
 * IPv4 parsing, conversion and subnet arithmetic. Addresses are handled as
 * unsigned 32-bit numbers (0 to 4,294,967,295), which JavaScript numbers
 * represent exactly; `>>> 0` keeps bitwise results unsigned.
 *
 * Dotted-decimal input is strict: four decimal parts from 0 to 255, without
 * leading zeros, because some systems read 010 as octal (8) and others as
 * decimal (10).
 */

export const MAX_IPV4 = 0xffffffff;

export type Ipv4Result = { ok: true; value: number } | { ok: false; error: string };

export function parseIpv4(input: string): Ipv4Result {
  const text = input.trim();
  if (text === "") return { ok: false, error: "Enter an IPv4 address, e.g. 192.168.1.10." };
  const parts = text.split(".");
  if (parts.length !== 4) return { ok: false, error: `An IPv4 address has four parts separated by dots; "${text}" has ${parts.length}.` };
  let value = 0;
  for (let i = 0; i < 4; i++) {
    const part = parts[i];
    if (!/^\d+$/.test(part)) return { ok: false, error: `Part ${i + 1} ("${part}") is not a number from 0 to 255.` };
    if (part.length > 1 && part.startsWith("0")) {
      return { ok: false, error: `Part ${i + 1} ("${part}") has a leading zero, which some systems read as octal. Write it as ${Number(part)}.` };
    }
    const n = Number(part);
    if (n > 255) return { ok: false, error: `Part ${i + 1} (${n}) is larger than 255.` };
    value = value * 256 + n;
  }
  return { ok: true, value };
}

export function formatIpv4(value: number): string {
  return [value >>> 24, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join(".");
}

/** The subnet mask for a prefix length, e.g. 24 → 255.255.255.0 (as a number). */
export function prefixToMask(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

/** The prefix length for a contiguous mask, or null if the mask has gaps (e.g. 255.0.255.0). */
export function maskToPrefix(mask: number): number | null {
  const inverted = ~mask >>> 0;
  if ((inverted & (inverted + 1)) !== 0) return null;
  return 32 - Math.round(Math.log2(inverted + 1));
}

export type CidrResult = { ok: true; address: number; prefix: number } | { ok: false; error: string };

/** Reads "10.0.0.5/24", or an address with a separate prefix ("24", "/24") or mask ("255.255.255.0"). */
export function parseCidr(input: string, prefixInput = ""): CidrResult {
  const text = input.trim();
  const slash = text.indexOf("/");
  const addressText = slash === -1 ? text : text.slice(0, slash);
  const prefixText = slash === -1 ? prefixInput.trim().replace(/^\//, "") : text.slice(slash + 1).trim();
  const address = parseIpv4(addressText);
  if (!address.ok) return address;
  if (prefixText === "") return { ok: false, error: "Enter a prefix length such as /24, or a subnet mask such as 255.255.255.0." };
  if (prefixText.includes(".")) {
    const mask = parseIpv4(prefixText);
    if (!mask.ok) return { ok: false, error: `The subnet mask is not valid: ${mask.error}` };
    const prefix = maskToPrefix(mask.value);
    if (prefix === null) return { ok: false, error: `${prefixText} is not a valid subnet mask: its 1 bits must be contiguous from the left, as in 255.255.255.0.` };
    return { ok: true, address: address.value, prefix };
  }
  if (!/^\d{1,2}$/.test(prefixText) || Number(prefixText) > 32) return { ok: false, error: `"/${prefixText}" is not a valid prefix length. Use a number from 0 to 32.` };
  return { ok: true, address: address.value, prefix: Number(prefixText) };
}

export type AddressType = { label: string; range: string; note?: string };

/** IANA special-purpose ranges (RFC 6890 and updates), most specific first. */
const SPECIAL: { cidr: [number, number]; label: string; range: string; note?: string }[] = [
  { cidr: [0xffffffff, 32], label: "Limited broadcast", range: "255.255.255.255/32" },
  { cidr: [0x00000000, 8], label: "\"This network\"", range: "0.0.0.0/8", note: "Not routable; 0.0.0.0 means \"any address\" or \"unspecified\"." },
  { cidr: [0x0a000000, 8], label: "Private", range: "10.0.0.0/8", note: "RFC 1918 private network; not routed on the internet." },
  { cidr: [0x64400000, 10], label: "Shared address space (CGNAT)", range: "100.64.0.0/10", note: "Used by carriers for carrier-grade NAT (RFC 6598)." },
  { cidr: [0x7f000000, 8], label: "Loopback", range: "127.0.0.0/8", note: "Always refers to this computer." },
  { cidr: [0xa9fe0000, 16], label: "Link-local", range: "169.254.0.0/16", note: "Assigned automatically when no DHCP server answers." },
  { cidr: [0xac100000, 12], label: "Private", range: "172.16.0.0/12", note: "RFC 1918 private network; not routed on the internet." },
  { cidr: [0xc0000000, 24], label: "IETF protocol assignments", range: "192.0.0.0/24" },
  { cidr: [0xc0000200, 24], label: "Documentation (TEST-NET-1)", range: "192.0.2.0/24", note: "Reserved for examples in documentation." },
  { cidr: [0xc0586300, 24], label: "Deprecated 6to4 relay anycast", range: "192.88.99.0/24" },
  { cidr: [0xc0a80000, 16], label: "Private", range: "192.168.0.0/16", note: "RFC 1918 private network; not routed on the internet." },
  { cidr: [0xc6120000, 15], label: "Benchmarking", range: "198.18.0.0/15", note: "Reserved for network device benchmark tests." },
  { cidr: [0xc6336400, 24], label: "Documentation (TEST-NET-2)", range: "198.51.100.0/24", note: "Reserved for examples in documentation." },
  { cidr: [0xcb007100, 24], label: "Documentation (TEST-NET-3)", range: "203.0.113.0/24", note: "Reserved for examples in documentation." },
  { cidr: [0xe0000000, 4], label: "Multicast", range: "224.0.0.0/4", note: "Addresses one-to-many groups, not a single host." },
  { cidr: [0xf0000000, 4], label: "Reserved", range: "240.0.0.0/4", note: "Reserved for future use; not usable on the internet." },
];

export function addressType(value: number): AddressType {
  for (const s of SPECIAL) {
    const mask = prefixToMask(s.cidr[1]);
    if (((value & mask) >>> 0) === s.cidr[0]) return { label: s.label, range: s.range, note: s.note };
  }
  return { label: "Public", range: "", note: "Globally routable on the internet." };
}

/** The historical class (A–E), still seen in documentation. Classful addressing is obsolete. */
export function addressClass(value: number): "A" | "B" | "C" | "D" | "E" {
  const first = value >>> 24;
  if (first < 128) return "A";
  if (first < 192) return "B";
  if (first < 224) return "C";
  if (first < 240) return "D";
  return "E";
}

export type Subnet = {
  address: number;
  prefix: number;
  mask: number;
  wildcard: number;
  network: number;
  broadcast: number;
  /** All addresses in the block. */
  total: number;
  /** Addresses that can be assigned to hosts. */
  usable: number;
  firstUsable: number;
  lastUsable: number;
  /** /31 and /32 have no separate network or broadcast address. */
  special: "point-to-point" | "single-host" | null;
};

export function calculateSubnet(address: number, prefix: number): Subnet {
  const mask = prefixToMask(prefix);
  const wildcard = ~mask >>> 0;
  const network = (address & mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const total = 2 ** (32 - prefix);
  if (prefix === 32) {
    return { address, prefix, mask, wildcard, network, broadcast, total, usable: 1, firstUsable: network, lastUsable: network, special: "single-host" };
  }
  if (prefix === 31) {
    // RFC 3021: both addresses of a /31 are usable on point-to-point links.
    return { address, prefix, mask, wildcard, network, broadcast, total, usable: 2, firstUsable: network, lastUsable: broadcast, special: "point-to-point" };
  }
  return { address, prefix, mask, wildcard, network, broadcast, total, usable: total - 2, firstUsable: network + 1, lastUsable: broadcast - 1, special: null };
}

export function toBinary(value: number, dotted = true): string {
  const bits = value.toString(2).padStart(32, "0");
  return dotted ? bits.match(/.{8}/g)!.join(".") : bits;
}

export function toHex(value: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;
}

export type Representation = "dotted" | "integer" | "hex" | "binary";

export type ConvertResult = { ok: true; value: number; detected: Representation } | { ok: false; error: string };

/**
 * Reads an IPv4 address written as dotted decimal, an unsigned integer
 * (0–4294967295), hexadecimal (0xC0A80001) or 32 binary digits (optionally
 * grouped with dots or spaces). The form is detected from the input; pass
 * `as` to require one.
 */
export function parseAnyIpv4(input: string, as: Representation | "auto" = "auto"): ConvertResult {
  const text = input.trim();
  if (text === "") return { ok: false, error: "Enter an IPv4 address in any form, e.g. 192.168.1.1, 3232235777, 0xC0A80101 or 11000000.10101000.00000001.00000001." };
  const binaryLike = /^[01]{8}([.\s][01]{8}){3}$/.test(text) || /^[01]{32}$/.test(text);
  const kind: Representation =
    as !== "auto" ? as : binaryLike ? "binary" : /^0x/i.test(text) ? "hex" : text.includes(".") ? "dotted" : /^\d+$/.test(text) ? "integer" : /^[0-9a-f]+$/i.test(text) ? "hex" : "dotted";

  if (kind === "dotted") {
    const r = parseIpv4(text);
    return r.ok ? { ok: true, value: r.value, detected: "dotted" } : r;
  }
  if (kind === "binary") {
    const bits = text.replace(/[.\s]/g, "");
    if (!/^[01]+$/.test(bits)) return { ok: false, error: "Binary input may contain only 0 and 1, optionally grouped in bytes with dots or spaces." };
    if (bits.length !== 32) return { ok: false, error: `An IPv4 address is 32 bits; this has ${bits.length}.` };
    return { ok: true, value: parseInt(bits, 2), detected: "binary" };
  }
  if (kind === "hex") {
    const digits = text.replace(/^0x/i, "");
    if (!/^[0-9a-f]+$/i.test(digits)) return { ok: false, error: "Hexadecimal input may contain only 0–9 and A–F, optionally after 0x." };
    if (digits.replace(/^0+(?=.)/, "").length > 8) return { ok: false, error: "The hexadecimal value is larger than FFFFFFFF, the largest IPv4 address." };
    return { ok: true, value: parseInt(digits, 16), detected: "hex" };
  }
  if (!/^\d+$/.test(text)) return { ok: false, error: "An integer address may contain only digits." };
  if (text.length > 1 && text.startsWith("0")) return { ok: false, error: "Remove the leading zeros from the integer." };
  const n = Number(text);
  if (text.length > 10 || n > MAX_IPV4) return { ok: false, error: `The integer is larger than ${MAX_IPV4.toLocaleString("en-US")} (255.255.255.255).` };
  return { ok: true, value: n, detected: "integer" };
}

export type RangeResult = { ok: true; start: number; end: number; source: "cidr" | "range" } | { ok: false; error: string };

/** Reads "10.0.0.0/24" or "10.0.0.1 - 10.0.0.20" (also with "to" or a comma). */
export function parseRange(input: string): RangeResult {
  const text = input.trim();
  if (text === "") return { ok: false, error: "Enter a CIDR block such as 192.168.1.0/28, or a range such as 192.168.1.10 - 192.168.1.20." };
  if (text.includes("/")) {
    const cidr = parseCidr(text);
    if (!cidr.ok) return cidr;
    const s = calculateSubnet(cidr.address, cidr.prefix);
    return { ok: true, start: s.network, end: s.broadcast, source: "cidr" };
  }
  const parts = text.split(/\s*(?:-|–|\bto\b|,)\s*/i).filter(Boolean);
  if (parts.length !== 2) return { ok: false, error: "Write a range as two addresses separated by a dash, e.g. 10.0.0.1 - 10.0.0.50, or use CIDR notation." };
  const start = parseIpv4(parts[0]);
  if (!start.ok) return { ok: false, error: `Start address: ${start.error}` };
  const end = parseIpv4(parts[1]);
  if (!end.ok) return { ok: false, error: `End address: ${end.error}` };
  if (end.value < start.value) return { ok: false, error: `The end address ${formatIpv4(end.value)} comes before the start address ${formatIpv4(start.value)}.` };
  return { ok: true, start: start.value, end: end.value, source: "range" };
}

export const DEFAULT_EXPAND_LIMIT = 1024;
export const MAX_EXPAND_LIMIT = 65_536;

export type Expansion = { addresses: string[]; count: number; truncated: boolean };

/**
 * Lists the addresses from `start` to `end`, at most `limit` of them, so a
 * /8 (16.7 million addresses) cannot exhaust memory. `count` is the full size.
 */
export function expandRange(start: number, end: number, limit: number): Expansion {
  const count = end - start + 1;
  const take = Math.min(count, Math.max(0, Math.min(limit, MAX_EXPAND_LIMIT)));
  const addresses = new Array<string>(take);
  for (let i = 0; i < take; i++) addresses[i] = formatIpv4(start + i);
  return { addresses, count, truncated: take < count };
}
