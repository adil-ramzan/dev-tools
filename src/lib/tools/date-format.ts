import { parseTimestamp, relativeTime, toUnit } from "@/lib/tools/timestamp";

/**
 * Date and time parsing and formatting with explicit rules instead of the
 * browser's lenient `Date.parse`, which accepts different strings in
 * different browsers and silently reads 03/04/2024 as March 4.
 *
 * Accepted inputs:
 * - ISO 8601 / RFC 3339 extended format: 2024-03-15, 2024-03-15T14:30,
 *   2024-03-15 14:30:00.250+02:00, 2024-03-15T14:30:00Z
 * - Unix time in seconds or milliseconds
 * - Written dates with English month names, including RFC 2822 and HTTP
 *   dates: Fri, 15 Mar 2024 14:30:00 GMT, 15 March 2024, March 15, 2024 2:30 PM
 * - Numeric dates with a four-digit year: 2024/03/15 always; 15/03/2024 and
 *   03/15/2024 only after choosing the day/month order
 *
 * Times without a zone are read in the chosen zone (UTC or the browser's
 * local zone), and the result says so. A local time that does not exist
 * (skipped when clocks go forward) or happens twice (when clocks go back) is
 * rejected rather than guessed.
 */

export type DateInputFormat = "auto" | "iso" | "unix-s" | "unix-ms" | "text" | "dmy" | "mdy";
export type AssumedZone = "utc" | "local";

export const dateInputFormats: { value: DateInputFormat; label: string }[] = [
  { value: "auto", label: "Detect (unambiguous formats)" },
  { value: "iso", label: "ISO 8601 / RFC 3339" },
  { value: "unix-s", label: "Unix time, seconds" },
  { value: "unix-ms", label: "Unix time, milliseconds" },
  { value: "text", label: "Written date / RFC 2822 / HTTP" },
  { value: "dmy", label: "Day/Month/Year (31/12/2024)" },
  { value: "mdy", label: "Month/Day/Year (12/31/2024)" },
];

export type ParsedDate =
  | {
      ok: true;
      ms: number;
      /** What the input was recognised as, e.g. "ISO 8601 date and time". */
      recognized: string;
      /** How the time zone was determined. */
      zone: { kind: "explicit"; offset: string } | { kind: "assumed"; zone: AssumedZone } | { kind: "timestamp" };
      notes: string[];
    }
  | { ok: false; error: string };

type Fields = { year: number; month: number; day: number; hour: number; minute: number; second: number; millis: number };

type Offset = { minutes: number; label: string } | null;

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Zone names with a single meaning: RFC 2822 §4.3 defines the US ones. */
const NAMED_ZONES: Record<string, number> = {
  Z: 0,
  UT: 0,
  UTC: 0,
  GMT: 0,
  EST: -300,
  EDT: -240,
  CST: -360,
  CDT: -300,
  MST: -420,
  MDT: -360,
  PST: -480,
  PDT: -420,
};

const SUPPORTED =
  "Supported formats: ISO 8601 (2024-03-15T14:30:00Z), Unix time (1710513000), written dates (15 March 2024 14:30, Fri, 15 Mar 2024 14:30:00 GMT) and numeric dates with a four-digit year (2024/03/15).";

function fail(error: string): ParsedDate {
  return { ok: false, error };
}

function monthIndex(name: string): number {
  const lower = name.toLowerCase().replace(/\.$/, "");
  if (lower === "sept") return 8;
  return MONTHS.findIndex((m) => m === lower || (lower.length === 3 && m.startsWith(lower)));
}

function weekdayIndex(name: string): number {
  const lower = name.toLowerCase().replace(/\.$/, "");
  return WEEKDAYS.findIndex((d) => d === lower || (lower.length >= 3 && d.startsWith(lower)));
}

/** Milliseconds for a UTC wall time; works for years 0–99, unlike Date.UTC. */
function utcFromFields(f: Fields): number {
  const date = new Date(0);
  date.setUTCFullYear(f.year, f.month - 1, f.day);
  date.setUTCHours(f.hour, f.minute, f.second, f.millis);
  return date.getTime();
}

