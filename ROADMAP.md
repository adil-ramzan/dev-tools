# Roadmap

Tools that are agreed but not started. Nothing here is in the tool registry
(`src/content/tools.ts`) yet: a registry entry with `status: "planned"` shows
as a "Coming soon" tile on the homepage, so add the entry only when work on the
tool begins, and set it to `"available"` only after its functionality and tests
pass.

## Shipped

- **Phases 1–6:** 25 tools.
- **Phase 7:** 12 tools: Hash Generator, Date & Time Format Converter, Integer
  Base Converter, Base64 File Converter, HTML Entity Encoder & Decoder, Text to
  Binary Converter, YAML ↔ JSON ↔ TOML Converter, List Converter, MIME Type
  Lookup, Slug Generator, String Obfuscator, ULID Generator.
- **Phase 8:** 7 security and cryptography tools in a new Security and
  Cryptography category: Bcrypt Hash & Verify, HMAC Generator, RSA Key Pair
  Generator, Password Strength Analyzer, Text Encryption & Decryption, TOTP
  Generator & Validator, Basic Auth Header Generator. 44 tools in total.
- **Phase 9:** 12 web and programming tools, with a new Web and HTTP Tools
  category: cURL to Code Converter (previously on this roadmap), URL Parser,
  HTML WYSIWYG Editor, User-Agent Parser, HTTP Status Code Reference,
  JavaScript Keycode Inspector, QR Code Generator, SVG Placeholder Generator,
  Git Cheatsheet, Docker Run to Compose Converter, JavaScript Benchmark
  Builder, Lorem Ipsum Generator. 56 tools in total.
- **Phase 9.5:** UI/UX redesign of all 56 tools, without new tools. Shared
  ActionBar (primary action under the input, Clear/Reset grouped, status next
  to it), Ctrl/⌘+Enter shortcuts, compact Notices for standing warnings,
  collapsible FAQ answers, a compact header, Clear/Reset/Regenerate wherever
  a tool lacked them, generators that show a result on load, non-resizable
  text boxes, and accessibility and 360 px layout checks for every tool in
  both themes.
- **Phase 10:** 8 networking and system tools in a new Networking and System
  Tools category: Chmod Calculator, IPv4 Subnet Calculator, IPv4 Address
  Converter, IPv4 Range Expander, MAC Address Vendor Lookup, IPv6 ULA
  Generator, Device Information, Random Port Number Generator. 64 tools in
  total. Known limitations:
  - MAC vendors come from the IEEE registry bundled at build time (oui-data
    2.1.44); newer assignments show as not found until `npm run data:oui` is
    rerun after upgrading the package. The vendor is the registrant of the
    prefix, not necessarily the device maker. The data adds about 590 KB
    gzipped, loaded only on that tool's page.
  - Only IPv4 is supported by the subnet, converter and range tools; the range
    expander lists at most 65,536 addresses.
  - The IPv6 ULA Global ID is drawn directly from `crypto.getRandomValues`
    rather than the SHA-1 derivation RFC 4193 suggests (which the RFC allows).
  - Random ports cannot be checked for availability from a web page.
  - Device information shows only what the browser exposes; browsers round,
    cap or alter several values (memory, processor count, user agent), and
    some APIs (connection details, device memory) exist only in Chromium.

- **Header search:** a search field in the shared header that finds
  available tools by name, keyword, category or description, entirely from
  the local registry. Keyboard navigation, `/` and Ctrl/⌘+K shortcuts, and a
  collapsible control on small screens. The homepage and `/tools` listings
  still have no search field of their own. Limitations: matching is by word
  prefix and substring, with no typo tolerance or synonyms beyond each tool's
  keywords, and the Ctrl+K shortcut overrides the browser's own Ctrl+K
  (focus the address bar's search) on this site.

- **Phase 11, batch 1:** 3 tools. Password Generator (Security and
  Cryptography; previously item 5 on this roadmap), HTTP Header Analyzer and
  Meta Tag Generator (Web and HTTP Tools). 67 tools in total. Decisions and
  limitations:
  - The Password Generator is a separate page that reuses `randomString` and
    the character sets from `src/lib/tools/token.ts`; the Token Generator is
    unchanged apart from linking to it. "At least one of each" redraws whole
    passwords until every set is present (uniform over valid passwords), and
    the entropy shown subtracts the excluded passwords exactly. No passphrase
    (word list) mode yet.
  - The HTTP Header Analyzer works only on pasted text and never fetches a
    URL. Its checks cover common caching, security-header, CSP, CORS, cookie,
    framing and redirect mistakes; they are guidance, not an audit. Only the
    last response of a pasted redirect chain is analyzed.
  - The Meta Tag Generator writes general `<head>` tags (title, description,
    canonical, robots, theme color, Open Graph, Twitter/X card). It does not
    preview cards, so the Open Graph Preview below remains a separate tool.
    Length guidance is by characters, while search engines truncate by pixel
    width.

- **Phase 11, batch 2:** 3 tools in a new Image Tools category: SVG to PNG
  Converter, Favicon Generator and Screenshot Beautifier (items 1–3 of the
  previous roadmap). 70 tools in total. No dependencies were added: SVG is
  sanitized with the existing DOMPurify, and the ICO and ZIP writers are
  small, tested modules in `src/lib/tools/favicon.ts`. Limitations:
  - SVG to PNG: external images, fonts and stylesheets are removed and never
    loaded, so text falls back to installed fonts; animations are captured at
    their first frame. Output is capped at 8,192 px per side and 16.7
    megapixels, input at 5 MB.
  - Favicon Generator: PNG and ICO only (no SVG favicon output). favicon.ico
    holds 16, 32 and 48 px PNG images, which Windows Vista and later and all
    current browsers read, but not Windows XP-era software. Emoji and text
    use the device's fonts. The ZIP is uncompressed (the PNGs are already
    compressed).
  - Screenshot Beautifier: frames are a drawn browser window only (no device
    mock-ups); output is PNG at the screenshot's own resolution, capped at
    16.7 megapixels; input is limited to 25 MB and 40 megapixels. Copy image
    needs a browser that can write images to the clipboard.

