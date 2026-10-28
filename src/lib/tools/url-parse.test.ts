import { describe, expect, it } from "vitest";
import { groupParams, paramsToJson, parseUrl, withParams } from "@/lib/tools/url-parse";

function parsed(input: string, base?: string) {
  const result = parseUrl(input, base);
  if (!result.ok) throw new Error(result.error);
  return result.url;
}

describe("parseUrl", () => {
  it("splits a URL into its parts", () => {
    const u = parsed("https://user:p%40ss@Example.COM:8443/a%20b/c?q=1&tag=x&tag=y&empty=&plus=a+b#sec-2");
    expect(u).toMatchObject({
      protocol: "https:",
      username: "user",
      password: "p@ss",
      hostname: "example.com",
      port: "8443",
      effectivePort: "8443",
      host: "example.com:8443",
      origin: "https://example.com:8443",
      pathname: "/a%20b/c",
      segments: ["a b", "c"],
      search: "?q=1&tag=x&tag=y&empty=&plus=a+b",
      hash: "#sec-2",
    });
    expect(u.params).toEqual([
      { key: "q", value: "1" },
      { key: "tag", value: "x" },
      { key: "tag", value: "y" },
      { key: "empty", value: "" },
      { key: "plus", value: "a b" },
    ]);
    expect(u.warnings.join(" ")).toMatch(/username or password/);
  });

  it("reports the default port and normalizes like a browser", () => {
    const u = parsed("HTTPS://example.com:443/./a/../b");
    expect(u).toMatchObject({ port: "", effectivePort: "443", pathname: "/b", href: "https://example.com/b" });
    expect(parsed("http://x.test").effectivePort).toBe("80");
  });

  it("keeps non-ASCII and percent-encoded parts readable", () => {
    const u = parsed("https://example.com/caf%C3%A9?city=K%C3%B6ln&q=%E2%9C%93");
    expect(u.segments).toEqual(["café"]);
    expect(u.params).toEqual([{ key: "city", value: "Köln" }, { key: "q", value: "✓" }]);
    expect(parsed("https://example.com/日本").pathname).toBe("/%E6%97%A5%E6%9C%AC");
  });

  it("flags Punycode, IP hosts, backslashes and dangerous schemes", () => {
    expect(parsed("https://münchen.example/").hostname).toBe("xn--mnchen-3ya.example");
    expect(parsed("https://münchen.example/").warnings.join(" ")).toMatch(/Punycode/);
    expect(parsed("http://192.168.0.1/").warnings.join(" ")).toMatch(/IP address/);
    expect(parsed("http://[::1]:8080/").warnings.join(" ")).toMatch(/IP address/);
    expect(parsed("https:\\\\example.com\\a").warnings.join(" ")).toMatch(/Backslashes/);
    expect(parsed("javascript:alert(1)").warnings.join(" ")).toMatch(/run code/);
  });

  it("parses non-web schemes", () => {
    expect(parsed("mailto:ada@example.com?subject=Hi")).toMatchObject({ protocol: "mailto:", pathname: "ada@example.com", params: [{ key: "subject", value: "Hi" }] });
    expect(parsed("file:///home/ada/notes.txt").segments).toEqual(["home", "ada", "notes.txt"]);
  });

  it("explains relative URLs and resolves them against a base", () => {
    expect(parseUrl("/docs?x=1")).toMatchObject({ ok: false, error: expect.stringContaining("relative URL") });
    expect(parseUrl("../img.png")).toMatchObject({ ok: false, error: expect.stringContaining("relative") });
    const u = parsed("../img.png?v=2", "https://example.com/a/b/page.html");
    expect(u.href).toBe("https://example.com/a/img.png?v=2");
    expect(u.warnings).toContain("The URL was resolved against the base URL.");
    expect(parseUrl("/x", "not a base")).toMatchObject({ ok: false, error: expect.stringContaining("base URL") });
  });

  it("suggests a scheme for host-only input", () => {
    expect(parseUrl("example.com/path")).toMatchObject({ ok: false, suggestion: "https://example.com/path" });
    expect(parseUrl("localhost:3000")).toMatchObject({ ok: false, suggestion: "http://localhost:3000" });
    expect(parseUrl("localhost:3000/api?x=1")).toMatchObject({ ok: false, suggestion: "http://localhost:3000/api?x=1" });
    expect(parseUrl("mailto:a@b.test").ok).toBe(true);
  });

  it("rejects empty, invalid and overlong input", () => {
    expect(parseUrl("").ok).toBe(false);
    expect(parseUrl("http://exa mple.com")).toMatchObject({ ok: false });
    expect(parseUrl("https://")).toMatchObject({ ok: false });
    expect(parseUrl("hello world")).toMatchObject({ ok: false, error: expect.stringContaining("spaces") });
    expect(parseUrl("https://x.test/" + "a".repeat(70_000)).ok).toBe(false);
  });

  it("trims whitespace with a warning", () => {
    expect(parsed("  https://x.test  ").warnings).toContain("Leading or trailing whitespace was removed.");
  });
});

describe("query helpers", () => {
  const params = [
    { key: "tag", value: "a b" },
    { key: "q", value: "x&y=z" },
    { key: "tag", value: "c" },
  ];

  it("rebuilds the URL with encoded parameters in order, keeping the fragment", () => {
    expect(withParams("https://x.test/p?old=1#frag", params)).toBe("https://x.test/p?tag=a+b&q=x%26y%3Dz&tag=c#frag");
    expect(withParams("https://x.test/p?old=1", [])).toBe("https://x.test/p");
    expect(withParams("https://x.test/p", [{ key: "", value: "" }])).toBe("https://x.test/p");
  });

  it("round-trips through parse and rebuild", () => {
    const rebuilt = withParams("https://x.test/", params);
    expect(parsed(rebuilt).params).toEqual(params);
  });

  it("groups repeated keys and exports JSON", () => {
    expect(groupParams(params)).toEqual([{ key: "tag", values: ["a b", "c"] }, { key: "q", values: ["x&y=z"] }]);
    expect(JSON.parse(paramsToJson(params))).toEqual({ tag: ["a b", "c"], q: "x&y=z" });
  });
});
