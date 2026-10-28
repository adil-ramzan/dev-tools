import { parseJson, type JsonNode } from "@/lib/tools/json";

/**
 * Conversion between JSON, YAML and TOML through a typed intermediate model,
 * so that differences between the formats are reported instead of hidden.
 *
 * - Integers and floats stay distinct (TOML `1.0` stays a float) and integers
 *   are BigInts, so large values are never rounded.
 * - TOML dates and times become strings in JSON and YAML, with a warning.
 * - Values a target cannot represent are errors listing their paths: TOML has
 *   no null and needs a table at the top level; JSON has no NaN or Infinity;
 *   TOML integers must fit in 64 bits.
 * - YAML aliases are expanded, non-string keys become strings, and comments
 *   are dropped, each with a warning.
 *
 * Parsers: the strict JSON parser in json.ts (exact numbers, duplicate keys
 * reported), `yaml` (YAML 1.2) and `smol-toml` (TOML 1.0), both loaded on
 * demand.
 */

export type DataFormat = "json" | "yaml" | "toml";

export const dataFormats: { value: DataFormat; label: string }[] = [
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "toml", label: "TOML" },
];

type DateKind = "offset-datetime" | "local-datetime" | "local-date" | "local-time";

export type DValue =
  | null
  | boolean
  | string
  | { kind: "int"; value: bigint }
  | { kind: "float"; value: number }
  | { kind: "date"; text: string; type: DateKind }
  | DValue[]
  | Map<string, DValue>;

export type ConvertResult =
  | { ok: true; output: string; warnings: string[] }
  | { ok: false; error: string; line?: number; column?: number };

type ParseResult = { ok: true; value: DValue; warnings: string[] } | { ok: false; error: string; line?: number; column?: number };

/** Caps the size of any document, so very large input cannot exhaust memory. */
export const MAX_NODES = 1_000_000;
/** Caps values produced by expanding aliases, which "billion laughs" documents inflate; rejected quickly. */
export const MAX_ALIAS_NODES = 100_000;

const INT64_MIN = -(BigInt(2) ** BigInt(63));
const INT64_MAX = BigInt(2) ** BigInt(63) - BigInt(1);
const SAFE_MAX = BigInt(Number.MAX_SAFE_INTEGER);

class Warnings {
  private seen = new Map<string, string[]>();
  add(kind: string, path: string) {
    const paths = this.seen.get(kind) ?? [];
    paths.push(path);
    this.seen.set(kind, paths);
  }
  list(): string[] {
    return [...this.seen].map(([kind, paths]) => `${kind}: ${formatPaths(paths)}.`);
  }
}

function formatPaths(paths: string[]): string {
  const shown = paths.slice(0, 5).join(", ");
  return paths.length > 5 ? `${shown} and ${paths.length - 5} more` : shown;
}

const childPath = (path: string, key: string | number) =>
  typeof key === "number" ? `${path}[${key}]` : /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;

const isTagged = (v: DValue): v is Extract<DValue, { kind: string }> => v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Map);

// --- JSON ---------------------------------------------------------------------

function fromJsonNode(node: JsonNode): DValue {
  switch (node.type) {
    case "object":
      return new Map(node.entries.map((e) => [e.key, fromJsonNode(e.value)]));
    case "array":
      return node.items.map(fromJsonNode);
    case "string":
      return JSON.parse(node.raw) as string;
    case "literal":
      return node.raw === "null" ? null : node.raw === "true";
    case "number":
      return /[.eE]/.test(node.raw) ? { kind: "float", value: Number(node.raw) } : { kind: "int", value: BigInt(node.raw) };
  }
}

function parseJsonSource(text: string): ParseResult {
  const result = parseJson(text);
  if (!result.ok) return { ok: false, error: result.error.message, line: result.error.line, column: result.error.column };
  const duplicate = result.warnings.find((w) => /duplicate/i.test(w.message));
  if (duplicate) {
    return { ok: false, error: `${duplicate.message} YAML and TOML do not allow duplicate keys, so remove or rename one of them.`, line: duplicate.line, column: duplicate.column };
  }
  const value = fromJsonNode(result.value);
  return { ok: true, value, warnings: [] };
}

