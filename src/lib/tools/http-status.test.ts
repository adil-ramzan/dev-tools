import { STATUS_CODES } from "node:http";
import { describe, expect, it } from "vitest";
import { HTTP_STATUSES, findStatuses, getStatus, statusClass } from "@/lib/tools/http-status";

describe("HTTP_STATUSES", () => {
  it("has unique codes in order, each with complete fields", () => {
    const codes = HTTP_STATUSES.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect([...codes].sort((a, b) => a - b)).toEqual(codes);
    for (const s of HTTP_STATUSES) {
      expect(s.code).toBeGreaterThanOrEqual(100);
      expect(s.code).toBeLessThan(600);
      expect(s.name && s.spec && s.description && s.usage, String(s.code)).toBeTruthy();
    }
  });

  it("covers every standard code Node.js knows, except vendor-specific and joke codes", () => {
    const ours = new Set(HTTP_STATUSES.map((s) => s.code));
    // 509 is an Apache extension; 418 is listed under its official reserved name.
    const missing = Object.keys(STATUS_CODES).map(Number).filter((c) => !ours.has(c) && c !== 509);
    expect(missing).toEqual([]);
  });

  it("uses current RFC 9110 names", () => {
    expect(getStatus(413)?.name).toBe("Content Too Large");
    expect(getStatus(422)?.name).toBe("Unprocessable Content");
    expect(getStatus(418)?.caution).toMatch(/Reserved/);
    expect(getStatus(305)?.caution).toMatch(/Deprecated/);
  });
});

describe("findStatuses", () => {
  it("finds exact codes and code prefixes", () => {
    expect(findStatuses("404").map((s) => s.code)).toEqual([404]);
    expect(findStatuses("40").map((s) => s.code)).toEqual([400, 401, 402, 403, 404, 405, 406, 407, 408, 409]);
    expect(findStatuses("999")).toEqual([]);
  });

  it("finds a whole class", () => {
    expect(findStatuses("5xx").every((s) => statusClass(s.code) === "5xx")).toBe(true);
    expect(findStatuses("3").length).toBe(9);
  });

  it("matches all words in names and descriptions, ignoring case", () => {
    expect(findStatuses("NOT FOUND").map((s) => s.code)).toContain(404);
    expect(findStatuses("rate limiting").map((s) => s.code)).toEqual([429]);
    expect(findStatuses("redirect post").map((s) => s.code)).toEqual(expect.arrayContaining([301, 302, 307]));
    expect(findStatuses("zzz-no-match")).toEqual([]);
  });

  it("combines queries with class filters", () => {
    expect(findStatuses("", ["2xx"]).map((s) => s.code)).toEqual([200, 201, 202, 203, 204, 205, 206, 207, 208, 226]);
    expect(findStatuses("timeout", ["5xx"]).map((s) => s.code)).toEqual([504]);
    expect(findStatuses("404", ["5xx"])).toEqual([]);
  });

  it("returns everything for an empty query", () => {
    expect(findStatuses("  ")).toHaveLength(HTTP_STATUSES.length);
  });
});
