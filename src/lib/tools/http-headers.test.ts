import { describe, expect, it } from "vitest";
import { SAMPLE_HEADERS, analyzeHeaders, formatSeconds, parseDirectives, parseHeaders } from "@/lib/tools/http-headers";

const titles = (text: string, https = true) => analyzeHeaders(text, { https }).findings.map((f) => `${f.severity}: ${f.title}`);
const GOOD = `HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Cache-Control: no-cache
ETag: "abc"
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-r4nd'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=()
Cross-Origin-Opener-Policy: same-origin`;

describe("parsing", () => {
  it("reads the status line, headers and line numbers", () => {
    const r = parseHeaders("HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nX-Empty:\r\n");
    expect(r.status).toEqual({ version: "1.1", code: 404, reason: "Not Found", name: "Not Found" });
    expect(r.headers).toEqual([{ name: "Content-Type", value: "text/plain", line: 2 }, { name: "X-Empty", value: "", line: 3 }]);
    expect(r.problems).toEqual([]);
  });

  it("accepts headers without a status line and HTTP/2 pseudo-headers", () => {
    expect(parseHeaders("vary: accept").status).toBeNull();
    expect(parseHeaders(":status: 304\ncache-control: max-age=1").status).toMatchObject({ code: 304, version: "2" });
  });

  it("keeps only the last response from a redirect chain", () => {
    const r = parseHeaders("HTTP/1.1 301 Moved\nLocation: /b\n\nHTTP/2 200\nserver: x");
    expect(r.responses).toBe(2);
    expect(r.status?.code).toBe(200);
    expect(r.headers.map((h) => h.name)).toEqual(["server"]);
  });

  it("reports invalid lines, names and folding", () => {
    const r = parseHeaders("Good: yes\nnot a header\nBad Name: x\nFolded: a\n  b");
    expect(r.problems.map((p) => p.line)).toEqual([2, 3, 5]);
    expect(r.problems[1].message).toContain("not a valid header name");
    expect(r.headers.find((h) => h.name === "Folded")?.value).toBe("a b");
  });

  it("parses directives and durations", () => {
    expect([...parseDirectives('public, Max-Age=60, community="UCI"')]).toEqual([["public", ""], ["max-age", "60"], ["community", "UCI"]]);
    expect(formatSeconds(31536000)).toBe("1 year");
    expect(formatSeconds(90)).toBe("1.5 minutes");
    expect(formatSeconds(0)).toBe("0 seconds");
  });
});

