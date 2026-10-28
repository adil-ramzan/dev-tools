// @vitest-environment jsdom
import DOMPurify from "dompurify";
import { describe, expect, it } from "vitest";
import { FRAME_CSP, blockRemoteMedia, checkLink, createSanitizer, formatHtml, frameDocument, restoreRemoteMedia, sanitizeEditorHtml } from "@/lib/tools/html-editor";

const purify = createSanitizer(DOMPurify, window);
const clean = (html: string) => sanitizeEditorHtml(html, purify);

describe("sanitizeEditorHtml", () => {
  it("keeps ordinary formatting", () => {
    const html = '<h2>Title</h2><p>Some <strong>bold</strong>, <em>italic</em> and <u>underlined</u> text with <a href="https://example.com">a link</a>.</p><ul><li>One</li></ul><blockquote>Quote</blockquote><pre><code>x = 1</code></pre>';
    expect(clean(html)).toBe(html);
  });

  it("removes scripts and event handlers", () => {
    expect(clean('<p onclick="alert(1)">Hi<script>alert(2)</script></p>')).toBe("<p>Hi</p>");
    expect(clean('<img src="x" onerror="alert(1)">')).toBe('<img src="x">');
    expect(clean('<svg><script>alert(1)</script></svg><math><mi>x</mi></math>')).toBe("");
    expect(clean('<details open ontoggle="alert(1)"><summary>s</summary></details>')).toBe("<details open=\"\"><summary>s</summary></details>");
  });

  it("removes javascript:, vbscript: and data:text URLs", () => {
    expect(clean('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(clean('<a href=" JaVaScRiPt:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(clean('<a href="vbscript:msgbox">x</a>')).toBe("<a>x</a>");
    expect(clean('<a href="data:text/html,<script>alert(1)</script>">x</a>')).toBe("<a>x</a>");
    expect(clean('<img src="data:image/svg+xml,<svg onload=alert(1)>">')).toBe("<img>");
  });

  it("keeps safe links and data images", () => {
    expect(clean('<a href="mailto:a@b.test">m</a><a href="/docs">d</a><a href="#top">t</a>')).toBe('<a href="mailto:a@b.test">m</a><a href="/docs">d</a><a href="#top">t</a>');
    expect(clean('<img src="data:image/png;base64,iVBORw0KGgo=" alt="dot">')).toBe('<img src="data:image/png;base64,iVBORw0KGgo=" alt="dot">');
    expect(clean('<img src="a.png" alt="data: chart">')).toBe('<img src="a.png" alt="data: chart">');
  });

  it("removes frames, forms, styles and other active or loading elements", () => {
    expect(clean('<iframe src="https://evil.test"></iframe><object data="x"></object><embed src="x"><form action="https://evil.test"><input name="q"><button>Go</button></form><style>body{background:url(https://evil.test)}</style><link rel="stylesheet" href="https://evil.test/a.css"><meta http-equiv="refresh" content="0;url=https://evil.test"><base href="https://evil.test/">')).toBe(
      // Removed elements keep their plain text (here the button label); no markup survives.
      "Go",
    );
  });

  it("removes inline styles that could load resources, keeping harmless ones", () => {
    expect(clean('<p style="text-align: center">c</p>')).toBe('<p style="text-align: center">c</p>');
    expect(clean('<p style="background: url(https://evil.test/track.gif)">c</p>')).toBe("<p>c</p>");
    expect(clean('<p style="background-image: image-set(\'x.png\' 1x)">c</p>')).toBe("<p>c</p>");
    expect(clean('<div style="width: expression(alert(1))">c</div>')).toBe("<div>c</div>");
  });

  it("removes srcset and ping, which could load or report URLs", () => {
    expect(clean('<img src="a.png" srcset="https://evil.test/b.png 2x"><a href="/x" ping="https://evil.test">x</a>')).toBe('<img src="a.png"><a href="/x">x</a>');
  });

  it("removes target, so links cannot open windows from the output", () => {
    expect(clean('<a href="https://x.test" target="_blank">x</a>')).toBe('<a href="https://x.test">x</a>');
  });

  it("neutralizes mutation-XSS payloads", () => {
    const out = clean('<noscript><p title="</noscript><img src=x onerror=alert(1)>">');
    expect(out).not.toMatch(/onerror/i);
    expect(clean("<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>")).not.toMatch(/onerror/i);
  });

  it("does not change the shared DOMPurify instance used by other tools", () => {
    expect(DOMPurify.sanitize('<p style="background:url(x)">a</p>')).toBe('<p style="background:url(x)">a</p>');
  });
});

describe("frameDocument", () => {
  it("includes a CSP that blocks network requests and a base target", () => {
    const doc = frameDocument("<p>Hi</p>", { editable: false });
    expect(doc).toContain(`<meta http-equiv="Content-Security-Policy" content="${FRAME_CSP}">`);
    expect(FRAME_CSP).toContain("default-src 'none'");
    expect(FRAME_CSP).not.toMatch(/script-src|https?:/);
    expect(doc).toContain('<base target="_blank">');
    expect(doc).toContain("<body><p>Hi</p></body>");
  });

  it("makes the body editable only for the editor frame", () => {
    expect(frameDocument("", { editable: true })).toContain('<body contenteditable="true"');
    expect(frameDocument("", { editable: false })).toContain("<body></body>");
    expect(frameDocument("", { editable: false })).not.toMatch(/<body[^>]*contenteditable/);
  });
});

describe("checkLink", () => {
  it("accepts web, email and phone links and adds https://", () => {
    expect(checkLink("example.com/a")).toEqual({ ok: true, href: "https://example.com/a" });
    expect(checkLink("http://x.test")).toEqual({ ok: true, href: "http://x.test/" });
    expect(checkLink("mailto:a@b.test")).toEqual({ ok: true, href: "mailto:a@b.test" });
  });

  it("rejects other schemes and invalid input", () => {
    expect(checkLink("javascript:alert(1)").ok).toBe(false);
    expect(checkLink("data:text/html,x").ok).toBe(false);
    expect(checkLink("").ok).toBe(false);
    expect(checkLink("http://exa mple").ok).toBe(false);
  });
});

describe("formatHtml", () => {
  it("puts block elements on their own lines", () => {
    expect(formatHtml("<h1>A</h1><p>B <b>c</b></p><ul><li>1</li><li>2</li></ul>")).toBe("<h1>A</h1>\n<p>B <b>c</b></p>\n<ul>\n<li>1</li>\n<li>2</li>\n</ul>");
  });
});

describe("blockRemoteMedia and restoreRemoteMedia", () => {
  const parser = new DOMParser();
  const html = '<p>x</p><img src="https://evil.test/a.png" alt="A"><img src="data:image/png;base64,AAAA"><video src="https://evil.test/v.mp4"></video><audio><source src="/s.mp3"></audio>';

  it("moves remote media URLs into an inert attribute and keeps data images", () => {
    const blocked = blockRemoteMedia(html, parser);
    expect(blocked).not.toMatch(/\ssrc="(?!data:)/);
    expect(blocked).toContain('data-blocked-src="https://evil.test/a.png"');
    expect(blocked).toContain('src="data:image/png;base64,AAAA"');
    expect(blocked).toContain('data-blocked-src="/s.mp3"');
  });

  it("restores the original URLs (attribute order may change)", () => {
    // Compare documents with attributes sorted, since moving src changes their order.
    const normalize = (value: string) => {
      const doc = parser.parseFromString(value, "text/html");
      for (const el of Array.from(doc.body.querySelectorAll("*"))) {
        const attrs = Array.from(el.attributes).map((a) => [a.name, a.value] as const).sort(([a], [b]) => a.localeCompare(b));
        for (const [name] of attrs) el.removeAttribute(name);
        for (const [name, value] of attrs) el.setAttribute(name, value);
      }
      return doc.body.innerHTML;
    };
    expect(normalize(restoreRemoteMedia(blockRemoteMedia(html, parser), parser))).toBe(normalize(html));
  });
});
