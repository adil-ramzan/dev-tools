import { getStatus } from "@/lib/tools/http-status";

/**
 * Offline analysis of pasted HTTP response headers: parsing, a short
 * explanation of each known header, and checks for common caching,
 * security, CORS and cookie configuration problems. Nothing is fetched; the
 * analysis covers only the text given.
 */

export const MAX_HEADERS_LENGTH = 100_000;

export type Severity = "error" | "warning" | "info" | "ok";

export type HeaderGroup = "security" | "caching" | "cors" | "cookies" | "content" | "other";

export const GROUP_LABELS: Record<HeaderGroup, string> = {
  security: "Security",
  caching: "Caching",
  cors: "CORS",
  cookies: "Cookies",
  content: "Content",
  other: "Other",
};

export type Finding = { severity: Severity; group: HeaderGroup; title: string; detail: string; header?: string };

export type ParsedHeader = { name: string; value: string; line: number };

export type ParseResult = {
  status: { version: string; code: number; reason: string; name?: string } | null;
  headers: ParsedHeader[];
  /** Problems with the text itself, by line. */
  problems: { line: number; message: string }[];
  /** How many responses were pasted (curl -L prints one per redirect); only the last is analyzed. */
  responses: number;
};

const TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const STATUS_LINE = /^HTTP\/(\d(?:\.\d)?)\s+(\d{3})(?:\s+(.*))?$/i;

export function parseHeaders(text: string): ParseResult {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let status: ParseResult["status"] = null;
  let headers: ParsedHeader[] = [];
  let problems: ParseResult["problems"] = [];
  let responses = 0;
  lines.forEach((raw, i) => {
    const line = i + 1;
    if (raw.trim() === "") return;
    const statusMatch = STATUS_LINE.exec(raw.trim());
    if (statusMatch) {
      // A new response starts: keep only the last one, as a browser following redirects would.
      responses++;
      headers = [];
      problems = [];
      const code = Number(statusMatch[2]);
      status = { version: statusMatch[1], code, reason: (statusMatch[3] ?? "").trim(), name: getStatus(code)?.name };
      return;
    }
    if (/^[ \t]/.test(raw) && headers.length > 0) {
      headers[headers.length - 1].value += ` ${raw.trim()}`;
      problems.push({ line, message: "Line folding (a line starting with whitespace) is obsolete (RFC 9112) and rejected by many servers and clients; it was joined to the previous header." });
      return;
    }
    // HTTP/2 and HTTP/3 pseudo-headers as shown by browser developer tools, e.g. ":status: 200".
    const pseudo = /^:([a-z]+):?\s*(.*)$/i.exec(raw.trim());
    if (pseudo) {
      if (pseudo[1].toLowerCase() === "status" && /^\d{3}$/.test(pseudo[2].trim())) {
        responses++;
        const code = Number(pseudo[2].trim());
        status = { version: "2", code, reason: "", name: getStatus(code)?.name };
      }
      return;
    }
    const colon = raw.indexOf(":");
    if (colon <= 0) {
      problems.push({ line, message: `"${raw.trim().slice(0, 60)}" is not a header: expected "Name: value".` });
      return;
    }
    const name = raw.slice(0, colon);
    if (!TOKEN.test(name)) {
      problems.push({ line, message: `"${name.slice(0, 60)}" is not a valid header name${/\s$/.test(name) ? ": there must be no space before the colon" : ""}.` });
      return;
    }
    headers.push({ name, value: raw.slice(colon + 1).trim(), line });
  });
  return { status, headers, problems, responses: Math.max(responses, headers.length ? 1 : 0) };
}

type HeaderInfo = { group: HeaderGroup; summary: string };

