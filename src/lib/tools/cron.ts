/**
 * Standard five-field cron expressions (minute hour day-of-month month
 * day-of-week), as used by Vixie cron, cronie, crontab files and most CI
 * schedulers.
 *
 * Supported: * , - / ranges with steps, month names (JAN–DEC), day names
 * (SUN–SAT), 0 or 7 for Sunday, and the macros @yearly, @annually, @monthly,
 * @weekly, @daily, @midnight and @hourly.
 *
 * Rejected with an explanation: seconds or year fields (6–7 fields),
 * Quartz/Jenkins syntax (? L W # H), "5/15" steps without a range and
 * @reboot.
 *
 * As in Vixie cron, when both day-of-month and day-of-week are restricted
 * (neither starts with *), a day matches if EITHER matches.
 */

type FieldSpec = { name: string; min: number; max: number; names?: string[] };

const FIELDS: FieldSpec[] = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day of month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12, names: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] },
  { name: "day of week", min: 0, max: 7, names: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] },
];

const MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type CronField = {
  raw: string;
  /** Matching values, sorted. Day of week uses 0–6 (7 is folded into 0). */
  values: number[];
  /** True for "*" and steps of "*", which cron treats as unrestricted for the day rule. */
  star: boolean;
};

export type ParsedCron = {
  expression: string;
  /** The five fields actually used (macros expanded). */
  normalized: string;
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
};

export type CronResult = { ok: true; cron: ParsedCron } | { ok: false; error: string };

function parseValue(text: string, spec: FieldSpec): number | string {
  const upper = text.toUpperCase();
  if (spec.names) {
    const index = spec.names.indexOf(upper);
    if (index !== -1) return index + (spec.name === "month" ? 1 : 0);
  }
  if (!/^\d+$/.test(text)) {
    return spec.names
      ? `"${text}" is not a valid ${spec.name}. Use ${spec.min}–${spec.max} or names like ${spec.names[0]}–${spec.names[spec.names.length - 1]}.`
      : `"${text}" is not a valid ${spec.name}. Use a number from ${spec.min} to ${spec.max}.`;
  }
  const n = Number(text);
  if (n < spec.min || n > spec.max) return `${n} is out of range for the ${spec.name} field (${spec.min}–${spec.max}).`;
  return n;
}

