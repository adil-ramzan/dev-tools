import { describe, expect, it } from "vitest";
import {
  formatDateOutputs,
  parseDateInput,
  toHttpDate,
  toIsoWeek,
  toLocalIso,
  toOrdinal,
  toRfc2822,
  type ParsedDate,
} from "@/lib/tools/date-format";

// vitest.config.mts sets TZ=America/New_York.
const iso = (result: ParsedDate) => {
  if (!result.ok) throw new Error(result.error);
  return new Date(result.ms).toISOString();
};
const error = (result: ParsedDate) => (result.ok ? "" : result.error);

describe("test environment", () => {
  it("runs in America/New_York", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("America/New_York");
  });
});

describe("ISO 8601", () => {
  it("reads explicit offsets and Z", () => {
    expect(iso(parseDateInput("2024-03-15T14:30:00Z", "auto", "local"))).toBe("2024-03-15T14:30:00.000Z");
    expect(iso(parseDateInput("2024-03-15T14:30:00+02:00", "auto", "local"))).toBe("2024-03-15T12:30:00.000Z");
    expect(iso(parseDateInput("2024-03-15 14:30-0530", "iso", "utc"))).toBe("2024-03-15T20:00:00.000Z");
  });

  it("reports an explicit offset", () => {
    const result = parseDateInput("2024-03-15T14:30:00+02:00", "auto", "utc");
    expect(result.ok && result.zone).toEqual({ kind: "explicit", offset: "+02:00" });
  });

  it("reads times without an offset in the assumed zone and says so", () => {
    const utc = parseDateInput("2024-03-15T14:30", "auto", "utc");
    expect(iso(utc)).toBe("2024-03-15T14:30:00.000Z");
    expect(utc.ok && utc.zone).toEqual({ kind: "assumed", zone: "utc" });
    // New York is UTC-4 in mid-March 2024 (DST started March 10).
    expect(iso(parseDateInput("2024-03-15T14:30", "auto", "local"))).toBe("2024-03-15T18:30:00.000Z");
    expect(iso(parseDateInput("2024-01-15", "auto", "local"))).toBe("2024-01-15T05:00:00.000Z");
  });

  it("keeps milliseconds and notes dropped sub-millisecond digits", () => {
    expect(iso(parseDateInput("2024-03-15T14:30:00.25Z", "auto", "utc"))).toBe("2024-03-15T14:30:00.250Z");
    const micro = parseDateInput("2024-03-15T14:30:00.123456Z", "auto", "utc");
    expect(iso(micro)).toBe("2024-03-15T14:30:00.123Z");
    expect(micro.ok && micro.notes[0]).toMatch(/millisecond precision/);
  });

  it("rejects impossible dates and times", () => {
    expect(error(parseDateInput("2023-02-29", "auto", "utc"))).toMatch(/February 2023 has no day 29/);
    expect(error(parseDateInput("2024-02-30", "auto", "utc"))).toMatch(/no day 30/);
    expect(error(parseDateInput("2024-13-01", "auto", "utc"))).toMatch(/Month 13/);
    expect(error(parseDateInput("2024-04-31", "iso", "utc"))).toMatch(/April 2024 has no day 31/);
    expect(error(parseDateInput("2024-03-15T25:00Z", "auto", "utc"))).toMatch(/Hour 25/);
    expect(error(parseDateInput("2024-03-15T24:00Z", "auto", "utc"))).toMatch(/24:00/);
    expect(error(parseDateInput("2016-12-31T23:59:60Z", "auto", "utc"))).toMatch(/Leap seconds/);
    expect(error(parseDateInput("2024-03-15T10:00+25:00", "auto", "utc"))).toMatch(/not valid/);
  });

  it("accepts 29 February in leap years", () => {
    expect(iso(parseDateInput("2024-02-29", "iso", "utc"))).toBe("2024-02-29T00:00:00.000Z");
    expect(iso(parseDateInput("2000-02-29", "iso", "utc"))).toBe("2000-02-29T00:00:00.000Z");
    expect(parseDateInput("1900-02-29", "iso", "utc").ok).toBe(false);
  });

  it("handles years before 100 without shifting them to the 1900s", () => {
    expect(iso(parseDateInput("0050-06-01", "iso", "utc"))).toBe("0050-06-01T00:00:00.000Z");
  });
});