function checkFields(f: Fields): string | null {
  if (f.year < 1 || f.year > 9999) return "Use a year from 0001 to 9999.";
  if (f.month < 1 || f.month > 12) return `Month ${f.month} is not valid. Use 1 to 12.`;
  if (f.day < 1 || f.day > 31) return `Day ${f.day} is not valid.`;
  if (f.hour === 24) return "24:00 is not accepted. Use 00:00 on the following day.";
  if (f.hour > 23) return `Hour ${f.hour} is not valid. Use 00 to 23.`;
  if (f.minute > 59) return `Minute ${f.minute} is not valid. Use 00 to 59.`;
  if (f.second === 60) return "Leap seconds (:60) cannot be represented: JavaScript time, like Unix time, has no leap seconds.";
  if (f.second > 59) return `Second ${f.second} is not valid. Use 00 to 59.`;
  const check = new Date(utcFromFields(f));
  if (check.getUTCDate() !== f.day) {
    return `${MONTHS[f.month - 1][0].toUpperCase()}${MONTHS[f.month - 1].slice(1)} ${String(f.year).padStart(4, "0")} has no day ${f.day}.`;
  }
  return null;
}

const pad = (n: number, width = 2) => String(Math.abs(n)).padStart(width, "0");

function wallTime(f: Fields): string {
  return `${pad(f.year, 4)}-${pad(f.month)}-${pad(f.day)} ${pad(f.hour)}:${pad(f.minute)}:${pad(f.second)}`;
}

function sameLocalWall(ms: number, f: Fields): boolean {
  const d = new Date(ms);
  return (
    d.getFullYear() === f.year &&
    d.getMonth() === f.month - 1 &&
    d.getDate() === f.day &&
    d.getHours() === f.hour &&
    d.getMinutes() === f.minute &&
    d.getSeconds() === f.second
  );
}

/**
 * Converts a local wall time to an instant, or explains why it has none or
 * more than one. Candidate offsets are taken from a day before and after,
 * which covers every daylight saving transition.
 */
export function localToInstant(f: Fields): { ok: true; ms: number } | { ok: false; error: string } {
  const wall = utcFromFields(f);
  const offsets = new Set<number>();
  for (const probe of [wall - 86_400_000, wall, wall + 86_400_000]) offsets.add(new Date(probe).getTimezoneOffset());
  const candidates = [...offsets].map((o) => wall + o * 60_000).filter((ms) => sameLocalWall(ms, f));
  const unique = [...new Set(candidates)].sort((a, b) => a - b);
  if (unique.length === 0) {
    return {
      ok: false,
      error: `${wallTime(f)} does not exist in your local time zone (${localZoneName()}): the clocks skip it when daylight saving time starts. Add a UTC offset or choose UTC.`,
    };
  }
  if (unique.length > 1) {
    const [first, second] = unique.map((ms) => offsetLabel(-new Date(ms).getTimezoneOffset()));
    return {
      ok: false,
      error: `${wallTime(f)} happens twice in your local time zone (${localZoneName()}), at UTC${first} and again at UTC${second}, because the clocks go back. Add a UTC offset to say which one you mean.`,
    };
  }
  return { ok: true, ms: unique[0] };
}

export function localZoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "local time";
  } catch {
    return "local time";
  }
}

function offsetLabel(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  return `${sign}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`;
}

function parseOffset(text: string | undefined): Offset | { error: string } {
  if (!text) return null;
  const upper = text.toUpperCase();
  if (upper in NAMED_ZONES) return { minutes: NAMED_ZONES[upper], label: upper === "Z" ? "Z (UTC)" : upper };
  const m = /^([+-])(\d{2}):?(\d{2})?$/.exec(text);
  if (!m) return { error: `"${text}" is not a supported time zone. Use Z, UTC, GMT or an offset such as +02:00.` };
  const hours = Number(m[2]);
  const minutes = Number(m[3] ?? 0);
  if (hours > 23 || minutes > 59) return { error: `The offset ${text} is not valid.` };
  const total = (m[1] === "-" ? -1 : 1) * (hours * 60 + minutes);
  return { minutes: total, label: offsetLabel(total) };
}

const TIME = String.raw`(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?(?:\s*([AaPp])\.?[Mm]\.?)?`;
const ZONE = String.raw`(Z|[+-]\d{2}:?\d{2}|[+-]\d{2}|[A-Za-z]{1,5})`;

type TimeParts = { hour: number; minute: number; second: number; millis: number; truncated: boolean } | { error: string };

function timeParts(h?: string, mi?: string, s?: string, frac?: string, meridiem?: string): TimeParts {
  if (h === undefined) return { hour: 0, minute: 0, second: 0, millis: 0, truncated: false };
  let hour = Number(h);
  if (meridiem) {
    if (hour < 1 || hour > 12) return { error: `${h} ${meridiem.toUpperCase()}M is not valid. With AM or PM, use hours 1 to 12.` };
    hour = (hour % 12) + (meridiem.toLowerCase() === "p" ? 12 : 0);
  }
  const fraction = frac ?? "";
  return {
    hour,
    minute: Number(mi),
    second: Number(s ?? 0),
    millis: Number(fraction.padEnd(3, "0").slice(0, 3)),
    truncated: fraction.length > 3 && /[1-9]/.test(fraction.slice(3)),
  };
}

