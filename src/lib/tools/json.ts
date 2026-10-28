/**
 * Strict JSON (RFC 8259) parser and formatter.
 *
 * A custom parser is used instead of JSON.parse so that:
 * - errors carry an exact position in every browser,
 * - numbers and strings are re-emitted exactly as written (JSON.parse would
 *   round 12345678901234567890 and normalise escapes),
 * - duplicate keys are reported and kept rather than silently dropped.
 */

export type JsonNode =
  | { type: "object"; entries: { key: string; rawKey: string; value: JsonNode }[] }
  | { type: "array"; items: JsonNode[] }
  | { type: "string"; raw: string }
  | { type: "number"; raw: string }
  | { type: "literal"; raw: "true" | "false" | "null" };

export type JsonPosition = { offset: number; line: number; column: number };

export type JsonError = JsonPosition & { message: string };

export type JsonWarning = JsonPosition & { message: string };

export type JsonParseResult =
  | { ok: true; value: JsonNode; warnings: JsonWarning[] }
  | { ok: false; error: JsonError };

const MAX_DEPTH = 500;

class JsonSyntaxError extends Error {
  constructor(
    message: string,
    readonly offset: number,
  ) {
    super(message);
  }
}

export function positionAt(text: string, offset: number): JsonPosition {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      lineStart = i + 1;
    }
  }
  return { offset, line, column: offset - lineStart + 1 };
}

function describe(char: string | undefined): string {
  if (char === undefined) return "end of input";
  if (char === "\n") return "a line break";
  if (char === "\t") return "a tab";
  const code = char.codePointAt(0) ?? 0;
  if (code < 0x20 || code === 0xfeff) return `character U+${code.toString(16).toUpperCase().padStart(4, "0")}`;
  return `'${char}'`;
}

class Parser {
  private pos = 0;
  private depth = 0;
  readonly warnings: { message: string; offset: number }[] = [];

  constructor(private readonly text: string) {}

  parse(): JsonNode {
    this.skipWhitespace();
    if (this.pos >= this.text.length) throw new JsonSyntaxError("The input is empty", 0);
    if (this.text[this.pos] === "﻿") {
      throw new JsonSyntaxError("The input starts with a byte order mark (U+FEFF), which JSON does not allow", 0);
    }
    const value = this.parseValue();
    this.skipWhitespace();
    if (this.pos < this.text.length) {
      throw new JsonSyntaxError(
        `Unexpected ${describe(this.text[this.pos])} after the end of the JSON value. Only one top-level value is allowed`,
        this.pos,
      );
    }
    return value;
  }

  private skipWhitespace() {
    while (this.pos < this.text.length) {
      const c = this.text[this.pos];
      if (c === " " || c === "\t" || c === "\n" || c === "\r") {
        this.pos++;
      } else if (c === "/" && (this.text[this.pos + 1] === "/" || this.text[this.pos + 1] === "*")) {
        throw new JsonSyntaxError("Comments are not allowed in JSON", this.pos);
      } else {
        return;
      }
    }
  }

  private parseValue(): JsonNode {
    const c = this.text[this.pos];
    switch (c) {
      case "{":
        return this.parseObject();
      case "[":
        return this.parseArray();
      case '"':
        return { type: "string", raw: this.parseString() };
      case "t":
        return this.parseLiteral("true");
      case "f":
        return this.parseLiteral("false");
      case "n":
        return this.parseLiteral("null");
      case "'":
        throw new JsonSyntaxError("Strings must use double quotes, not single quotes", this.pos);
      case undefined:
        throw new JsonSyntaxError("Unexpected end of input: expected a value", this.pos);
      default:
        if (c === "-" || (c >= "0" && c <= "9")) return { type: "number", raw: this.parseNumber() };
        if (/[A-Za-z_$]/.test(c)) {
          const word = /^[A-Za-z_$][\w$]*/.exec(this.text.slice(this.pos))?.[0] ?? c;
          const hint =
            word === "undefined" || word === "NaN" || word === "Infinity"
              ? `${word} is not a valid JSON value`
              : `Unexpected word '${word}'. Strings must be in double quotes`;
          throw new JsonSyntaxError(hint, this.pos);
        }
        throw new JsonSyntaxError(`Unexpected ${describe(c)}: expected a value`, this.pos);
    }
  }