describe("daylight saving time", () => {
  it("rejects a local time skipped when clocks go forward", () => {
    // New York skipped 02:00–03:00 on 10 March 2024.
    expect(error(parseDateInput("2024-03-10 02:30", "auto", "local"))).toMatch(/does not exist/);
  });

  it("rejects a local time that happens twice when clocks go back", () => {
    // 01:30 happened twice on 3 November 2024.
    const message = error(parseDateInput("2024-11-03 01:30", "auto", "local"));
    expect(message).toMatch(/happens twice/);
    expect(message).toContain("-04:00");
    expect(message).toContain("-05:00");
  });

  it("accepts the same wall times when an offset or UTC removes the ambiguity", () => {
    expect(iso(parseDateInput("2024-11-03 01:30-05:00", "auto", "local"))).toBe("2024-11-03T06:30:00.000Z");
    expect(iso(parseDateInput("2024-03-10 02:30", "auto", "utc"))).toBe("2024-03-10T02:30:00.000Z");
  });

  it("accepts times just outside the transitions", () => {
    expect(iso(parseDateInput("2024-03-10 03:00", "auto", "local"))).toBe("2024-03-10T07:00:00.000Z");
    expect(iso(parseDateInput("2024-11-03 02:00", "auto", "local"))).toBe("2024-11-03T07:00:00.000Z");
  });
});

describe("ambiguous numeric dates", () => {
  it("refuses to guess the order of 03/04/2024 in auto mode", () => {
    expect(error(parseDateInput("03/04/2024", "auto", "utc"))).toMatch(/ambiguous/);
    expect(error(parseDateInput("13/04/2024", "auto", "utc"))).toMatch(/ambiguous/);
    expect(error(parseDateInput("03-04-2024", "auto", "utc"))).toMatch(/ambiguous/);
    expect(error(parseDateInput("3.4.2024", "auto", "utc"))).toMatch(/ambiguous/);
  });

  it("reads the order the user chose", () => {
    expect(iso(parseDateInput("03/04/2024", "dmy", "utc"))).toBe("2024-04-03T00:00:00.000Z");
    expect(iso(parseDateInput("03/04/2024", "mdy", "utc"))).toBe("2024-03-04T00:00:00.000Z");
    expect(iso(parseDateInput("31.12.2024 23:59", "dmy", "utc"))).toBe("2024-12-31T23:59:00.000Z");
  });

  it("validates against the chosen order", () => {
    expect(error(parseDateInput("13/04/2024", "mdy", "utc"))).toMatch(/Month 13/);
    expect(error(parseDateInput("31/02/2024", "dmy", "utc"))).toMatch(/no day 31/);
  });

  it("accepts year-first numeric dates, which have one reading", () => {
    expect(iso(parseDateInput("2024/03/04", "auto", "utc"))).toBe("2024-03-04T00:00:00.000Z");
  });

  it("rejects two-digit years", () => {
    expect(error(parseDateInput("03/04/24", "dmy", "utc"))).toMatch(/four digits/);
    expect(error(parseDateInput("15 March 24", "auto", "utc"))).toMatch(/four digits/);
  });
});