type Candidate = { fields: Fields; zone: Offset; recognized: string; notes: string[] } | { error: string } | null;

const ISO = new RegExp(String.raw`^(\d{4})-(\d{2})-(\d{2})(?:(?:T|\s+)(\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$`, "i");

function matchIso(input: string): Candidate {
  const m = ISO.exec(input);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, frac, zone] = m;
  const time = timeParts(h, mi, s, frac);
  if ("error" in time) return time;
  if (zone && !h) return { error: "A time zone needs a time, e.g. 2024-03-15T00:00Z." };
  const offset = parseOffset(zone);
  if (offset && "error" in offset) return offset;
  const notes = time.truncated ? ["Digits after milliseconds were dropped: JavaScript dates have millisecond precision."] : [];
  return {
    fields: { year: Number(y), month: Number(mo), day: Number(d), ...time },
    zone: offset,
    recognized: h ? "ISO 8601 date and time" : "ISO 8601 date",
    notes,
  };
}

// [Weekday,] 15 Mar 2024 [time] [zone]   and   [Weekday,] March 15[th][,] 2024 [time] [zone]
const DAY_FIRST = new RegExp(String.raw`^(?:([A-Za-z]+\.?),?\s+)?(\d{1,2})\s+([A-Za-z]+\.?),?\s+(\d{2,4})(?:,?\s+(?:at\s+)?${TIME})?(?:\s+${ZONE})?$`);
const MONTH_FIRST = new RegExp(String.raw`^(?:([A-Za-z]+\.?),?\s+)?([A-Za-z]+\.?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{2,4})(?:,?\s+(?:at\s+)?${TIME})?(?:\s+${ZONE})?$`);

function matchText(input: string): Candidate {
  let m = DAY_FIRST.exec(input);
  let weekday: string | undefined, day: string, month: string, year: string, rest: (string | undefined)[];
  if (m) {
    [, weekday, day, month, year, ...rest] = m;
  } else {
    m = MONTH_FIRST.exec(input);
    if (!m) return null;
    [, weekday, month, day, year, ...rest] = m;
  }
  const monthNumber = monthIndex(month) + 1;
  if (monthNumber === 0) return null;
  if (year.length !== 4) return { error: `The year "${year}" is ambiguous. Write all four digits, e.g. 2024.` };
  const [h, mi, s, frac, meridiem, zone] = rest;
  const time = timeParts(h, mi, s, frac, meridiem);
  if ("error" in time) return time;
  if (zone && !h) return { error: "A time zone needs a time, e.g. 15 Mar 2024 00:00 GMT." };
  if (zone && !(zone.toUpperCase() in NAMED_ZONES) && /^[A-Za-z]+$/.test(zone)) {
    return { error: `The time zone abbreviation "${zone}" is ambiguous or unknown (IST, for example, means India, Ireland or Israel). Use a UTC offset such as +05:30 instead.` };
  }
  const offset = parseOffset(zone);
  if (offset && "error" in offset) return offset;
  const fields: Fields = { year: Number(year), month: monthNumber, day: Number(day), ...time };
  if (weekday !== undefined) {
    const wd = weekdayIndex(weekday);
    if (wd === -1) return { error: `"${weekday}" is not a day of the week.` };
    const problem = checkFields(fields);
    if (problem) return { error: problem };
    const actual = new Date(utcFromFields({ ...fields, hour: 12, minute: 0, second: 0, millis: 0 })).getUTCDay();
    if (actual !== wd) {
      return { error: `The weekday does not match the date: ${pad(fields.day)} ${SHORT_MONTHS[monthNumber - 1]} ${year} is a ${WEEKDAYS[actual][0].toUpperCase()}${WEEKDAYS[actual].slice(1)}.` };
    }
  }
  const rfc = weekday !== undefined && zone !== undefined;
  return {
    fields,
    zone: offset,
    recognized: rfc ? "RFC 2822 / HTTP date" : h ? "Written date and time" : "Written date",
    notes: time.truncated ? ["Digits after milliseconds were dropped: JavaScript dates have millisecond precision."] : [],
  };
}

const NUMERIC = new RegExp(String.raw`^(\d{1,4})([/.-])(\d{1,2})\2(\d{1,4})(?:,?\s+${TIME})?(?:\s+${ZONE})?$`);

