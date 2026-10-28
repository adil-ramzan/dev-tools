import { parseColor, toHex } from "@/lib/tools/color";
import { escapeXml } from "@/lib/tools/svg-placeholder";

/**
 * Favicon generation from text, emoji or a local image. Each size is drawn
 * on a canvas in the browser and exported as PNG; favicon.ico is a real ICO
 * file (an ICONDIR header with embedded PNG images, supported by every
 * current browser and Windows Vista and later), and the package is a ZIP
 * written here without compression (PNG data is already compressed).
 */

export type FaviconFile = { name: string; size: number; purpose: string };

/** PNG files in the package, smallest first. */
export const PNG_FILES: FaviconFile[] = [
  { name: "favicon-16x16.png", size: 16, purpose: "Browser tabs" },
  { name: "favicon-32x32.png", size: 32, purpose: "Browser tabs on high-density screens, taskbar" },
  { name: "favicon-48x48.png", size: 48, purpose: "Windows site icons" },
  { name: "apple-touch-icon.png", size: 180, purpose: "iOS home screen" },
  { name: "android-chrome-192x192.png", size: 192, purpose: "Android home screen (manifest)" },
  { name: "android-chrome-512x512.png", size: 512, purpose: "Install prompts and splash screens (manifest)" },
];

/** Sizes embedded in favicon.ico. */
export const ICO_SIZES = [16, 32, 48];

// --- Text icons ----------------------------------------------------------------

export type Shape = "square" | "rounded" | "circle";
export type FontStyle = "sans" | "serif" | "mono";

export const FONT_STACKS: Record<FontStyle, string> = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'ui-serif, Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
};

export const MAX_TEXT_GRAPHEMES = 3;

export type IconOptions = {
  text: string;
  font: FontStyle;
  bold: boolean;
  foreground: string;
  background: string;
  transparent: boolean;
  shape: Shape;
  /** Padding around the content, as a percentage of the icon size (0–40). */
  padding: number;
};

export const DEFAULT_OPTIONS: IconOptions = {
  text: "D",
  font: "sans",
  bold: true,
  foreground: "#ffffff",
  background: "#1f4fe0",
  transparent: false,
  shape: "rounded",
  padding: 10,
};

/** User-perceived characters, so an emoji with modifiers counts as one. */
export function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment);
  return Array.from(text);
}

export function checkText(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed === "") return "Enter one to three letters, digits or an emoji.";
  if (graphemes(trimmed).length > MAX_TEXT_GRAPHEMES) return `Use at most ${MAX_TEXT_GRAPHEMES} characters: longer text is unreadable at 16×16 pixels.`;
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return "The text contains control characters.";
  return null;
}

export type ColorCheck = { ok: true; foreground: string; background: string } | { ok: false; error: string };

export function checkColors(foreground: string, background: string): ColorCheck {
  const fg = parseColor(foreground);
  if (!fg.ok) return { ok: false, error: `Text color: ${fg.error}` };
  const bg = parseColor(background);
  if (!bg.ok) return { ok: false, error: `Background: ${bg.error}` };
  return { ok: true, foreground: toHex(fg.color), background: toHex(bg.color) };
}

// --- Drawing ----------------------------------------------------------------------

type Ctx = Pick<
  CanvasRenderingContext2D,
  "clearRect" | "fillRect" | "beginPath" | "arc" | "roundRect" | "fill" | "save" | "restore" | "clip" | "fillText" | "measureText" | "drawImage" | "rect"
> & { fillStyle: CanvasRenderingContext2D["fillStyle"]; font: string; textAlign: CanvasTextAlign; textBaseline: CanvasTextBaseline; imageSmoothingQuality: ImageSmoothingQuality };

export type IconSource = { kind: "text" } | { kind: "image"; image: CanvasImageSource; width: number; height: number; fit: "contain" | "cover" };

function shapePath(ctx: Ctx, size: number, shape: Shape) {
  ctx.beginPath();
  if (shape === "circle") ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  else if (shape === "rounded") ctx.roundRect(0, 0, size, size, size * 0.2);
  else ctx.rect(0, 0, size, size);
}

/** Draws one icon of `size` pixels. Text is scaled to fill the padded area. */
export function drawIcon(ctx: Ctx, size: number, options: IconOptions, source: IconSource) {
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  shapePath(ctx, size, options.shape);
  ctx.clip();
  if (!options.transparent) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, size, size);
  }
  const inner = size * (1 - (2 * options.padding) / 100);
  const offset = (size - inner) / 2;
  if (source.kind === "image") {
    const scale = source.fit === "cover" ? Math.max(inner / source.width, inner / source.height) : Math.min(inner / source.width, inner / source.height);
    const w = source.width * scale;
    const h = source.height * scale;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source.image, offset + (inner - w) / 2, offset + (inner - h) / 2, w, h);
  } else {
    const text = options.text.trim();
    const weight = options.bold ? "700" : "400";
    // Measure at a reference size, then scale so the text fits the padded square.
    ctx.font = `${weight} 100px ${FONT_STACKS[options.font]}`;
    const m = ctx.measureText(text);
    const textHeight = (m.actualBoundingBoxAscent || 72) + (m.actualBoundingBoxDescent || 0);
    const fontSize = 100 * Math.min(inner / Math.max(m.width, 1), inner / Math.max(textHeight, 1));
    ctx.font = `${weight} ${fontSize}px ${FONT_STACKS[options.font]}`;
    ctx.fillStyle = options.foreground;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    // Center on the glyphs' actual bounds rather than the font's line box.
    const fitted = ctx.measureText(text);
    const ascent = fitted.actualBoundingBoxAscent || fontSize * 0.72;
    const descent = fitted.actualBoundingBoxDescent || 0;
    ctx.fillText(text, size / 2, size / 2 + (ascent - descent) / 2);
  }
  ctx.restore();
}

