import { HttpStatusCodes } from "@/components/tools/http-status-codes/HttpStatusCodes";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "http-status-codes";

const content: ToolPageContent = {
  metaDescription:
    "Every standard HTTP status code from 100 to 511 with its meaning, practical usage notes and defining RFC. Filter by category or look up a code.",
  howItWorks: [
    "The reference lists every status code in the IANA HTTP Status Code Registry, from 100 Continue to 511 Network Authentication Required, grouped into five categories: informational (1xx), success (2xx), redirection (3xx), client errors (4xx) and server errors (5xx).",
    "Type a code (`404`), a category (`5xx`) or words (`rate limit`) to find a status, or use the category buttons to filter. Each entry gives the official name, what it means, when to use it in practice and the specification that defines it.",
    "Deprecated, reserved and experimental codes are marked, so you can avoid them in new APIs.",
  ],
  notes: [
    "Names follow RFC 9110 (2022), which renamed some codes: 413 is now Content Too Large and 422 is Unprocessable Content.",
    "Vendor-specific codes, such as nginx's 499 or Cloudflare's 520–530, are not standard and are not listed.",
    "418 is reserved because of a 1998 April Fools' RFC; it is not a real status for APIs.",
    "All data is included in the page; no external service is called.",
  ],
  example: {
    description: "Looking up a rate-limiting status:",
    input: "429",
    output: `429 Too Many Requests (RFC 6585)
The client sent too many requests in a given time.
Include Retry-After so clients know when to try again.`,
  },
  faqs: [
    {
      question: "What is the difference between 401 and 403?",
      answer: "401 Unauthorized means the request is not authenticated (log in and try again). 403 Forbidden means the server knows who you are, or authentication would not help, and refuses anyway.",
    },
    {
      question: "Should I use 301 or 308 for a permanent redirect?",
      answer: "Use 301 for ordinary web pages. Use 308 when the method and body must be kept, for example when moving an API endpoint that receives POST requests.",
    },
    {
      question: "Which status should an API return for validation errors?",
      answer: "400 Bad Request for malformed requests, and 422 Unprocessable Content when the request is well-formed but its values are invalid. Either way, explain the problem in the response body.",
    },
    {
      question: "What causes 502 and 504 errors?",
      answer: "Both come from a proxy or load balancer in front of the application: 502 when the application returned an invalid response or closed the connection, 504 when it did not respond in time.",
    },
  ],
  related: ["curl-to-code", "url-parser", "user-agent-parser", "mime-type-lookup"],
};

export const metadata = toolMetadata(slug, content);

export default function HttpStatusCodesPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <HttpStatusCodes />
    </ToolPage>
  );
}
