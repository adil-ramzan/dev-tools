/**
 * HTTP status codes from the IANA HTTP Status Code Registry, with the
 * specification that defines each. Unofficial codes used by single vendors
 * (such as nginx's 499 or Cloudflare's 52x) are not included.
 */

export type StatusClass = "1xx" | "2xx" | "3xx" | "4xx" | "5xx";

export type HttpStatus = {
  code: number;
  name: string;
  spec: string;
  description: string;
  usage: string;
  /** Deprecated, unused or experimental codes. */
  caution?: string;
};

export const STATUS_CLASSES: { value: StatusClass; label: string; description: string }[] = [
  { value: "1xx", label: "1xx Informational", description: "The request was received and processing continues." },
  { value: "2xx", label: "2xx Success", description: "The request was received, understood and accepted." },
  { value: "3xx", label: "3xx Redirection", description: "Further action, usually following a Location header, is needed." },
  { value: "4xx", label: "4xx Client error", description: "The request is wrong or cannot be fulfilled as sent." },
  { value: "5xx", label: "5xx Server error", description: "The server failed to fulfil a valid request." },
];

export const HTTP_STATUSES: HttpStatus[] = [
  { code: 100, name: "Continue", spec: "RFC 9110 §15.2.1", description: "The server has received the request headers and the client should send the body.", usage: "Sent in reply to Expect: 100-continue, so a client can check headers (such as authentication or size) before uploading a large body." },
  { code: 101, name: "Switching Protocols", spec: "RFC 9110 §15.2.2", description: "The server is switching to the protocol the client asked for in the Upgrade header.", usage: "Most often seen when a WebSocket connection is opened." },
  { code: 102, name: "Processing", spec: "RFC 2518", description: "The server has accepted the request but has not finished it yet.", usage: "A WebDAV keep-alive for long operations.", caution: "Deprecated: removed from WebDAV in RFC 4918. Clients rarely handle it." },
  { code: 103, name: "Early Hints", spec: "RFC 8297", description: "Preliminary headers sent before the final response.", usage: "Lets browsers start preloading CSS, fonts or scripts (Link: rel=preload) while the server is still building the page." },
  { code: 200, name: "OK", spec: "RFC 9110 §15.3.1", description: "The request succeeded.", usage: "The standard response for successful GET requests, and for other methods that return a result in the body." },
  { code: 201, name: "Created", spec: "RFC 9110 §15.3.2", description: "The request succeeded and created a new resource.", usage: "Return it from POST (or PUT) that creates something, with a Location header pointing to the new resource." },
  { code: 202, name: "Accepted", spec: "RFC 9110 §15.3.3", description: "The request was accepted for processing, which has not finished.", usage: "Use for asynchronous jobs; include a way to check progress, such as a status URL." },
  { code: 203, name: "Non-Authoritative Information", spec: "RFC 9110 §15.3.4", description: "The response was modified by a transforming proxy.", usage: "Rare; set by proxies that change the original server's response." },
  { code: 204, name: "No Content", spec: "RFC 9110 §15.3.5", description: "The request succeeded and there is no body.", usage: "Common for DELETE and for PUT or PATCH that do not return the updated resource. The response must not have a body." },
  { code: 205, name: "Reset Content", spec: "RFC 9110 §15.3.6", description: "The request succeeded; the client should reset the document view, such as a form.", usage: "Rarely used in practice." },
  { code: 206, name: "Partial Content", spec: "RFC 9110 §15.3.7", description: "The server is returning only part of the resource, as requested with a Range header.", usage: "Used for resumable downloads and video seeking; the Content-Range header says which part is sent." },
  { code: 207, name: "Multi-Status", spec: "RFC 4918", description: "The body contains separate status codes for several operations.", usage: "A WebDAV response; some APIs reuse it for batch requests." },
  { code: 208, name: "Already Reported", spec: "RFC 5842", description: "Members of a WebDAV binding were already listed earlier in the response.", usage: "WebDAV only." },
  { code: 226, name: "IM Used", spec: "RFC 3229", description: "The response is the result of instance manipulations, such as a delta, applied to the resource.", usage: "Delta encoding in HTTP; almost never seen." },
  { code: 300, name: "Multiple Choices", spec: "RFC 9110 §15.4.1", description: "The resource has several representations to choose from.", usage: "Rarely used because there is no standard way to choose automatically." },
  { code: 301, name: "Moved Permanently", spec: "RFC 9110 §15.4.2", description: "The resource has moved permanently to the URL in the Location header.", usage: "Use for permanent URL changes; search engines update their index. Clients may change POST to GET on the redirect; use 308 to keep the method." },
  { code: 302, name: "Found", spec: "RFC 9110 §15.4.3", description: "The resource is temporarily at the URL in the Location header.", usage: "The classic temporary redirect. Clients may change POST to GET; use 303 or 307 to be explicit." },
  { code: 303, name: "See Other", spec: "RFC 9110 §15.4.4", description: "The result is at another URL, which should be fetched with GET.", usage: "Redirect after a form POST (the Post/Redirect/Get pattern) so reloading does not resubmit." },
  { code: 304, name: "Not Modified", spec: "RFC 9110 §15.4.5", description: "The cached copy is still valid.", usage: "Sent in reply to conditional requests (If-None-Match, If-Modified-Since); there is no body." },
  { code: 305, name: "Use Proxy", spec: "RFC 9110 §15.4.6", description: "The resource must be accessed through a proxy.", usage: "Do not use.", caution: "Deprecated for security reasons; browsers ignore it." },
  { code: 306, name: "(Unused)", spec: "RFC 9110 §15.4.7", description: "Reserved; was \"Switch Proxy\" in an early draft.", usage: "Do not use.", caution: "Reserved and no longer used." },
  { code: 307, name: "Temporary Redirect", spec: "RFC 9110 §15.4.8", description: "The resource is temporarily at another URL; repeat the same request there.", usage: "Like 302, but the method and body must not change, so a POST stays a POST." },
  { code: 308, name: "Permanent Redirect", spec: "RFC 9110 §15.4.9", description: "The resource has moved permanently; repeat the same request at the new URL.", usage: "Like 301, but the method and body must not change. Good for moving API endpoints." },
  { code: 400, name: "Bad Request", spec: "RFC 9110 §15.5.1", description: "The server cannot process the request because it is malformed.", usage: "Use for syntax errors, invalid JSON or missing required parameters; explain the problem in the body." },
  { code: 401, name: "Unauthorized", spec: "RFC 9110 §15.5.2", description: "Authentication is required or has failed.", usage: "Despite the name, it means unauthenticated. Must include a WWW-Authenticate header. Use 403 when the user is known but not allowed." },
  { code: 402, name: "Payment Required", spec: "RFC 9110 §15.5.3", description: "Reserved for future use.", usage: "Some APIs use it for billing problems, but there is no standard meaning.", caution: "Reserved; behavior is not standardized." },
  { code: 403, name: "Forbidden", spec: "RFC 9110 §15.5.4", description: "The server understood the request but refuses to allow it.", usage: "The client is authenticated (or authentication would not help) but lacks permission. Some servers return 404 instead to hide that the resource exists." },
  { code: 404, name: "Not Found", spec: "RFC 9110 §15.5.5", description: "The server has no resource at this URL.", usage: "The most common error. Use 410 if the resource existed and was deliberately removed." },
  { code: 405, name: "Method Not Allowed", spec: "RFC 9110 §15.5.6", description: "The resource does not support this HTTP method.", usage: "Must include an Allow header listing the supported methods, e.g. Allow: GET, HEAD." },
  { code: 406, name: "Not Acceptable", spec: "RFC 9110 §15.5.7", description: "No representation matches the client's Accept headers.", usage: "Content negotiation failure; many servers return a default format instead." },
  { code: 407, name: "Proxy Authentication Required", spec: "RFC 9110 §15.5.8", description: "The client must authenticate with the proxy.", usage: "Like 401, for proxies; uses Proxy-Authenticate." },
  { code: 408, name: "Request Timeout", spec: "RFC 9110 §15.5.9", description: "The server timed out waiting for the request.", usage: "Sent on idle connections; clients may retry." },
  { code: 409, name: "Conflict", spec: "RFC 9110 §15.5.10", description: "The request conflicts with the current state of the resource.", usage: "Use for edit conflicts, duplicate unique values, or a state that does not allow the change." },
  { code: 410, name: "Gone", spec: "RFC 9110 §15.5.11", description: "The resource was removed and will not come back.", usage: "Tells clients and search engines to remove links to it; stronger than 404." },
  { code: 411, name: "Length Required", spec: "RFC 9110 §15.5.12", description: "The request needs a Content-Length header.", usage: "Rare with modern clients." },
  { code: 412, name: "Precondition Failed", spec: "RFC 9110 §15.5.13", description: "A condition in the request headers was false.", usage: "Used with If-Match for optimistic concurrency: the resource changed since the client last read it." },
  { code: 413, name: "Content Too Large", spec: "RFC 9110 §15.5.14", description: "The request body is larger than the server accepts.", usage: "Formerly \"Payload Too Large\". Common for upload size limits; add Retry-After if the limit is temporary." },
  { code: 414, name: "URI Too Long", spec: "RFC 9110 §15.5.15", description: "The URL is longer than the server will process.", usage: "Often caused by too much data in query strings; send it in a POST body instead." },
  { code: 415, name: "Unsupported Media Type", spec: "RFC 9110 §15.5.16", description: "The server does not support the request body's format.", usage: "Check the Content-Type header, e.g. sending form data to a JSON-only API." },
  { code: 416, name: "Range Not Satisfiable", spec: "RFC 9110 §15.5.17", description: "The requested range is outside the resource.", usage: "Include Content-Range: bytes */length to state the actual size." },
  { code: 417, name: "Expectation Failed", spec: "RFC 9110 §15.5.18", description: "The server cannot meet the Expect request header.", usage: "Usually a reply to an unsupported Expect: 100-continue." },
  { code: 418, name: "(Unused)", spec: "RFC 9110 §15.5.19", description: "Reserved because of \"418 I'm a teapot\" from the 1998 April Fools' RFC 2324.", usage: "Some servers return it as a joke or to refuse unwanted traffic; do not use it in APIs.", caution: "Reserved, not a real status." },
  { code: 421, name: "Misdirected Request", spec: "RFC 9110 §15.5.20", description: "The request reached a server that cannot answer for this host.", usage: "Seen with HTTP/2 connection reuse across host names; clients retry on a new connection." },
  { code: 422, name: "Unprocessable Content", spec: "RFC 9110 §15.5.21", description: "The request is well-formed but its content is invalid.", usage: "Popular for validation errors in APIs: valid JSON with values that break business rules." },
  { code: 423, name: "Locked", spec: "RFC 4918", description: "The resource is locked.", usage: "WebDAV." },
  { code: 424, name: "Failed Dependency", spec: "RFC 4918", description: "The request failed because a request it depended on failed.", usage: "WebDAV." },
  { code: 425, name: "Too Early", spec: "RFC 8470", description: "The server will not process a request that might be replayed.", usage: "Used with TLS 1.3 early data (0-RTT)." },
  { code: 426, name: "Upgrade Required", spec: "RFC 9110 §15.5.22", description: "The client must switch to another protocol, given in the Upgrade header.", usage: "For example, requiring TLS or a newer HTTP version." },
  { code: 428, name: "Precondition Required", spec: "RFC 6585", description: "The request must be conditional.", usage: "Forces clients to send If-Match, preventing lost updates." },
  { code: 429, name: "Too Many Requests", spec: "RFC 6585", description: "The client sent too many requests in a given time.", usage: "Rate limiting. Include Retry-After so clients know when to try again." },
  { code: 431, name: "Request Header Fields Too Large", spec: "RFC 6585", description: "The request headers are too large.", usage: "Often caused by too many or oversized cookies." },
  { code: 451, name: "Unavailable For Legal Reasons", spec: "RFC 7725", description: "The resource cannot be provided for legal reasons.", usage: "Used for censorship or legal blocks; the number refers to Fahrenheit 451." },
  { code: 500, name: "Internal Server Error", spec: "RFC 9110 §15.6.1", description: "The server hit an unexpected condition.", usage: "The generic server error, usually an unhandled exception. Do not expose stack traces in the body." },
  { code: 501, name: "Not Implemented", spec: "RFC 9110 §15.6.2", description: "The server does not support the functionality required.", usage: "For example, an unknown HTTP method. Use 405 when the method exists but not for this resource." },
  { code: 502, name: "Bad Gateway", spec: "RFC 9110 §15.6.3", description: "A gateway or proxy got an invalid response from the upstream server.", usage: "Common behind load balancers when the application crashed or closed the connection." },
  { code: 503, name: "Service Unavailable", spec: "RFC 9110 §15.6.4", description: "The server is temporarily unable to handle the request.", usage: "For maintenance or overload. Add Retry-After; search engines treat it as temporary." },
  { code: 504, name: "Gateway Timeout", spec: "RFC 9110 §15.6.5", description: "A gateway or proxy did not get a response in time from the upstream server.", usage: "The application took longer than the proxy's timeout." },
  { code: 505, name: "HTTP Version Not Supported", spec: "RFC 9110 §15.6.6", description: "The server does not support the HTTP version used.", usage: "Rare." },
  { code: 506, name: "Variant Also Negotiates", spec: "RFC 2295", description: "A configuration error in transparent content negotiation.", usage: "Experimental; almost never seen.", caution: "Experimental." },
  { code: 507, name: "Insufficient Storage", spec: "RFC 4918", description: "The server cannot store what is needed to complete the request.", usage: "WebDAV." },
  { code: 508, name: "Loop Detected", spec: "RFC 5842", description: "The server found an infinite loop while processing the request.", usage: "WebDAV." },
  { code: 510, name: "Not Extended", spec: "RFC 2774", description: "Further extensions are needed to fulfil the request.", usage: "Do not use.", caution: "Obsolete: RFC 2774 is historic." },
  { code: 511, name: "Network Authentication Required", spec: "RFC 6585", description: "The client must authenticate to get network access.", usage: "Sent by captive portals, such as hotel or airport Wi-Fi login pages." },
];