/** One-line explanations of headers commonly seen in responses. Keys are lowercase. */
export const HEADER_INFO: Record<string, HeaderInfo> = {
  "strict-transport-security": { group: "security", summary: "HSTS: tells browsers to use only HTTPS for this host for max-age seconds." },
  "content-security-policy": { group: "security", summary: "Restricts where scripts, styles, images, frames and other resources may load from." },
  "content-security-policy-report-only": { group: "security", summary: "A CSP that only reports violations; nothing is blocked." },
  "x-content-type-options": { group: "security", summary: "nosniff stops browsers from guessing a different content type than Content-Type says." },
  "x-frame-options": { group: "security", summary: "Controls whether other sites may show this page in a frame (clickjacking protection)." },
  "referrer-policy": { group: "security", summary: "How much of this page's URL is sent in the Referer header to other pages." },
  "permissions-policy": { group: "security", summary: "Turns browser features such as camera, geolocation or fullscreen on or off for this page and its frames." },
  "cross-origin-opener-policy": { group: "security", summary: "Isolates this page's browsing context from cross-origin pop-ups and openers." },
  "cross-origin-embedder-policy": { group: "security", summary: "Requires embedded resources to opt in to being loaded (needed for cross-origin isolation)." },
  "cross-origin-resource-policy": { group: "security", summary: "Limits which sites may embed this resource." },
  "x-xss-protection": { group: "security", summary: "Legacy XSS filter switch. Modern browsers ignore it." },
  "x-powered-by": { group: "other", summary: "Names the framework that produced the response." },
  server: { group: "other", summary: "Names the server software." },
  "cache-control": { group: "caching", summary: "Caching rules for browsers and shared caches (CDNs, proxies)." },
  expires: { group: "caching", summary: "Date after which the response is stale. Ignored when Cache-Control has max-age." },
  pragma: { group: "caching", summary: "HTTP/1.0 cache directive, superseded by Cache-Control." },
  etag: { group: "caching", summary: "Version identifier, used for conditional requests (If-None-Match) and 304 responses." },
  "last-modified": { group: "caching", summary: "When the resource last changed, used for conditional requests (If-Modified-Since)." },
  age: { group: "caching", summary: "Seconds the response has spent in a shared cache." },
  vary: { group: "caching", summary: "Request headers that caches must include in the cache key." },
  "cdn-cache-control": { group: "caching", summary: "Cache-Control for CDNs only (RFC 9213)." },
  "surrogate-control": { group: "caching", summary: "Cache-Control for CDNs and reverse proxies that support it." },
  "access-control-allow-origin": { group: "cors", summary: "Which origin may read this response from JavaScript (CORS)." },
  "access-control-allow-credentials": { group: "cors", summary: "Whether cross-origin requests with cookies or HTTP auth may read the response." },
  "access-control-allow-methods": { group: "cors", summary: "Methods allowed for cross-origin requests (preflight responses)." },
  "access-control-allow-headers": { group: "cors", summary: "Request headers allowed for cross-origin requests (preflight responses)." },
  "access-control-expose-headers": { group: "cors", summary: "Response headers that cross-origin JavaScript may read." },
  "access-control-max-age": { group: "cors", summary: "Seconds a preflight result may be cached." },
  "set-cookie": { group: "cookies", summary: "Stores a cookie in the browser." },
  "content-type": { group: "content", summary: "Media type of the body, and for text its character encoding." },
  "content-length": { group: "content", summary: "Size of the body in bytes." },
  "content-encoding": { group: "content", summary: "Compression applied to the body, such as gzip, br or zstd." },
  "content-disposition": { group: "content", summary: "Whether to show the body inline or download it, and the file name." },
  "content-language": { group: "content", summary: "Language of the content." },
  "transfer-encoding": { group: "content", summary: "How the body is framed on the wire (HTTP/1.1 chunked)." },
  location: { group: "other", summary: "Where a redirect (3xx) or a created resource (201) points." },
  "retry-after": { group: "other", summary: "How long to wait before retrying (with 429 or 503)." },
  date: { group: "other", summary: "When the response was generated." },
  connection: { group: "other", summary: "Connection options for HTTP/1.1. Not allowed in HTTP/2 and HTTP/3." },
  "keep-alive": { group: "other", summary: "Keep-alive parameters for HTTP/1.1." },
  "alt-svc": { group: "other", summary: "Advertises the same service on another protocol or port, such as HTTP/3." },
  link: { group: "other", summary: "Related resources, such as preload hints or pagination links." },
  "www-authenticate": { group: "security", summary: "Authentication scheme the client should use (with 401)." },
  "accept-ranges": { group: "content", summary: "Whether range requests (partial downloads) are supported." },
  "timing-allow-origin": { group: "other", summary: "Origins allowed to see detailed resource timing." },
  "server-timing": { group: "other", summary: "Server-side timing metrics, visible in developer tools." },
  nel: { group: "other", summary: "Network Error Logging policy." },
  "report-to": { group: "other", summary: "Legacy endpoints for browser reports; replaced by Reporting-Endpoints." },
  "reporting-endpoints": { group: "other", summary: "Endpoints browsers send reports (such as CSP violations) to." },
};

