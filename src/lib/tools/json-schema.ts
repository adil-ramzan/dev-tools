/**
 * JSON Schema validation with @cfworker/json-schema, an interpreter that
 * never generates or evaluates code from the schema. Runs in a Web Worker
 * (see json-schema.worker.ts) so a slow `pattern` cannot freeze the page.
 *
 * Both inputs are parsed with the strict JSON parser first, for exact error
 * positions. Values are then compared as JavaScript values, so numbers beyond
 * 64-bit floating point precision are compared approximately.
 */

import { Validator, type OutputUnit, type SchemaDraft } from "@cfworker/json-schema";
import { parseJson, type JsonError } from "@/lib/tools/json";

export type DraftOption = "auto" | "2020-12" | "2019-09" | "7" | "4";

export const draftLabels: Record<Exclude<DraftOption, "auto">, string> = {
  "2020-12": "2020-12",
  "2019-09": "2019-09",
  "7": "Draft 7",
  "4": "Draft 4",
};

export type SchemaError = {
  /** Location in the data, as a JSONPath-like string such as $.address.zip. */
  path: string;
  message: string;
  keyword: string;
  /** Location of the failing keyword in the schema, such as #/properties/zip/pattern. */
  schemaPath: string;
  /** For anyOf, oneOf and similar: why each alternative failed. */
  details: string[];
};

export type SchemaValidationResult =
  | { ok: true; valid: boolean; errors: SchemaError[]; draft: Exclude<DraftOption, "auto">; warnings: string[] }
  | { ok: false; input: "schema" | "data"; error: JsonError | { message: string; line?: undefined; column?: undefined } };

function detectDraft(schema: unknown): Exclude<DraftOption, "auto"> {
  const id = typeof schema === "object" && schema !== null ? (schema as Record<string, unknown>).$schema : undefined;
  if (typeof id !== "string") return "2020-12";
  if (id.includes("2019-09")) return "2019-09";
  if (id.includes("draft-07")) return "7";
  if (id.includes("draft-04")) return "4";
  return "2020-12";
}