export function statusClass(code: number): StatusClass {
  return `${Math.floor(code / 100)}xx` as StatusClass;
}

/**
 * Finds statuses by code ("404"), class ("4xx" or "4"), or words in the name
 * and description ("not found", "rate limit"). All words must match.
 */
export function findStatuses(query: string, classes: StatusClass[] = []): HttpStatus[] {
  const inClass = (s: HttpStatus) => classes.length === 0 || classes.includes(statusClass(s.code));
  const text = query.trim().toLowerCase();
  if (text === "") return HTTP_STATUSES.filter(inClass);
  const cls = /^([1-5])(xx)?$/.exec(text);
  if (cls) return HTTP_STATUSES.filter((s) => statusClass(s.code) === `${cls[1]}xx` && inClass(s));
  if (/^\d{1,3}$/.test(text)) return HTTP_STATUSES.filter((s) => String(s.code).startsWith(text) && inClass(s));
  const words = text.split(/\s+/);
  return HTTP_STATUSES.filter((s) => {
    const haystack = `${s.code} ${s.name} ${s.description} ${s.usage}`.toLowerCase();
    return inClass(s) && words.every((w) => haystack.includes(w));
  });
}

export function getStatus(code: number): HttpStatus | undefined {
  return HTTP_STATUSES.find((s) => s.code === code);
}
