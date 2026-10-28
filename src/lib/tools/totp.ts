/**
 * Time-based one-time passwords (TOTP, RFC 6238) built on HOTP (RFC 4226),
 * with HMAC computed by the browser's Web Crypto API (SHA-1, SHA-256 or
 * SHA-512). Secrets are Base32 (RFC 4648), the format authenticator apps use,
 * and setup links follow the Key URI format:
 *
 *   otpauth://totp/Issuer:account?secret=BASE32&issuer=Issuer&algorithm=SHA1&digits=6&period=30
 *
 * Most authenticator apps support only SHA1, 6 digits and 30 seconds; other
 * settings work only where both sides support them.
 */

export type OtpAlgorithm = "SHA-1" | "SHA-256" | "SHA-512";

export type TotpSettings = { algorithm: OtpAlgorithm; digits: number; period: number };

export const DEFAULT_SETTINGS: TotpSettings = { algorithm: "SHA-1", digits: 6, period: 30 };
export const DIGIT_OPTIONS = [6, 7, 8] as const;
export const MIN_PERIOD = 10;
export const MAX_PERIOD = 300;
export const MAX_WINDOW = 10;
/** 20 bytes (160 bits), as RFC 4226 recommends. */
export const SECRET_BYTES = 20;

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export type SecretResult = { ok: true; bytes: Uint8Array } | { ok: false; error: string };

