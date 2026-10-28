/**
 * Unix timestamp conversion. Timestamps are counted from 1970-01-01T00:00:00Z
 * and ignore leap seconds, like JavaScript's Date.
 */

export type TimestampUnit = "auto" | "s" | "ms" | "us" | "ns";

export const unitLabels: Record<Exclude<TimestampUnit, "auto">, string> = {
  s: "seconds",
  ms: "milliseconds",
  us: "microseconds",
  ns: "nanoseconds",
};

/** JavaScript dates cover ±100,000,000 days around 1970. */
const MAX_MS = 8.64e15;

export type TimestampResult =
  | { ok: true; ms: number; unit: Exclude<TimestampUnit, "auto">; detected: boolean; truncated: boolean }
  | { ok: false; error: string };

/**
 * Guesses the unit from the number of digits: up to 11 digits is seconds
 * (until the year 5138), up to 14 milliseconds, up to 17 microseconds,
 * otherwise nanoseconds.
 */
function detectUnit(integerDigits: number): Exclude<TimestampUnit, "auto"> {
  if (integerDigits <= 11) return "s";
  if (integerDigits <= 14) return "ms";
  if (integerDigits <= 17) return "us";
  return "ns";
}

export function parseTimestamp(input: string, unit: TimestampUnit): TimestampResult {
  const text = input.trim().replace(/[_,\s]/g, "");
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) {
    return { ok: false, error: "Enter a whole or decimal number, such as 1700000000 or 1700000000000." };
  }
  const [, sign, intPart, fraction = ""] = match;
  const digits = intPart.replace(/^0+(?=\d)/, "").length;
  const resolved = unit === "auto" ? detectUnit(digits) : unit;

  let ms: number;
  let truncated = false;
  if (resolved === "s" || resolved === "ms") {
    ms = Number(text) * (resolved === "s" ? 1000 : 1);
  } else {
    // Exact integer arithmetic so long micro/nanosecond values do not lose precision before division.
    const divisor = BigInt(resolved === "us" ? 1000 : 1_000_000);
    const whole = BigInt(sign + intPart);
    ms = Number(whole / divisor);
    truncated = whole % divisor !== BigInt(0) || fraction.replace(/0+$/, "") !== "";
  }
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_MS) {
    return { ok: false, error: `This timestamp is outside the range of dates JavaScript can represent (about 271,821 BC to 275,760 AD) when read as ${unitLabels[resolved]}.` };
  }
  return { ok: true, ms, unit: resolved, detected: unit === "auto", truncated };
}

export type DateZone = "local" | "utc";

const ISO_LIKE =
  /^(\d{4,6}|[+-]\d{6})-(\d{2})-(\d{2})(?:[T\s]+(\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i;

export type DateResult = { ok: true; ms: number; hadZone: boolean } | { ok: false; error: string };

/**
 * Parses an ISO 8601 date or date-time such as 2024-03-15, 2024-03-15 14:30
 * or 2024-03-15T14:30:00.250+02:00. Without an offset or Z, the time is read
 * in `zone`. Other formats are rejected because browsers parse them
 * inconsistently.
 */
export function parseIsoDate(input: string, zone: DateZone): DateResult {
  const match = ISO_LIKE.exec(input.trim());
  if (!match) {
    return { ok: false, error: "Enter a date in ISO 8601 format, such as 2024-03-15, 2024-03-15 14:30 or 2024-03-15T14:30:00Z." };
  }
  const [, y, mo, d, h = "0", mi = "0", s = "0", frac = "", offset] = match;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);
  const second = Number(s);
  const millis = Number(frac.padEnd(3, "0").slice(0, 3));
  if (month < 1 || month > 12) return { ok: false, error: `Month ${month} is not valid. Use 01 to 12.` };
  if (hour > 23 || minute > 59 || second > 59) return { ok: false, error: "The time is not valid. Use hours 00–23, minutes and seconds 00–59." };

  // Build in UTC first; check the day exists in that month (e.g. no 2023-02-30).
  const utc = new Date(0);
  utc.setUTCFullYear(year, month - 1, day);
  utc.setUTCHours(hour, minute, second, millis);
  if (utc.getUTCDate() !== day) return { ok: false, error: `${y}-${mo} does not have a day ${day}.` };

  let ms: number;
  if (offset) {
    let offsetMinutes = 0;
    if (offset.toUpperCase() !== "Z") {
      const m = /^([+-])(\d{2}):?(\d{2})?$/.exec(offset)!;
      offsetMinutes = (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
    }
    ms = utc.getTime() - offsetMinutes * 60_000;
  } else if (zone === "utc") {
    ms = utc.getTime();
  } else {
    const local = new Date(0);
    local.setFullYear(year, month - 1, day);
    local.setHours(hour, minute, second, millis);
    ms = local.getTime();
  }
  if (!Number.isFinite(ms)) return { ok: false, error: "This date is outside the range JavaScript can represent." };
  return { ok: true, ms, hadZone: Boolean(offset) };
}

/** ISO 8601 in UTC, keeping years beyond 9999 readable. */
export function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

/** Timestamp in a unit as an exact decimal string (no exponent notation). */
export function toUnit(ms: number, unit: Exclude<TimestampUnit, "auto">): string {
  if (unit === "ms") return Number.isInteger(ms) ? String(ms) : ms.toFixed(3).replace(/\.?0+$/, "");
  if (unit === "s") {
    const seconds = ms / 1000;
    return Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(3).replace(/\.?0+$/, "");
  }
  const whole = BigInt(Math.trunc(ms));
  return String(whole * BigInt(unit === "us" ? 1000 : 1_000_000));
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365.25 * 24 * 3600 * 1000],
  ["month", 30.44 * 24 * 3600 * 1000],
  ["week", 7 * 24 * 3600 * 1000],
  ["day", 24 * 3600 * 1000],
  ["hour", 3600 * 1000],
  ["minute", 60 * 1000],
  ["second", 1000],
];

/** "in 3 days", "2 hours ago" and so on, relative to `now`. */
export function relativeTime(ms: number, now: number): string {
  const diff = ms - now;
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= size || unit === "second") return format.format(Math.round(diff / size), unit);
  }
  return format.format(0, "second");
}