  private enter() {
    if (++this.depth > MAX_DEPTH) {
      throw new JsonSyntaxError(`Nesting is deeper than ${MAX_DEPTH} levels, which this tool does not support`, this.pos);
    }
  }

  private parseObject(): JsonNode {
    this.enter();
    this.pos++; // {
    const entries: { key: string; rawKey: string; value: JsonNode }[] = [];
    const seen = new Map<string, number>();
    this.skipWhitespace();
    if (this.text[this.pos] === "}") {
      this.pos++;
      this.depth--;
      return { type: "object", entries };
    }
    for (;;) {
      this.skipWhitespace();
      const keyStart = this.pos;
      const c = this.text[this.pos];
      if (c === "}") throw new JsonSyntaxError("Trailing commas are not allowed", this.lastComma(keyStart));
      if (c === "'") throw new JsonSyntaxError("Property names must use double quotes, not single quotes", this.pos);
      if (c !== '"') {
        if (c === undefined) throw new JsonSyntaxError("Unexpected end of input: expected a property name", this.pos);
        throw new JsonSyntaxError(`Expected a property name in double quotes, found ${describe(c)}`, this.pos);
      }
      const rawKey = this.parseString();
      const key = JSON.parse(rawKey) as string;
      if (seen.has(key)) {
        this.warnings.push({ message: `Duplicate key ${rawKey}. Both entries are kept in the output`, offset: keyStart });
      } else {
        seen.set(key, keyStart);
      }
      this.skipWhitespace();
      if (this.text[this.pos] !== ":") {
        throw new JsonSyntaxError(`Expected ':' after property name ${rawKey}, found ${describe(this.text[this.pos])}`, this.pos);
      }
      this.pos++;
      this.skipWhitespace();
      const value = this.parseValue();
      entries.push({ key, rawKey, value });
      this.skipWhitespace();
      const next = this.text[this.pos];
      if (next === ",") {
        this.pos++;
        continue;
      }
      if (next === "}") {
        this.pos++;
        this.depth--;
        return { type: "object", entries };
      }
      if (next === undefined) throw new JsonSyntaxError("Unexpected end of input: the object is missing a closing '}'", this.pos);
      throw new JsonSyntaxError(`Expected ',' or '}' after a property value, found ${describe(next)}`, this.pos);
    }
  }

  private parseArray(): JsonNode {
    this.enter();
    this.pos++; // [
    const items: JsonNode[] = [];
    this.skipWhitespace();
    if (this.text[this.pos] === "]") {
      this.pos++;
      this.depth--;
      return { type: "array", items };
    }
    for (;;) {
      this.skipWhitespace();
      if (this.text[this.pos] === "]") throw new JsonSyntaxError("Trailing commas are not allowed", this.lastComma(this.pos));
      items.push(this.parseValue());
      this.skipWhitespace();
      const next = this.text[this.pos];
      if (next === ",") {
        this.pos++;
        continue;
      }
      if (next === "]") {
        this.pos++;
        this.depth--;
        return { type: "array", items };
      }
      if (next === undefined) throw new JsonSyntaxError("Unexpected end of input: the array is missing a closing ']'", this.pos);
      throw new JsonSyntaxError(`Expected ',' or ']' after an array item, found ${describe(next)}`, this.pos);
    }
  }

  /** Position of the comma before `from`, for trailing-comma errors. */
  private lastComma(from: number): number {
    const index = this.text.lastIndexOf(",", from);
    return index === -1 ? from : index;
  }