function matchNumeric(input: string, order: "auto" | "dmy" | "mdy"): Candidate {
  const m = NUMERIC.exec(input);
  if (!m) return null;
  const [, a, , b, c, h, mi, s, frac, meridiem, zone] = m;
  let year: string, month: string, day: string, recognized: string;
  if (a.length === 4) {
    [year, month, day] = [a, b, c];
    recognized = "Year/month/day date";
  } else if (c.length === 4) {
    if (order === "auto") {
      return {
        error: `"${input.split(/\s/)[0]}" is ambiguous: it could be day/month/year or month/day/year depending on the country. Choose Day/Month/Year or Month/Day/Year as the input format, or use ISO 8601 (YYYY-MM-DD).`,
      };
    }
    [day, month] = order === "dmy" ? [a, b] : [b, a];
    year = c;
    recognized = order === "dmy" ? "Day/month/year date" : "Month/day/year date";
  } else {
    return { error: "Write the year with four digits, e.g. 15/03/2024 or 2024/03/15." };
  }
  const time = timeParts(h, mi, s, frac, meridiem);
  if ("error" in time) return time;
  if (zone && !(zone.toUpperCase() in NAMED_ZONES) && /^[A-Za-z]+$/.test(zone)) {
    return { error: `The time zone abbreviation "${zone}" is ambiguous or unknown. Use a UTC offset such as +05:30 instead.` };
  }
  const offset = parseOffset(zone);
  if (offset && "error" in offset) return offset;
  return {
    fields: { year: Number(year), month: Number(month), day: Number(day), ...time },
    zone: offset,
    recognized: h ? `${recognized} and time` : recognized,
    notes: time.truncated ? ["Digits after milliseconds were dropped: JavaScript dates have millisecond precision."] : [],
  };
}

function fromCandidate(candidate: Exclude<Candidate, null>, zone: AssumedZone): ParsedDate {
  if ("error" in candidate) return fail(candidate.error);
  const { fields, recognized, notes } = candidate;
  const problem = checkFields(fields);
  if (problem) return fail(problem);
  if (candidate.zone) {
    const ms = utcFromFields(fields) - candidate.zone.minutes * 60_000;
    return { ok: true, ms, recognized, zone: { kind: "explicit", offset: candidate.zone.label }, notes };
  }
  if (zone === "utc") return { ok: true, ms: utcFromFields(fields), recognized, zone: { kind: "assumed", zone }, notes };
  const local = localToInstant(fields);
  if (!local.ok) return fail(local.error);
  return { ok: true, ms: local.ms, recognized, zone: { kind: "assumed", zone }, notes };
}

function fromTimestamp(text: string, unit: "auto" | "s" | "ms"): ParsedDate {
  const result = parseTimestamp(text, unit);
  if (!result.ok) return fail(result.error);
  if (result.unit !== "s" && result.unit !== "ms") {
    return fail("This number has too many digits for seconds or milliseconds. Use the Unix Timestamp Converter for microseconds and nanoseconds.");
  }
  const notes: string[] = [];
  if (result.detected) {
    const digits = text.replace(/^-/, "").split(".")[0].replace(/^0+(?=\d)/, "").length;
    notes.push(`Read as ${result.unit === "s" ? "seconds" : "milliseconds"} because it has ${digits} ${digits === 1 ? "digit" : "digits"}. Choose a Unix time unit as the input format to override this.`);
  }
  if (!Number.isInteger(result.ms)) notes.push("Fractions of a millisecond were dropped.");
  return {
    ok: true,
    ms: Math.trunc(result.ms),
    recognized: `Unix time in ${result.unit === "s" ? "seconds" : "milliseconds"}`,
    zone: { kind: "timestamp" },
    notes,
  };
}

const UNIX = /^-?\d+(?:\.\d+)?$/;

export function parseDateInput(raw: string, format: DateInputFormat, zone: AssumedZone): ParsedDate {
  const input = raw.trim().replace(/\s+/g, " ");
  if (input === "") return fail("Enter a date, a date and time, or a Unix timestamp.");

  switch (format) {
    case "unix-s":
    case "unix-ms": {
      const text = input.replace(/[_,\s]/g, "");
      if (!UNIX.test(text)) return fail("Enter a whole or decimal number, such as 1710513000.");
      return fromTimestamp(text, format === "unix-s" ? "s" : "ms");
    }
    case "iso":
      return fromCandidate(matchIso(input) ?? { error: "Enter an ISO 8601 date such as 2024-03-15, 2024-03-15T14:30 or 2024-03-15T14:30:00+02:00." }, zone);
    case "text":
      return fromCandidate(matchText(input) ?? { error: "Enter a date with an English month name, such as 15 March 2024, March 15, 2024 2:30 PM or Fri, 15 Mar 2024 14:30:00 GMT." }, zone);
    case "dmy":
    case "mdy":
      return fromCandidate(
        matchNumeric(input, format) ?? matchIso(input) ?? { error: `Enter a date such as ${format === "dmy" ? "31/12/2024" : "12/31/2024"}, optionally followed by a time.` },
        zone,
      );
    default: {
      if (UNIX.test(input.replace(/[_,]/g, ""))) return fromTimestamp(input.replace(/[_,]/g, ""), "auto");
      const candidate = matchIso(input) ?? matchNumeric(input, "auto") ?? matchText(input);
      if (!candidate) return fail(`This date format is not recognized. ${SUPPORTED}`);
      return fromCandidate(candidate, zone);
    }
  }
}

