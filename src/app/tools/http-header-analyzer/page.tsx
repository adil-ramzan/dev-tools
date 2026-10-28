import { HttpHeaderAnalyzer } from "@/components/tools/http-header-analyzer/HttpHeaderAnalyzer";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "http-header-analyzer";

const content: ToolPageContent = {
  metaDescription:
    "Paste HTTP response headers to explain each one and check caching, security headers, CORS, cookies and content type. Runs offline; no URL is fetched.",
  howItWorks: [
    "Paste the response headers of a page or API, for example from `curl -I https://example.com` or the Network tab of your browser's developer tools. The status line is optional; HTTP/2 pseudo-headers such as `:status` are understood, and if you paste a redirect chain (`curl -IL`), only the last response is analyzed.",
    "The analyzer explains each common header and checks for problems: missing or weak security headers (HSTS, Content-Security-Policy, X-Content-Type-Options, clickjacking protection, Referrer-Policy), unsafe CSP sources, CORS mistakes such as a wildcard origin with credentials, cookies without Secure, HttpOnly or SameSite, contradictory Cache-Control directives, duplicate headers and invalid values. It also summarizes how long browsers and shared caches may keep the response.",
    "Findings are sorted by severity. Errors break something or are rejected by browsers; warnings weaken security or caching; info items are worth knowing but often intentional.",
  ],
  notes: [
    "Nothing is fetched: the tool cannot see a live site, its redirects or its TLS configuration. Analyze the headers of the exact response you care about, since they often differ between pages, file types and logged-in states.",
    "Turn off Served over HTTPS for plain-HTTP responses: HSTS and Secure cookies are then not expected.",
    "These checks are guidance for common configurations, not a security audit. A header that looks unusual may be correct for your application.",
    "Headers stay in this page. They are not sent anywhere, stored, or put in the address bar, so you can paste responses that include cookies.",
  ],
  example: {
    description: "A response with several common problems:",
    input: `HTTP/2 200
content-type: text/html
cache-control: public, max-age=600
set-cookie: session=8f2a91; Path=/; HttpOnly
access-control-allow-origin: *
access-control-allow-credentials: true`,
    inputLabel: "Headers",
    output: `Error: Wildcard origin with credentials
Warning: No Strict-Transport-Security
Warning: No Content-Security-Policy
Warning: text/html without charset
Warning: Cookie session: missing Secure
Warning: Set-Cookie on a response shared caches may store
Caching: fresh for 10 minutes in browsers.`,
    outputLabel: "Findings (excerpt)",
  },
  faqs: [
    {
      question: "How do I get a site's response headers?",
      answer:
        "Run `curl -sI https://example.com` in a terminal, or open your browser's developer tools, select the request in the Network tab and copy the Response Headers. Use `curl -sD - -o /dev/null URL` for a GET request instead of HEAD, since some servers answer HEAD differently.",
    },
    {
      question: "Which security headers should every site send?",
      answer:
        "Over HTTPS: Strict-Transport-Security, a Content-Security-Policy, X-Content-Type-Options: nosniff, and clickjacking protection with CSP frame-ancestors or X-Frame-Options. Referrer-Policy, Permissions-Policy and Cross-Origin-Opener-Policy are good additions. X-XSS-Protection is obsolete.",
    },
    {
      question: "Why does max-age matter more than Expires?",
      answer:
        "When a response has Cache-Control max-age, caches ignore Expires. max-age is relative, so it does not depend on the server's clock being right.",
    },
    {
      question: "Can this check CORS preflight responses?",
      answer:
        "Yes, paste the response to the OPTIONS request. The tool checks Access-Control-Allow-Origin, credentials and Vary: Origin; whether the allowed methods and headers suit your requests depends on what the client sends.",
    },
  ],
  related: ["http-status-codes", "curl-to-code", "url-parser", "jwt-decoder"],
};

export const metadata = toolMetadata(slug, content);

export default function HttpHeaderAnalyzerPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <HttpHeaderAnalyzer />
    </ToolPage>
  );
}