describe("written dates", () => {
  it("reads RFC 2822 and HTTP dates", () => {
    expect(iso(parseDateInput("Fri, 15 Mar 2024 14:30:00 GMT", "auto", "local"))).toBe("2024-03-15T14:30:00.000Z");
    expect(iso(parseDateInput("Fri, 15 Mar 2024 14:30:00 +0200", "text", "local"))).toBe("2024-03-15T12:30:00.000Z");
    expect(iso(parseDateInput("15 Mar 2024 09:30 EST", "auto", "utc"))).toBe("2024-03-15T14:30:00.000Z");
  });

  it("reads day-first and month-first dates with English month names", () => {
    expect(iso(parseDateInput("15 March 2024", "auto", "utc"))).toBe("2024-03-15T00:00:00.000Z");
    expect(iso(parseDateInput("March 15, 2024", "auto", "utc"))).toBe("2024-03-15T00:00:00.000Z");
    expect(iso(parseDateInput("Sept 1st 2024", "auto", "utc"))).toBe("2024-09-01T00:00:00.000Z");
    expect(iso(parseDateInput("march 15 2024 at 2:30 pm", "auto", "utc"))).toBe("2024-03-15T14:30:00.000Z");
    expect(iso(parseDateInput("March 15, 2024 12:05 AM", "auto", "utc"))).toBe("2024-03-15T00:05:00.000Z");
  });

  it("rejects a weekday that does not match the date", () => {
    expect(error(parseDateInput("Mon, 15 Mar 2024 14:30:00 GMT", "auto", "utc"))).toMatch(/is a Friday/);
  });

  it("rejects ambiguous zone abbreviations", () => {
    expect(error(parseDateInput("15 Mar 2024 14:30 IST", "auto", "utc"))).toMatch(/ambiguous/);
  });

  it("rejects invalid 12-hour times", () => {
    expect(error(parseDateInput("March 15, 2024 13:00 PM", "auto", "utc"))).toMatch(/hours 1 to 12/);
  });

  it("does not fall back to Date.parse for unknown formats", () => {
    expect(error(parseDateInput("next tuesday", "auto", "utc"))).toMatch(/not recognized/);
    expect(error(parseDateInput("2024-03-15T14:30:00 Europe/Paris", "auto", "utc"))).toMatch(/not recognized/);
    expect(error(parseDateInput("", "auto", "utc"))).toMatch(/Enter a date/);
  });
});

describe("Unix time", () => {
  it("detects seconds and milliseconds by length and explains the guess", () => {
    const seconds = parseDateInput("1710513000", "auto", "local");
    expect(iso(seconds)).toBe("2024-03-15T14:30:00.000Z");
    expect(seconds.ok && seconds.notes[0]).toMatch(/seconds because it has 10 digits/);
    expect(iso(parseDateInput("1710513000123", "auto", "local"))).toBe("2024-03-15T14:30:00.123Z");
  });

  it("uses the unit the user chose", () => {
    expect(iso(parseDateInput("1710513000", "unix-ms", "utc"))).toBe("1970-01-20T19:08:33.000Z");
    expect(iso(parseDateInput("-86400", "unix-s", "utc"))).toBe("1969-12-31T00:00:00.000Z");
  });

  it("rejects non-numbers and out-of-range values", () => {
    expect(error(parseDateInput("12abc", "unix-s", "utc"))).toMatch(/number/);
    expect(parseDateInput("99999999999999999", "unix-s", "utc").ok).toBe(false);
  });
});

describe("formatting", () => {
  const ms = Date.UTC(2024, 2, 15, 14, 30, 5, 250);

  it("formats RFC 2822, HTTP, local ISO, week and ordinal dates", () => {
    expect(toRfc2822(ms)).toBe("Fri, 15 Mar 2024 14:30:05 +0000");
    expect(toHttpDate(ms)).toBe("Fri, 15 Mar 2024 14:30:05 GMT");
    expect(toLocalIso(ms)).toBe("2024-03-15T10:30:05.250-04:00");
    expect(toIsoWeek(ms)).toBe("2024-W11-5");
    expect(toOrdinal(ms)).toBe("2024-075");
  });

  it("uses the ISO week-numbering year at year boundaries", () => {
    expect(toIsoWeek(Date.UTC(2021, 0, 1))).toBe("2020-W53-5");
    expect(toIsoWeek(Date.UTC(2024, 11, 30))).toBe("2025-W01-1");
  });

  it("produces every output, including relative time", () => {
    const outputs = formatDateOutputs(ms, { now: ms + 3_600_000, locale: "en-US" });
    const byId = Object.fromEntries(outputs.map((o) => [o.id, o.value]));
    expect(byId["iso-utc"]).toBe("2024-03-15T14:30:05.250Z");
    expect(byId["unix-s"]).toBe("1710513005.25");
    expect(byId["unix-ms"]).toBe("1710513005250");
    expect(byId.utc).toContain("March 15, 2024");
    expect(byId.relative).toBe("1 hour ago");
  });

  it("marks formats that cannot show years beyond 9999", () => {
    const outputs = formatDateOutputs(Date.UTC(20000, 0, 1));
    expect(outputs.find((o) => o.id === "rfc2822")?.value).toMatch(/Not available/);
  });
});
