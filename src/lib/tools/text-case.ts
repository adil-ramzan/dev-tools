/**
 * Text case conversions.
 *
 * Prose cases (UPPERCASE, lowercase, Title Case, Sentence case) keep the
 * text's punctuation and spacing and only change letters.
 *
 * Identifier cases (camelCase, PascalCase, snake_case, kebab-case,
 * CONSTANT_CASE) split each line into words, then join them. Words are split
 * at spaces, punctuation, underscores, hyphens and case changes
 * ("XMLHttpRequest" → XML, Http, Request). Digits stay with the preceding
 * word ("version2" stays one word). Apostrophes inside words are removed
 * ("don't" → dont). Each line is converted separately, so a list of names can
 * be converted at once.
 */

export type CaseId =
  | "upper"
  | "lower"
  | "title"
  | "sentence"
  | "camel"
  | "pascal"
  | "snake"
  | "kebab"
  | "constant";

export const caseOptions: { id: CaseId; label: string; example: string }[] = [
  { id: "upper", label: "UPPERCASE", example: "HELLO WORLD" },
  { id: "lower", label: "lowercase", example: "hello world" },
  { id: "title", label: "Title Case", example: "Hello World" },
  { id: "sentence", label: "Sentence case", example: "Hello world" },
  { id: "camel", label: "camelCase", example: "helloWorld" },
  { id: "pascal", label: "PascalCase", example: "HelloWorld" },
  { id: "snake", label: "snake_case", example: "hello_world" },
  { id: "kebab", label: "kebab-case", example: "hello-world" },
  { id: "constant", label: "CONSTANT_CASE", example: "HELLO_WORLD" },
];

const WORD =
  /\p{Lu}+(?=\p{Lu}\p{Ll})|\p{Lu}?[\p{Ll}\p{Lo}\p{Lm}\p{M}\p{N}]+|\p{Lu}+[\p{M}\p{N}]*|\p{Lt}[\p{Ll}\p{M}\p{N}]*|\p{N}+/gu;

/** Splits an identifier or phrase into words. */
export function splitWords(text: string): string[] {
  const withoutApostrophes = text.replace(/(\p{L})['’](?=\p{L})/gu, "$1");
  return withoutApostrophes.match(WORD) ?? [];
}

function capitalize(word: string): string {
  const [first = "", ...rest] = Array.from(word);
  return first.toUpperCase() + rest.join("").toLowerCase();
}

function convertIdentifierLine(line: string, id: CaseId): string {
  const words = splitWords(line);
  if (words.length === 0) return line.trim() === "" ? line : "";
  switch (id) {
    case "camel":
      return words.map((w, i) => (i === 0 ? w.toLowerCase() : capitalize(w))).join("");
    case "pascal":
      return words.map(capitalize).join("");
    case "snake":
      return words.map((w) => w.toLowerCase()).join("_");
    case "kebab":
      return words.map((w) => w.toLowerCase()).join("-");
    case "constant":
      return words.map((w) => w.toUpperCase()).join("_");
    default:
      return line;
  }
}

function toTitleCase(text: string): string {
  return text.replace(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:['’][\p{L}\p{M}]+)*/gu, capitalize);
}

function toSentenceCase(text: string): string {
  const lower = text.toLowerCase();
  // Capitalise the first letter of the text, after . ! ? followed by space,
  // and after blank lines.
  return lower.replace(/(^|[.!?]\s+|\n\s*\n\s*)(\P{L}*?)(\p{L})/gu, (_, before, gap, letter) => before + gap + letter.toUpperCase());
}

export function convertCase(text: string, id: CaseId): string {
  switch (id) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return toTitleCase(text);
    case "sentence":
      return toSentenceCase(text);
    default:
      return text
        .split(/\r\n|\r|\n/)
        .map((line) => convertIdentifierLine(line, id))
        .join("\n");
  }
}
