import { describe, expect, it } from "vitest";
import { PRESETS, explain, parseOctal, parsePermissions, parseSymbolic, toChmodSymbolic, toOctal, toSymbolic, warnings, type Permissions } from "@/lib/tools/chmod";

const perms = (input: string): Permissions => {
  const r = parsePermissions(input);
  if (!r.ok) throw new Error(r.error);
  return r.permissions;
};

describe("octal ↔ symbolic", () => {
  it.each([
    ["755", "rwxr-xr-x", "u=rwx,g=rx,o=rx"],
    ["644", "rw-r--r--", "u=rw,g=r,o=r"],
    ["600", "rw-------", "u=rw,g=,o="],
    ["000", "---------", "u=,g=,o="],
    ["777", "rwxrwxrwx", "u=rwx,g=rwx,o=rwx"],
    ["4755", "rwsr-xr-x", "u=rwxs,g=rx,o=rx"],
    ["2775", "rwxrwsr-x", "u=rwx,g=rwxs,o=rx"],
    ["1777", "rwxrwxrwt", "u=rwx,g=rwx,o=rwxt"],
    ["4644", "rwSr--r--", "u=rws,g=r,o=r"],
    ["1666", "rw-rw-rwT", "u=rw,g=rw,o=rwt"],
    ["7777", "rwsrwsrwt", "u=rwxs,g=rwxs,o=rwxt"],
  ])("%s is %s", (octal, symbolic, chmod) => {
    const p = perms(octal);
    expect(toSymbolic(p)).toBe(symbolic);
    expect(toChmodSymbolic(p)).toBe(chmod);
    expect(toOctal(perms(symbolic))).toBe(octal);
  });

  it("accepts a leading zero and prints four digits on request", () => {
    expect(toOctal(perms("0755"))).toBe("755");
    expect(toOctal(perms("755"), { full: true })).toBe("0755");
  });

  it("reads ls -l output with a file type and ACL or SELinux marker", () => {
    expect(parseSymbolic("drwxr-xr-x")).toMatchObject({ ok: true, fileType: "directory" });
    expect(parseSymbolic("-rw-r--r--.")).toMatchObject({ ok: true, fileType: "regular file" });
    expect(parseSymbolic("lrwxrwxrwx")).toMatchObject({ ok: true, fileType: "symbolic link" });
    expect(toOctal(perms("-rw-r-----+"))).toBe("640");
  });
});

describe("validation", () => {
  it("rejects invalid octal modes", () => {
    expect(parseOctal("78")).toMatchObject({ ok: false });
    expect(parseOctal("789")).toMatchObject({ ok: false, error: expect.stringContaining("0 to 7") });
    expect(parseOctal("17777")).toMatchObject({ ok: false });
    expect(parsePermissions("")).toMatchObject({ ok: false });
  });

  it("rejects invalid symbolic strings and explains the position", () => {
    expect(parseSymbolic("rwxr-xr-")).toMatchObject({ ok: false, error: expect.stringContaining("9 characters") });
    expect(parseSymbolic("rwxrwxrwz")).toMatchObject({ ok: false, error: expect.stringContaining("Position 9") });
    expect(parseSymbolic("wrxr-xr-x")).toMatchObject({ ok: false, error: expect.stringContaining("Position 1") });
    expect(parseSymbolic("rwtr-xr-x")).toMatchObject({ ok: false, error: expect.stringContaining("s or S") });
    expect(parseSymbolic("rwxr-xr-s")).toMatchObject({ ok: false, error: expect.stringContaining("t or T") });
    expect(parseSymbolic("xrwxr-xr-x")).toMatchObject({ ok: false, error: expect.stringContaining("file type") });
  });
});

describe("explanations and warnings", () => {
  it("explains file and directory permissions in plain words", () => {
    expect(explain(perms("750"), "file")).toEqual({
      owner: "The owner can read, change and run.",
      group: "Members of the group can read and run.",
      others: "Everyone else has no access.",
    });
    expect(explain(perms("711"), "directory").group).toBe("Members of the group can enter and access files inside.");
  });

  it("warns about risky modes", () => {
    expect(warnings(perms("777")).join(" ")).toMatch(/World-writable/);
    expect(warnings(perms("1777")).join(" ")).toMatch(/\/tmp/);
    expect(warnings(perms("4755")).join(" ")).toMatch(/Setuid/);
    expect(warnings(perms("4644")).join(" ")).toMatch(/capital S/);
    expect(warnings(perms("644"))).toEqual([]);
  });

  it("has valid presets", () => {
    for (const p of PRESETS) expect(parseOctal(p.mode).ok, p.mode).toBe(true);
  });
});
