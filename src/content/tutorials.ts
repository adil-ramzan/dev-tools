import type { TutorialDefinition } from "@/types/tutorial";

/**
 * Tutorials, in display order. Each one teaches a task with tools that are
 * already available; `src/content/tutorials.test.ts` checks the tool slugs and
 * recomputes the worked examples with the tools' own logic, so keep both in
 * sync when a tool changes. Slugs are permanent URLs.
 */
export const tutorials: TutorialDefinition[] = [
  {
    slug: "calculate-ipv4-subnet",
    title: "How to calculate an IPv4 subnet",
    description: "Work out the network, broadcast address, usable host range and host count of a CIDR block, by hand and with the calculator.",
    metaDescription:
      "Step-by-step guide to IPv4 subnetting: find the network and broadcast address, usable host range and host count from an address and CIDR prefix.",
    tools: ["ipv4-subnet-calculator", "ipv4-range-expander", "ipv4-address-converter"],
    intro: [
      "An IPv4 subnet is a block of addresses that share the same leading bits. You describe it with an address and a prefix length, such as `10.20.30.40/27`: the first 27 bits identify the network and the remaining 5 bits number the hosts inside it.",
      "You need the subnet's boundaries when you configure an interface, write a firewall rule or route, plan address space, or check whether two hosts are on the same network. This guide shows how the numbers are derived, so you can check the calculator's answer and spot mistakes in existing configuration.",
    ],
    steps: [
      {
        title: "Write the address with its prefix",
        body: [
          "Take the address and the prefix length, for example `10.20.30.40/27`. If you have a subnet mask instead, convert it: `255.255.255.224` has 27 one-bits, so it is a `/27`. The IPv4 Subnet Calculator accepts either form, including a mask after the slash such as `10.20.30.40/255.255.255.224`.",
        ],
        tool: "ipv4-subnet-calculator",
      },
      {
        title: "Count the addresses in the block",
        body: [
          "The host part has `32 − prefix` bits, so the block holds `2^(32 − prefix)` addresses. A `/27` leaves 5 host bits: 2⁵ = 32 addresses. Each step of the prefix halves or doubles the block: a `/26` has 64 addresses, a `/28` has 16.",
        ],
      },
      {
        title: "Find the network address",
        body: [
          "The network address is the address with every host bit set to zero (the address AND the mask). The quick way: the block size in the octet where the mask stops is `256 − mask octet`. For `/27` the last mask octet is 224, so blocks are 32 addresses wide and start at 0, 32, 64, 96 and so on.",
          "40 falls in the block that starts at 32, so the network address is `10.20.30.32`.",
        ],
      },
      {
        title: "Find the broadcast address and the usable range",
        body: [
          "The broadcast address is the last address in the block: the network address plus the block size minus one, here `10.20.30.63`. The usable host addresses are everything in between, `10.20.30.33` to `10.20.30.62`, which is 32 − 2 = 30 hosts.",
          "Two prefixes are exceptions. A `/31` has two addresses and both are usable on point-to-point links (RFC 3021); a `/32` is a single host. The calculator applies both rules.",
        ],
      },
      {
        title: "Check the result and copy what you need",
        body: [
          "Enter the address in the calculator and compare its network, broadcast and usable range with your own working. Each value has a copy button, and the binary view shows exactly where the mask splits network bits from host bits. To list every address in the block, for an allow-list or a scan, paste the CIDR into the IPv4 Range Expander.",
        ],
        tool: "ipv4-range-expander",
      },
    ],
    example: {
      description: "Calculating the subnet for `10.20.30.40/27`:",
      input: "10.20.30.40/27",
      output: `Network      10.20.30.32/27
Subnet mask  255.255.255.224
Wildcard     0.0.0.31
Broadcast    10.20.30.63
Usable       10.20.30.33 – 10.20.30.62
Hosts        30 (32 addresses)`,
      outputLabel: "Result",
    },
    mistakes: [
      {
        title: "Using a host address as the network",
        body: "A route or firewall rule for `10.20.30.40/27` means the network `10.20.30.32/27`. Some systems reject the host form, others silently correct it, so write the network address to make the rule's intent clear.",
      },
      {
        title: "Sizing a subnet for its total, not its usable hosts",
        body: "A `/27` has 32 addresses but only 30 for hosts, and your gateway takes one of those. For 32 devices you need a `/26` (62 usable).",
      },
      {
        title: "Mixing up subnet and wildcard masks",
        body: "Cisco access lists and OSPF use the wildcard mask (`0.0.0.31` for a /27), the inverse of the subnet mask. Pasting `255.255.255.224` where a wildcard is expected matches the wrong addresses.",
      },
      {
        title: "Writing octets with leading zeros",
        body: "Some software reads `010` as octal 8, so `192.168.1.010` may not mean `.10`. The calculator rejects leading zeros instead of guessing.",
      },
    ],
  },
  {
    slug: "inspect-http-headers",
    title: "How to inspect HTTP response headers",
    description: "Capture a response's headers with curl or your browser, then check caching, security headers, CORS and cookies.",
    metaDescription:
      "Learn how to capture HTTP response headers with curl or browser developer tools and check them for caching, security header, CORS and cookie problems.",
    tools: ["http-header-analyzer", "http-status-codes", "curl-to-code"],
    intro: [
      "Response headers control how browsers and caches treat a page or API response: how long it may be cached, which other sites may read it, whether it may be framed, and how cookies are protected. Problems there rarely show up in the page itself, so it pays to look at the headers directly.",
      "The HTTP Header Analyzer works only on headers you paste. It never contacts the site, so you can use it on internal or logged-in responses, but you have to capture the headers first.",
    ],
    steps: [
      {
        title: "Capture the headers of the response you care about",
        body: [
          "In a terminal, `curl -sI https://example.com` prints the headers of a HEAD request. Some servers answer HEAD differently from GET, so `curl -sD - -o /dev/null https://example.com` is more faithful: it makes a GET request and prints only the headers. Add `-L` to follow redirects.",
          "In a browser, open the developer tools, select the request in the Network tab and copy its Response Headers (the raw view keeps one header per line). This captures headers for a logged-in session, which curl would not see.",
        ],
      },
      {
        title: "Paste them into the analyzer",
        body: [
          "Paste the text into Response headers. The status line is optional and HTTP/2 lowercase names are fine. Findings update as you paste; there is no button to press. If you pasted a redirect chain from `curl -IL`, only the last response is analyzed.",
          "Leave Served over HTTPS on for HTTPS responses. Turn it off for plain HTTP, where HSTS and Secure cookies cannot apply.",
        ],
        tool: "http-header-analyzer",
      },
      {
        title: "Read the findings by severity",
        body: [
          "Errors are things browsers reject or that break behavior, such as a wildcard CORS origin combined with credentials. Warnings weaken security or caching, such as a missing Content-Security-Policy. Info items are worth knowing but often intentional, and OK items confirm what is set correctly. The caching summary tells you how long browsers and shared caches may keep the response.",
        ],
      },
      {
        title: "Fix the configuration and check again",
        body: [
          "Change the server, framework or CDN configuration, capture the headers again and paste the new response. Check more than one URL: HTML pages, API routes and static files often get different headers, and so do cached and uncached responses. If the status code itself is unexpected, look it up in the HTTP Status Code Reference.",
        ],
        tool: "http-status-codes",
      },
    ],
    example: {
      description: "An HTTPS API response with HSTS but several gaps:",
      input: `HTTP/2 200
content-type: application/json
cache-control: no-store, max-age=3600
strict-transport-security: max-age=31536000; includeSubDomains
x-content-type-options: nosniff
set-cookie: sid=abc123; Path=/; Secure
access-control-allow-origin: *`,
      inputLabel: "Headers",
      output: `Warning  No Content-Security-Policy
Warning  No clickjacking protection
Info     No Referrer-Policy
Info     Any site may read this response
Info     Cookie sid: no HttpOnly
Info     Cookie sid: no SameSite
Info     no-store overrides the other directives
OK       HSTS for 1 year, including subdomains`,
      outputLabel: "Findings",
    },
    mistakes: [
      {
        title: "Checking a different response from the one users get",
        body: "Headers differ between HEAD and GET, between pages and file types, between logged-in and anonymous requests, and between a CDN hit and a miss. Capture the exact request that matters.",
      },
      {
        title: "Analyzing the redirect instead of the destination",
        body: "`curl -I http://example.com` often returns only a 301. Use `-L` to follow it, or request the final URL directly.",
      },
      {
        title: "Sharing headers that contain live session cookies",
        body: "Set-Cookie and Authorization values can let someone else sign in as you. The analyzer keeps them on your device, but replace the values before pasting headers into a ticket or chat.",
      },
      {
        title: "Treating the result as a security audit",
        body: "The checks cover common header mistakes. They cannot see TLS settings, application logic or whether an unusual header is deliberate for your setup.",
      },
    ],
  },
  {
    slug: "generate-secure-passwords",
    title: "How to generate and use secure passwords",
    description: "Choose a length and character sets that a system accepts, generate a random password, and store and use it safely.",
    metaDescription:
      "How to generate strong random passwords: choose length and character sets, read entropy, handle systems that reject symbols, and store passwords safely.",
    tools: ["password-generator", "password-strength-analyzer", "bcrypt-hash-verify", "token-generator"],
    intro: [
      "A secure password is long, random and used for one account only. People are bad at being random, which is why generated passwords stored in a password manager are the usual advice. This guide covers choosing settings, reading the strength figure and the habits that keep a strong password strong.",
    ],
    steps: [
      {
        title: "Check what the system accepts",
        body: [
          "Look for a maximum length and for characters the system rejects, such as quotes, spaces or certain symbols. Config files, connection strings and shell scripts often have their own trouble characters, typically `\"`, `'`, `` ` ``, `$` and `\\`.",
        ],
      },
      {
        title: "Set the length and character sets",
        body: [
          "Open the Password Generator. A password appears straight away with the defaults: 20 characters from uppercase letters, lowercase letters, numbers and symbols. Move the Length slider and switch sets on or off; the password and its strength update immediately.",
          "Prefer length over variety. With all four sets each character adds about 6.5 bits; 16 lowercase letters and digits (82 bits) are stronger than 12 characters with symbols (78 bits).",
        ],
        tool: "password-generator",
      },
      {
        title: "Exclude characters that cause trouble",
        body: [
          "Type rejected characters into Also exclude these characters. Turn on Exclude ambiguous when someone will read or type the password by hand, which removes `I l 1 | O 0 o`. Keep At least one of each on if the system requires every type of character; the entropy shown already accounts for it.",
        ],
      },
      {
        title: "Read the entropy",
        body: [
          "The strength line shows entropy in bits: how many guesses an attacker would need, as a power of two. Because the password is random, this figure is exact for your settings. Below 60 bits is only suitable where guesses are rate-limited; 80 bits or more is strong, and 128 or more is beyond practical brute force.",
        ],
      },
      {
        title: "Copy it straight into a password manager",
        body: [
          "Select Copy and paste the password into your password manager and the site's form. The generator keeps it only on the open page: it is not stored or sent, so once you leave, it is gone. If you need to judge a password you did not generate, use the Password Strength Analyzer, which also detects words and patterns.",
        ],
        tool: "password-strength-analyzer",
      },
    ],
    example: {
      description: "Entropy and strength for all four character sets at different lengths, as the generator reports them:",
      input: `8 characters
12 characters
16 characters
20 characters (default)
16 characters, lowercase and numbers only`,
      inputLabel: "Settings",
      output: `51 bits   Weak
78 bits   Fair
104 bits  Strong
130 bits  Very strong
82 bits   Strong`,
      outputLabel: "Strength",
    },
    mistakes: [
      {
        title: "Reusing a password",
        body: "A strong password that leaks from one site is tried on others. Generate a new one for every account; that is what the password manager is for.",
      },
      {
        title: "Shortening it to make it memorable",
        body: "Random passwords are meant to be stored, not remembered. For the one password you must type, such as the password manager's own, use a long passphrase instead.",
      },
      {
        title: "Sending passwords in chat or email",
        body: "Messages are kept, synced and searched. Use your password manager's sharing feature, or send the password through a separate channel and change it after first use.",
      },
      {
        title: "Storing passwords in plain text in your own application",
        body: "If you build a login, store a slow hash such as bcrypt or Argon2id, never the password. Note that bcrypt uses only the first 72 bytes of a password; the Bcrypt Hash & Verify tool shows how hashes and that limit behave.",
      },
      {
        title: "Using a password generator for API keys",
        body: "Keys and tokens are copied by machines, so symbols only cause escaping problems. The Token Generator produces hex or Base64URL secrets of a chosen number of bytes from the same secure random source.",
      },
    ],
  },
  {
    slug: "encode-decode-html-entities",
    title: "How to encode and decode HTML entities",
    description: "Escape text so HTML shows it literally, decode character references back to text, and avoid double encoding.",
    metaDescription:
      "Learn when and how to encode HTML entities like &lt; and &amp;, decode named and numeric references, avoid double encoding and know the limits for XSS.",
    tools: ["html-entity-encoder-decoder", "url-encoder-decoder", "markdown-editor"],
    intro: [
      "In HTML, `<` starts a tag, `&` starts a character reference, and quotes end attribute values. To show those characters as text, for example a code sample in documentation or a user's name in an attribute, you write them as character references (entities) such as `&lt;` and `&amp;`. Decoding does the reverse: it turns references found in scraped pages, feeds or database exports back into readable text.",
    ],
    steps: [
      {
        title: "Paste the text and encode it",
        body: [
          "Open the HTML Entity Encoder & Decoder, paste the text into Input and select Encode. The five special characters are replaced: `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `\"` → `&quot;` and `'` → `&#39;`. The status line tells you how many characters changed.",
        ],
        tool: "html-entity-encoder-decoder",
      },
      {
        title: "Choose what happens to non-ASCII characters",
        body: [
          "Under Non-ASCII characters, keep Keep as is for UTF-8 pages, which is almost every page today: characters such as é and — need no encoding. Choose Named where available (`Caf&eacute;`) or Numeric (`Caf&#xE9;`) only for a system that is not Unicode-safe, such as some legacy email or database pipelines.",
        ],
      },
      {
        title: "Decide about existing entities",
        body: [
          "References already in the text are left alone, so `Tom &amp; Jerry <3` becomes `Tom &amp; Jerry &lt;3`, not `&amp;amp;`. Turn on Encode existing entities again only when you want the reference itself to appear on the page, for instance in a tutorial about entities.",
        ],
      },
      {
        title: "Decode references back to text",
        body: [
          "Paste encoded text and select Decode. All named references in the HTML standard are recognized, as well as decimal (`&#8212;`) and hex (`&#x2014;`) ones. Unknown references such as `&foo;` are kept as written and listed, so you can see what was not converted. Turn on Decode: require semicolons to leave legacy forms such as `&copy` without a semicolon untouched.",
        ],
      },
    ],
    example: {
      description: "Encoding an HTML snippet so a page displays it as code:",
      input: `<p class="note">Fish & chips</p>`,
      output: "&lt;p class=&quot;note&quot;&gt;Fish &amp; chips&lt;/p&gt;",
    },
    mistakes: [
      {
        title: "Treating encoding as sanitizing",
        body: "Entity encoding is safe for text between tags and inside quoted attribute values. It does not make text safe inside `<script>`, `<style>`, unquoted attributes, event handlers or `javascript:` URLs. Use your framework's escaping and a sanitizer for user-supplied HTML.",
      },
      {
        title: "Encoding twice",
        body: "Encoding at both the template and the data layer turns `&` into `&amp;amp;`, and visitors see `&amp;` on the page. Encode once, at output.",
      },
      {
        title: "Using HTML entities in a URL",
        body: "Query strings need percent-encoding (`&` → `%26`), not entities. Use the URL Encoder & Decoder for parameter values; an `&amp;` inside an `href` attribute is only the HTML layer on top of that.",
      },
      {
        title: "Relying on &apos;",
        body: "`&apos;` was not part of HTML 4, and some older parsers and email clients do not decode it. `&#39;` works everywhere, which is why the encoder uses it.",
      },
    ],
  },
  {
    slug: "format-validate-json",
    title: "How to format and validate JSON",
    description: "Pretty-print or minify JSON, fix syntax errors from their line and column, and check data against a JSON Schema.",
    metaDescription:
      "How to format, minify and validate JSON: fix common syntax errors such as trailing commas and single quotes, then check the data's structure with JSON Schema.",
    tools: ["json-formatter", "json-schema-validator", "json-diff", "json-to-typescript"],
    intro: [
      "JSON fails in two different ways. It can be invalid syntax, such as a trailing comma that a strict parser rejects, or valid syntax with the wrong content, such as a string where your API expects a number. This guide covers both: the JSON Formatter & Validator catches the first, and a JSON Schema catches the second.",
    ],
    steps: [
      {
        title: "Format, minify or validate",
        body: [
          "Paste JSON into JSON input in the JSON Formatter & Validator. Format writes an indented copy to Result (choose 2 spaces, 4 spaces or Tab under Indentation, and optionally Sort keys A–Z), Minify removes all whitespace, and Validate only reports whether the input is valid. Ctrl+Enter (⌘+Enter on Mac) runs Format.",
          "Numbers and escapes are copied exactly as written, so a large id such as `12345678901234567890` is not rounded the way `JSON.parse` would round it.",
        ],
        tool: "json-formatter",
      },
      {
        title: "Fix syntax errors from their position",
        body: [
          "Invalid input is left unchanged and the error shows its line and column with a short reason, for example Trailing commas are not allowed. Select Show in input to jump to the problem. Fix it and run the tool again: there may be more errors after the first.",
          "Duplicate keys are valid syntax but usually a bug; they are listed as warnings rather than errors.",
        ],
      },
      {
        title: "Check the structure with a schema",
        body: [
          "When the syntax is valid, describe the shape you expect as a JSON Schema: required properties, types, formats and allowed values. Paste the schema and the data into the JSON Schema Validator and select Validate. Each error names its location in the data, such as `$.id`, and the rule that failed.",
        ],
        tool: "json-schema-validator",
      },
      {
        title: "Compare versions or generate types",
        body: [
          "To see what changed between two responses or config files, use JSON Diff, which compares by structure rather than by line. To use the data in TypeScript, paste a representative sample into JSON to TypeScript to generate interfaces.",
        ],
        tool: "json-diff",
      },
    ],
    example: {
      description: "A trailing comma, as the formatter reports it:",
      input: `{"name": "Ada", "roles": ["admin", "editor",]}`,
      output: `Invalid JSON: line 1, column 44
Trailing commas are not allowed.`,
      outputLabel: "Result",
    },
    mistakes: [
      {
        title: "Writing JavaScript instead of JSON",
        body: "Trailing commas, single quotes, unquoted keys and comments are fine in JavaScript and JSON5 but not in JSON. The formatter reports them as errors rather than fixing them silently, so you know strict parsers will accept the file.",
      },
      {
        title: "Assuming valid JSON is valid data",
        body: "`{\"id\": \"42\"}` parses fine even if your API needs a number. Only a schema, or your application's own validation, catches type and required-field mistakes.",
      },
      {
        title: "Losing precision in large numbers",
        body: "The formatter keeps `12345678901234567890` intact, but JavaScript's `JSON.parse` rounds integers above 9,007,199,254,740,991. Send large ids as strings if JavaScript clients will read them.",
      },
      {
        title: "Using values JSON does not have",
        body: "`undefined`, `NaN`, `Infinity` and dates are not JSON values. `JSON.stringify` drops or converts them, so encode dates as ISO 8601 strings and use `null` for missing values.",
      },
    ],
  },
];

export function getTutorialBySlug(slug: string): TutorialDefinition | undefined {
  return tutorials.find((tutorial) => tutorial.slug === slug);
}

export function tutorialPath(slug: string): string {
  return `/tutorials/${slug}`;
}

/** Tutorials that use a tool, for links from its page. */
export function tutorialsForTool(toolSlug: string): TutorialDefinition[] {
  return tutorials.filter((tutorial) => tutorial.tools.includes(toolSlug));
}
