/**
 * Text statistics. Counting conventions (shown on the Word Counter page):
 * - Characters are user-perceived characters (grapheme clusters), so an emoji
 *   or an accented letter counts once.
 * - Words are runs of text separated by whitespace that contain a letter or
 *   digit; hyphenated words and contractions count as one. Scripts written
 *   without spaces (Chinese, Japanese, Thai, ...) are split with the
 *   browser's word segmentation.
 * - Sentences come from the browser's sentence segmentation and are an
 *   estimate: abbreviations such as "e.g." can affect the count.
 * - Lines count line breaks + 1, as a text editor shows them.
 */

export type TextStats = {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  lines: number;
  paragraphs: number;
  /** Size when encoded as UTF-8. */
  utf8Bytes: number;
  /** UTF-16 code units: what JavaScript's `string.length` returns. */
  codeUnits: number;
};

const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const NO_SPACE_SCRIPTS =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
const WHITESPACE_ONLY = /^\s+$/u;

type Segmenters = {
  grapheme: Intl.Segmenter;
  word: Intl.Segmenter;
  sentence: Intl.Segmenter;
} | null;

let segmenters: Segmenters | undefined;

function getSegmenters(): Segmenters {
  if (segmenters !== undefined) return segmenters;
  segmenters =
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? {
          grapheme: new Intl.Segmenter(undefined, { granularity: "grapheme" }),
          word: new Intl.Segmenter(undefined, { granularity: "word" }),
          sentence: new Intl.Segmenter(undefined, { granularity: "sentence" }),
        }
      : null;
  return segmenters;
}

function graphemes(text: string, seg: Segmenters): string[] {
  if (seg) return Array.from(seg.grapheme.segment(text), (s) => s.segment);
  return Array.from(text); // Fallback: code points.
}

function countWords(text: string, seg: Segmenters): number {
  let count = 0;
  for (const token of text.split(/\s+/u)) {
    if (!token || !HAS_LETTER_OR_DIGIT.test(token)) continue;
    if (seg && NO_SPACE_SCRIPTS.test(token)) {
      for (const part of seg.word.segment(token)) if (part.isWordLike) count++;
    } else {
      count++;
    }
  }
  return count;
}

function countSentences(text: string, seg: Segmenters): number {
  if (seg) {
    let count = 0;
    for (const part of seg.sentence.segment(text)) if (HAS_LETTER_OR_DIGIT.test(part.segment)) count++;
    return count;
  }
  return text.split(/[.!?。！？]+(?:\s+|$)/u).filter((s) => HAS_LETTER_OR_DIGIT.test(s)).length;
}

export function getTextStats(text: string): TextStats {
  const seg = getSegmenters();
  const chars = graphemes(text, seg);
  return {
    characters: chars.length,
    charactersNoSpaces: chars.filter((c) => !WHITESPACE_ONLY.test(c)).length,
    words: countWords(text, seg),
    sentences: countSentences(text, seg),
    lines: text === "" ? 0 : text.split(/\r\n|\r|\n/).length,
    paragraphs: text.split(/(?:\r\n|\r|\n)\s*(?:\r\n|\r|\n)/).filter((p) => p.trim() !== "").length,
    utf8Bytes: new TextEncoder().encode(text).length,
    codeUnits: text.length,
  };
}
