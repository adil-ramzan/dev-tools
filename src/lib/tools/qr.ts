import { contrastRatio, luminance, parseColor, toHex } from "@/lib/tools/color";

/**
 * QR code generation with qrcode-generator (MIT, no dependencies), loaded
 * only on this tool's page. Everything is computed locally.
 *
 * Text is encoded as UTF-8 bytes. qrcode-generator's default byte encoding
 * keeps only the low 8 bits of each UTF-16 unit, which corrupts characters
 * such as € and emoji, so the text is converted to UTF-8 first.
 */

export type ErrorLevel = "L" | "M" | "Q" | "H";

export const ERROR_LEVELS: { value: ErrorLevel; label: string; recovery: string }[] = [
  { value: "L", label: "Low", recovery: "about 7%" },
  { value: "M", label: "Medium", recovery: "about 15%" },
  { value: "Q", label: "Quartile", recovery: "about 25%" },
  { value: "H", label: "High", recovery: "about 30%" },
];

export const MIN_SIZE = 64;
export const MAX_SIZE = 2048;
export const MAX_MARGIN = 16;
/** Recommended quiet zone, in modules, from the QR specification. */
export const RECOMMENDED_MARGIN = 4;

type QrFactory = typeof import("qrcode-generator");

export function loadQr(): Promise<QrFactory> {
  return import("qrcode-generator").then((m) => ((m as { default?: QrFactory }).default ?? m) as QrFactory);
}

/** Each byte of the UTF-8 encoding as one character, which qrcode-generator copies byte for byte. */
export function utf8ByteString(text: string): string {
  let out = "";
  for (const byte of new TextEncoder().encode(text)) out += String.fromCharCode(byte);
  return out;
}

export type QrMatrix = { modules: boolean[][]; version: number };

export type QrResult = { ok: true; qr: QrMatrix } | { ok: false; error: string };

export function generateQr(text: string, level: ErrorLevel, qrcode: QrFactory): QrResult {
  if (text === "") return { ok: false, error: "Enter text or a URL to encode." };
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text)) {
    return { ok: false, error: "The text contains an incomplete Unicode character." };
  }
  const bytes = new TextEncoder().encode(text).length;
  try {
    const qr = qrcode(0, level);
    qr.addData(utf8ByteString(text), "Byte");
    qr.make();
    const count = qr.getModuleCount();
    const modules = Array.from({ length: count }, (_, row) => Array.from({ length: count }, (_, col) => qr.isDark(row, col)));
    return { ok: true, qr: { modules, version: (count - 17) / 4 } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/overflow/i.test(message)) {
      const level_ = ERROR_LEVELS.find((l) => l.value === level)!;
      return { ok: false, error: `The text is too long for a QR code at ${level_.label} error correction (${bytes.toLocaleString("en-US")} bytes as UTF-8). Shorten it or choose a lower error correction level; the maximum is 2,953 bytes at Low.` };
    }
    return { ok: false, error: `The QR code could not be created: ${message}` };
  }
}

export type QrColors = { foreground: string; background: string };

export type ColorCheck = { ok: true; foreground: string; background: string; warnings: string[] } | { ok: false; error: string };

/** Validates colors and warns about combinations scanners struggle with. Returns normalized hex. */
export function checkColors({ foreground, background }: QrColors): ColorCheck {
  const fg = parseColor(foreground);
  const bg = background.trim().toLowerCase() === "transparent" ? ({ ok: true, color: { r: 255, g: 255, b: 255, a: 0 } } as const) : parseColor(background);
  if (!fg.ok) return { ok: false, error: `Foreground: ${fg.error}` };
  if (!bg.ok) return { ok: false, error: `Background: ${bg.error}` };
  if (fg.color.a < 1) return { ok: false, error: "The foreground color must be fully opaque." };
  const warnings: string[] = [];
  const ratio = contrastRatio(fg.color, bg.color.a === 0 ? { r: 255, g: 255, b: 255, a: 1 } : bg.color);
  if (ratio < 3) warnings.push(`The contrast between the colors is low (${ratio.toFixed(1)}:1). Many scanners need strong contrast; dark on light works best.`);
  if (bg.color.a > 0 && luminance(fg.color) > luminance(bg.color)) warnings.push("Light modules on a dark background (an inverted code) are not supported by every scanner.");
  if (bg.color.a < 1) warnings.push("A transparent background depends on what the code is placed on; make sure it is light and plain.");
  return { ok: true, foreground: toHex(fg.color), background: bg.color.a === 0 ? "transparent" : toHex(bg.color), warnings };
}

export type RenderOptions = { size: number; margin: number; foreground: string; background: string };

export function checkRender({ size, margin }: Pick<RenderOptions, "size" | "margin">): string | null {
  if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) return `The size must be a whole number of pixels from ${MIN_SIZE} to ${MAX_SIZE}.`;
  if (!Number.isInteger(margin) || margin < 0 || margin > MAX_MARGIN) return `The margin must be a whole number of modules from 0 to ${MAX_MARGIN}.`;
  return null;
}

/** An SVG with one path for all dark modules, built from runs of adjacent modules in each row. */
export function toSvg({ modules }: QrMatrix, { size, margin, foreground, background }: RenderOptions): string {
  const count = modules.length + margin * 2;
  let path = "";
  modules.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      let end = x;
      while (end + 1 < row.length && row[end + 1]) end++;
      path += `M${x + margin} ${y + margin}h${end - x + 1}v1h-${end - x + 1}z`;
      x = end;
    }
  });
  const bg = background === "transparent" ? "" : `<rect width="${count}" height="${count}" fill="${background}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${count} ${count}" shape-rendering="crispEdges">${bg}<path fill="${foreground}" d="${path}"/></svg>`;
}

/** Draws the code on a canvas context at `size` pixels, snapping modules to whole pixels where possible. */
export function drawToCanvas(ctx: Pick<CanvasRenderingContext2D, "fillStyle" | "fillRect" | "clearRect">, { modules }: QrMatrix, { size, margin, foreground, background }: RenderOptions) {
  const count = modules.length + margin * 2;
  const scale = size / count;
  ctx.clearRect(0, 0, size, size);
  if (background !== "transparent") {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.fillStyle = foreground;
  modules.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (!dark) return;
      const left = Math.round((x + margin) * scale);
      const top = Math.round((y + margin) * scale);
      ctx.fillRect(left, top, Math.round((x + margin + 1) * scale) - left, Math.round((y + margin + 1) * scale) - top);
    }),
  );
}
