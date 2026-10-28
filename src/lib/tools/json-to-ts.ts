/**
 * Generates TypeScript declarations from a JSON sample.
 *
 * - Each object becomes a named interface (or type alias). Names come from
 *   the property name in PascalCase; array items are singularised
 *   ("users" → User).
 * - Objects in the same array are merged: a property missing from some
 *   items becomes optional, and differing types become a union.
 * - Empty arrays become unknown[], because their item type cannot be known.
 * - Identical shapes with the same name are declared once.
 */

import { parseJson, type JsonNode, type JsonError } from "@/lib/tools/json";
import { splitWords } from "@/lib/tools/text-case";

type Shape =
  | { kind: "string" | "number" | "boolean" | "null" | "unknown" }
  | { kind: "array"; element: Shape }
  | { kind: "object"; fields: Map<string, { shape: Shape; optional: boolean }>; name: string }
  | { kind: "union"; members: Shape[] };

export type TsOptions = {
  rootName: string;
  declaration: "interface" | "type";
  /** "inferred": optional only when missing from some array items. "all": every property optional. */
  optional: "inferred" | "all";
  exportTypes: boolean;
};

export type TsResult = { ok: true; output: string; warnings: string[] } | { ok: false; error: JsonError | string };

function pascal(text: string, fallback: string): string {
  const name = splitWords(text)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join("")
    .replace(/[^\p{L}\p{N}_$]/gu, "");
  if (!name) return fallback;
  return /^\p{N}/u.test(name) ? `T${name}` : name;
}

function singular(name: string): string {
  if (/ies$/.test(name)) return name.slice(0, -3) + "y";
  if (/(x|ch|sh|ss|z|us)es$/.test(name)) return name.slice(0, -2);
  if (/(ss|us|is)$/.test(name)) return name;
  if (/s$/.test(name) && name.length > 1) return name.slice(0, -1);
  return `${name}Item`;
}

function infer(node: JsonNode, name: string): Shape {
  switch (node.type) {
    case "string":
      return { kind: "string" };
    case "number":
      return { kind: "number" };
    case "literal":
      return { kind: node.raw === "null" ? "null" : "boolean" };
    case "array": {
      const itemName = singular(name);
      const element = node.items.map((item) => infer(item, itemName)).reduce<Shape | null>((acc, s) => (acc ? merge(acc, s) : s), null);
      return { kind: "array", element: element ?? { kind: "unknown" } };
    }
    case "object": {
      const fields = new Map<string, { shape: Shape; optional: boolean }>();
      // A duplicate key keeps its last value, like JSON.parse.
      for (const entry of node.entries) fields.set(entry.key, { shape: infer(entry.value, pascal(entry.key, "Item")), optional: false });
      return { kind: "object", fields, name };
    }
  }
}

function members(shape: Shape): Shape[] {
  return shape.kind === "union" ? shape.members : [shape];
}

function merge(a: Shape, b: Shape): Shape {
  if (a.kind === "unknown") return b;
  if (b.kind === "unknown") return a;
  const result: Shape[] = [...members(a)];
  for (const m of members(b)) {
    const index = result.findIndex((r) => r.kind === m.kind);
    if (index === -1) {
      result.push(m);
      continue;
    }
    const existing = result[index];
    if (existing.kind === "object" && m.kind === "object") {
      const fields = new Map<string, { shape: Shape; optional: boolean }>();
      for (const [key, field] of existing.fields) {
        const other = m.fields.get(key);
        fields.set(key, other ? { shape: merge(field.shape, other.shape), optional: field.optional || other.optional } : { ...field, optional: true });
      }
      for (const [key, field] of m.fields) if (!fields.has(key)) fields.set(key, { ...field, optional: true });
      result[index] = { kind: "object", fields, name: existing.name };
    } else if (existing.kind === "array" && m.kind === "array") {
      result[index] = { kind: "array", element: merge(existing.element, m.element) };
    }
  }
  return result.length === 1 ? result[0] : { kind: "union", members: result };
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

export function jsonToTypeScript(json: string, options: TsOptions): TsResult {
  const parsed = parseJson(json);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const warnings = parsed.warnings.map((w) => `Line ${w.line}: ${w.message.replace("Both entries are kept in the output", "The last value is used for the type")}.`);
  const rootName = pascal(options.rootName, "Root");
  const root = infer(parsed.value, rootName);

  const declarations: string[] = [];
  const declared = new Map<string, string>(); // name → body, to reuse identical shapes
  const queue: { shape: Extract<Shape, { kind: "object" }>; name: string }[] = [];
  const assigned = new Map<Shape, string>();

  function nameFor(shape: Extract<Shape, { kind: "object" }>): string {
    const known = assigned.get(shape);
    if (known) return known;
    let name = shape.name;
    let n = 2;
    const taken = () => [...assigned.values()].includes(name);
    while (taken()) name = `${shape.name}${n++}`;
    assigned.set(shape, name);
    queue.push({ shape, name });
    return name;
  }

  function typeOf(shape: Shape): string {
    switch (shape.kind) {
      case "object":
        return shape.fields.size === 0 ? "Record<string, unknown>" : nameFor(shape);
      case "array": {
        const inner = typeOf(shape.element);
        return shape.element.kind === "union" ? `(${inner})[]` : `${inner}[]`;
      }
      case "union":
        return shape.members.map(typeOf).join(" | ");
      default:
        return shape.kind;
    }
  }

  const exp = options.exportTypes ? "export " : "";
  const rootIsObject = root.kind === "object" && root.fields.size > 0;
  if (!rootIsObject) {
    declarations.push(`${exp}type ${rootName} = ${typeOf(root)};`);
  } else {
    nameFor(root);
  }

  const aliases = new Map<string, string>(); // duplicate shape name → first name
  for (let i = 0; i < queue.length; i++) {
    const { shape, name } = queue[i];
    const lines = [...shape.fields].map(([key, field]) => {
      const prop = IDENTIFIER.test(key) ? key : JSON.stringify(key);
      const optional = options.optional === "all" || field.optional ? "?" : "";
      return `  ${prop}${optional}: ${typeOf(field.shape)};`;
    });
    const body = `{\n${lines.join("\n")}\n}`;
    const base = shape.name;
    if (name !== base && declared.get(base) === body) {
      aliases.set(name, base);
      continue;
    }
    declared.set(name, body);
    declarations.push(
      options.declaration === "interface" ? `${exp}interface ${name} ${body}` : `${exp}type ${name} = ${body};`,
    );
  }

  let output = declarations.join("\n\n");
  for (const [duplicate, original] of aliases) output = output.replace(new RegExp(`\\b${duplicate}\\b`, "g"), original);
  return { ok: true, output: `${output}\n`, warnings };
}