  private parseString(): string {
    const start = this.pos;
    this.pos++; // opening quote
    for (;;) {
      const c = this.text[this.pos];
      if (c === undefined) throw new JsonSyntaxError("Unterminated string: missing closing double quote", start);
      if (c === '"') {
        this.pos++;
        return this.text.slice(start, this.pos);
      }
      if (c === "\\") {
        const e = this.text[this.pos + 1];
        if (e === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(this.text.slice(this.pos + 2, this.pos + 6))) {
            throw new JsonSyntaxError("Invalid Unicode escape: \\u must be followed by four hex digits", this.pos);
          }
          this.pos += 6;
          continue;
        }
        if (e !== undefined && '"\\/bfnrt'.includes(e)) {
          this.pos += 2;
          continue;
        }
        throw new JsonSyntaxError(`Invalid escape sequence '\\${e ?? ""}' in string`, this.pos);
      }
      if (c.charCodeAt(0) < 0x20) {
        throw new JsonSyntaxError(
          `Unescaped ${describe(c)} in string. Use \\n, \\t or a \\u escape instead`,
          this.pos,
        );
      }
      this.pos++;
    }
  }

  private parseNumber(): string {
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(this.text.slice(this.pos));
    const start = this.pos;
    if (!match) throw new JsonSyntaxError("Invalid number", start);
    const raw = match[0];
    const after = this.text[start + raw.length];
    if (after !== undefined && /[\d.eExX]/.test(after)) {
      if (/^-?0\d/.test(this.text.slice(start))) throw new JsonSyntaxError("Numbers cannot have leading zeros", start);
      throw new JsonSyntaxError("Invalid number", start);
    }
    this.pos += raw.length;
    return raw;
  }

  private parseLiteral(word: "true" | "false" | "null"): JsonNode {
    if (this.text.startsWith(word, this.pos) && !/[\w$]/.test(this.text[this.pos + word.length] ?? "")) {
      this.pos += word.length;
      return { type: "literal", raw: word };
    }
    const found = /^[A-Za-z_$][\w$]*/.exec(this.text.slice(this.pos))?.[0] ?? this.text[this.pos];
    throw new JsonSyntaxError(`Unexpected word '${found}'. Did you mean ${word}?`, this.pos);
  }
}

export function parseJson(text: string): JsonParseResult {
  const parser = new Parser(text);
  try {
    const value = parser.parse();
    return {
      ok: true,
      value,
      warnings: parser.warnings.map((w) => ({ ...positionAt(text, w.offset), message: w.message })),
    };
  } catch (error) {
    if (error instanceof JsonSyntaxError) {
      return { ok: false, error: { ...positionAt(text, error.offset), message: error.message } };
    }
    throw error;
  }
}

export type FormatOptions = {
  /** Indentation string, e.g. "  " or "\t". Empty string minifies. */
  indent: string;
  /** Sort object keys by code point order. */
  sortKeys?: boolean;
};

export function formatJson(node: JsonNode, { indent, sortKeys = false }: FormatOptions): string {
  const out: string[] = [];
  const newline = indent ? "\n" : "";
  const colon = indent ? ": " : ":";

  function write(value: JsonNode, level: number) {
    switch (value.type) {
      case "string":
      case "number":
      case "literal":
        out.push(value.raw);
        return;
      case "array": {
        if (value.items.length === 0) {
          out.push("[]");
          return;
        }
        const pad = indent.repeat(level + 1);
        out.push("[", newline);
        value.items.forEach((item, i) => {
          out.push(pad);
          write(item, level + 1);
          out.push(i < value.items.length - 1 ? "," : "", newline);
        });
        out.push(indent.repeat(level), "]");
        return;
      }
      case "object": {
        if (value.entries.length === 0) {
          out.push("{}");
          return;
        }
        const entries = sortKeys
          ? [...value.entries].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
          : value.entries;
        const pad = indent.repeat(level + 1);
        out.push("{", newline);
        entries.forEach((entry, i) => {
          out.push(pad, entry.rawKey, colon);
          write(entry.value, level + 1);
          out.push(i < entries.length - 1 ? "," : "", newline);
        });
        out.push(indent.repeat(level), "}");
        return;
      }
    }
  }

  write(node, 0);
  return out.join("");
}