/** "#/address/zip" → "$.address.zip"; "#/items/0" → "$.items[0]". */
export function pointerToPath(pointer: string): string {
  const parts = pointer.replace(/^#/, "").split("/").slice(1);
  let path = "$";
  for (const raw of parts) {
    const key = decodeURIComponent(raw).replace(/~1/g, "/").replace(/~0/g, "~");
    if (/^(0|[1-9]\d*)$/.test(key)) path += `[${key}]`;
    else if (/^[A-Za-z_$][\w$]*$/.test(key)) path += `.${key}`;
    else path += `[${JSON.stringify(key)}]`;
  }
  return path;
}

/** Keywords whose alternatives are listed as details under one error. */
const COMBINATORS = new Set(["anyOf", "oneOf", "not", "contains"]);
/** Keywords that only report that something inside them failed. */
const WRAPPERS = new Set([
  "properties", "patternProperties", "additionalProperties", "unevaluatedProperties", "items", "prefixItems",
  "additionalItems", "unevaluatedItems", "dependentSchemas", "dependencies", "propertyNames", "allOf", "then", "else",
  "$ref", "$dynamicRef", "$recursiveRef",
]);

/**
 * Turns the validator's flat output into readable errors:
 * - drops wrapper messages ("Property x does not match schema") when a more
 *   specific error explains them,
 * - drops the validator's spurious additionalProperties/unevaluatedProperties
 *   errors for declared properties that already failed, and their
 *   "False boolean schema" companions,
 * - groups the errors inside anyOf/oneOf/not under the combinator.
 */
export function readableErrors(units: OutputUnit[]): SchemaError[] {
  const failedDeclared = new Set<string>();
  for (const u of units) {
    if (u.keyword !== "properties" && u.keyword !== "patternProperties") continue;
    const name = /Property "(.*?)"/.exec(u.error)?.[1];
    if (name !== undefined) failedDeclared.add(`${u.instanceLocation}\u0000${name}`);
  }

  const kept = units.filter((u) => {
    if (u.keyword === "false" && u.keywordLocation === u.instanceLocation) return false;
    if (u.keyword === "additionalProperties" || u.keyword === "unevaluatedProperties") {
      const name = /Property "(.*?)"/.exec(u.error)?.[1];
      if (name !== undefined && failedDeclared.has(`${u.instanceLocation}\u0000${name}`)) return false;
    }
    return true;
  });

  const explainedByDeeper = (u: OutputUnit) =>
    kept.some((other) => other !== u && other.keywordLocation.startsWith(`${u.keywordLocation}/`));
  const combinators = kept.filter((u) => COMBINATORS.has(u.keyword));
  const underCombinator = (u: OutputUnit) =>
    combinators.find((c) => c !== u && u.keywordLocation.startsWith(`${c.keywordLocation}/`));

  const result: SchemaError[] = [];
  const byCombinator = new Map<OutputUnit, SchemaError>();
  for (const u of kept) {
    const parent = underCombinator(u);
    if (parent) continue; // Added as a detail below.
    if (WRAPPERS.has(u.keyword) && explainedByDeeper(u)) continue;
    const error: SchemaError = {
      path: pointerToPath(u.instanceLocation),
      message: u.error,
      keyword: u.keyword,
      schemaPath: u.keywordLocation,
      details: [],
    };
    if (COMBINATORS.has(u.keyword)) byCombinator.set(u, error);
    result.push(error);
  }
  for (const u of kept) {
    const parent = underCombinator(u);
    if (!parent || (WRAPPERS.has(u.keyword) && explainedByDeeper(u)) || COMBINATORS.has(u.keyword)) continue;
    const target = byCombinator.get(parent);
    const branch = u.keywordLocation.slice(parent.keywordLocation.length + 1).split("/")[0];
    const where = u.instanceLocation === parent.instanceLocation ? "" : ` at ${pointerToPath(u.instanceLocation)}`;
    target?.details.push(`${/^\d+$/.test(branch) ? `Option ${Number(branch) + 1}` : branch}${where}: ${u.error}`);
  }
  return result;
}

export function validateWithSchema(schemaText: string, dataText: string, draftOption: DraftOption): SchemaValidationResult {
  const schemaParsed = parseJson(schemaText);
  if (!schemaParsed.ok) return { ok: false, input: "schema", error: schemaParsed.error };
  const dataParsed = parseJson(dataText);
  if (!dataParsed.ok) return { ok: false, input: "data", error: dataParsed.error };

  const schema = JSON.parse(schemaText) as unknown;
  if (typeof schema !== "boolean" && (typeof schema !== "object" || schema === null || Array.isArray(schema))) {
    return { ok: false, input: "schema", error: { message: "A JSON Schema must be an object or a boolean" } };
  }
  const data = JSON.parse(dataText) as unknown;
  const draft = draftOption === "auto" ? detectDraft(schema) : draftOption;
  const warnings = [
    ...schemaParsed.warnings.map((w) => `Schema line ${w.line}: ${w.message.replace("Both entries are kept in the output", "Only the last value is used")}.`),
    ...dataParsed.warnings.map((w) => `Data line ${w.line}: ${w.message.replace("Both entries are kept in the output", "Only the last value is used")}.`),
  ];

  try {
    const validator = new Validator(schema as object, draft as SchemaDraft, false);
    const output = validator.validate(data);
    return { ok: true, valid: output.valid, errors: output.valid ? [] : readableErrors(output.errors), draft, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
    const remote = /Unresolved \$ref/.test(message)
      ? `${message} Schemas referenced by URL are not downloaded. Put the referenced definitions in $defs and refer to them with "#/$defs/name".`
      : `The schema could not be used: ${message}`;
    return { ok: false, input: "schema", error: { message: remote } };
  }
}
