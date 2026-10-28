/**
 * IPv6 Unique Local Address (ULA) prefixes, RFC 4193.
 *
 * A ULA prefix is fd00::/8 followed by a 40-bit Global ID chosen at random,
 * giving a /48 for one site. The next 16 bits number up to 65,536 /64
 * subnets, and the last 64 bits identify interfaces within a subnet.
 *
 * RFC 4193 section 3.2.2 suggests deriving the Global ID from a SHA-1 hash of
 * the time and a hardware address, but allows any method that produces
 * sufficiently random results. Here the 40 bits come straight from
 * crypto.getRandomValues; Math.random is never used.
 */

type RandomSource = Pick<Crypto, "getRandomValues">;

export const MAX_SUBNETS = 256;
export const SUBNET_COUNT = 65536;

function defaultSource(): RandomSource | null {
  const source = globalThis.crypto;
  return source && typeof source.getRandomValues === "function" ? source : null;
}

export type GlobalIdResult = { ok: true; globalId: Uint8Array } | { ok: false; error: string };

/** Draws a 40-bit (5-byte) Global ID. */
export function randomGlobalId(source: RandomSource | null = defaultSource()): GlobalIdResult {
  if (!source) {
    return { ok: false, error: "This browser does not provide a secure random number generator (crypto.getRandomValues), so a prefix cannot be generated safely." };
  }
  try {
    const globalId = new Uint8Array(5);
    source.getRandomValues(globalId);
    return { ok: true, globalId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `The secure random number generator failed: ${message}` };
  }
}

/**
 * Writes eight 16-bit groups in the RFC 5952 canonical form: lowercase hex,
 * no leading zeros, and the longest run of two or more zero groups (the first
 * one on a tie) replaced by "::".
 */
export function formatIpv6(groups: number[]): string {
  let bestStart = -1;
  let bestLength = 0;
  for (let i = 0; i < groups.length; ) {
    if (groups[i] !== 0) {
      i++;
      continue;
    }
    let j = i;
    while (j < groups.length && groups[j] === 0) j++;
    if (j - i > bestLength) {
      bestStart = i;
      bestLength = j - i;
    }
    i = j;
  }
  const hex = groups.map((g) => g.toString(16));
  if (bestLength < 2) return hex.join(":");
  return `${hex.slice(0, bestStart).join(":")}::${hex.slice(bestStart + bestLength).join(":")}`;
}

/** Every group written in full, e.g. fd12:3456:789a:0000:0000:0000:0000:0000. */
export function expandIpv6(groups: number[]): string {
  return groups.map((g) => g.toString(16).padStart(4, "0")).join(":");
}

/** The eight groups of fdXX:XXXX:XXXX:subnet::interface. */
export function ulaGroups(globalId: Uint8Array, subnet = 0, interfaceId: [number, number, number, number] = [0, 0, 0, 0]): number[] {
  const g = globalId;
  return [0xfd00 | g[0], (g[1] << 8) | g[2], (g[3] << 8) | g[4], subnet, ...interfaceId];
}

export function globalIdHex(globalId: Uint8Array): string {
  return Array.from(globalId, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Reads a Global ID typed as 10 hex digits, with or without colons or spaces. */
export function parseGlobalId(input: string): GlobalIdResult {
  const hex = input.replace(/[\s:]/g, "").toLowerCase();
  if (!/^[0-9a-f]{10}$/.test(hex)) return { ok: false, error: "A Global ID is exactly 10 hexadecimal digits (40 bits), e.g. 3c4d5e6f70." };
  return { ok: true, globalId: Uint8Array.from(hex.match(/.{2}/g)!, (b) => parseInt(b, 16)) };
}

/** Reads a subnet ID typed in hex (0–ffff), as it appears in the address. */
export function parseSubnetId(input: string): { ok: true; value: number } | { ok: false; error: string } {
  const text = input.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{1,4}$/.test(text)) return { ok: false, error: "The first subnet ID is 1 to 4 hexadecimal digits, from 0 to ffff." };
  return { ok: true, value: parseInt(text, 16) };
}

export type UlaPlan = {
  prefix: string;
  globalId: string;
  /** The /48 in full notation, for configurations that do not accept "::". */
  expanded: string;
  subnets: { id: string; prefix: string }[];
  /** An example interface address in the first listed subnet. */
  example: string;
};

/** The /48 and `count` consecutive /64 subnets starting at `firstSubnet`, wrapping at most to ffff. */
export function ulaPlan(globalId: Uint8Array, count = 4, firstSubnet = 0): UlaPlan {
  const n = Math.max(0, Math.min(count, MAX_SUBNETS, SUBNET_COUNT - firstSubnet));
  const subnets = Array.from({ length: n }, (_, i) => {
    const id = firstSubnet + i;
    return { id: id.toString(16).padStart(4, "0"), prefix: `${formatIpv6(ulaGroups(globalId, id))}/64` };
  });
  return {
    prefix: `${formatIpv6(ulaGroups(globalId))}/48`,
    globalId: globalIdHex(globalId),
    expanded: `${expandIpv6(ulaGroups(globalId))}/48`,
    subnets,
    example: formatIpv6(ulaGroups(globalId, firstSubnet, [0, 0, 0, 1])),
  };
}
