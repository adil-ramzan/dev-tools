export const MAX_UUIDS = 1000;

/**
 * Random (version 4) UUID from the browser's cryptographically secure
 * generator. Uses crypto.randomUUID where available; it only exists in secure
 * contexts (HTTPS or localhost), so getRandomValues is the fallback.
 */
export function uuidV4(): string {
  const crypto = globalThis.crypto;
  if (!crypto?.getRandomValues) {
    throw new Error("This browser does not provide a secure random number generator.");
  }
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 9562 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type UuidFormat = { uppercase: boolean; hyphens: boolean; braces: boolean };

export function formatUuid(uuid: string, { uppercase, hyphens, braces }: UuidFormat): string {
  let value = hyphens ? uuid : uuid.replace(/-/g, "");
  if (uppercase) value = value.toUpperCase();
  return braces ? `{${value}}` : value;
}

export function generateUuids(count: number, format: UuidFormat): string[] {
  const n = Math.min(Math.max(Math.trunc(count) || 0, 1), MAX_UUIDS);
  return Array.from({ length: n }, () => formatUuid(uuidV4(), format));
}