- **Phase 12:** Open Graph Preview (Web and HTTP Tools), the last tool on
  this roadmap. 71 tools in total. Limitations: previews approximate the
  Facebook/LinkedIn and X layouts and are not pixel-identical; image URLs are
  never loaded (a local file can stand in for the image), so the tool cannot
  confirm an image exists or check its real size; it reads only the HTML
  given and cannot see what a live page serves to crawlers.

- **Phase 12, site pages:** About, Contact, Privacy Policy, Terms of Use and
  Tutorials, with no new tools or dependencies. Footer links to all five, and
  Tutorials is in the header. Five tutorials live in `src/content/tutorials.ts`
  (IPv4 subnetting, HTTP headers, passwords, HTML entities, JSON); a unit test
  recomputes each worked example with the tool's own logic, and tool pages link
  to their tutorials. The privacy policy describes the verified behavior (no
  cookies or third-party requests from the site's code, only `theme` in local
  storage, the Markdown Editor's opt-in remote images), and a browser test
  checks those claims. Open items:
  - No contact address is published: `/contact` says so until
    `siteConfig.contactEmail` is set.
  - The policy cannot see Cloudflare dashboard settings; if Web Analytics or
    bot-protection cookies are enabled there, update the policy.
  - The legal pages have not been reviewed by a lawyer and name no operator,
    jurisdiction or effective date.

- **Phase 13, SEO:** canonical, Open Graph, sitemap, robots and structured
  data URLs all come from `siteConfig.url` through one helper (`absoluteUrl`),
  with no trailing slash (the homepage is the bare origin). Production builds
  default to `https://dev-tools.emadilramzan.workers.dev` when
  `NEXT_PUBLIC_SITE_URL` is unset, and fail on localhost, non-HTTPS, malformed
  or path-bearing values, so localhost can no longer reach generated SEO
  output. JSON-LD: `WebSite` on the homepage, `WebApplication` plus the
  existing `FAQPage` (one `@graph` script) on tool pages, `TechArticle` on
  tutorials; no ratings, prices, authors, dates or organization. No
  `BreadcrumbList`, because the site shows no breadcrumb trail. The 404 page
  now has a single `noindex` (the root layout's redundant `index, follow` was
  removed) and its own description. `e2e/seo.spec.ts` checks the built export:
  sitemap coverage and uniqueness, robots, unique titles and descriptions,
  canonical and `og:url` agreement, structured data against visible content,
  404s. Not verified: the Cloudflare build variable, the live site, and any
  search-engine submission; FAQ rich results are currently shown by Google only
  for a small set of authoritative sites, so `FAQPage` is unlikely to produce
  them here.

## Next

No tools are planned. Add new items here before work starts.

## Completed from this list

### Open Graph Preview

Shipped in Phase 12 as `/tools/open-graph-preview`. Following the
requirements recorded here, it does not fetch URLs or claim to inspect live
pages, escapes and never inserts user HTML, and is separate from the Meta Tag
Generator. Unlike the original note, remote images are not displayed at all
(not even through a plain `<img>`), so no request reaches the image's host.

### Screenshot Beautifier, SVG to PNG Converter, Favicon Generator

Shipped in Phase 11 (batch 2) as `/tools/screenshot-beautifier`,
`/tools/svg-to-png-converter` and `/tools/favicon-generator`, in a new Image
Tools category, following the requirements recorded here (Canvas 2D,
`createImageBitmap`, size caps, DOMPurify plus image-context rendering for
SVG, a real ICO file, frames drawn in code).

### Password Generator

Shipped in Phase 11 (batch 1) as `/tools/password-generator`, following the
requirements and the separate-page recommendation recorded here.

### cURL to Code Converter

Shipped in Phase 9 as `/tools/curl-to-code`, following the requirements that
were recorded here. Remaining ideas: reading `-d @file` and `-F file=@…`
uploads from a file chosen in the browser, and more target languages.
