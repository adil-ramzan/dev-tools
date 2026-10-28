import type { DOMPurify, WindowLike } from "dompurify";

/**
 * Safety model for the HTML editor:
 *
 * 1. Every piece of HTML that enters the editor, the source view or the
 *    output is sanitized with DOMPurify: scripts, event handlers, forms,
 *    embedded frames and objects, and javascript: or other unsafe URLs are
 *    removed, as are inline styles that could load resources (url(),
 *    @import, expression()).
 * 2. The HTML is never placed in the application's own DOM. It is shown in
 *    iframes with the sandbox attribute and without allow-scripts, so nothing
 *    in it can run even if sanitizing missed something.
 * 3. Each frame's document carries its own Content-Security-Policy that
 *    blocks every network request except data: images and fonts, so editing
 *    or previewing never contacts another server. Links open nowhere: the
 *    frames cannot navigate or open pop-ups.
 */

/** No network access from the frame: only inline styles and data: images and fonts. */
export const FRAME_CSP = "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'";

export const MAX_HTML_LENGTH = 1_000_000;

const FORBID_TAGS = ["script", "style", "link", "meta", "base", "title", "form", "input", "button", "textarea", "select", "option", "iframe", "frame", "frameset", "object", "embed", "applet", "template", "slot", "portal", "noscript", "dialog"];

const ALLOWED_URI = /^(?:https?:|mailto:|tel:|#|\/|\.{0,2}\/|[^:]*$|data:image\/(?:png|gif|jpe?g|webp);)/i;

const RASTER_DATA_URI = /^data:image\/(?:png|gif|jpe?g|webp)[;,]/i;

const UNSAFE_STYLE = /url\s*\(|@import|expression\s*\(|image-set\s*\(|-moz-binding|behavior\s*:/i;

/** A DOMPurify instance configured for the editor, separate from the global one other tools use. */
export function createSanitizer(DOMPurifyFactory: DOMPurify, win: WindowLike): DOMPurify {
  const purify = DOMPurifyFactory(win);
  purify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (data.attrName === "style" && UNSAFE_STYLE.test(data.attrValue)) data.keepAttr = false;
    // DOMPurify allows any data: URI on images by default; keep only raster image types.
    if ((data.attrName === "src" || data.attrName === "href") && /^\s*data:/i.test(data.attrValue) && !RASTER_DATA_URI.test(data.attrValue.trim())) data.keepAttr = false;
  });
  return purify;
}

export function sanitizeEditorHtml(html: string, purify: DOMPurify): string {
  return purify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS,
    FORBID_ATTR: ["srcset", "ping", "formaction", "background", "poster", "action"],
    ALLOWED_URI_REGEXP: ALLOWED_URI,
    ALLOW_DATA_ATTR: false,
  });
}

const FRAME_STYLE = `
:root { color-scheme: light; }
body { background: #fff; color: #111827; margin: 0; padding: 16px; font: 16px/1.6 ui-sans-serif, system-ui, sans-serif; overflow-wrap: anywhere; min-height: calc(100vh - 32px); }
body:focus { outline: none; }
img { max-width: 100%; height: auto; }
pre, code { font-family: ui-monospace, monospace; font-size: 0.9em; }
pre { padding: 8px; overflow-x: auto; background: rgba(127,127,127,0.12); }
blockquote { margin-left: 0; padding-left: 12px; border-left: 3px solid rgba(127,127,127,0.5); }
table { border-collapse: collapse; } td, th { border: 1px solid rgba(127,127,127,0.5); padding: 4px 8px; }
img[data-blocked-src] { display: inline-block; min-width: 160px; min-height: 28px; padding: 4px 8px; border: 1px dashed rgba(127,127,127,0.7); color: #555; font-size: 0.85em; }
body[contenteditable]:empty::before { content: "Start typing, or paste content…"; opacity: 0.55; }
`;

/**
 * A complete document for a sandboxed frame. `sanitizedBody` must already be
 * sanitized; the CSP and sandbox are defense in depth, not a replacement.
 */
export function frameDocument(sanitizedBody: string, { editable }: { editable: boolean }): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${FRAME_CSP}"><base target="_blank"><style>${FRAME_STYLE}</style></head><body${editable ? ' contenteditable="true" spellcheck="true"' : ""}>${sanitizedBody}</body></html>`;
}

export type LinkCheck = { ok: true; href: string } | { ok: false; error: string };

const MEDIA = "img[src], video[src], audio[src], source[src], track[src]";
const BLOCKED = "data-blocked-src";

/**
 * Moves remote media URLs into an inert attribute before HTML is shown in a
 * frame, so nothing is fetched from another server even if the frame's CSP is
 * not applied in time. Parsing uses DOMParser, whose documents never load
 * resources. Embedded data: images keep their src and are displayed.
 */
export function blockRemoteMedia(html: string, parser: DOMParser): string {
  const doc = parser.parseFromString(`<!doctype html><body>${html}`, "text/html");
  for (const el of Array.from(doc.querySelectorAll(MEDIA))) {
    const src = el.getAttribute("src") ?? "";
    if (/^\s*data:/i.test(src)) continue;
    el.setAttribute(BLOCKED, src);
    el.removeAttribute("src");
  }
  return doc.body.innerHTML;
}

/** Restores URLs moved by blockRemoteMedia, for HTML read back from the editing frame. */
export function restoreRemoteMedia(html: string, parser: DOMParser): string {
  const doc = parser.parseFromString(`<!doctype html><body>${html}`, "text/html");
  for (const el of Array.from(doc.querySelectorAll(`[${BLOCKED}]`))) {
    el.setAttribute("src", el.getAttribute(BLOCKED) ?? "");
    el.removeAttribute(BLOCKED);
  }
  return doc.body.innerHTML;
}

/** Validates a link entered in the editor toolbar. Only web, email and phone links are allowed. */
export function checkLink(input: string): LinkCheck {
  const text = input.trim();
  if (text === "") return { ok: false, error: "Enter a link address." };
  if (/^(mailto|tel):/i.test(text)) return { ok: true, href: text };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, error: "Only http, https, mailto and tel links are allowed." };
    return { ok: true, href: url.href };
  } catch {
    return { ok: false, error: "This is not a valid link address." };
  }
}

/** Indents HTML for the source view: one block-level element per line. */
export function formatHtml(html: string): string {
  return html
    .replace(/>\s*(<(?:p|div|h[1-6]|ul|ol|li|blockquote|pre|table|thead|tbody|tr|td|th|hr)\b|<\/(?:ul|ol|blockquote|table|thead|tbody|tr|div)>)/gi, ">\n$1")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