export function headerInfo(name: string): HeaderInfo | undefined {
  return HEADER_INFO[name.toLowerCase()];
}

/** Headers that must appear only once; a second copy is either ignored or makes the response invalid. */
const SINGLETONS = ["content-type", "content-length", "strict-transport-security", "x-frame-options", "x-content-type-options", "referrer-policy", "location", "etag", "last-modified", "expires", "age", "access-control-allow-origin", "access-control-allow-credentials"];

/** Directives of a comma-separated header such as Cache-Control, lowercased, with their values. */
export function parseDirectives(value: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of value.split(",")) {
    const [rawKey, ...rest] = part.split("=");
    const key = rawKey.trim().toLowerCase();
    if (key) map.set(key, rest.join("=").trim().replace(/^"|"$/g, ""));
  }
  return map;
}

/** Seconds as a short duration, e.g. 31536000 → "1 year". */
export function formatSeconds(seconds: number): string {
  const units: [number, string][] = [[31536000, "year"], [86400, "day"], [3600, "hour"], [60, "minute"], [1, "second"]];
  if (seconds === 0) return "0 seconds";
  for (const [size, unit] of units) {
    if (seconds >= size) {
      const n = Math.round((seconds / size) * 10) / 10;
      return `${n} ${unit}${n === 1 ? "" : "s"}`;
    }
  }
  return `${seconds} seconds`;
}

export type AnalyzeOptions = { https: boolean };

export type Analysis = ParseResult & {
  findings: Finding[];
  /** Plain-language caching summary. */
  caching: string;
  /** Recommended security headers and whether each is present. */
  checklist: { name: string; present: boolean }[];
};

const SECURITY_CHECKLIST = ["Strict-Transport-Security", "Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "Cross-Origin-Opener-Policy"];

function cspFindings(policy: string, header: string): Finding[] {
  const findings: Finding[] = [];
  const directives = new Map<string, string[]>();
  for (const part of policy.split(";")) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name && !directives.has(name.toLowerCase())) directives.set(name.toLowerCase(), sources.map((s) => s.toLowerCase()));
  }
  const scripts = directives.get("script-src") ?? directives.get("default-src");
  const add = (severity: Severity, title: string, detail: string) => findings.push({ severity, group: "security", title, detail, header });
  if (!scripts) add("warning", "CSP does not restrict scripts", "There is no script-src or default-src directive, so scripts may load from anywhere.");
  else {
    const strict = scripts.some((s) => s.startsWith("'nonce-") || s.startsWith("'sha") || s === "'strict-dynamic'");
    if (scripts.includes("'unsafe-inline'") && !strict) add("warning", "CSP allows inline scripts", "'unsafe-inline' without a nonce or hash lets injected <script> tags and event handlers run, which removes most XSS protection.");
    if (scripts.includes("'unsafe-eval'")) add("warning", "CSP allows eval()", "'unsafe-eval' lets strings run as code. Remove it unless a dependency really needs it.");
    if (scripts.some((s) => s === "*" || s === "https:" || s === "http:" || s === "data:")) add("warning", "CSP allows scripts from any host", "A wildcard, scheme-only source (https:) or data: in script-src lets an attacker load a script from a host they control.");
  }
  if (!directives.has("object-src") && !directives.get("default-src")?.includes("'none'")) add("info", "CSP: consider object-src 'none'", "Plugins (<object>, <embed>) are rarely needed; blocking them closes an old injection path.");
  if (!directives.has("base-uri")) add("info", "CSP: consider base-uri 'self' or 'none'", "Without base-uri, an injected <base> tag can redirect relative script URLs.");
  return findings;
}

