import type { DOMPurify, WindowLike } from "dompurify";

/**
 * SVG to PNG conversion in the browser. Safety model:
 *
 * 1. The SVG is sanitized with DOMPurify (SVG profile): scripts, event
 *    handlers, <foreignObject> and similar are removed, and every reference
 *    to an external resource (href, xlink:href, url() and @import pointing
 *    anywhere but a fragment or a raster data: URI) is dropped.
 * 2. The sanitized SVG is only ever drawn through an <img> element from a
 *    Blob URL. Browsers never run scripts or fetch external resources for
 *    SVG in an image context, so step 1 is defense in depth. The SVG is
 *    never inserted into the page's DOM.
 */

export const MAX_SVG_BYTES = 5 * 1024 * 1024;
export const MAX_OUTPUT_SIDE = 8192;
/** About 16.7 megapixels: the largest canvas iOS Safari reliably allows. */
export const MAX_OUTPUT_PIXELS = 4096 * 4096;
/** CSS default size of a replaced element without a size, used for SVGs with neither size nor viewBox. */
export const DEFAULT_SIZE = { width: 300, height: 150 };

const UNIT_PX: Record<string, number> = { "": 1, px: 1, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, pt: 96 / 72, pc: 16 };

/** A length attribute in CSS pixels, or null for percentages, em and invalid values. */
export function lengthToPx(value: string | null): number | null {
  if (value === null) return null;
  const m = /^\s*(\d*\.?\d+(?:e[+-]?\d+)?)\s*(px|in|cm|mm|pt|pc)?\s*$/i.exec(value);
  if (!m) return null;
  const px = Number(m[1]) * UNIT_PX[(m[2] ?? "").toLowerCase()];
  return Number.isFinite(px) && px > 0 ? px : null;
}

export type ViewBox = { x: number; y: number; width: number; height: number };

export function parseViewBox(value: string | null): ViewBox | null {
  if (!value) return null;
  const parts = value.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n)) || parts[2] <= 0 || parts[3] <= 0) return null;
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}

export type SvgInfo = {
  /** Intrinsic size in CSS pixels. */
  width: number;
  height: number;
  /** Where the size came from, for display. */
  source: "attributes" | "viewBox" | "default";
  viewBox: ViewBox | null;
};

export type SvgCheck = { ok: true; info: SvgInfo } | { ok: false; error: string };

type ParserWindow = { DOMParser: typeof DOMParser };