// --- Output -----------------------------------------------------------------

export type DateOutput = { id: string; label: string; value: string };

function yearInRange(date: Date, utc: boolean): boolean {
  const year = utc ? date.getUTCFullYear() : date.getFullYear();
  return year >= 1 && year <= 9999;
}

/** ISO 8601 with the local UTC offset, e.g. 2024-03-15T10:30:00.000-04:00. */
export function toLocalIso(ms: number): string {
  const d = new Date(ms);
  const offset = -d.getTimezoneOffset();
  const ms3 = pad(d.getMilliseconds(), 3);
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms3}${offsetLabel(offset)}`;
}

/** RFC 2822 date in UTC, e.g. Fri, 15 Mar 2024 14:30:00 +0000. */
export function toRfc2822(ms: number): string {
  const d = new Date(ms);
  return `${SHORT_DAYS[d.getUTCDay()]}, ${pad(d.getUTCDate())} ${SHORT_MONTHS[d.getUTCMonth()]} ${pad(d.getUTCFullYear(), 4)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} +0000`;
}

/** HTTP date (RFC 9110 IMF-fixdate), always in GMT. */
export function toHttpDate(ms: number): string {
  return toRfc2822(ms).replace(/\+0000$/, "GMT");
}

/** ISO week date in UTC, e.g. 2024-W11-5. The week-numbering year can differ from the calendar year. */
export function toIsoWeek(ms: number): string {
  const d = new Date(ms);
  const day = d.getUTCDay() || 7;
  const thursday = new Date(Date.UTC(2000, 0, 1));
  thursday.setUTCFullYear(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(2000, 0, 1));
  yearStart.setUTCFullYear(thursday.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${pad(thursday.getUTCFullYear(), 4)}-W${pad(week)}-${day}`;
}

/** ISO ordinal date in UTC, e.g. 2024-075. */
export function toOrdinal(ms: number): string {
  const d = new Date(ms);
  const start = new Date(0);
  start.setUTCFullYear(d.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((ms - start.getTime()) / 86_400_000) + 1;
  return `${pad(d.getUTCFullYear(), 4)}-${pad(dayOfYear, 3)}`;
}

function readable(ms: number, timeZone: string | undefined, locale: string | undefined): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "long", timeZone }).format(ms);
}

export function formatDateOutputs(ms: number, { now = Date.now(), locale }: { now?: number; locale?: string } = {}): DateOutput[] {
  const date = new Date(ms);
  const utcOk = yearInRange(date, true);
  const outOfRange = "Not available for years outside 0001–9999";
  return [
    { id: "iso-utc", label: "ISO 8601 (UTC)", value: date.toISOString() },
    { id: "iso-local", label: `ISO 8601 (${localZoneName()})`, value: yearInRange(date, false) ? toLocalIso(ms) : outOfRange },
    { id: "utc", label: "UTC", value: readable(ms, "UTC", locale) },
    { id: "local", label: `Local time (${localZoneName()})`, value: readable(ms, undefined, locale) },
    { id: "unix-s", label: "Unix time (seconds)", value: toUnit(ms, "s") },
    { id: "unix-ms", label: "Unix time (milliseconds)", value: toUnit(ms, "ms") },
    { id: "rfc2822", label: "RFC 2822 (email)", value: utcOk ? toRfc2822(ms) : outOfRange },
    { id: "http", label: "HTTP date (RFC 9110)", value: utcOk ? toHttpDate(ms) : outOfRange },
    { id: "week", label: "ISO week date (UTC)", value: utcOk ? toIsoWeek(ms) : outOfRange },
    { id: "ordinal", label: "Ordinal date (UTC)", value: utcOk ? toOrdinal(ms) : outOfRange },
    { id: "relative", label: "Relative to now", value: relativeTime(ms, now) },
  ];
}
