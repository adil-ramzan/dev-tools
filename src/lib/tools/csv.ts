/**
 * CSV parsing and writing (RFC 4180), and conversion to and from JSON.
 *
 * Parsing is strict: a quote inside an unquoted field, text after a closing
 * quote and an unclosed quoted field are errors with a line and column,
 * rather than being guessed at.
 */

import { formatJson, parseJson, type JsonNode } from "@/lib/tools/json";

export type Delimiter = "," | ";" | "\t" | "|";
export type DelimiterOption = Delimiter | "auto";

export const delimiterLabels: Record<Delimiter, string> = { ",": "Comma", ";": "Semicolon", "\t": "Tab", "|": "Pipe" };

export type CsvError = { message: string; line: number; column: number };

export type CsvParseResult = { ok: true; rows: string[][]; delimiter: Delimiter } | { ok: false; error: CsvError };

/** Picks the candidate delimiter that appears most often outside quotes in the first line. */
export function detectDelimiter(text: string): Delimiter {
  const counts: Record<Delimiter, number> = { ",": 0, ";": 0, "\t": 0, "|": 0 };
  let quoted = false;
  for (const char of text) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === "\n" || char === "\r")) break;
    else if (!quoted && char in counts) counts[char as Delimiter]++;
  }
  const best = (Object.keys(counts) as Delimiter[]).reduce((a, b) => (counts[b] > counts[a] ? b : a), ",");
  return counts[best] > 0 ? best : ",";
}

export function parseCsv(input: string, option: DelimiterOption = "auto"): CsvParseResult {
  const text = input.startsWith("﻿") ? input.slice(1) : input;
  const delimiter = option === "auto" ? detectDelimiter(text) : option;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let line = 1;
  let lineStart = 0;
  const error = (message: string, at: number, atLine = line, atLineStart = lineStart): CsvParseResult => ({
    ok: false,
    error: { message, line: atLine, column: at - atLineStart + 1 },
  });

  const endRow = () => {
    row.push(field);
    field = "";
    // Skip blank lines (a single empty field).
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];
    if (char === '"' && field === "") {
      // Quoted field.
      const startLine = line;
      const startLineStart = lineStart;
      const start = i;
      i++;
      for (;;) {
        if (i >= text.length) return error("This quoted field is never closed. Add the missing closing quote (\")", start, startLine, startLineStart);
        const c = text[i];
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          i++;
          break;
        }
        if (c === "\n" || (c === "\r" && text[i + 1] !== "\n")) {
          line++;
          lineStart = i + 1;
        }
        field += c;
        i++;
      }
      const next = text[i];
      if (next !== undefined && next !== delimiter && next !== "\n" && next !== "\r") {
        return error(`Unexpected text after a closing quote. A quoted field must be followed by the delimiter or a line break; to include a quote inside a field, write it as two quotes ("")`, i);
      }
      continue;
    }
    if (char === '"' && field.trim() === "") {
      return error("Unexpected space before a quoted field. Remove the spaces between the delimiter and the opening quote", i - field.length);
    }
    if (char === '"') {
      return error('Unexpected quote in an unquoted field. Wrap the field in quotes and write each quote inside it as two quotes ("")', i);
    }
    if (char === delimiter) {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (char === "\r" || char === "\n") {
      endRow();
      i += char === "\r" && text[i + 1] === "\n" ? 2 : 1;
      line++;
      lineStart = i;
      continue;
    }
    field += char;
    i++;
  }
  if (field !== "" || row.length > 0) endRow();
  return { ok: true, rows, delimiter };
}

const JSON_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

export type CsvToJsonOptions = { header: boolean; inferTypes: boolean };

export type ConvertResult = { ok: true; output: string; warnings: string[]; rows: number } | { ok: false; error: string; line?: number; column?: number };

/**
 * Converts parsed CSV to JSON. With a header row, each row becomes an object;
 * otherwise an array of arrays. With type inference, numbers in JSON syntax
 * and true/false become JSON numbers and booleans; numbers are written
 * exactly as in the CSV, so no precision is lost, and values like 007 stay
 * strings.
 */
