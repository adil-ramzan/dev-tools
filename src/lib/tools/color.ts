/**
 * Color parsing, conversion and WCAG contrast. Colors are sRGB with
 * channels 0–255 and alpha 0–1.
 *
 * Accepted input: #rgb, #rgba, #rrggbb, #rrggbbaa, rgb()/rgba() and
 * hsl()/hsla() in both comma and space syntax (rgb(31 79 224 / 50%)).
 * Values out of range are rejected rather than clamped.
 */

export type Rgba = { r: number; g: number; b: number; a: number };
export type ColorFormat = "hex" | "rgb" | "hsl";
export type ColorResult = { ok: true; color: Rgba; format: ColorFormat } | { ok: false; error: string };

const NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?`;

function parseAlpha(value: string): number | string {
  const pct = value.endsWith("%");
  const n = Number(pct ? value.slice(0, -1) : value);
  if (!Number.isFinite(n)) return `"${value}" is not a valid alpha value`;
  const alpha = pct ? n / 100 : n;
  if (alpha < 0 || alpha > 1) return "Alpha must be between 0 and 1 (or 0% and 100%)";
  return alpha;
}

/** Splits "a, b, c" or "a b c / d" into channel strings and an optional alpha. */
function splitArgs(body: string): { channels: string[]; alpha?: string } | null {
  const trimmed = body.trim();
  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map((p) => p.trim());
    if (parts.some((p) => p === "" || /\s/.test(p))) return null;
    return parts.length === 4 ? { channels: parts.slice(0, 3), alpha: parts[3] } : { channels: parts };
  }
  const [main, alpha, extra] = trimmed.split("/").map((p) => p.trim());
  if (extra !== undefined || alpha === "") return null;
  return { channels: main.split(/\s+/).filter(Boolean), alpha };
}

function hueDegrees(value: string): number | null {
  const m = new RegExp(`^(${NUMBER})(deg|turn|rad|grad)?$`, "i").exec(value);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = (m[2] ?? "deg").toLowerCase();
  const deg = unit === "turn" ? n * 360 : unit === "rad" ? (n * 180) / Math.PI : unit === "grad" ? n * 0.9 : n;
  return ((deg % 360) + 360) % 360;
}

export function parseColor(input: string): ColorResult {
  const text = input.trim();
  if (text === "") return { ok: false, error: "Enter a color, such as #1f4fe0, rgb(31, 79, 224) or hsl(225, 76%, 50%)." };

  const hex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(text);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return { ok: true, format: "hex", color: { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? Math.round((n(6) / 255) * 1000) / 1000 : 1 } };
  }
  if (/^#/.test(text)) return { ok: false, error: "A HEX color has 3, 4, 6 or 8 hexadecimal digits after #, such as #1f4fe0." };

  const fn = /^(rgba?|hsla?)\((.*)\)$/i.exec(text);
  if (!fn) {
    return /^[a-z]+$/i.test(text)
      ? { ok: false, error: `Named colors such as "${text}" are not supported. Use HEX, RGB or HSL.` }
      : { ok: false, error: "Use HEX (#1f4fe0), RGB (rgb(31, 79, 224)) or HSL (hsl(225, 76%, 50%))." };
  }
  const name = fn[1].toLowerCase();
  const args = splitArgs(fn[2]);
  if (!args || args.channels.length !== 3) {
    return { ok: false, error: `${name}() needs three values, plus an optional alpha: for example ${name.startsWith("rgb") ? "rgb(31, 79, 224) or rgb(31 79 224 / 50%)" : "hsl(225, 76%, 50%) or hsl(225 76% 50% / 0.5)"}.` };
  }
  let a = 1;
  if (args.alpha !== undefined) {
    const alpha = parseAlpha(args.alpha);
    if (typeof alpha === "string") return { ok: false, error: alpha };
    a = alpha;
  }

  if (name.startsWith("rgb")) {
    const values: number[] = [];
    for (const channel of args.channels) {
      const pct = channel.endsWith("%");
      const n = Number(pct ? channel.slice(0, -1) : channel);
      if (!Number.isFinite(n) || !new RegExp(`^${NUMBER}%?$`, "i").test(channel)) return { ok: false, error: `"${channel}" is not a valid RGB value.` };
      const v = pct ? (n / 100) * 255 : n;
      if (v < 0 || v > 255) return { ok: false, error: `RGB values must be between 0 and 255 (or 0% and 100%); "${channel}" is out of range.` };
      values.push(v);
    }
    return { ok: true, format: "rgb", color: { r: values[0], g: values[1], b: values[2], a } };
  }

  const h = hueDegrees(args.channels[0]);
  if (h === null) return { ok: false, error: `"${args.channels[0]}" is not a valid hue. Use degrees, such as 225 or 225deg.` };
  const percents: number[] = [];
  for (const channel of args.channels.slice(1)) {
    const n = Number(channel.replace(/%$/, ""));
    if (!Number.isFinite(n) || !new RegExp(`^${NUMBER}%?$`, "i").test(channel)) return { ok: false, error: `"${channel}" is not a valid percentage.` };
    if (n < 0 || n > 100) return { ok: false, error: `Saturation and lightness must be between 0% and 100%; "${channel}" is out of range.` };
    percents.push(n);
  }
  return { ok: true, format: "hsl", color: { ...hslToRgb(h, percents[0], percents[1]), a } };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const chroma = sat * Math.min(light, 1 - light);
  const f = (n: number) => 255 * (light - chroma * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)));
  return { r: f(0), g: f(8), b: f(4) };
}

export function rgbToHsl({ r, g, b }: Rgba): { h: number; s: number; l: number } {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: s * 100, l: l * 100 };
}

const trim = (n: number, digits = 1) => String(Number(n.toFixed(digits)));
const byte = (n: number) => Math.round(Math.min(255, Math.max(0, n)));
const alphaText = (a: number) => trim(a, 3);

export function toHex(c: Rgba): string {
  const hex = [c.r, c.g, c.b].map((v) => byte(v).toString(16).padStart(2, "0")).join("");
  return `#${hex}${c.a < 1 ? byte(c.a * 255).toString(16).padStart(2, "0") : ""}`;
}

