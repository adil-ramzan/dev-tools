/**
 * CSS generation for the gradient, box shadow and flexbox tools. Each takes
 * the tool's state and returns the exact CSS that the preview uses.
 */

import { parseColor, toHex, toRgbString, type Rgba } from "@/lib/tools/color";

const num = (n: number) => String(Number(n.toFixed(2)));
const px = (n: number) => (n === 0 ? "0" : `${num(n)}px`);

function colorWithOpacity(hex: string, opacity: number): Rgba {
  const parsed = parseColor(hex);
  const base = parsed.ok ? parsed.color : { r: 0, g: 0, b: 0, a: 1 };
  return { ...base, a: Math.min(1, Math.max(0, opacity)) };
}

/** Opaque colors as HEX; translucent ones as rgba() for readability. */
function cssColor(c: Rgba): string {
  return c.a >= 1 ? toHex(c) : toRgbString(c);
}

// --- Gradient --------------------------------------------------------------

export type GradientStop = { id: string; color: string; opacity: number; position: number };

export type GradientState = {
  type: "linear" | "radial";
  /** Linear: angle in degrees (0 = to top, 90 = to right). */
  angle: number;
  /** Radial: shape and center position in percent. */
  shape: "circle" | "ellipse";
  x: number;
  y: number;
  stops: GradientStop[];
};

export const MAX_STOPS = 8;

/** The gradient value, with stops in position order as CSS requires. */
export function gradientValue(state: GradientState): string {
  const stops = [...state.stops]
    .sort((a, b) => a.position - b.position)
    .map((s) => `${cssColor(colorWithOpacity(s.color, s.opacity))} ${num(Math.min(100, Math.max(0, s.position)))}%`)
    .join(", ");
  if (state.type === "linear") return `linear-gradient(${num(((state.angle % 360) + 360) % 360)}deg, ${stops})`;
  return `radial-gradient(${state.shape} at ${num(state.x)}% ${num(state.y)}%, ${stops})`;
}

export function gradientCss(state: GradientState): string {
  const first = [...state.stops].sort((a, b) => a.position - b.position)[0];
  const fallback = first ? cssColor(colorWithOpacity(first.color, first.opacity)) : "transparent";
  return `background-color: ${fallback};\nbackground-image: ${gradientValue(state)};`;
}

// --- Box shadow --------------------------------------------------------------

export type ShadowLayer = {
  id: string;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  /** 0–100. */
  opacity: number;
  inset: boolean;
};

export const MAX_SHADOWS = 5;

export function shadowValue(layers: ShadowLayer[]): string {
  if (layers.length === 0) return "none";
  return layers
    .map((l) => {
      const parts = [l.inset ? "inset" : "", px(l.x), px(l.y), px(Math.max(0, l.blur)), px(l.spread), cssColor(colorWithOpacity(l.color, l.opacity / 100))];
      return parts.filter(Boolean).join(" ");
    })
    .join(",\n    ");
}

export function boxShadowCss(layers: ShadowLayer[]): string {
  return `box-shadow: ${shadowValue(layers)};`;
}

// --- Flexbox -----------------------------------------------------------------

export type FlexItem = { id: string; label: string; grow: number };

export type FlexState = {
  direction: "row" | "row-reverse" | "column" | "column-reverse";
  wrap: "nowrap" | "wrap" | "wrap-reverse";
  justifyContent: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems: "stretch" | "flex-start" | "center" | "flex-end" | "baseline";
  alignContent: "normal" | "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly" | "stretch";
  gap: number;
  items: FlexItem[];
};

export const MAX_FLEX_ITEMS = 12;

export function flexContainerStyle(state: FlexState): Record<string, string> {
  return {
    display: "flex",
    flexDirection: state.direction,
    flexWrap: state.wrap,
    justifyContent: state.justifyContent,
    alignItems: state.alignItems,
    alignContent: state.alignContent,
    gap: px(state.gap),
  };
}

export function flexCss(state: FlexState): string {
  const lines = [
    ".container {",
    "  display: flex;",
    `  flex-direction: ${state.direction};`,
    `  flex-wrap: ${state.wrap};`,
    `  justify-content: ${state.justifyContent};`,
    `  align-items: ${state.alignItems};`,
    `  align-content: ${state.alignContent};`,
    `  gap: ${px(state.gap)};`,
    "}",
  ];
  state.items.forEach((item, i) => {
    if (item.grow > 0) lines.push("", `.item-${i + 1} {`, `  flex-grow: ${item.grow};`, "}");
  });
  return lines.join("\n");
}

// --- PX to REM ---------------------------------------------------------------

export type UnitDirection = "px-to-rem" | "rem-to-px";

export type UnitOptions = {
  direction: UnitDirection;
  /** Root font size in pixels (browsers default to 16). */
  rootSize: number;
  /** Maximum decimal places. */
  precision: number;
  /** Leave 1px values (usually hairline borders) unchanged. */
  keepOnePx: boolean;
};

export type UnitResult = { ok: true; output: string; converted: number } | { ok: false; error: string };

function formatNumber(n: number, precision: number): string {
  const text = String(Number(n.toFixed(precision)));
  return text === "-0" ? "0" : text;
}

/**
 * Converts values in free text. Values with the source unit (16px, 1.5rem)
 * are converted where they appear and everything else is left untouched,
 * so whole CSS rules can be pasted. Text made only of plain numbers (one per
 * line, or separated by spaces or commas) is read as the source unit.
 */
export function convertUnits(text: string, options: UnitOptions): UnitResult {
  const { direction, rootSize, precision, keepOnePx } = options;
  if (!Number.isFinite(rootSize) || rootSize <= 0 || rootSize > 1000) {
    return { ok: false, error: "The root font size must be a number greater than 0 and at most 1000." };
  }
  const from = direction === "px-to-rem" ? "px" : "rem";
  const to = direction === "px-to-rem" ? "rem" : "px";
  const convert = (value: number) => (direction === "px-to-rem" ? value / rootSize : value * rootSize);
  let converted = 0;

  const unitPattern = new RegExp(String.raw`(?<![\w.#-])(-?(?:\d+\.?\d*|\.\d+))${from}\b`, "gi");
  if (unitPattern.test(text)) {
    unitPattern.lastIndex = 0;
    const output = text.replace(unitPattern, (match, value: string) => {
      const n = Number(value);
      if (from === "px" && keepOnePx && Math.abs(n) === 1) return match;
      converted++;
      return `${formatNumber(convert(n), precision)}${to}`;
    });
    return { ok: true, output, converted };
  }

  if (/^[\s,]*(-?(\d+\.?\d*|\.\d+)[\s,]*)+$/.test(text)) {
    const output = text.replace(/-?(?:\d+\.?\d*|\.\d+)/g, (value) => {
      const n = Number(value);
      if (from === "px" && keepOnePx && Math.abs(n) === 1) return `${value}px`;
      converted++;
      return `${formatNumber(convert(n), precision)}${to}`;
    });
    return { ok: true, output, converted };
  }

  if (text.trim() === "") return { ok: true, output: "", converted: 0 };
  return { ok: false, error: `No ${from} values were found. Enter values such as ${from === "px" ? "16px or 24" : "1rem or 1.5"}, or paste CSS that uses ${from}.` };
}
