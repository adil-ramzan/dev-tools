/**
 * Masks text so a value stays recognizable without being shown in full, e.g.
 * sk_live_4eC39HqLyjWDarjtT1zdp7dc → sk**************************7dc.
 *
 * Rules, applied to each line (or the whole text) separately:
 * - The first `keepStart` and last `keepEnd` characters stay visible, and
 *   every other character becomes the mask character.
 * - Characters are user-perceived characters (grapheme clusters), so an
 *   emoji or an accented letter is masked as one character.
 * - If the value is too short to keep that many characters visible and still
 *   hide at least one, the whole value is masked.
 * - Optional: keep spaces and punctuation visible, keep the domain of an
 *   email address, and hide the length by using a fixed number of mask
 *   characters.
 *
 * Masking is not encryption or anonymization: the visible characters, the
 * length and the format all leak information, and short or predictable values
 * can be guessed.
 */

export type ObfuscateOptions = {
  keepStart: number;
  keepEnd: number;
  mask: string;
  /** Use exactly this many mask characters instead of one per hidden character; 0 keeps the length. */
  fixedLength: number;
  keepPunctuation: boolean;
  keepEmailDomain: boolean;
  perLine: boolean;
};

export const defaultObfuscateOptions: ObfuscateOptions = {
  keepStart: 2,
  keepEnd: 2,
  mask: "*",
  fixedLength: 0,
  keepPunctuation: false,
  keepEmailDomain: false,
  perLine: true,
};

export const MAX_KEEP = 64;

export type ObfuscateResult =
  | { ok: true; output: string; fullyMasked: number; values: number }
  | { ok: false; error: string };

let segmenter: Intl.Segmenter | null | undefined;

export function graphemes(text: string): string[] {
  if (segmenter === undefined) segmenter = "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);
}

const PUNCTUATION = /^[\s\p{P}\p{S}]+$/u;
const EMAIL = /^([^\s@]+)@([^\s@]+\.[^\s@]+)$/;

function maskValue(value: string, o: ObfuscateOptions): { text: string; full: boolean } {
  const chars = graphemes(value);
  const maskable = chars.map((c) => !(o.keepPunctuation && PUNCTUATION.test(c)));
  const positions = maskable.flatMap((m, i) => (m ? [i] : []));
  if (positions.length === 0) return { text: value, full: false };

  const start = positions.slice(0, o.keepStart);
  const end = positions.slice(Math.max(start.length, positions.length - o.keepEnd));
  // Too short to keep that much visible and still hide something: hide it all.
  const full = start.length + end.length >= positions.length;
  const visible = full ? new Set<number>() : new Set([...start, ...end]);

  if (o.fixedLength > 0) {
    const text = (indexes: number[]) => (full ? "" : indexes.map((i) => chars[i]).join(""));
    return { text: text(start) + o.mask.repeat(o.fixedLength) + text(end), full };
  }
  return { text: chars.map((c, i) => (maskable[i] && !visible.has(i) ? o.mask : c)).join(""), full };
}

function obfuscateOne(value: string, o: ObfuscateOptions): { text: string; full: boolean } | null {
  if (value.trim() === "") return null;
  const leading = /^\s*/.exec(value)![0];
  const trailing = /\s*$/.exec(value)![0];
  const core = value.slice(leading.length, value.length - trailing.length);
  const email = o.keepEmailDomain ? EMAIL.exec(core) : null;
  if (email) {
    const local = maskValue(email[1], o);
    return { text: `${leading}${local.text}@${email[2]}${trailing}`, full: local.full };
  }
  const masked = maskValue(core, o);
  return { text: leading + masked.text + trailing, full: masked.full };
}

export function obfuscate(input: string, options: ObfuscateOptions): ObfuscateResult {
  const o = options;
  for (const [name, value] of [["characters to keep at the start", o.keepStart], ["characters to keep at the end", o.keepEnd]] as const) {
    if (!Number.isInteger(value) || value < 0 || value > MAX_KEEP) return { ok: false, error: `The number of ${name} must be a whole number from 0 to ${MAX_KEEP}.` };
  }
  if (!Number.isInteger(o.fixedLength) || o.fixedLength < 0 || o.fixedLength > 64) return { ok: false, error: "The fixed mask length must be a whole number from 0 to 64." };
  if (graphemes(o.mask).length !== 1 || /\s/.test(o.mask)) return { ok: false, error: "The mask must be a single visible character, such as * or •." };

  const parts = o.perLine ? input.split(/(\r\n|\r|\n)/) : [input];
  let fullyMasked = 0;
  let values = 0;
  const output = parts
    .map((part, i) => {
      if (o.perLine && i % 2 === 1) return part; // a line break
      const result = obfuscateOne(part, o);
      if (!result) return part;
      values++;
      if (result.full) fullyMasked++;
      return result.text;
    })
    .join("");
  return { ok: true, output, fullyMasked, values };
}