export function toRgbString(c: Rgba): string {
  const rgb = `${byte(c.r)}, ${byte(c.g)}, ${byte(c.b)}`;
  return c.a < 1 ? `rgba(${rgb}, ${alphaText(c.a)})` : `rgb(${rgb})`;
}

export function toHslString(c: Rgba): string {
  const { h, s, l } = rgbToHsl(c);
  const hsl = `${trim(h)}, ${trim(s)}%, ${trim(l)}%`;
  return c.a < 1 ? `hsla(${hsl}, ${alphaText(c.a)})` : `hsl(${hsl})`;
}

/** Mixes `c` with `other`; amount 0 = c, 1 = other. Alpha is kept from c. */
export function mix(c: Rgba, other: Rgba, amount: number): Rgba {
  return { r: c.r + (other.r - c.r) * amount, g: c.g + (other.g - c.g) * amount, b: c.b + (other.b - c.b) * amount, a: c.a };
}

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };
const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };

/** Tints (mixed with white) and shades (mixed with black), lightest first. */
export function shades(c: Rgba): { label: string; color: Rgba }[] {
  const opaque = { ...c, a: 1 };
  return [
    ...[0.9, 0.75, 0.6, 0.4, 0.2].map((t) => ({ label: `${Math.round(t * 100)}% lighter`, color: mix(opaque, WHITE, t) })),
    { label: "Base", color: opaque },
    ...[0.2, 0.4, 0.6, 0.75].map((t) => ({ label: `${Math.round(t * 100)}% darker`, color: mix(opaque, BLACK, t) })),
  ];
}

/** Places a translucent color over an opaque background. */
export function composite(fg: Rgba, bg: Rgba): Rgba {
  const a = fg.a;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(c: Rgba): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/**
 * WCAG 2 contrast ratio. A translucent text color is first blended onto the
 * background; a translucent background is blended onto white.
 */
export function contrastRatio(text: Rgba, background: Rgba): number {
  const bg = background.a < 1 ? composite(background, WHITE) : background;
  const fg = text.a < 1 ? composite(text, bg) : text;
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Ratio for display, rounded down so 4.499 is never shown as 4.50. */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;
}

export type WcagResult = { aaNormal: boolean; aaLarge: boolean; aaaNormal: boolean; aaaLarge: boolean };

export function wcag(ratio: number): WcagResult {
  return { aaNormal: ratio >= 4.5, aaLarge: ratio >= 3, aaaNormal: ratio >= 7, aaaLarge: ratio >= 4.5 };
}

/** Whichever of black or white text has more contrast on `bg`. */
export function readableText(bg: Rgba): Rgba {
  return contrastRatio(WHITE, bg) >= contrastRatio(BLACK, bg) ? WHITE : BLACK;
}