/** Decodes Base32, ignoring case, spaces, hyphens and = padding as authenticator apps do. */
export function base32Decode(input: string): SecretResult {
  const text = input.replace(/[\s-]+/g, "").replace(/=+$/, "").toUpperCase();
  if (text === "") return { ok: false, error: "Enter a secret." };
  const bad = /[^A-Z2-7]/.exec(text);
  if (bad) {
    const hint = /[01890]/.test(bad[0]) ? " Base32 has no 0, 1, 8 or 9: check for the letters O, I or B instead." : "";
    return { ok: false, error: `"${bad[0]}" is not a Base32 character. Secrets use A–Z and 2–7.${hint}` };
  }
  if ([1, 3, 6].includes(text.length % 8)) return { ok: false, error: "The secret has an invalid length for Base32. It may be incomplete." };
  const bytes = new Uint8Array(Math.floor((text.length * 5) / 8));
  let bits = 0;
  let value = 0;
  let index = 0;
  for (const char of text) {
    value = (value << 5) | BASE32.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return { ok: true, bytes };
}

type Subtle = Pick<SubtleCrypto, "importKey" | "sign">;

function defaultSubtle(): Subtle | null {
  const subtle = globalThis.crypto?.subtle;
  return subtle && typeof subtle.sign === "function" ? subtle : null;
}

export const NO_CRYPTO = "This browser does not provide Web Crypto (crypto.subtle), which is needed to compute codes. It is only available on secure (HTTPS) pages in up-to-date browsers.";

/** HOTP (RFC 4226): HMAC of the 8-byte big-endian counter, dynamically truncated to `digits` digits. */
export async function hotp(secret: Uint8Array, counter: number, digits: number, algorithm: OtpAlgorithm, subtle: Subtle): Promise<string> {
  const message = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    message[i] = c % 256;
    c = Math.floor(c / 256);
  }
  const key = await subtle.importKey("raw", new Uint8Array(secret), { name: "HMAC", hash: algorithm }, false, ["sign"]);
  const mac = new Uint8Array(await subtle.sign("HMAC", key, message));
  const offset = mac[mac.length - 1] & 0x0f;
  const binary = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function checkSettings({ algorithm, digits, period }: TotpSettings): string | null {
  if (!["SHA-1", "SHA-256", "SHA-512"].includes(algorithm)) return "Choose SHA-1, SHA-256 or SHA-512.";
  if (!DIGIT_OPTIONS.includes(digits as 6)) return "Codes must have 6, 7 or 8 digits.";
  if (!Number.isInteger(period) || period < MIN_PERIOD || period > MAX_PERIOD) return `The period must be a whole number of seconds from ${MIN_PERIOD} to ${MAX_PERIOD}.`;
  return null;
}

export type CodeResult = { ok: true; code: string; counter: number; remaining: number } | { ok: false; error: string };

/** The TOTP code at `timeMs`, with the seconds left until it changes. */
export async function totp(secret: string, settings: TotpSettings, timeMs: number, subtle: Subtle | null = defaultSubtle()): Promise<CodeResult> {
  const invalid = checkSettings(settings);
  if (invalid) return { ok: false, error: invalid };
  const key = base32Decode(secret);
  if (!key.ok) return key;
  if (key.bytes.length < 10) return { ok: false, error: "The secret is shorter than 80 bits (16 Base32 characters), which RFC 4226 does not allow." };
  if (!subtle) return { ok: false, error: NO_CRYPTO };
  const seconds = Math.floor(timeMs / 1000);
  const counter = Math.floor(seconds / settings.period);
  try {
    const code = await hotp(key.bytes, counter, settings.digits, settings.algorithm, subtle);
    return { ok: true, code, counter, remaining: settings.period - (seconds % settings.period) };
  } catch (error) {
    return { ok: false, error: `The code could not be computed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export type VerifyResult = { ok: true; valid: true; offset: number } | { ok: true; valid: false } | { ok: false; error: string };

/**
 * Checks a code against the current period and up to `window` periods before
 * and after it, to allow for clock differences. Offset 0 is the current
 * period, -1 the previous one.
 */
export async function verifyTotp(code: string, secret: string, settings: TotpSettings, timeMs: number, window: number, subtle: Subtle | null = defaultSubtle()): Promise<VerifyResult> {
  const cleaned = code.replace(/\s+/g, "");
  if (!new RegExp(`^\\d{${settings.digits}}$`).test(cleaned)) return { ok: false, error: `Enter the ${settings.digits}-digit code.` };
  if (!Number.isInteger(window) || window < 0 || window > MAX_WINDOW) return { ok: false, error: `The window must be from 0 to ${MAX_WINDOW} periods.` };
  const current = await totp(secret, settings, timeMs, subtle);
  if (!current.ok) return current;
  const key = base32Decode(secret);
  if (!key.ok) return key;
  // Check every offset so the time taken does not reveal which one matched.
  let match: number | null = null;
  for (let offset = -window; offset <= window; offset++) {
    const counter = current.counter + offset;
    if (counter < 0) continue;
    const candidate = await hotp(key.bytes, counter, settings.digits, settings.algorithm, subtle!);
    let diff = 0;
    for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ cleaned.charCodeAt(i);
    if (diff === 0 && (match === null || Math.abs(offset) < Math.abs(match))) match = offset;
  }
  return match === null ? { ok: true, valid: false } : { ok: true, valid: true, offset: match };
}

type RandomSource = Pick<Crypto, "getRandomValues">;

export function generateSecret(source: RandomSource | null = globalThis.crypto ?? null): SecretResult & { base32?: string } {
  if (!source || typeof source.getRandomValues !== "function") {
    return { ok: false, error: "This browser does not provide a secure random number generator, so a secret cannot be generated safely." };
  }
  try {
    const bytes = source.getRandomValues(new Uint8Array(SECRET_BYTES));
    return { ok: true, bytes, base32: base32Encode(bytes) };
  } catch (error) {
    return { ok: false, error: `The secure random number generator failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export type OtpAuth = TotpSettings & { secret: string; issuer: string; account: string };

export type ParseUriResult = { ok: true; value: OtpAuth; warnings: string[] } | { ok: false; error: string };

const URI_ALGORITHMS: Record<string, OtpAlgorithm> = { SHA1: "SHA-1", SHA256: "SHA-256", SHA512: "SHA-512" };

/** Parses an otpauth://totp/ URI (Google Authenticator Key URI format). */
export function parseOtpauthUri(input: string): ParseUriResult {
  const text = input.trim();
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, error: "This is not a valid URI. It should start with otpauth://totp/." };
  }
  if (url.protocol !== "otpauth:") return { ok: false, error: "The URI must start with otpauth://." };
  if (url.hostname === "hotp") return { ok: false, error: "This is an HOTP (counter-based) URI. Only TOTP (time-based) is supported." };
  if (url.hostname !== "totp") return { ok: false, error: `Unknown OTP type "${url.hostname}". Only totp is supported.` };

  const params = url.searchParams;
  const secret = params.get("secret") ?? "";
  if (!secret) return { ok: false, error: "The URI has no secret parameter." };
  const decoded = base32Decode(secret);
  if (!decoded.ok) return { ok: false, error: `The secret is not valid Base32: ${decoded.error}` };

  let label: string;
  try {
    label = decodeURIComponent(url.pathname.replace(/^\//, ""));
  } catch {
    return { ok: false, error: "The label in the URI is not valid percent-encoding." };
  }
  const colon = label.indexOf(":");
  const labelIssuer = colon === -1 ? "" : label.slice(0, colon).trim();
  const account = (colon === -1 ? label : label.slice(colon + 1)).trim();
  const issuer = params.get("issuer")?.trim() ?? labelIssuer;
  const warnings: string[] = [];
  if (labelIssuer && params.get("issuer") && labelIssuer !== issuer) warnings.push(`The issuer in the label (${labelIssuer}) differs from the issuer parameter (${issuer}); the parameter is used.`);

  const algorithmParam = (params.get("algorithm") ?? "SHA1").toUpperCase();
  const algorithm = URI_ALGORITHMS[algorithmParam];
  if (!algorithm) return { ok: false, error: `The algorithm "${algorithmParam}" is not supported. Use SHA1, SHA256 or SHA512.` };
  const digits = Number(params.get("digits") ?? 6);
  const period = Number(params.get("period") ?? 30);
  const settings = { algorithm, digits, period };
  const invalid = checkSettings(settings);
  if (invalid) return { ok: false, error: invalid };
  if (algorithm !== "SHA-1" || digits !== 6 || period !== 30) warnings.push("Many authenticator apps ignore settings other than SHA1, 6 digits and 30 seconds, and would show different codes.");
  return { ok: true, value: { ...settings, secret: base32Encode(decoded.bytes), issuer, account }, warnings };
}

export function buildOtpauthUri({ secret, issuer, account, algorithm, digits, period }: OtpAuth): string {
  const label = issuer ? `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}` : encodeURIComponent(account);
  const params = new URLSearchParams({ secret: secret.replace(/[\s=-]+/g, "").toUpperCase() });
  if (issuer) params.set("issuer", issuer);
  params.set("algorithm", algorithm.replace("-", ""));
  params.set("digits", String(digits));
  params.set("period", String(period));
  return `otpauth://totp/${label}?${params.toString().replace(/\+/g, "%20")}`;
}
