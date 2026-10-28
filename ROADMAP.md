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

## Next: developer tools (not started)

Requirements for all of them:

- Process everything in the browser. No backend, API routes, server actions,
  analytics, or sending input to third-party services.
- Reuse the existing architecture: a registry entry, logic as pure functions in
  `src/lib/tools/` with unit tests, a component in `src/components/tools/<slug>/`,
  a route with `ToolPageContent` (explanation, example, notes, FAQs, related
  tools), and a colorful icon in `ToolIcon`.
- Keep dependencies minimal and lazy-load them on the tool's page.
- Preserve all existing tools and their behavior.
- When implementation begins, test functionality, security, responsiveness,
  type-checking, lint and the production build, and add browser tests in `e2e/`.

### 1. ScreenSnap: screenshot beautifier

Import a local screenshot; set a solid or gradient background; adjust padding,
corner radius and shadow; optionally place the image in a device or browser
frame; export PNG.

- Duplication check: no existing image tool. The SVG Placeholder Generator
  (Phase 9) creates images from scratch and does not edit screenshots. The CSS Gradient Generator and CSS
  Box Shadow Generator produce CSS rather than images; reuse their gradient and
  shadow models where practical.
- Category: none of the current categories fits image editing well. Decide
  between "CSS and Design Tools" and a new "Image Tools" category before
  starting.
- Rendering: Canvas 2D. Set a maximum input size (pixels and bytes) and an
  output size cap, because large canvases fail silently or crash tabs on mobile.
  Decode with `createImageBitmap` and report decode failures clearly.
- Frames should be drawn in code or as bundled SVG, not fetched.

### 2. SVG to PNG Converter

Accept SVG text or a local file, choose output dimensions and a transparent or
colored background, preview the result, and download a PNG.

- Duplication check: no overlap. The Base64 File Converter only re-encodes
  bytes, and the SVG Placeholder and QR Code generators already export SVG
  and, for QR codes, PNG; reuse the QR tool's canvas export code.
- Category: same decision as ScreenSnap.
- Security: render through an `<img>` element from a Blob URL. Browsers do not
  run scripts or load external resources for SVG in an image context. Also
  sanitize the SVG with the existing DOMPurify dependency (SVG profile) before
  previewing, and never insert untrusted SVG into the DOM with
  `innerHTML`. Follow the HTML WYSIWYG Editor's approach (Phase 9): sandboxed
  frames, a blocking CSP, and remote URLs made inert before display. External `href`s will not load; say so in the notes.
- Handle SVGs without `width`/`height` (use the `viewBox`), and cap output
  dimensions.

### 3. Favicon Generator

Accept text, an emoji or a local image, and generate favicon PNGs (16, 32, 48,
180 Apple Touch Icon, 192 and 512), a web manifest snippet and the HTML markup,
downloadable as a package.

- Duplication check: no overlap.
- Category: same decision as ScreenSnap.
- ICO: offer ICO export only if a real ICO file (an ICONDIR header with
  embedded PNG images) is generated and tested; otherwise label the output
  "PNG favicons" and do not mention ICO as supported.
- Packaging: a ZIP needs either a small, maintained library loaded on demand,
  or individual downloads. Decide when implementing, and justify any
  dependency.
- Emoji rendering depends on the user's platform fonts; note this on the page.

### 4. Open Graph Preview

Enter a title, description, image (URL or local file) and site name; preview
common social sharing card layouts; show recommended dimensions and the
`og:`/`twitter:` meta tag markup.

- Duplication check: no overlap. There is no Meta Tag Generator in the registry
  or codebase today; if one is planned, keep it as a separate tool that builds
  general `<head>` tags, while this one focuses on previews.
- Category: Developer Utilities, or alongside a future Meta Tag Generator.
- Do not fetch arbitrary URLs or claim to inspect a live page's metadata.
  Images given by URL may be displayed with a plain `<img>`, which the browser
  loads directly from that host; state this. Local images stay local (Blob URL).
- Previews approximate each platform's layout; say they are not
  pixel-identical and may change without notice.
- Escape every value in the generated markup (reuse `html-entities.ts`).
- The HTML WYSIWYG Editor (Phase 9) shows how to preview untrusted markup
  without loading remote images.

## Completed from this list

### Password Generator

Shipped in Phase 11 (batch 1) as `/tools/password-generator`, following the
requirements and the separate-page recommendation recorded here.

### cURL to Code Converter

Shipped in Phase 9 as `/tools/curl-to-code`, following the requirements that
were recorded here. Remaining ideas: reading `-d @file` and `-F file=@…`
uploads from a file chosen in the browser, and more target languages.
