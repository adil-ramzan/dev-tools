import { convertCase } from "@/lib/tools/text-case";

/**
 * Line- and column-based list processing.
 *
 * Steps run in this order: split → trim → remove empty → change case →
 * truncate items → remove duplicates → sort → reverse → keep first N rows →
 * transpose → add prefix/suffix → join.
 *
 * Nothing is removed unless its option is on: empty lines, leading and
 * trailing whitespace and duplicates are all kept by default. In column mode,
 * each line is a row split into cells; sorting and duplicate removal compare
 * whole rows (or one column for sorting), and case and truncation apply to
 * every cell.
 */

export type ListMode = "lines" | "columns";
export type ItemSeparator = "newline" | "comma" | "semicolon" | "tab" | "space" | "custom";
export type ColumnDelimiter = "tab" | "comma" | "semicolon" | "pipe";
export type OutputSeparator = "newline" | "comma" | "comma-space" | "semicolon" | "tab" | "space" | "custom";
export type CaseMode = "none" | "lower" | "upper" | "title";
export type SortMode = "none" | "alpha" | "natural" | "numeric" | "length";

export type ListOptions = {
  mode: ListMode;
  separator: ItemSeparator;
  customSeparator: string;
  delimiter: ColumnDelimiter;
  trim: boolean;
  removeEmpty: boolean;
  caseMode: CaseMode;
  dedupe: boolean;
  ignoreCase: boolean;
  sort: SortMode;
  descending: boolean;
  /** 1-based column to sort by in column mode; 0 sorts by the whole row. */
  sortColumn: number;
  reverse: boolean;
  /** Keep only the first N rows; null keeps all. */
  limit: number | null;
  /** Cut items (or cells) to this many characters; null keeps them whole. */
  maxLength: number | null;
  transpose: boolean;
  prefix: string;
  suffix: string;
  output: OutputSeparator;
  customOutput: string;
};

export const defaultListOptions: ListOptions = {
  mode: "lines",
  separator: "newline",
  customSeparator: "",
  delimiter: "tab",
  trim: false,
  removeEmpty: false,
  caseMode: "none",
  dedupe: false,
  ignoreCase: false,
  sort: "none",
  descending: false,
  sortColumn: 0,
  reverse: false,
  limit: null,
  maxLength: null,
  transpose: false,
  prefix: "",
  suffix: "",
  output: "newline",
  customOutput: "",
};

const ITEM_SEPARATORS: Record<Exclude<ItemSeparator, "custom">, string | RegExp> = {
  newline: /\r\n|\r|\n/,
  comma: ",",
  semicolon: ";",
  tab: "\t",
  space: / +/,
};

export const DELIMITERS: Record<ColumnDelimiter, string> = { tab: "\t", comma: ",", semicolon: ";", pipe: "|" };

const OUTPUT_SEPARATORS: Record<Exclude<OutputSeparator, "custom">, string> = {
  newline: "\n",
  comma: ",",
  "comma-space": ", ",
  semicolon: ";",
  tab: "\t",
  space: " ",
};

export type ListStats = {
  inputRows: number;
  outputRows: number;
  removedEmpty: number;
  removedDuplicates: number;
  truncated: number;
};

export type ListResult = { ok: true; output: string; stats: ListStats; warnings: string[] } | { ok: false; error: string };

/** Characters, counted as user-perceived characters so emoji and accents are not cut in half. */
let segmenter: Intl.Segmenter | null | undefined;

function graphemes(text: string): string[] {
  if (segmenter === undefined) segmenter = "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);
}

function changeCase(text: string, mode: CaseMode): string {
  if (mode === "lower") return text.toLowerCase();
  if (mode === "upper") return text.toUpperCase();
  if (mode === "title") return convertCase(text, "title");
  return text;
}