describe("analysis", () => {
  it("finds no warnings or errors in a well-configured response", () => {
    const a = analyzeHeaders(GOOD, { https: true });
    expect(a.findings.filter((f) => f.severity === "error" || f.severity === "warning")).toEqual([]);
    expect(a.checklist.every((c) => c.present)).toBe(true);
    expect(a.caching).toBe("Stored, but revalidated with the server before every use.");
    expect(titles(GOOD)).toContain("ok: HSTS for 2 years, including subdomains");
  });

  it("flags the problems in the sample", () => {
    const t = titles(SAMPLE_HEADERS);
    expect(t).toContain("error: Wildcard origin with credentials");
    expect(t).toContain("warning: HSTS max-age is short (1 day)");
    expect(t).toContain('warning: X-Frame-Options: "ALLOW-FROM https://partner.example" is not supported');
    expect(t).toContain("warning: No Content-Security-Policy");
    expect(t).toContain("warning: No X-Content-Type-Options");
    expect(t).toContain("warning: text/html without charset");
    expect(t).toContain("warning: Cookie session: missing Secure");
    expect(t).toContain("warning: Set-Cookie on a response shared caches may store");
    expect(t).toContain("info: X-XSS-Protection is obsolete");
    expect(t).toContain('info: x-powered-by reveals "Express 4.18.2"');
    // Errors come first.
    expect(t[0]).toMatch(/^error/);
  });

  it("checks CSP sources", () => {
    expect(titles("Content-Security-Policy: script-src 'self' 'unsafe-inline' 'unsafe-eval' https:")).toEqual(
      expect.arrayContaining(["warning: CSP allows inline scripts", "warning: CSP allows eval()", "warning: CSP allows scripts from any host"]),
    );
    expect(titles("Content-Security-Policy: script-src 'unsafe-inline' 'nonce-x'")).not.toContain("warning: CSP allows inline scripts");
    expect(titles("Content-Security-Policy: img-src *")).toContain("warning: CSP does not restrict scripts");
    expect(titles("Content-Security-Policy-Report-Only: default-src 'self'")).toContain("info: CSP is in report-only mode");
  });

  it("checks cookies", () => {
    expect(titles("Set-Cookie: a=1; SameSite=None")).toContain("error: Cookie a: SameSite=None without Secure");
    expect(titles("Set-Cookie: __Host-id=1; Secure; Path=/app")).toContain("error: Cookie __Host-id: __Host- prefix rules broken");
    expect(titles("Set-Cookie: __Secure-id=1; HttpOnly; SameSite=Lax")).toContain("error: Cookie __Secure-id: __Secure- prefix without Secure");
    expect(titles("Set-Cookie: id=1; Secure; HttpOnly; SameSite=Lax").filter((t) => t.includes("Cookie"))).toEqual([]);
    expect(titles("Set-Cookie: id=1", false)).not.toContain("warning: Cookie id: missing Secure");
  });

  it("checks CORS", () => {
    expect(titles("Access-Control-Allow-Origin: https://a.example, https://b.example")).toContain("error: Access-Control-Allow-Origin lists several origins");
    expect(titles("Access-Control-Allow-Origin: https://a.example")).toContain("warning: Specific origin without Vary: Origin");
    expect(titles("Access-Control-Allow-Origin: https://a.example\nVary: Accept, Origin")).not.toContain("warning: Specific origin without Vary: Origin");
    expect(titles("Access-Control-Allow-Origin: null")).toContain("warning: Access-Control-Allow-Origin: null");
  });

  it("explains caching", () => {
    expect(analyzeHeaders("Cache-Control: public, max-age=31536000, immutable", { https: true }).caching).toBe("Cached: fresh for 1 year in browsers, never revalidated while fresh (immutable).");
    expect(analyzeHeaders("Cache-Control: private, max-age=60, s-maxage=600", { https: true }).caching).toBe("Cached: fresh for 1 minute in the browser only.");
    expect(analyzeHeaders("Cache-Control: no-store, max-age=60", { https: true }).caching).toBe("Not stored by any cache.");
    expect(titles("Cache-Control: no-store, max-age=60")).toContain("info: no-store overrides the other directives");
    expect(titles("Cache-Control: max-age=soon")).toContain("error: Cache-Control max-age is not a number of seconds");
    expect(titles("Cache-Control: public, private")).toContain("warning: Cache-Control has both public and private");
    expect(titles("Vary: *")).toContain("warning: Vary: *");
    expect(titles("HTTP/1.1 200 OK\nContent-Type: text/plain; charset=utf-8")).toEqual(expect.arrayContaining(["info: No Cache-Control", "info: No ETag or Last-Modified"]));
  });

  it("checks content, framing, duplicates and redirects", () => {
    expect(titles("Content-Length: 10\nContent-Length: 12")).toContain("error: Content-Length appears 2 times");
    expect(titles("Content-Type: text/html; charset=utf-8\nContent-Type: text/html; charset=utf-8")).toContain("warning: Content-Type appears 2 times");
    expect(titles("Content-Length: ten")).toContain("error: Content-Length is not a number of bytes");
    expect(titles("Transfer-Encoding: chunked\nContent-Length: 5")).toContain("error: Both Transfer-Encoding and Content-Length");
    expect(titles("HTTP/2 200\nconnection: keep-alive")).toContain("warning: connection is not allowed in HTTP/2");
    expect(titles("HTTP/1.1 302 Found")).toContain("error: 302 redirect without Location");
    expect(titles("HTTP/1.1 302 Found")).not.toContain("warning: No Content-Type");
    expect(titles("HTTP/1.1 204 No Content")).not.toContain("warning: No Content-Type");
    expect(titles("HTTP/1.1 429 Too Many Requests")).toContain("info: 429 without Retry-After");
    expect(titles("Content-Type: nonsense")).toContain('error: Content-Type "nonsense" is not a valid media type');
  });

  it("does not ask for HSTS over HTTP", () => {
    expect(titles("Content-Type: text/plain", false)).not.toContain("warning: No Strict-Transport-Security");
    expect(titles("Strict-Transport-Security: max-age=31536000", false)).toContain("info: HSTS is ignored over HTTP");
  });

  it("handles empty input", () => {
    const a = analyzeHeaders("", { https: true });
    expect(a.headers).toEqual([]);
    expect(a.responses).toBe(0);
  });
});
