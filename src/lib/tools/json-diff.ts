/**
 * Structural JSON comparison, built on the strict JSON parser so large
 * numbers and exact string escapes are compared without loss.
 *
 * - Objects are compared by key, regardless of key order.
 * - Arrays are compared by position: an item inserted at the start shows
 *   every later item as changed.
 * - Strings are compared by their decoded value ("é" equals "é").
 * - Numbers are compared by exact decimal value, so 1.0 equals 1 and 1e2
 *   equals 100, unless `exactNumbers` is set.
 */

import { formatJson, parseJson, type JsonError, type JsonNode } from "@/lib/tools/json";

export type JsonChangeKind = "added" | "removed" | "changed";

export type JsonChange = {
  path: string;
  kind: JsonChangeKind;
  before?: string;
  after?: string;
  /** Set when the value changed type, e.g. from a string to a number. */
  typeChange?: { from: string; to: string };
};

export type JsonDiffResult =
  | {
      ok: true;
      changes: JsonChange[];
      added: number;
      removed: number;
      changed: number;
      /** True when more changes were found than are listed. */
      truncated: boolean;
      warnings: string[];
    }
  | { ok: false; side: "original" | "changed"; error: JsonError };

const MAX_LISTED = 5000;
const PREVIEW_LENGTH = 200;

function typeName(node: JsonNode): string {
  if (node.type === "literal") return node.raw === "null" ? "null" : "boolean";
  return node.type;
}

function preview(node: JsonNode): string {
  const text = formatJson(node, { indent: "" });
  return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH)}…` : text;
}

/** Canonical exact form of a JSON number: digits and a power of ten. */
export function canonicalNumber(raw: string): string {
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(raw);
  if (!m) return raw;
  const fraction = m[3] ?? "";
  let digits = (m[2] + fraction).replace(/^0+/, "");
  let exponent = BigInt(m[4] ?? "0") - BigInt(fraction.length);
  if (digits === "") return "0";
  while (digits.endsWith("0")) {
    digits = digits.slice(0, -1);
    exponent += BigInt(1);
  }
  return `${m[1]}${digits}e${exponent}`;
}

function childPath(path: string, key: string | number): string {
  if (typeof key === "number") return `${path}[${key}]`;
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;
}

export function diffJson(original: string, changed: string, { exactNumbers = false } = {}): JsonDiffResult {
  const a = parseJson(original);
  if (!a.ok) return { ok: false, side: "original", error: a.error };
  const b = parseJson(changed);
  if (!b.ok) return { ok: false, side: "changed", error: b.error };

  const changes: JsonChange[] = [];
  const counts = { added: 0, removed: 0, changed: 0 };
  const record = (change: JsonChange) => {
    counts[change.kind]++;
    if (changes.length < MAX_LISTED) changes.push(change);
  };

  function compare(x: JsonNode, y: JsonNode, path: string) {
    const tx = typeName(x);
    const ty = typeName(y);
    if (tx !== ty) {
      record({ path, kind: "changed", before: preview(x), after: preview(y), typeChange: { from: tx, to: ty } });
      return;
    }
    if (x.type === "object" && y.type === "object") {
      // A duplicate key uses its last value, like JSON.parse.
      const xs = new Map(x.entries.map((e) => [e.key, e.value]));
      const ys = new Map(y.entries.map((e) => [e.key, e.value]));
      for (const [key, value] of xs) {
        const other = ys.get(key);
        if (other === undefined) record({ path: childPath(path, key), kind: "removed", before: preview(value) });
        else compare(value, other, childPath(path, key));
      }
      for (const [key, value] of ys) {
        if (!xs.has(key)) record({ path: childPath(path, key), kind: "added", after: preview(value) });
      }
      return;
    }
    if (x.type === "array" && y.type === "array") {
      const shared = Math.min(x.items.length, y.items.length);
      for (let i = 0; i < shared; i++) compare(x.items[i], y.items[i], childPath(path, i));
      for (let i = shared; i < x.items.length; i++) record({ path: childPath(path, i), kind: "removed", before: preview(x.items[i]) });
      for (let i = shared; i < y.items.length; i++) record({ path: childPath(path, i), kind: "added", after: preview(y.items[i]) });
      return;
    }
    let equal: boolean;
    if (x.type === "string" && y.type === "string") equal = JSON.parse(x.raw) === JSON.parse(y.raw);
    else if (x.type === "number" && y.type === "number") equal = exactNumbers ? x.raw === y.raw : canonicalNumber(x.raw) === canonicalNumber(y.raw);
    else equal = (x as { raw: string }).raw === (y as { raw: string }).raw;
    if (!equal) record({ path, kind: "changed", before: preview(x), after: preview(y) });
  }

  compare(a.value, b.value, "$");
  const warnings = [
    ...a.warnings.map((w) => `Original, line ${w.line}: ${w.message.replace("Both entries are kept in the output", "The last value is compared")}.`),
    ...b.warnings.map((w) => `Changed, line ${w.line}: ${w.message.replace("Both entries are kept in the output", "The last value is compared")}.`),
  ];
  const total = counts.added + counts.removed + counts.changed;
  return { ok: true, changes, ...counts, truncated: total > changes.length, warnings };
}
