import { parseColor, toHex } from "@/lib/tools/color";

/**
 * SVG placeholder images. The SVG is built from validated numbers and
 * colors, and the label is XML-escaped, so user input can never add
 * elements, attributes or scripts to the image.
 */

export const MIN_DIMENSION = 1;
export const MAX_DIMENSION = 4000;
export const MAX_TEXT_LENGTH = 200;

export const FONT_FAMILIES = {
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const;

export type FontFamily = keyof typeof FONT_FAMILIES;

export type PlaceholderOptions = {
  width: number;
  height: number;
  background: string;
  foreground: string;
  /** Empty means "width × height". */
  text: string;
  /** 0 picks a size that fits. */
  fontSize: number;
  font: FontFamily;
};

export type PlaceholderResult = { ok: true; svg: string; label: string } | { ok: false; error: string; field: keyof PlaceholderOptions };

/** Escapes text for XML content and attribute values. */
export function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Characters XML 1.0 does not allow at all, which would make the SVG invalid. */
const INVALID_XML = /[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

function color(value: string, field: "background" | "foreground"): string | PlaceholderResult {
  const parsed = parseColor(value);
  if (!parsed.ok) return { ok: false, error: `${field === "background" ? "Background" : "Text"} color: ${parsed.error}`, field };
  return toHex(parsed.color);
}

export function buildPlaceholder(options: PlaceholderOptions): PlaceholderResult {
  const { width, height, text, fontSize, font } = options;
  for (const [field, value] of [["width", width], ["height", height]] as const) {
    if (!Number.isInteger(value) || value < MIN_DIMENSION || value > MAX_DIMENSION) {
      return { ok: false, error: `The ${field} must be a whole number of pixels from ${MIN_DIMENSION} to ${MAX_DIMENSION.toLocaleString("en-US")}.`, field };
    }
  }
  if (!Number.isInteger(fontSize) || fontSize < 0 || fontSize > 1000) return { ok: false, error: "The font size must be a whole number from 0 (automatic) to 1000.", field: "fontSize" };
  if (!(font in FONT_FAMILIES)) return { ok: false, error: "Choose a font.", field: "font" };
  if (text.length > MAX_TEXT_LENGTH) return { ok: false, error: `The text is longer than ${MAX_TEXT_LENGTH} characters.`, field: "text" };
  if (INVALID_XML.test(text)) return { ok: false, error: "The text contains control characters that SVG cannot contain.", field: "text" };

  const background = color(options.background, "background");
  if (typeof background !== "string") return background;
  const foreground = color(options.foreground, "foreground");
  if (typeof foreground !== "string") return foreground;

  const label = text.trim() === "" ? `${width}×${height}` : text.replace(/\s+/g, " ").trim();
  // Fit the label: about 0.6 em per character in most fonts, and at most a quarter of the height.
  const size = fontSize || Math.max(1, Math.floor(Math.min((width * 0.9) / (Array.from(label).length * 0.6), height * 0.25)));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(label)}">` +
    `<rect width="100%" height="100%" fill="${background}"/>` +
    `<text x="50%" y="50%" fill="${foreground}" font-family="${escapeXml(FONT_FAMILIES[font])}" font-size="${size}" font-weight="600" text-anchor="middle" dominant-baseline="central">${escapeXml(label)}</text>` +
    `</svg>`;
  return { ok: true, svg, label };
}

/** A data URI for use in img src or CSS, percent-encoding only what is needed. */
export function svgDataUri(svg: string): string {
  // encodeURIComponent leaves ( ) unencoded, which breaks unquoted CSS url(), so every character is escaped explicitly.
  return `data:image/svg+xml,${svg.replace(/"/g, "'").replace(/[\r\n%#()<>?[\\\]^`{|}]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`)}`;
}