function cookieFindings(value: string, https: boolean): Finding[] {
  const [pair, ...attrParts] = value.split(";");
  const name = pair.split("=")[0].trim();
  const attrs = new Map(attrParts.map((a) => {
    const [k, ...v] = a.split("=");
    return [k.trim().toLowerCase(), v.join("=").trim()] as const;
  }));
  const findings: Finding[] = [];
  const add = (severity: Severity, title: string, detail: string) => findings.push({ severity, group: "cookies", title: `Cookie ${name || "(no name)"}: ${title}`, detail, header: "Set-Cookie" });
  const secure = attrs.has("secure");
  const sameSite = attrs.get("samesite")?.toLowerCase();
  if (!secure && https) add("warning", "missing Secure", "Without Secure the cookie is also sent over plain HTTP, where it can be read or changed.");
  if (!attrs.has("httponly")) add("info", "no HttpOnly", "JavaScript can read this cookie. Add HttpOnly for session cookies so an XSS bug cannot steal them.");
  if (sameSite === "none" && !secure) add("error", "SameSite=None without Secure", "Browsers reject SameSite=None cookies that are not also Secure.");
  else if (!sameSite) add("info", "no SameSite", "Most browsers then treat it as SameSite=Lax. State the value you want explicitly.");
  else if (!["strict", "lax", "none"].includes(sameSite)) add("error", `invalid SameSite value "${attrs.get("samesite")}"`, "Use Strict, Lax or None.");
  if (name.startsWith("__Host-") && (!secure || attrs.has("domain") || attrs.get("path") !== "/")) add("error", "__Host- prefix rules broken", "A __Host- cookie must be Secure, have Path=/ and no Domain, or browsers reject it.");
  if (name.startsWith("__Secure-") && !secure) add("error", "__Secure- prefix without Secure", "Browsers reject __Secure- cookies that are not Secure.");
  return findings;
}