/** Parses SVG markup and works out its intrinsic size the way browsers do. */
export function inspectSvg(text: string, win: ParserWindow): SvgCheck {
  if (text.trim() === "") return { ok: false, error: "Paste SVG markup or choose an .svg file." };
  if (new TextEncoder().encode(text).length > MAX_SVG_BYTES) return { ok: false, error: `The SVG is larger than ${MAX_SVG_BYTES / 1024 / 1024} MB.` };
  const doc = new win.DOMParser().parseFromString(text, "image/svg+xml");
  const error = doc.getElementsByTagName("parsererror")[0];
  if (error) {
    const detail = (error.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
    return { ok: false, error: `The SVG is not well-formed XML${detail ? `: ${detail}` : "."}` };
  }
  const root = doc.documentElement;
  if (root.localName !== "svg" || root.namespaceURI !== "http://www.w3.org/2000/svg") {
    return { ok: false, error: 'The root element must be <svg> with xmlns="http://www.w3.org/2000/svg".' };
  }
  const viewBox = parseViewBox(root.getAttribute("viewBox"));
  let width = lengthToPx(root.getAttribute("width"));
  let height = lengthToPx(root.getAttribute("height"));
  let source: SvgInfo["source"] = "attributes";
  if (viewBox) {
    // One missing dimension follows the viewBox's aspect ratio.
    if (width && !height) height = (width * viewBox.height) / viewBox.width;
    else if (height && !width) width = (height * viewBox.width) / viewBox.height;
    else if (!width && !height) {
      width = viewBox.width;
      height = viewBox.height;
      source = "viewBox";
    }
  }
  if (!width || !height) {
    width = width ?? DEFAULT_SIZE.width;
    height = height ?? DEFAULT_SIZE.height;
    source = "default";
  }
  return { ok: true, info: { width, height, source, viewBox } };
}

const FRAGMENT_OR_RASTER = /^\s*(#|data:image\/(?:png|gif|jpe?g|webp)[;,])/i;
const EXTERNAL_CSS = /@import|url\(\s*(?!['"]?\s*#)[^)]*\)/i;

export type SanitizeResult = { svg: string; removed: number };

/** A DOMPurify instance for SVG, separate from the global one other tools use. */
export function createSvgSanitizer(factory: DOMPurify, win: WindowLike): DOMPurify {
  const purify = factory(win);
  purify.addHook("uponSanitizeAttribute", (_node, data) => {
    const name = data.attrName.toLowerCase();
    if ((name === "href" || name === "xlink:href" || name === "src") && !FRAGMENT_OR_RASTER.test(data.attrValue)) data.keepAttr = false;
    else if (EXTERNAL_CSS.test(data.attrValue)) data.keepAttr = false;
  });
  purify.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName === "style" && EXTERNAL_CSS.test(node.textContent ?? "")) node.textContent = (node.textContent ?? "").replace(/@import[^;]*;?/gi, "").replace(/url\(\s*(?!['"]?\s*#)[^)]*\)/gi, "none");
  });
  return purify;
}

export function sanitizeSvg(text: string, purify: DOMPurify): SanitizeResult {
  const svg = purify.sanitize(text, {
    USE_PROFILES: { svg: true, svgFilters: true },
    // <use> is safe here: the hook above limits its href to fragments in the same document.
    ADD_TAGS: ["style", "use"],
    FORBID_TAGS: ["foreignObject", "script", "iframe"],
    ALLOW_DATA_ATTR: false,
  });
  // DOMPurify also lists the <body> wrapper it parses into; only count real content.
  const removed = purify.removed.filter((r) => !("element" in r) || !["BODY", "HEAD", "HTML"].includes(r.element.nodeName)).length;
  return { svg, removed };
}

export type SizeMode = "scale" | "width" | "height" | "custom";

export type OutputSettings = { mode: SizeMode; scale: number; width: number; height: number };

export type OutputSize = { ok: true; width: number; height: number } | { ok: false; error: string };

/** Output pixel size from the intrinsic size, rounded to whole pixels and capped. */
export function outputSize(info: Pick<SvgInfo, "width" | "height">, { mode, scale, width, height }: OutputSettings): OutputSize {
  const ratio = info.width / info.height;
  const positive = (v: number) => Number.isFinite(v) && v > 0;
  let w: number;
  let h: number;
  if (mode === "scale") {
    if (!positive(scale) || scale > 16) return { ok: false, error: "The scale must be greater than 0 and at most 16." };
    w = info.width * scale;
    h = info.height * scale;
  } else {
    if ((mode === "width" || mode === "custom") && !positive(width)) return { ok: false, error: "Enter a width in pixels greater than 0." };
    if ((mode === "height" || mode === "custom") && !positive(height)) return { ok: false, error: "Enter a height in pixels greater than 0." };
    w = mode === "height" ? height * ratio : width;
    h = mode === "width" ? width / ratio : height;
  }
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  if (w > MAX_OUTPUT_SIDE || h > MAX_OUTPUT_SIDE) return { ok: false, error: `The PNG would be ${w}×${h} pixels. Each side can be at most ${MAX_OUTPUT_SIDE.toLocaleString("en-US")} pixels.` };
  if (w * h > MAX_OUTPUT_PIXELS) return { ok: false, error: `The PNG would be ${w}×${h} pixels (${((w * h) / 1e6).toFixed(1)} megapixels). The limit is ${(MAX_OUTPUT_PIXELS / 1e6).toFixed(1)} megapixels, which phones can still draw.` };
  return { ok: true, width: w, height: h };
}

/**
 * The SVG with an explicit pixel size, so the image is rasterized at the
 * output size instead of being scaled up afterwards. A viewBox is added
 * when there is none, or the content would not scale with the new size.
 */
export function withPixelSize(svg: string, info: SvgInfo, width: number, height: number, win: ParserWindow & { XMLSerializer: typeof XMLSerializer }): string {
  const doc = new win.DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (!info.viewBox) root.setAttribute("viewBox", `0 0 ${info.width} ${info.height}`);
  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));
  return new win.XMLSerializer().serializeToString(root);
}

export const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#ec4899"/>
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="100" height="100" rx="24" fill="url(#g)"/>
  <path d="M42 60l12 12 26-28" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