// --- ICO -------------------------------------------------------------------------

/** PNG width and height from the IHDR chunk, or null if the bytes are not a PNG. */
export function pngSize(png: Uint8Array): { width: number; height: number } | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.length < 24 || signature.some((b, i) => png[i] !== b)) return null;
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** An ICO file containing the given PNG images (each at most 256×256), in the order given. */
export function buildIco(pngs: Uint8Array[]): Uint8Array {
  if (pngs.length === 0 || pngs.length > 255) throw new RangeError("An ICO file holds 1 to 255 images.");
  const sizes = pngs.map((png) => {
    const size = pngSize(png);
    if (!size) throw new TypeError("Every ICO image must be a PNG.");
    if (size.width > 256 || size.height > 256) throw new RangeError("ICO images can be at most 256×256 pixels.");
    return size;
  });
  const headerSize = 6 + 16 * pngs.length;
  const total = headerSize + pngs.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, pngs.length, true);
  let offset = headerSize;
  pngs.forEach((png, i) => {
    const entry = 6 + 16 * i;
    out[entry] = sizes[i].width === 256 ? 0 : sizes[i].width; // 0 means 256
    out[entry + 1] = sizes[i].height === 256 ? 0 : sizes[i].height;
    out[entry + 2] = 0; // palette colors
    out[entry + 3] = 0; // reserved
    view.setUint16(entry + 4, 1, true); // color planes
    view.setUint16(entry + 6, 32, true); // bits per pixel
    view.setUint32(entry + 8, png.length, true);
    view.setUint32(entry + 12, offset, true);
    out.set(png, offset);
    offset += png.length;
  });
  return out;
}

// --- ZIP -------------------------------------------------------------------------

let crcTable: Uint32Array | null = null;

export function crc32(data: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** DOS date and time fields used by ZIP headers. */
function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.min(Math.max(date.getFullYear(), 1980), 2107);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/** A ZIP archive with the files stored uncompressed. Names are UTF-8. */
export function buildZip(files: { name: string; data: Uint8Array }[], modified = new Date()): Uint8Array {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(modified);
  const entries = files.map((f) => ({ name: encoder.encode(f.name), data: f.data, crc: crc32(f.data) }));
  const localSize = entries.reduce((n, e) => n + 30 + e.name.length + e.data.length, 0);
  const centralSize = entries.reduce((n, e) => n + 46 + e.name.length, 0);
  const out = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(out.buffer);
  const offsets: number[] = [];
  let p = 0;
  for (const e of entries) {
    offsets.push(p);
    view.setUint32(p, 0x04034b50, true);
    view.setUint16(p + 4, 20, true); // version needed
    view.setUint16(p + 6, 0x0800, true); // UTF-8 names
    view.setUint16(p + 8, 0, true); // stored
    view.setUint16(p + 10, time, true);
    view.setUint16(p + 12, date, true);
    view.setUint32(p + 14, e.crc, true);
    view.setUint32(p + 18, e.data.length, true);
    view.setUint32(p + 22, e.data.length, true);
    view.setUint16(p + 26, e.name.length, true);
    view.setUint16(p + 28, 0, true);
    out.set(e.name, p + 30);
    out.set(e.data, p + 30 + e.name.length);
    p += 30 + e.name.length + e.data.length;
  }
  const centralStart = p;
  entries.forEach((e, i) => {
    view.setUint32(p, 0x02014b50, true);
    view.setUint16(p + 4, 20, true); // version made by
    view.setUint16(p + 6, 20, true); // version needed
    view.setUint16(p + 8, 0x0800, true);
    view.setUint16(p + 10, 0, true);
    view.setUint16(p + 12, time, true);
    view.setUint16(p + 14, date, true);
    view.setUint32(p + 16, e.crc, true);
    view.setUint32(p + 20, e.data.length, true);
    view.setUint32(p + 24, e.data.length, true);
    view.setUint16(p + 28, e.name.length, true);
    // Extra field, comment, disk number, internal and external attributes: all zero.
    view.setUint32(p + 42, offsets[i], true);
    out.set(e.name, p + 46);
    p += 46 + e.name.length;
  });
  view.setUint32(p, 0x06054b50, true);
  view.setUint16(p + 8, entries.length, true);
  view.setUint16(p + 10, entries.length, true);
  view.setUint32(p + 12, p - centralStart, true);
  view.setUint32(p + 16, centralStart, true);
  return out;
}

// --- Markup ----------------------------------------------------------------------

export type ManifestOptions = { name: string; themeColor: string; backgroundColor: string };

export function manifestJson({ name, themeColor, backgroundColor }: ManifestOptions): string {
  const trimmed = name.trim();
  return JSON.stringify(
    {
      ...(trimmed ? { name: trimmed, short_name: graphemes(trimmed).slice(0, 12).join("") } : {}),
      icons: [
        { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
        { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      ],
      theme_color: themeColor,
      background_color: backgroundColor,
      display: "standalone",
    },
    null,
    2,
  );
}

/** The <head> markup, assuming the files are served from the site root. */
export function headHtml(themeColor: string): string {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="48x48">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
    `<meta name="theme-color" content="${escapeXml(themeColor)}">`,
  ].join("\n");
}