function writeJson(value: DValue, indent: string, errors: Warnings, warnings: Warnings, path = "$", depth = 0): string {
  const pad = indent.repeat(depth + 1);
  const end = indent.repeat(depth);
  if (value === null || typeof value === "boolean") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((v, i) => pad + writeJson(v, indent, errors, warnings, childPath(path, i), depth + 1)).join(",\n")}\n${end}]`;
  }
  if (value instanceof Map) {
    if (value.size === 0) return "{}";
    const entries = [...value].map(([k, v]) => `${pad}${JSON.stringify(k)}: ${writeJson(v, indent, errors, warnings, childPath(path, k), depth + 1)}`);
    return `{\n${entries.join(",\n")}\n${end}}`;
  }
  switch (value.kind) {
    case "int":
      if (value.value > SAFE_MAX || value.value < -SAFE_MAX) warnings.add("Integers beyond ±9,007,199,254,740,991 are written exactly, but many JSON parsers (including JavaScript's) will round them", path);
      return value.value.toString();
    case "float":
      if (!Number.isFinite(value.value)) {
        errors.add("JSON cannot represent NaN or infinity", path);
        return "null";
      }
      return Number.isInteger(value.value) && Math.abs(value.value) < 1e21 ? `${value.value}.0` : String(value.value);
    case "date":
      warnings.add("JSON has no date type, so dates and times became strings", path);
      return JSON.stringify(value.text);
  }
}

// --- YAML ---------------------------------------------------------------------

type YamlModule = typeof import("yaml");

async function parseYamlSource(text: string): Promise<ParseResult> {
  const Y: YamlModule = await import("yaml");
  // The library's own duplicate-key check is quadratic; duplicates are detected below instead.
  const docs = Y.parseAllDocuments(text, { intAsBigInt: true, uniqueKeys: false });
  if (!Array.isArray(docs)) return { ok: true, value: null, warnings: [] };
  if (docs.length > 1) {
    return { ok: false, error: `The input contains ${docs.length} YAML documents separated by ---. Convert them one at a time.` };
  }
  const doc = docs[0];
  if (!doc) return { ok: true, value: null, warnings: [] };
  const error = doc.errors[0];
  if (error) {
    const [first] = error.message.split(" at line");
    return { ok: false, error: first.replace(/:$/, ""), line: error.linePos?.[0].line, column: error.linePos?.[0].col };
  }

  const warnings = new Warnings();
  const notes: string[] = doc.warnings.map((w) => w.message.split(":\n")[0].replace(/ at line \d+, column \d+$/, "") + ". The value was converted without its tag.");
  let nodes = 0;
  let expanded = 0;
  let comments = Boolean(doc.comment || doc.commentBefore);

  const convert = (node: unknown, path: string, viaAlias = false): DValue => {
    if (++nodes > MAX_NODES) throw new Error(`The document has more than ${MAX_NODES.toLocaleString("en-US")} values. It was not converted.`);
    if (viaAlias && ++expanded > MAX_ALIAS_NODES) {
      throw new Error(`Expanding the aliases (*name) produces more than ${MAX_ALIAS_NODES.toLocaleString("en-US")} values, a pattern used to exhaust memory. It was not converted.`);
    }
    if (Y.isNode(node) && (node.comment || node.commentBefore)) comments = true;
    if (Y.isAlias(node)) {
      warnings.add("Aliases (*name) were expanded into copies of the anchored value", path);
      return convert(node.resolve(doc), path, true);
    }
    if (Y.isScalar(node)) {
      const v = node.value;
      if (v === null || v === undefined) return null;
      if (typeof v === "boolean" || typeof v === "string") return v;
      if (typeof v === "bigint") return { kind: "int", value: v };
      if (typeof v === "number") return Number.isInteger(v) && !/[.eE]|inf|nan/i.test(node.source ?? "") ? { kind: "int", value: BigInt(v) } : { kind: "float", value: v };
      if (v instanceof Uint8Array) {
        warnings.add("Binary values (!!binary) were kept as Base64 strings", path);
        return typeof node.source === "string" ? node.source.replace(/\s+/g, "") : "";
      }
      return String(v);
    }
    if (Y.isSeq(node)) return node.items.map((item, i) => convert(item, childPath(path, i), viaAlias));
    if (Y.isMap(node)) {
      const map = new Map<string, DValue>();
      const fromNonString = new Set<string>();
      for (const pair of node.items) {
        const keyNode = Y.isAlias(pair.key) ? pair.key.resolve(doc) : pair.key;
        if (keyNode && !Y.isScalar(keyNode)) {
          throw new Error(`The map at ${path} has a key that is a list or map. JSON and TOML keys must be strings.`);
        }
        const raw = Y.isScalar(keyNode) ? keyNode.value : keyNode;
        let key: string;
        if (typeof raw === "string") key = raw;
        else {
          key = raw === null || raw === undefined ? "null" : String(raw);
          warnings.add("Keys that were not strings (numbers, booleans or null) were converted to strings", childPath(path, key));
        }
        if (map.has(key)) {
          const converted = typeof raw !== "string" || fromNonString.has(key);
          throw new Error(`Map keys must be unique, but "${key}" appears more than once at ${path}${converted ? " (after converting keys to strings)" : ""}.`);
        }
        if (typeof raw !== "string") fromNonString.add(key);
        if (key === "<<") warnings.add("YAML 1.2 has no merge keys, so << was kept as an ordinary key", childPath(path, key));
        map.set(key, convert(pair.value, childPath(path, key), viaAlias));
      }
      return map;
    }
    return null;
  };

  try {
    const value = convert(doc.contents, "$");
    const list = [...notes, ...warnings.list()];
    if (comments) list.push("Comments are not carried over to the output.");
    return { ok: true, value, warnings: list };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Strings that YAML 1.1 parsers would read as booleans or null if left unquoted. */
const YAML11_SPECIAL = /^(?:y|n|yes|no|on|off|true|false|null|~)$/i;

async function writeYaml(value: DValue, indent: number, warnings: Warnings): Promise<string> {
  const Y: YamlModule = await import("yaml");
  const toNode = (v: DValue, path: string): unknown => {
    if (Array.isArray(v)) {
      const seq = new Y.YAMLSeq();
      v.forEach((item, i) => seq.items.push(toNode(item, childPath(path, i))));
      return seq;
    }
    if (v instanceof Map) {
      const map = new Y.YAMLMap();
      for (const [k, item] of v) map.items.push(new Y.Pair(new Y.Scalar(k), toNode(item, childPath(path, k))));
      return map;
    }
    if (isTagged(v)) {
      if (v.kind === "int") return new Y.Scalar(v.value);
      if (v.kind === "date") {
        warnings.add("YAML 1.2 has no date type, so dates and times became strings", path);
        const scalar = new Y.Scalar(v.text);
        scalar.type = Y.Scalar.QUOTE_DOUBLE;
        return scalar;
      }
      const scalar = new Y.Scalar(v.value);
      scalar.minFractionDigits = 1;
      return scalar;
    }
    const scalar = new Y.Scalar(v);
    if (typeof v === "string" && YAML11_SPECIAL.test(v)) scalar.type = Y.Scalar.QUOTE_DOUBLE;
    return scalar;
  };
  const doc = new Y.Document(null, { version: "1.2" });
  doc.contents = toNode(value, "$") as typeof doc.contents;
  return doc.toString({ indent, lineWidth: 0 });
}

// --- TOML ---------------------------------------------------------------------

type TomlModule = typeof import("smol-toml");

async function parseTomlSource(text: string): Promise<ParseResult> {
  const T: TomlModule = await import("smol-toml");
  let parsed: unknown;
  try {
    parsed = T.parse(text, { integersAsBigInt: true });
  } catch (e) {
    if (e instanceof T.TomlError) {
      return { ok: false, error: e.message.split("\n")[0].replace(/^Invalid TOML document:\s*/, ""), line: e.line, column: e.column };
    }
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const convert = (v: unknown): DValue => {
    if (typeof v === "bigint") return { kind: "int", value: v };
    if (typeof v === "number") return { kind: "float", value: v };
    if (typeof v === "string" || typeof v === "boolean") return v;
    if (v instanceof T.TomlDate) {
      const type: DateKind = v.isDate() ? "local-date" : v.isTime() ? "local-time" : v.isLocal() ? "local-datetime" : "offset-datetime";
      return { kind: "date", text: v.toISOString(), type };
    }
    if (Array.isArray(v)) return v.map(convert);
    const map = new Map<string, DValue>();
    for (const key of Object.keys(v as object)) map.set(key, convert((v as Record<string, unknown>)[key]));
    return map;
  };
  const warnings = /^\s*#/m.test(text) ? ["Comments are not carried over to the output."] : [];
  return { ok: true, value: convert(parsed), warnings };
}

async function writeToml(value: DValue, errors: Warnings): Promise<string | { error: string }> {
  if (!(value instanceof Map)) {
    const what = value === null ? "null" : Array.isArray(value) ? "a list" : "a single value";
    return { error: `TOML documents must be a table (an object of key/value pairs) at the top level, but the input is ${what}. Wrap it in an object, e.g. {"items": …}.` };
  }
  const T: TomlModule = await import("smol-toml");
  const toPlain = (v: DValue, path: string): unknown => {
    if (v === null) {
      errors.add("TOML has no null value", path);
      return "";
    }
    if (Array.isArray(v)) return v.map((item, i) => toPlain(item, childPath(path, i)));
    if (v instanceof Map) {
      // A null-prototype object keeps keys such as __proto__ as ordinary keys.
      const object: Record<string, unknown> = Object.create(null);
      for (const [k, item] of v) object[k] = toPlain(item, childPath(path, k));
      return object;
    }
    if (isTagged(v)) {
      if (v.kind === "int") {
        if (v.value < INT64_MIN || v.value > INT64_MAX) errors.add("TOML integers must fit in 64 bits", path);
        return v.value;
      }
      if (v.kind === "date") return new T.TomlDate(v.text);
      return v.value;
    }
    return v;
  };
  const plain = toPlain(value, "$");
  if (errors.list().length) return "";
  return T.stringify(plain, { numbersAsFloat: true }).replace(/^\n+/, "");
}

// --- Public API -------------------------------------------------------------------

export function parseSource(text: string, format: DataFormat): Promise<ParseResult> {
  if (format === "json") return Promise.resolve(parseJsonSource(text));
  return format === "yaml" ? parseYamlSource(text) : parseTomlSource(text);
}

export async function convertData(text: string, from: DataFormat, to: DataFormat, { indent = 2 }: { indent?: number } = {}): Promise<ConvertResult> {
  if (!text.trim()) return { ok: false, error: "Enter some input to convert." };
  const parsed = await parseSource(text, from);
  if (!parsed.ok) return parsed;

  const errors = new Warnings();
  const warnings = new Warnings();
  let output: string;
  if (to === "json") {
    output = writeJson(parsed.value, " ".repeat(indent), errors, warnings) + "\n";
  } else if (to === "yaml") {
    output = await writeYaml(parsed.value, indent, warnings);
  } else {
    const result = await writeToml(parsed.value, errors);
    if (typeof result !== "string") return { ok: false, error: result.error };
    output = result;
  }
  const problems = errors.list();
  if (problems.length) {
    return { ok: false, error: `The input has values ${dataFormats.find((f) => f.value === to)!.label} cannot represent. ${problems.join(" ")} Change these values and convert again.` };
  }
  return { ok: true, output, warnings: [...parsed.warnings, ...warnings.list()] };
}