export function analyzeHeaders(text: string, { https }: AnalyzeOptions): Analysis {
  const parsed = parseHeaders(text);
  const findings: Finding[] = [];
  const all = (name: string) => parsed.headers.filter((h) => h.name.toLowerCase() === name);
  const get = (name: string) => all(name)[0]?.value;
  const has = (name: string) => all(name).length > 0;
  const add = (finding: Finding) => findings.push(finding);
  const code = parsed.status?.code;

  if (parsed.responses > 1) add({ severity: "info", group: "other", title: `${parsed.responses} responses pasted`, detail: "Only the last response is analyzed, as a browser following the redirects would see it." });

  // Duplicates
  for (const name of SINGLETONS) {
    const copies = all(name);
    if (copies.length > 1) {
      const distinct = new Set(copies.map((c) => c.value)).size > 1;
      add({ severity: name === "content-length" && distinct ? "error" : "warning", group: headerInfo(name)?.group ?? "other", title: `${copies[0].name} appears ${copies.length} times`, detail: distinct ? "The copies have different values; clients may use either one, or reject the response." : "The copies are identical, but should be sent once.", header: copies[0].name });
    }
  }
  if (all("content-security-policy").length > 1) add({ severity: "info", group: "security", title: "Several Content-Security-Policy headers", detail: "Every policy is enforced: a resource must pass all of them, so the result is stricter than each one alone.", header: "Content-Security-Policy" });

  // Security
  const hsts = get("strict-transport-security");
  if (hsts !== undefined) {
    const d = parseDirectives(hsts.replace(/;/g, ","));
    const maxAge = Number(d.get("max-age"));
    if (!https) add({ severity: "info", group: "security", title: "HSTS is ignored over HTTP", detail: "Browsers only honor Strict-Transport-Security on HTTPS responses.", header: "Strict-Transport-Security" });
    if (!d.has("max-age") || !Number.isFinite(maxAge)) add({ severity: "error", group: "security", title: "HSTS has no valid max-age", detail: "max-age is required, in seconds.", header: "Strict-Transport-Security" });
    else if (maxAge === 0) add({ severity: "warning", group: "security", title: "HSTS max-age=0 turns HSTS off", detail: "This tells browsers to forget the HSTS policy for the host.", header: "Strict-Transport-Security" });
    else if (maxAge < 15768000) add({ severity: "warning", group: "security", title: `HSTS max-age is short (${formatSeconds(maxAge)})`, detail: "Use at least 6 months (15768000); 1 year (31536000) or more is common.", header: "Strict-Transport-Security" });
    else add({ severity: "ok", group: "security", title: `HSTS for ${formatSeconds(maxAge)}${d.has("includesubdomains") ? ", including subdomains" : ""}`, detail: d.has("preload") ? (maxAge >= 31536000 && d.has("includesubdomains") ? "Meets the preload list's requirements." : "preload needs max-age of at least 1 year and includeSubDomains.") : "Add includeSubDomains if every subdomain serves HTTPS.", header: "Strict-Transport-Security" });
  } else if (https) add({ severity: "warning", group: "security", title: "No Strict-Transport-Security", detail: "Without HSTS, a user typing the address can be downgraded to HTTP by an attacker on the network. Example: max-age=31536000; includeSubDomains." });

  const csp = get("content-security-policy");
  if (csp !== undefined) findings.push(...cspFindings(csp, "Content-Security-Policy"));
  else if (has("content-security-policy-report-only")) add({ severity: "info", group: "security", title: "CSP is in report-only mode", detail: "Violations are reported but nothing is blocked. Switch to Content-Security-Policy once the reports are clean.", header: "Content-Security-Policy-Report-Only" });
  else add({ severity: "warning", group: "security", title: "No Content-Security-Policy", detail: "A CSP is the main defense in depth against XSS. Start with default-src 'self' and tighten from there." });

  const nosniff = get("x-content-type-options");
  if (nosniff === undefined) add({ severity: "warning", group: "security", title: "No X-Content-Type-Options", detail: "Send X-Content-Type-Options: nosniff so browsers do not treat uploads or JSON as HTML or script." });
  else if (nosniff.toLowerCase() !== "nosniff") add({ severity: "error", group: "security", title: `X-Content-Type-Options: "${nosniff}" is not valid`, detail: "The only value is nosniff.", header: "X-Content-Type-Options" });

  const xfo = get("x-frame-options")?.toUpperCase();
  const frameAncestors = csp !== undefined && /(^|;)\s*frame-ancestors\b/i.test(csp);
  if (xfo !== undefined && !["DENY", "SAMEORIGIN"].includes(xfo)) add({ severity: "warning", group: "security", title: `X-Frame-Options: "${get("x-frame-options")}" is not supported`, detail: "Only DENY and SAMEORIGIN work in current browsers; ALLOW-FROM is ignored. Use CSP frame-ancestors to allow specific sites.", header: "X-Frame-Options" });
  if (xfo === undefined && !frameAncestors) add({ severity: "warning", group: "security", title: "No clickjacking protection", detail: "Neither X-Frame-Options nor CSP frame-ancestors is set, so any site can frame this page. Use frame-ancestors 'self' (or X-Frame-Options: SAMEORIGIN)." });

  const referrer = get("referrer-policy")?.toLowerCase();
  if (referrer === undefined) add({ severity: "info", group: "security", title: "No Referrer-Policy", detail: "Browsers default to strict-origin-when-cross-origin, which is reasonable. Set it explicitly if URLs can contain private data." });
  else if (referrer.split(",").some((p) => p.trim() === "unsafe-url")) add({ severity: "warning", group: "security", title: "Referrer-Policy: unsafe-url", detail: "The full URL, including path and query, is sent to every site, even from HTTPS to HTTP.", header: "Referrer-Policy" });

  const xss = get("x-xss-protection");
  if (xss !== undefined && xss.trim() !== "0") add({ severity: "info", group: "security", title: "X-XSS-Protection is obsolete", detail: "Modern browsers removed the XSS filter, and in old ones it could introduce leaks. Remove the header or set it to 0, and rely on CSP.", header: "X-XSS-Protection" });

  for (const name of ["server", "x-powered-by", "x-aspnet-version", "x-aspnetmvc-version"]) {
    const value = get(name);
    if (value && (/\d/.test(value) || name !== "server")) add({ severity: "info", group: "security", title: `${all(name)[0].name} reveals "${value.slice(0, 60)}"`, detail: "Version details help attackers match known vulnerabilities. Consider removing or shortening it.", header: all(name)[0].name });
  }

  // CORS
  const acao = all("access-control-allow-origin");
  const credentials = get("access-control-allow-credentials")?.toLowerCase() === "true";
  if (acao.length) {
    const value = acao[0].value;
    if (/[\s,]/.test(value.trim())) add({ severity: "error", group: "cors", title: "Access-Control-Allow-Origin lists several origins", detail: "The header takes exactly one origin, * or null. Check the request's Origin on the server and echo it back if it is allowed.", header: "Access-Control-Allow-Origin" });
    else if (value === "*" && credentials) add({ severity: "error", group: "cors", title: "Wildcard origin with credentials", detail: "Browsers block responses that combine Access-Control-Allow-Origin: * with Access-Control-Allow-Credentials: true.", header: "Access-Control-Allow-Origin" });
    else if (value === "*") add({ severity: "info", group: "cors", title: "Any site may read this response", detail: "Fine for public data. Never use * for responses that depend on cookies or the user's network.", header: "Access-Control-Allow-Origin" });
    else if (value.toLowerCase() === "null") add({ severity: "warning", group: "cors", title: "Access-Control-Allow-Origin: null", detail: "Sandboxed frames and local files send Origin: null, so any site can obtain it. Do not allow it.", header: "Access-Control-Allow-Origin" });
    else if (!(get("vary") ?? "").toLowerCase().split(",").some((v) => ["origin", "*"].includes(v.trim()))) add({ severity: "warning", group: "cors", title: "Specific origin without Vary: Origin", detail: "If the allowed origin depends on the request, a cache can serve one origin's response to another. Add Vary: Origin.", header: "Access-Control-Allow-Origin" });
  } else if (credentials) add({ severity: "info", group: "cors", title: "Allow-Credentials without Allow-Origin", detail: "Access-Control-Allow-Credentials has no effect without Access-Control-Allow-Origin.", header: "Access-Control-Allow-Credentials" });

  // Cookies
  for (const cookie of all("set-cookie")) findings.push(...cookieFindings(cookie.value, https));

  // Content
  const contentType = get("content-type");
  const noBody = code !== undefined && (code === 204 || code === 304 || (code >= 100 && code < 200));
  if (contentType === undefined) {
    if (!noBody && (code === undefined || (code < 300 || code >= 400))) add({ severity: "warning", group: "content", title: "No Content-Type", detail: "Browsers will guess the type, which can turn uploaded text into HTML. Always send Content-Type for responses with a body." });
  } else {
    const type = contentType.split(";")[0].trim().toLowerCase();
    if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(type)) add({ severity: "error", group: "content", title: `Content-Type "${type}" is not a valid media type`, detail: "Use type/subtype, for example text/html; charset=utf-8.", header: "Content-Type" });
    else if ((type.startsWith("text/") || type === "application/javascript") && !/charset=/i.test(contentType)) add({ severity: type === "text/html" ? "warning" : "info", group: "content", title: `${type} without charset`, detail: "Add ; charset=utf-8 so the browser does not have to guess the encoding.", header: "Content-Type" });
  }
  const length = get("content-length");
  if (length !== undefined && !/^\d+$/.test(length)) add({ severity: "error", group: "content", title: "Content-Length is not a number of bytes", detail: `"${length}" is not a non-negative integer.`, header: "Content-Length" });
  if (has("transfer-encoding") && length !== undefined) add({ severity: "error", group: "content", title: "Both Transfer-Encoding and Content-Length", detail: "A response must not have both; mismatches between servers and proxies cause request smuggling.", header: "Transfer-Encoding" });
  if (parsed.status && Number(parsed.status.version) >= 2) {
    for (const name of ["connection", "keep-alive", "transfer-encoding", "upgrade"]) {
      if (has(name)) add({ severity: "warning", group: "other", title: `${all(name)[0].name} is not allowed in HTTP/${parsed.status.version}`, detail: "Connection-specific headers are invalid in HTTP/2 and HTTP/3; clients may reject the response.", header: all(name)[0].name });
    }
  }

  // Redirects and retries
  if (code !== undefined && [301, 302, 303, 307, 308].includes(code) && !has("location")) add({ severity: "error", group: "other", title: `${code} redirect without Location`, detail: "Clients cannot follow a redirect that does not say where to go." });
  if (code !== undefined && (code === 429 || code === 503) && !has("retry-after")) add({ severity: "info", group: "other", title: `${code} without Retry-After`, detail: "Retry-After tells clients how long to back off, which avoids retry storms." });

  // Caching
  const cacheControl = get("cache-control");
  const cc = parseDirectives(cacheControl ?? "");
  const maxAge = cc.has("max-age") ? Number(cc.get("max-age")) : undefined;
  const sMaxAge = cc.has("s-maxage") ? Number(cc.get("s-maxage")) : undefined;
  let caching: string;
  if (cacheControl === undefined) {
    const expires = get("expires");
    caching = expires ? `No Cache-Control; Expires says the response is fresh until ${expires}.` : has("last-modified") || has("etag") ? "No explicit lifetime: caches may guess one (heuristic freshness, typically 10% of the time since Last-Modified)." : "No caching headers: caches may still store the response and guess how long it stays fresh.";
    if (!noBody && code !== undefined && code >= 200 && code < 300) add({ severity: "info", group: "caching", title: "No Cache-Control", detail: "Without it, browsers and CDNs apply heuristics. State the intended policy, for example no-store for private data or max-age for static files." });
  } else {
    if (cc.has("no-store")) caching = "Not stored by any cache.";
    else if (cc.has("no-cache")) caching = "Stored, but revalidated with the server before every use.";
    else {
      const parts: string[] = [];
      if (maxAge !== undefined && Number.isFinite(maxAge)) parts.push(`fresh for ${formatSeconds(maxAge)} in ${cc.has("private") ? "the browser only" : "browsers"}`);
      if (sMaxAge !== undefined && Number.isFinite(sMaxAge) && !cc.has("private")) parts.push(`${formatSeconds(sMaxAge)} in shared caches`);
      caching = parts.length ? `Cached: ${parts.join(", ")}${cc.has("immutable") ? ", never revalidated while fresh (immutable)" : ""}.` : "Cache-Control sets no lifetime: caches may guess one.";
      if (cc.has("stale-while-revalidate")) caching += ` May be served stale for ${formatSeconds(Number(cc.get("stale-while-revalidate")) || 0)} while refreshing.`;
    }
    for (const key of ["max-age", "s-maxage", "stale-while-revalidate", "stale-if-error"]) {
      if (cc.has(key) && !/^\d+$/.test(cc.get(key)!)) add({ severity: "error", group: "caching", title: `Cache-Control ${key} is not a number of seconds`, detail: `"${cc.get(key)}" is invalid; caches ignore it.`, header: "Cache-Control" });
    }
    if (cc.has("public") && cc.has("private")) add({ severity: "warning", group: "caching", title: "Cache-Control has both public and private", detail: "These conflict; caches handle it differently. Keep only one.", header: "Cache-Control" });
    if (cc.has("no-store") && (maxAge || cc.has("public") || cc.has("immutable"))) add({ severity: "info", group: "caching", title: "no-store overrides the other directives", detail: "With no-store nothing is cached, so max-age, public and immutable have no effect.", header: "Cache-Control" });
    if (cc.has("immutable") && !maxAge) add({ severity: "info", group: "caching", title: "immutable without max-age", detail: "immutable only applies while the response is fresh; add a long max-age.", header: "Cache-Control" });
    if (get("expires") && maxAge !== undefined) add({ severity: "info", group: "caching", title: "Expires is ignored", detail: "Cache-Control max-age takes precedence over Expires.", header: "Expires" });
  }
  if (get("pragma")?.toLowerCase() === "no-cache" && cacheControl === undefined) add({ severity: "info", group: "caching", title: "Pragma: no-cache alone", detail: "Pragma is for HTTP/1.0 requests and has no defined meaning in responses. Use Cache-Control: no-cache.", header: "Pragma" });
  const vary = (get("vary") ?? "").toLowerCase();
  if (vary.split(",").some((v) => v.trim() === "*")) add({ severity: "warning", group: "caching", title: "Vary: *", detail: "Every request is treated as different, so shared caches cannot reuse the response.", header: "Vary" });
  else if (/\buser-agent\b/.test(vary)) add({ severity: "info", group: "caching", title: "Vary: User-Agent", detail: "There are thousands of user-agent strings, so caches will rarely get a hit. Vary on a smaller header such as Sec-CH-UA-Mobile if possible.", header: "Vary" });
  const sharedCacheable = cacheControl !== undefined && !cc.has("private") && !cc.has("no-store") && (cc.has("public") || (sMaxAge ?? 0) > 0);
  if (sharedCacheable && has("set-cookie")) add({ severity: "warning", group: "caching", title: "Set-Cookie on a response shared caches may store", detail: "A CDN could serve one user's cookie to others. Mark responses that set cookies private or no-store.", header: "Set-Cookie" });
  if (!noBody && !has("etag") && !has("last-modified") && !cc.has("no-store") && code !== undefined && code >= 200 && code < 300) add({ severity: "info", group: "caching", title: "No ETag or Last-Modified", detail: "Without a validator, a stale response must be downloaded again in full instead of answered with 304 Not Modified." });

  const present = new Set(parsed.headers.map((h) => h.name.toLowerCase()));
  const checklist = SECURITY_CHECKLIST.map((name) => ({ name, present: present.has(name.toLowerCase()) || (name === "Content-Security-Policy" && present.has("content-security-policy-report-only")) }));
  const order: Record<Severity, number> = { error: 0, warning: 1, info: 2, ok: 3 };
  return { ...parsed, findings: findings.sort((a, b) => order[a.severity] - order[b.severity]), caching, checklist };
}

export const SAMPLE_HEADERS = `HTTP/2 200
date: Tue, 27 Oct 2026 14:03:11 GMT
content-type: text/html
cache-control: public, max-age=600
set-cookie: session=8f2a91; Path=/; HttpOnly
strict-transport-security: max-age=86400
x-frame-options: ALLOW-FROM https://partner.example
access-control-allow-origin: *
access-control-allow-credentials: true
x-powered-by: Express 4.18.2
x-xss-protection: 1; mode=block
etag: "33a64df5"`;
