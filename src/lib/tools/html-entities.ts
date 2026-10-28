import { findLoneSurrogate } from "@/lib/tools/unicode";

/**
 * HTML character references.
 *
 * Encoding escapes the five characters that are special in HTML text and
 * attribute values (& < > " '), and optionally every non-ASCII character.
 * References already in the input (&amp;, &#169;, &#x1F600;) are left as
 * they are unless double encoding is requested, so running the encoder twice
 * does not turn &amp; into &amp;amp;.
 *
 * Decoding uses the `entities` package, which follows the WHATWG HTML
 * specification: all 2,231 named references, decimal and hex numeric
 * references, and the same replacements browsers make for invalid code
 * points. It is loaded only when decoding.
 *
 * Escaping text is not sanitizing HTML: it makes text safe to place between
 * tags or in a quoted attribute value, but not inside <script>, <style>,
 * unquoted attributes, URLs (javascript:) or event handlers.
 */

export type NonAsciiMode = "keep" | "named" | "numeric";

export type EncodeOptions = { nonAscii: NonAsciiMode; doubleEncode: boolean };

export type EntityResult = { ok: true; output: string; changed: number; note?: string } | { ok: false; error: string };

const ESSENTIAL: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** An existing character reference: named, decimal or hex, terminated by a semicolon. */
const REFERENCE = /&(?:#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[A-Za-z][A-Za-z0-9]{1,31});/y;

export type EntitiesModule = typeof import("entities");

/** Loads the entity tables (about 30 KB) on demand. */
export function loadEntities(): Promise<EntitiesModule> {
  return import("entities");
}

function numeric(codePoint: number): string {
  return `&#x${codePoint.toString(16).toUpperCase()};`;
}

/**
 * Encodes text for use in HTML. `entities` is needed only for named
 * references to non-ASCII characters and for checking that existing named
 * references are real (&copy; is, &foo; is not).
 */
export function encodeHtmlEntities(text: string, { nonAscii, doubleEncode }: EncodeOptions, lib: EntitiesModule | null): EntityResult {
  const bad = findLoneSurrogate(text);
  if (bad !== -1) {
    return { ok: false, error: `The text contains an incomplete Unicode character at position ${bad + 1}, which has no valid character reference.` };
  }
  let output = "";
  let changed = 0;
  let kept = 0;
  for (let i = 0; i < text.length; ) {
    const char = text[i];
    if (char === "&" && !doubleEncode) {
      REFERENCE.lastIndex = i;
      const match = REFERENCE.exec(text);
      if (match && isRealReference(match[0], lib)) {
        output += match[0];
        i += match[0].length;
        kept++;
        continue;
      }
    }
    if (char in ESSENTIAL) {
      output += ESSENTIAL[char];
      changed++;
      i++;
      continue;
    }
    const codePoint = text.codePointAt(i)!;
    const width = codePoint > 0xffff ? 2 : 1;
    if (codePoint > 0x7f && nonAscii !== "keep") {
      const ch = text.slice(i, i + width);
      const named = nonAscii === "named" && lib ? lib.encodeNonAsciiHTML(ch) : null;
      output += named && !named.startsWith("&#") ? named : numeric(codePoint);
      changed++;
    } else {
      output += text.slice(i, i + width);
    }
    i += width;
  }
  const note = kept > 0 ? `${kept} existing ${kept === 1 ? "reference was" : "references were"} left unchanged to avoid double encoding.` : undefined;
  return { ok: true, output, changed, note };
}

function isRealReference(reference: string, lib: EntitiesModule | null): boolean {
  if (reference[1] === "#") return true;
  // Without the table, only the essential names are recognized.
  if (!lib) return ["&amp;", "&lt;", "&gt;", "&quot;", "&apos;", "&nbsp;"].includes(reference);
  return lib.decodeHTMLStrict(reference) !== reference;
}

export type DecodeOptions = { strict: boolean };

/**
 * Decodes character references as an HTML parser would in text content.
 * Strict mode decodes only references that end with a semicolon; otherwise
 * legacy references such as &copy without a semicolon are decoded as well,
 * like browsers do.
 */
export function decodeHtmlEntities(text: string, { strict }: DecodeOptions, lib: EntitiesModule): EntityResult {
  const output = strict ? lib.decodeHTMLStrict(text) : lib.decodeHTML(text);
  const references = text.match(/&(?:#[0-9]+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);?/g) ?? [];
  const unknown = [...new Set(references.filter((r) => r.endsWith(";") && r[1] !== "#" && lib.decodeHTMLStrict(r) === r))];
  const changed = references.filter((r) => (strict ? lib.decodeHTMLStrict(r) : lib.decodeHTML(r)) !== r).length;
  const note = unknown.length
    ? `Not recognized as HTML references, so left as written: ${unknown.slice(0, 5).join(", ")}${unknown.length > 5 ? ` and ${unknown.length - 5} more` : ""}.`
    : undefined;
  return { ok: true, output, changed, note };
}
