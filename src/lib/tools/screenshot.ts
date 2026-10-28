import { parseColor, toHex } from "@/lib/tools/color";

/**
 * Screenshot beautifier: places an image on a solid or gradient background
 * with padding, rounded corners, a drop shadow and an optional browser
 * window frame, drawn with Canvas 2D at the image's own resolution. The
 * image never leaves the browser.
 */

export const MAX_PADDING = 512;
export const MAX_RADIUS = 96;
export const MAX_SHADOW_BLUR = 160;
/** Same canvas limit as the SVG to PNG Converter: about 16.7 megapixels. */
export const MAX_OUTPUT_PIXELS = 4096 * 4096;
export const MAX_OUTPUT_SIDE = 8192;

export type Background = "gradient" | "solid" | "transparent";
export type Frame = "none" | "light" | "dark";

export type BeautifyOptions = {
  background: Background;
  color1: string;
  color2: string;
  /** CSS gradient angle in degrees: 0 points up, 90 right. */
  angle: number;
  padding: number;
  radius: number;
  shadowBlur: number;
  /** 0–100 percent opacity of the black shadow. */
  shadowOpacity: number;
  shadowOffsetY: number;
  frame: Frame;
};

export const DEFAULT_BEAUTIFY: BeautifyOptions = {
  background: "gradient",
  color1: "#6366f1",
  color2: "#ec4899",
  angle: 135,
  padding: 64,
  radius: 12,
  shadowBlur: 48,
  shadowOpacity: 35,
  shadowOffsetY: 16,
  frame: "none",
};

export const BACKGROUND_PRESETS: { label: string; color1: string; color2: string }[] = [
  { label: "Indigo to pink", color1: "#6366f1", color2: "#ec4899" },
  { label: "Ocean", color1: "#0ea5e9", color2: "#22c55e" },
  { label: "Sunset", color1: "#f97316", color2: "#facc15" },
  { label: "Slate", color1: "#334155", color2: "#0f172a" },
  { label: "Paper", color1: "#f1f5f9", color2: "#e2e8f0" },
];

/** Height of the browser frame's title bar for an image of this width. */
export function frameBarHeight(imageWidth: number): number {
  return Math.round(Math.min(Math.max(imageWidth * 0.035, 24), 96));
}

export type Layout = {
  width: number;
  height: number;
  /** The window: frame bar plus image, with rounded corners and the shadow. */
  window: { x: number; y: number; width: number; height: number };
  image: { x: number; y: number; width: number; height: number };
  bar: number;
};

export type LayoutResult = { ok: true; layout: Layout } | { ok: false; error: string };

export function checkOptions(o: BeautifyOptions): string | null {
  const ranges: [keyof BeautifyOptions, number, number, string][] = [
    ["padding", 0, MAX_PADDING, "Padding"],
    ["radius", 0, MAX_RADIUS, "Corner radius"],
    ["shadowBlur", 0, MAX_SHADOW_BLUR, "Shadow blur"],
    ["shadowOpacity", 0, 100, "Shadow opacity"],
    ["shadowOffsetY", -MAX_SHADOW_BLUR, MAX_SHADOW_BLUR, "Shadow offset"],
    ["angle", 0, 360, "Gradient angle"],
  ];
  for (const [key, min, max, label] of ranges) {
    const v = o[key] as number;
    if (!Number.isFinite(v) || v < min || v > max) return `${label} must be from ${min} to ${max}.`;
  }
  if (o.background !== "transparent") {
    for (const color of o.background === "gradient" ? [o.color1, o.color2] : [o.color1]) {
      if (!parseColor(color).ok) return `"${color}" is not a valid color.`;
    }
  }
  return null;
}

export function layout(imageWidth: number, imageHeight: number, o: BeautifyOptions): LayoutResult {
  const invalid = checkOptions(o);
  if (invalid) return { ok: false, error: invalid };
  const bar = o.frame === "none" ? 0 : frameBarHeight(imageWidth);
  const p = Math.round(o.padding);
  const width = imageWidth + 2 * p;
  const height = imageHeight + bar + 2 * p;
  if (width > MAX_OUTPUT_SIDE || height > MAX_OUTPUT_SIDE || width * height > MAX_OUTPUT_PIXELS) {
    return { ok: false, error: `The result would be ${width}×${height} pixels, over the ${(MAX_OUTPUT_PIXELS / 1e6).toFixed(1)}-megapixel limit that phones can draw. Reduce the padding or use a smaller screenshot.` };
  }
  return {
    ok: true,
    layout: { width, height, bar, window: { x: p, y: p, width: imageWidth, height: imageHeight + bar }, image: { x: p, y: p + bar, width: imageWidth, height: imageHeight } },
  };
}

/** Start and end points of a CSS linear-gradient(angle) over a w×h box, so the result matches CSS. */
export function gradientLine(angle: number, w: number, h: number): [number, number, number, number] {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  // CSS: the gradient line's length makes the corners reach exactly 0% and 100%.
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  return [w / 2 - dx * half, h / 2 - dy * half, w / 2 + dx * half, h / 2 + dy * half];
}

type Ctx = Pick<
  CanvasRenderingContext2D,
  "clearRect" | "fillRect" | "beginPath" | "roundRect" | "rect" | "arc" | "fill" | "save" | "restore" | "clip" | "drawImage" | "createLinearGradient"
> & {
  fillStyle: CanvasRenderingContext2D["fillStyle"];
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetY: number;
  shadowOffsetX: number;
  imageSmoothingQuality: ImageSmoothingQuality;
};

/** Draws the full result. `image` is drawn at its own pixel size, so nothing is scaled. */
export function drawScreenshot(ctx: Ctx, image: CanvasImageSource, { width, height, window: win, image: img, bar }: Layout, o: BeautifyOptions) {
  ctx.clearRect(0, 0, width, height);
  if (o.background === "solid") {
    ctx.fillStyle = toHex((parseColor(o.color1) as { ok: true; color: Parameters<typeof toHex>[0] }).color);
    ctx.fillRect(0, 0, width, height);
  } else if (o.background === "gradient") {
    const g = ctx.createLinearGradient(...gradientLine(o.angle, width, height));
    g.addColorStop(0, o.color1);
    g.addColorStop(1, o.color2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }
  const radius = Math.min(o.radius, win.width / 2, win.height / 2);
  const windowFill = o.frame === "dark" ? "#1f2937" : "#ffffff";

  // Shadow: cast by a filled window-shaped rectangle drawn under the image.
  if (o.shadowOpacity > 0 && (o.shadowBlur > 0 || o.shadowOffsetY !== 0)) {
    ctx.save();
    ctx.shadowColor = `rgba(0, 0, 0, ${o.shadowOpacity / 100})`;
    ctx.shadowBlur = o.shadowBlur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = o.shadowOffsetY;
    ctx.fillStyle = windowFill;
    ctx.beginPath();
    ctx.roundRect(win.x, win.y, win.width, win.height, radius);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(win.x, win.y, win.width, win.height, radius);
  ctx.clip();
  if (bar > 0) {
    ctx.fillStyle = o.frame === "dark" ? "#1f2937" : "#e5e7eb";
    ctx.fillRect(win.x, win.y, win.width, bar);
    const r = bar * 0.18;
    ["#ff5f57", "#febc2e", "#28c840"].forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(win.x + bar * 0.6 + i * r * 3.2, win.y + bar / 2, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, img.x, img.y, img.width, img.height);
  ctx.restore();
}