const leadingNumber = (text: string) => {
  const match = /^\s*[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?/i.exec(text);
  return match ? Number(match[0]) : NaN;
};

function comparator(sort: SortMode, ignoreCase: boolean): (a: string, b: string) => number {
  if (sort === "length") return (a, b) => graphemes(a).length - graphemes(b).length;
  if (sort === "numeric") {
    // Items without a leading number go last, in their original order.
    return (a, b) => {
      const x = leadingNumber(a);
      const y = leadingNumber(b);
      if (Number.isNaN(x) || Number.isNaN(y)) return Number(Number.isNaN(x)) - Number(Number.isNaN(y));
      return x - y;
    };
  }
  const collator = new Intl.Collator(undefined, { numeric: sort === "natural", sensitivity: ignoreCase ? "accent" : "variant" });
  return collator.compare;
}

export function processList(input: string, options: ListOptions): ListResult {
  const o = options;
  if (o.limit !== null && (!Number.isInteger(o.limit) || o.limit < 0)) return { ok: false, error: "The number of rows to keep must be a whole number of 0 or more." };
  if (o.maxLength !== null && (!Number.isInteger(o.maxLength) || o.maxLength < 1)) return { ok: false, error: "The maximum item length must be a whole number of 1 or more." };
  if (o.mode === "lines" && o.separator === "custom" && o.customSeparator === "") return { ok: false, error: "Enter a custom separator, or choose another one." };
  if (o.mode === "columns" && o.sortColumn < 0) return { ok: false, error: "The sort column must be 1 or more." };
  if (input === "") return { ok: true, output: "", stats: { inputRows: 0, outputRows: 0, removedEmpty: 0, removedDuplicates: 0, truncated: 0 }, warnings: [] };

  const warnings: string[] = [];
  const columns = o.mode === "columns";
  const delimiter = DELIMITERS[o.delimiter];
  const splitter = columns ? ITEM_SEPARATORS.newline : o.separator === "custom" ? o.customSeparator : ITEM_SEPARATORS[o.separator];
  let rows: string[][] = input.split(splitter).map((row) => (columns ? row.split(delimiter) : [row]));
  const inputRows = rows.length;

  if (o.trim) rows = rows.map((cells) => cells.map((c) => c.trim()));
  let removedEmpty = 0;
  if (o.removeEmpty) {
    const before = rows.length;
    rows = rows.filter((cells) => cells.some((c) => c.trim() !== ""));
    removedEmpty = before - rows.length;
  }
  if (o.caseMode !== "none") rows = rows.map((cells) => cells.map((c) => changeCase(c, o.caseMode)));

  let truncated = 0;
  if (o.maxLength !== null) {
    const max = o.maxLength;
    rows = rows.map((cells) =>
      cells.map((c) => {
        const chars = graphemes(c);
        if (chars.length <= max) return c;
        truncated++;
        return chars.slice(0, max).join("");
      }),
    );
  }

  let removedDuplicates = 0;
  if (o.dedupe) {
    const seen = new Set<string>();
    const before = rows.length;
    rows = rows.filter((cells) => {
      let key = cells.join("\u0000").normalize("NFC");
      if (o.ignoreCase) key = key.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    removedDuplicates = before - rows.length;
  }

  if (o.sort !== "none") {
    const compare = comparator(o.sort, o.ignoreCase);
    const key = (cells: string[]) => (columns && o.sortColumn > 0 ? (cells[o.sortColumn - 1] ?? "") : cells.join(delimiter));
    const direction = o.descending ? -1 : 1;
    rows = [...rows].sort((a, b) => direction * compare(key(a), key(b)));
    if (columns && o.sortColumn > 0 && rows.some((cells) => cells.length < o.sortColumn)) {
      warnings.push(`Some rows have fewer than ${o.sortColumn} columns; they were sorted as if that column were empty.`);
    }
  }
  if (o.reverse) rows = rows.reverse();
  if (o.limit !== null) rows = rows.slice(0, o.limit);

  if (columns && o.transpose) {
    const width = Math.max(0, ...rows.map((cells) => cells.length));
    if (rows.some((cells) => cells.length !== width)) warnings.push("Rows had different numbers of columns, so missing cells were left empty when transposing.");
    rows = Array.from({ length: width }, (_, c) => rows.map((cells) => cells[c] ?? ""));
  }

  const items = rows.map((cells) => o.prefix + cells.join(delimiter) + o.suffix);
  const join = columns ? "\n" : o.output === "custom" ? o.customOutput : OUTPUT_SEPARATORS[o.output];
  return {
    ok: true,
    output: items.join(join),
    stats: { inputRows, outputRows: items.length, removedEmpty, removedDuplicates, truncated },
    warnings,
  };
}