export function csvToJson(input: string, delimiter: DelimiterOption, options: CsvToJsonOptions): ConvertResult {
  const parsed = parseCsv(input, delimiter);
  if (!parsed.ok) return { ok: false, error: parsed.error.message, line: parsed.error.line, column: parsed.error.column };
  const { rows } = parsed;
  if (rows.length === 0) return { ok: false, error: "The CSV has no rows." };

  const warnings: string[] = [];
  const value = (cell: string) => {
    if (options.inferTypes) {
      if (JSON_NUMBER.test(cell)) return cell;
      if (cell === "true" || cell === "false") return cell;
    }
    return JSON.stringify(cell);
  };

  if (!options.header) {
    const body = rows.map((r) => `  [${r.map(value).join(", ")}]`).join(",\n");
    return { ok: true, output: `[\n${body}\n]`, warnings, rows: rows.length };
  }

  const width = Math.max(...rows.map((r) => r.length));
  const seen = new Map<string, number>();
  const headers = Array.from({ length: width }, (_, c) => {
    const raw = rows[0][c];
    let name = raw === undefined || raw.trim() === "" ? `column_${c + 1}` : raw;
    if (raw === undefined) warnings.push(`Some rows have more fields than the header; the extra column ${c + 1} is named "${name}".`);
    else if (raw.trim() === "") warnings.push(`Column ${c + 1} has an empty header and is named "${name}".`);
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    if (count > 1) {
      const renamed = `${name}_${count}`;
      warnings.push(`The header "${name}" appears more than once; column ${c + 1} is named "${renamed}".`);
      name = renamed;
    }
    return name;
  });

  const short: number[] = [];
  const body = rows.slice(1).map((r, index) => {
    if (r.length < rows[0].length) short.push(index + 2);
    const props = headers.map((h, c) => `    ${JSON.stringify(h)}: ${r[c] === undefined ? '""' : value(r[c])}`);
    return `  {\n${props.join(",\n")}\n  }`;
  });
  if (short.length) {
    const list = short.slice(0, 5).join(", ") + (short.length > 5 ? ` and ${short.length - 5} more` : "");
    warnings.push(`Row${short.length > 1 ? "s" : ""} ${list} ${short.length > 1 ? "have" : "has"} fewer fields than the header; the missing values are empty strings.`);
  }
  return { ok: true, output: body.length ? `[\n${body.join(",\n")}\n]` : "[]", warnings, rows: rows.length - 1 };
}

function csvField(value: string, delimiter: Delimiter): string {
  const needsQuotes = value.includes(delimiter) || /["\r\n]/.test(value) || /^\s|\s$/.test(value);
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
}

function cellText(node: JsonNode, counts: { nested: number; nulls: number }): string {
  switch (node.type) {
    case "string":
      return JSON.parse(node.raw) as string;
    case "number":
      return node.raw;
    case "literal":
      if (node.raw === "null") {
        counts.nulls++;
        return "";
      }
      return node.raw;
    default:
      counts.nested++;
      return formatJson(node, { indent: "" });
  }
}

/**
 * Converts a JSON array to CSV. Arrays of objects use the union of their keys
 * as columns, in first-seen order; arrays of arrays become rows; arrays of
 * plain values become a single "value" column. Nested objects and arrays are
 * written as JSON text, and null as an empty cell (both are reported).
 */
export function jsonToCsv(input: string, delimiter: Delimiter): ConvertResult {
  const parsed = parseJson(input);
  if (!parsed.ok) return { ok: false, error: parsed.error.message, line: parsed.error.line, column: parsed.error.column };
  const root = parsed.value;
  const items = root.type === "array" ? root.items : root.type === "object" ? [root] : null;
  if (!items) return { ok: false, error: "The JSON must be an array (of objects, arrays or values) or a single object." };
  if (items.length === 0) return { ok: false, error: "The JSON array is empty, so there is nothing to convert." };

  const counts = { nested: 0, nulls: 0 };
  const warnings = parsed.warnings.map((w) => `Line ${w.line}: ${w.message.replace("Both entries are kept in the output", "Only the last value is used")}.`);
  let lines: string[];

  if (items.every((item) => item.type === "object")) {
    const columns: string[] = [];
    for (const item of items) {
      if (item.type !== "object") continue;
      for (const entry of item.entries) if (!columns.includes(entry.key)) columns.push(entry.key);
    }
    lines = [columns.map((c) => csvField(c, delimiter)).join(delimiter)];
    for (const item of items) {
      if (item.type !== "object") continue;
      const values = new Map(item.entries.map((e) => [e.key, e.value]));
      lines.push(
        columns.map((c) => {
          const node = values.get(c);
          return csvField(node ? cellText(node, counts) : "", delimiter);
        }).join(delimiter),
      );
    }
  } else if (items.every((item) => item.type === "array")) {
    lines = items.map((item) => (item.type === "array" ? item.items.map((n) => csvField(cellText(n, counts), delimiter)).join(delimiter) : ""));
  } else if (items.every((item) => item.type !== "object" && item.type !== "array")) {
    lines = ["value", ...items.map((n) => csvField(cellText(n, counts), delimiter))];
  } else {
    return { ok: false, error: "The array mixes objects, arrays and plain values. Use one kind of item so each can become a row." };
  }

  if (counts.nested) warnings.push(`${counts.nested} ${counts.nested === 1 ? "cell contains" : "cells contain"} a nested object or array, written as JSON text.`);
  if (counts.nulls) warnings.push(`${counts.nulls} null ${counts.nulls === 1 ? "value was" : "values were"} written as ${counts.nulls === 1 ? "an empty cell" : "empty cells"}.`);
  return { ok: true, output: lines.join("\n"), warnings, rows: items.length };
}
