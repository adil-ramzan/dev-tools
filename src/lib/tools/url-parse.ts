/**
 * URL parsing with the WHATWG URL API that browsers use, so results match
 * what a browser would request. Nothing is fetched.
 *
 * Query parameters are read with URLSearchParams, which keeps repeated keys
 * in order and decodes + as a space (form encoding). The rebuilt URL uses the
 * same encoding, so editing parameters cannot produce an ambiguous query.
 */

export const DEFAULT_PORTS: Record<string, string> = { "http:": "80", "https:": "443", "ws:": "80", "wss:": "443", "ftp:": "21" };

export type QueryParam = { key: string; value: string };

export type ParsedUrl = {
  href: string;
  protocol: string;
  username: string;
  password: string;
  hostname: string;
  port: string;
  /** The port used, including the scheme's default when none is written. */
  effectivePort: string;
  host: string;
  origin: string;
  pathname: string;
  /** Decoded path segments. */
  segments: string[];
  search: string;
  params: QueryParam[];
  hash: string;
  warnings: string[];
};

export type ParseUrlResult = { ok: true; url: ParsedUrl } | { ok: false; error: string; suggestion?: string };

export const MAX_URL_LENGTH = 65_536;

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

export function parseUrl(input: string, base = ""): ParseUrlResult {
  const text = input.trim();
  if (text === "") return { ok: false, error: "Enter a URL, e.g. https://example.com/path?q=1#top." };
  if (text.length > MAX_URL_LENGTH) return { ok: false, error: "The URL is longer than 65,536 characters." };

  let url: URL;
  let usedBase = false;
  try {
    url = new URL(text);
  } catch {
    const baseText = base.trim();
    if (baseText) {
      try {
        url = new URL(text, baseText);
        usedBase = true;
      } catch {
        return { ok: false, error: `The base URL "${baseText}" is not a valid absolute URL.` };
      }
    } else if (/^(\/|\.{1,2}\/|\?|#)/.test(text)) {
      return { ok: false, error: "This is a relative URL: it has no scheme or host, so it only has a meaning relative to another page. Enter a base URL to resolve it against." };
    } else if (/^[^\s/:?#]+\.[^\s/:?#]+(:\d+)?([/?#]|$)/.test(text)) {
      return { ok: false, error: "The URL has no scheme (such as https://), so browsers would treat it as a relative path.", suggestion: `https://${text}` };
    } else if (/\s/.test(text)) {
      return { ok: false, error: "The URL contains spaces. Encode them as %20, or check that you pasted a single URL." };
    } else {
      return { ok: false, error: "This is not a valid URL. A URL needs a scheme, such as https://, and for web addresses a host name." };
    }
  }

  // "localhost:3000" parses with "localhost:" as the scheme, which is almost never what was meant.
  if (!usedBase && /^[A-Za-z][\w.+-]*:\d+([/?#]|$)/.test(text)) {
    return { ok: false, error: `"${url.protocol.slice(0, -1)}" was read as a scheme, not a host name, because the URL does not start with one such as http://.`, suggestion: `http://${text}` };
  }

  const warnings: string[] = [];
  if (usedBase) warnings.push("The URL was resolved against the base URL.");
  if (text !== input) warnings.push("Leading or trailing whitespace was removed.");
  if (text.includes("\\") && (url.protocol === "http:" || url.protocol === "https:")) warnings.push("Backslashes were read as forward slashes, as browsers do for web URLs.");
  if (url.username || url.password) warnings.push("The URL contains a username or password. Credentials in URLs end up in logs and browser history; browsers also use them to disguise phishing links.");
  if (url.protocol === "javascript:" || url.protocol === "data:" || url.protocol === "vbscript:") warnings.push(`${url.protocol} URLs run code or embed content instead of pointing to a resource. Never put untrusted ones in links.`);
  if (url.hostname.startsWith("xn--") || url.hostname.includes(".xn--")) warnings.push("The host name uses Punycode (xn--), the ASCII form of an internationalized domain name. Check it is the domain you expect.");
  if (url.port && DEFAULT_PORTS[url.protocol] === undefined) warnings.push(`Port ${url.port} is used.`);

  const special = url.protocol in DEFAULT_PORTS || url.protocol === "file:";
  const segments = special || url.pathname.startsWith("/") ? url.pathname.split("/").slice(1).map(decodeSegment) : [];
  const hostname = url.hostname;
  if (IPV4.test(hostname) || hostname.startsWith("[")) warnings.push("The host is an IP address rather than a domain name.");

  return {
    ok: true,
    url: {
      href: url.href,
      protocol: url.protocol,
      username: decodeSegment(url.username),
      password: decodeSegment(url.password),
      hostname,
      port: url.port,
      effectivePort: url.port || DEFAULT_PORTS[url.protocol] || "",
      host: url.host,
      origin: url.origin,
      pathname: url.pathname,
      segments,
      search: url.search,
      params: Array.from(url.searchParams, ([key, value]) => ({ key, value })),
      hash: url.hash,
      warnings,
    },
  };
}

/** Replaces the query string of `href` with `params`, keeping their order and repeated keys. */
export function withParams(href: string, params: QueryParam[]): string {
  const url = new URL(href);
  const search = new URLSearchParams();
  for (const { key, value } of params) if (key !== "" || value !== "") search.append(key, value);
  url.search = search.toString();
  return url.href;
}

/** Groups repeated keys, e.g. tag=a&tag=b → tag: [a, b]. */
export function groupParams(params: QueryParam[]): { key: string; values: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const { key, value } of params) groups.set(key, [...(groups.get(key) ?? []), value]);
  return [...groups].map(([key, values]) => ({ key, values }));
}

/** The query as JSON, with repeated keys as arrays. */
export function paramsToJson(params: QueryParam[]): string {
  const object: Record<string, string | string[]> = {};
  for (const { key, values } of groupParams(params)) object[key] = values.length === 1 ? values[0] : values;
  return JSON.stringify(object, null, 2);
}