function parseField(raw: string, spec: FieldSpec): CronField | string {
  const unsupported = /[?LW#H]/i.exec(raw.replace(/[A-Z]{3}/gi, (m) => (spec.names?.includes(m.toUpperCase()) ? "" : m)));
  if (unsupported) {
    const ch = unsupported[0].toUpperCase();
    const what =
      ch === "?" ? '"?" (from Quartz and Spring)' : ch === "L" ? '"L" for "last" (Quartz)' : ch === "W" ? '"W" for "nearest weekday" (Quartz)' : ch === "#" ? '"#" for "nth weekday" (Quartz)' : '"H" for hashed values (Jenkins)';
    return `${what} is not standard cron syntax and is not supported. Use * instead of ?, and lists or ranges instead of L, W, # or H.`;
  }
  const values = new Set<number>();
  for (const part of raw.split(",")) {
    if (part === "") return `The ${spec.name} field has an empty item in its list.`;
    const [range, stepText, extra] = part.split("/");
    if (extra !== undefined) return `"${part}" has more than one "/".`;
    let step = 1;
    if (stepText !== undefined) {
      if (!/^\d+$/.test(stepText) || Number(stepText) === 0) return `"${part}": the step after "/" must be a whole number greater than 0.`;
      step = Number(stepText);
    }
    let from: number;
    let to: number;
    if (range === "*") {
      from = spec.min;
      to = spec.name === "day of week" ? 6 : spec.max;
    } else if (range.includes("-")) {
      const [a, b, more] = range.split("-");
      if (more !== undefined || a === "" || b === "") return `"${range}" is not a valid range. Write ranges as start-end, such as 1-5.`;
      const start = parseValue(a, spec);
      const end = parseValue(b, spec);
      if (typeof start === "string") return start;
      if (typeof end === "string") return end;
      if (start > end) return `The range "${range}" goes backwards. Wrap-around ranges are not supported; use a list such as ${spec.name === "day of week" ? "FRI-SAT,SUN" : "22-23,0-2"} instead.`;
      [from, to] = [start, end];
    } else {
      const single = parseValue(range, spec);
      if (typeof single === "string") return single;
      if (stepText !== undefined) {
        return `"${part}" is ambiguous: some schedulers read it as ${single}-${spec.max}/${step}, others reject it. Write the range explicitly, such as ${single}-${spec.name === "day of week" ? 6 : spec.max}/${step}.`;
      }
      [from, to] = [single, single];
    }
    for (let v = from; v <= to; v += step) values.add(spec.name === "day of week" && v === 7 ? 0 : v);
  }
  return { raw, values: [...values].sort((x, y) => x - y), star: raw.startsWith("*") };
}

export function parseCron(input: string): CronResult {
  const expression = input.trim().replace(/\s+/g, " ");
  if (expression === "") return { ok: false, error: "Enter a cron expression, such as */15 * * * *." };
  let normalized = expression;
  if (expression.startsWith("@")) {
    const macro = MACROS[expression.toLowerCase()];
    if (expression.toLowerCase() === "@reboot") return { ok: false, error: "@reboot runs once when the system starts, so it has no schedule to show." };
    if (!macro) return { ok: false, error: `Unknown macro "${expression}". Supported: ${Object.keys(MACROS).join(", ")}.` };
    normalized = macro;
  }
  const parts = normalized.split(" ");
  if (parts.length === 6 || parts.length === 7) {
    return { ok: false, error: `This expression has ${parts.length} fields. Six- and seven-field formats with seconds or years (used by Quartz, Spring and some libraries) are not supported. Standard cron has five fields: minute hour day-of-month month day-of-week.` };
  }
  if (parts.length !== 5) return { ok: false, error: `A cron expression has five fields (minute hour day-of-month month day-of-week), but this has ${parts.length}.` };
  const fields: CronField[] = [];
  for (let i = 0; i < 5; i++) {
    const field = parseField(parts[i], FIELDS[i]);
    if (typeof field === "string") return { ok: false, error: `${FIELDS[i].name[0].toUpperCase()}${FIELDS[i].name.slice(1)} field: ${field}` };
    fields.push(field);
  }
  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
  return { ok: true, cron: { expression, normalized, minute, hour, dayOfMonth, month, dayOfWeek } };
}

function dayMatches(cron: ParsedCron, date: number, weekday: number): boolean {
  const dom = cron.dayOfMonth.values.includes(date);
  const dow = cron.dayOfWeek.values.includes(weekday);
  if (!cron.dayOfMonth.star && !cron.dayOfWeek.star) return dom || dow;
  return dom && dow;
}

export type CronZone = "local" | "utc";

/**
 * The next `count` times after `from`, searching up to 10 years ahead. In
 * local time, times that do not exist because of a daylight saving change
 * are skipped, and repeated times run once.
 */
export function nextRuns(cron: ParsedCron, from: Date, count: number, zone: CronZone): Date[] {
  const runs: Date[] = [];
  const utc = zone === "utc";
  const get = (d: Date) =>
    utc
      ? { y: d.getUTCFullYear(), mo: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() }
      : { y: d.getFullYear(), mo: d.getMonth(), d: d.getDate(), h: d.getHours(), mi: d.getMinutes() };
  const make = (y: number, mo: number, d: number, h = 0, mi = 0) => (utc ? new Date(Date.UTC(y, mo, d, h, mi)) : new Date(y, mo, d, h, mi));

  const start = new Date(from.getTime() + 60_000 - (from.getTime() % 60_000));
  const s = get(start);
  let day = make(s.y, s.mo, s.d);
  const limit = 366 * 10;
  for (let i = 0; i < limit && runs.length < count; i++, day = make(s.y, s.mo, s.d + i)) {
    const cur = get(day);
    if (!cron.month.values.includes(cur.mo + 1)) continue;
    const weekday = utc ? day.getUTCDay() : day.getDay();
    if (!dayMatches(cron, cur.d, weekday)) continue;
    for (const h of cron.hour.values) {
      for (const mi of cron.minute.values) {
        const run = make(cur.y, cur.mo, cur.d, h, mi);
        if (run.getTime() < start.getTime()) continue;
        const check = get(run);
        if (check.h !== h || check.mi !== mi || check.d !== cur.d) continue; // Skipped by a DST change.
        if (runs.length && runs[runs.length - 1].getTime() === run.getTime()) continue;
        runs.push(run);
        if (runs.length === count) return runs;
      }
    }
  }
  return runs;
}

// --- Description -------------------------------------------------------------

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Describes one comma-separated item of a field, e.g. "1-5" → "Monday through Friday". */
function describePart(part: string, label: (n: number) => string, spec: FieldSpec): string {
  const [range, step] = part.split("/");
  const value = (t: string) => {
    const v = parseValue(t, spec) as number;
    return label(spec.name === "day of week" && v === 7 ? 0 : v);
  };
  const body = range === "*" ? "" : range.includes("-") ? `${value(range.split("-")[0])} through ${value(range.split("-")[1])}` : value(range);
  if (step) return `every ${ordinal(Number(step))} ${spec.name}${body ? ` from ${body}` : ""}`;
  return body;
}

function describeField(field: CronField, spec: FieldSpec, label: (n: number) => string): string {
  return joinList(field.raw.split(",").map((p) => describePart(p, label, spec)));
}

/** "every minute", "minute 5 and 10", or "every 10th minute from 0 through 30". */
function phrase(field: CronField, spec: FieldSpec, unit: string, label: (n: number) => string): string {
  if (field.raw === "*") return `every ${unit}`;
  const text = describeField(field, spec, label);
  return text.startsWith("every") ? text : `${unit} ${text}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function describeCron(cron: ParsedCron): string {
  const { minute, hour, dayOfMonth, month, dayOfWeek } = cron;
  const single = (f: CronField) => /^\d+$/.test(f.raw);
  let time: string;
  if (minute.raw === "*" && hour.raw === "*") time = "Every minute";
  else if (/^\*\/\d+$/.test(minute.raw) && hour.raw === "*") time = `Every ${minute.raw.slice(2)} minutes`;
  else if (single(minute) && hour.raw === "*") time = `At minute ${minute.values[0]} of every hour`;
  else if (single(minute) && /^\*\/\d+$/.test(hour.raw)) time = `At minute ${minute.values[0]} of every ${ordinal(Number(hour.raw.slice(2)))} hour`;
  else if (minute.values.length * hour.values.length <= 6 && !minute.raw.includes("/") && !hour.raw.includes("/") && minute.raw !== "*" && hour.raw !== "*") {
    time = `At ${joinList(hour.values.flatMap((h) => minute.values.map((m) => `${pad(h)}:${pad(m)}`)))}`;
  } else {
    const m = phrase(minute, FIELDS[0], "minute", String);
    const h = phrase(hour, FIELDS[1], "hour", String);
    time = `At ${m} of ${h}`.replace(/^At every minute of/, "Every minute of");
  }

  const days: string[] = [];
  const domText = phrase(dayOfMonth, FIELDS[2], "day", String) + (dayOfMonth.raw.includes("/") ? "" : " of the month");
  const dowText = describeField(dayOfWeek, FIELDS[4], (n) => DAY_NAMES[n]);
  if (!dayOfMonth.star && !dayOfWeek.star) days.push(`on ${domText} or on ${dowText}`);
  else if (!dayOfMonth.star) days.push(`on ${domText}`);
  else if (dayOfMonth.raw !== "*") days.push(`on ${domText}`);
  if (dayOfMonth.star && dayOfWeek.raw !== "*") days.push(`on ${dowText}`);
  if (month.raw !== "*") days.push(`in ${describeField(month, FIELDS[3], (n) => MONTH_NAMES[n - 1])}`);

  return `${[time, ...days].join(", ")}.`;
}

/** Plain-language summary of each field, for the breakdown table. */
export function fieldBreakdown(cron: ParsedCron): { field: string; raw: string; meaning: string }[] {
  const list = (values: number[], label: (n: number) => string, all: number) =>
    values.length === all ? "every value" : values.length > 12 ? `${values.length} values: ${values.slice(0, 12).map(label).join(", ")}, …` : values.map(label).join(", ");
  return [
    { field: "Minute", raw: cron.minute.raw, meaning: list(cron.minute.values, String, 60) },
    { field: "Hour", raw: cron.hour.raw, meaning: list(cron.hour.values, String, 24) },
    { field: "Day of month", raw: cron.dayOfMonth.raw, meaning: list(cron.dayOfMonth.values, String, 31) },
    { field: "Month", raw: cron.month.raw, meaning: list(cron.month.values, (n) => MONTH_NAMES[n - 1], 12) },
    { field: "Day of week", raw: cron.dayOfWeek.raw, meaning: list(cron.dayOfWeek.values, (n) => DAY_NAMES[n], 7) },
  ];
}
