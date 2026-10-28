import { describe, expect, it } from "vitest";
import { tokenize } from "@/lib/tools/shell";

const args = (input: string) => {
  const result = tokenize(input);
  if (!result.ok) throw new Error(result.error);
  return result.args;
};

describe("tokenize", () => {
  it("splits on whitespace and handles quotes", () => {
    expect(args(`curl  -H 'A: b c'   "d e" f\\ g`)).toEqual(["curl", "-H", "A: b c", "d e", "f g"]);
    expect(args(`a'b'"c"d`)).toEqual(["abcd"]);
    expect(args(`'' ""`)).toEqual(["", ""]);
  });

  it("keeps single-quoted text literal", () => {
    expect(args(`'a\\nb $HOME "x"'`)).toEqual([`a\\nb $HOME "x"`]);
  });

  it("applies double-quote escapes only to \\ \" $ and backtick", () => {
    expect(args(`"a\\"b\\\\c\\$d\\ne"`)).toEqual([`a"b\\c$d\\ne`]);
  });

  it("decodes $'ANSI-C' quotes as used by Chrome's Copy as cURL", () => {
    expect(args(`$'{"a":"it\\'s"}\\n\\t\\x41\\u00e9\\U0001F600\\101'`)).toEqual([`{"a":"it's"}\n\tAé😀A`]);
  });

  it("joins backslash-newline continuations, including CRLF", () => {
    expect(args("curl \\\n  -X POST \\\r\n  https://x")).toEqual(["curl", "-X", "POST", "https://x"]);
  });

  it("skips comments", () => {
    expect(args("a # comment\nb")).toEqual(["a", "b"]);
    expect(args("a#b")).toEqual(["a#b"]);
  });

  it("keeps variables literally with a warning", () => {
    const result = tokenize(`curl -H "Authorization: Bearer $TOKEN" $URL`);
    expect(result).toMatchObject({ ok: true, args: ["curl", "-H", "Authorization: Bearer $TOKEN", "$URL"] });
    expect(result.ok && result.warnings.join(" ")).toMatch(/\$TOKEN.*literal/);
  });

  it("preserves newlines inside quotes", () => {
    expect(args(`'line1\nline2'`)).toEqual(["line1\nline2"]);
  });

  it("rejects unterminated quotes", () => {
    expect(tokenize(`'abc`)).toMatchObject({ ok: false, error: expect.stringContaining("single quote at position 1") });
    expect(tokenize(`x "abc`)).toMatchObject({ ok: false, error: expect.stringContaining("double quote at position 3") });
    expect(tokenize(`$'abc`)).toMatchObject({ ok: false });
  });

  it("rejects pipes, separators, redirections and substitution", () => {
    expect(tokenize("curl x | jq")).toMatchObject({ ok: false, error: expect.stringContaining("pipe") });
    expect(tokenize("a; b")).toMatchObject({ ok: false, error: expect.stringContaining("separator") });
    expect(tokenize("a && b")).toMatchObject({ ok: false });
    expect(tokenize("curl x > out")).toMatchObject({ ok: false, error: expect.stringContaining("redirection") });
    expect(tokenize("curl $(cat url)")).toMatchObject({ ok: false, error: expect.stringContaining("substitution") });
    expect(tokenize('curl "`id`"')).toMatchObject({ ok: false, error: expect.stringContaining("substitution") });
  });

  it("allows those characters inside quotes", () => {
    expect(args(`'a | b; c > d && e'`)).toEqual(["a | b; c > d && e"]);
    expect(args(`"x&y"`)).toEqual(["x&y"]);
  });

  it("rejects Windows cmd syntax", () => {
    expect(tokenize('curl ^"https://x^" ^\n -H ^"a^"')).toMatchObject({ ok: false, error: expect.stringContaining("Windows") });
  });

  it("rejects overlong input", () => {
    expect(tokenize("a".repeat(100_001)).ok).toBe(false);
  });

  it("returns no arguments for blank input", () => {
    expect(args("  \n ")).toEqual([]);
  });
});
