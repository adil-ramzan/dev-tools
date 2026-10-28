/**
 * HTML, CSS and JavaScript minification. Each library is loaded on demand,
 * parses the code into a syntax tree and never executes it.
 *
 * - JavaScript: Terser. Top-level names are not renamed, so globals that
 *   other scripts rely on keep working. License comments (/*! … *\/,
 *   @license, @preserve) are kept.
 * - CSS: csso, with structural optimisations (rule merging) turned off.
 *   csso's parser recovers from errors by dropping invalid code, so the CSS
 *   is checked first and refused if the parser reports errors.
 * - HTML: parse5 (a spec-compliant HTML parser) and the serializer below.
 *   Comments are removed and runs of whitespace collapse to one space, except
 *   inside <pre>, <textarea> and raw-text elements. Inline <style>, <script>
 *   and JSON blocks are minified with the tools above; if one fails to
 *   parse, it is kept unchanged and a warning is returned.
 */

import { formatJson, parseJson } from "@/lib/tools/json";

export type MinifyLanguage = "html" | "css" | "js";

export type MinifyResult = { ok: true; output: string; warnings: string[] } | { ok: false; error: string };

type TerserError = Error & { line?: number; col?: number };

export async function minifyJs(code: string, { module = false } = {}): Promise<MinifyResult> {
  const { minify } = await import("terser");
  try {
    const result = await minify(code, {
      module,
      compress: { passes: 1 },
      mangle: true,
      format: { comments: "some" },
    });
    return { ok: true, output: result.code ?? "", warnings: [] };
  } catch (error) {
    const e = error as TerserError;
    const where = e.line ? `Line ${e.line}, column ${(e.col ?? 0) + 1}: ` : "";
    return { ok: false, error: `${where}${e.message}` };
  }
}

export async function minifyCss(code: string): Promise<MinifyResult> {
  const csso = await import("csso");
  const errors: { message: string; line?: number; column?: number }[] = [];
  csso.syntax.parse(code, {
    positions: true,
    onParseError: (error: { message: string; line?: number; column?: number }) => errors.push(error),
  } as Parameters<typeof csso.syntax.parse>[1]);
  if (errors.length > 0) {
    const first = errors[0];
    const where = first.line ? `Line ${first.line}, column ${first.column}: ` : "";
    const more = errors.length > 1 ? ` (${errors.length - 1} more ${errors.length === 2 ? "error" : "errors"})` : "";
    const nesting = /\{[^{}]*&[^{}]*\{/.test(code)
      ? " This looks like CSS nesting (&), which this minifier does not support yet."
      : "";
    return {
      ok: false,
      error: `${where}${first.message}${more}.${nesting} The CSS was not minified, because the minifier would drop the code it cannot parse.`,
    };
  }
  const { css } = csso.minify(code, { restructure: false, comments: "exclamation" });
  return { ok: true, output: css, warnings: [] };
}

// --- HTML ---------------------------------------------------------------

type HtmlAttr = { name: string; value: string; prefix?: string };
type HtmlNode = {
  nodeName: string;
  tagName?: string;
  attrs?: HtmlAttr[];
  childNodes?: HtmlNode[];
  content?: HtmlNode;
  value?: string;
  data?: string;
  name?: string;
  publicId?: string | null;
  systemId?: string | null;
};

const VOID_ELEMENTS = new Set([
  "area", "base", "basefont", "bgsound", "br", "col", "embed", "frame", "hr", "img", "input", "keygen", "link",
  "meta", "param", "source", "track", "wbr",
]);
const RAW_TEXT_ELEMENTS = new Set(["style", "script", "xmp", "iframe", "noembed", "noframes", "plaintext", "noscript"]);
const PRESERVE_WHITESPACE = new Set(["pre", "textarea", "listing", "plaintext"]);
const NO_RENDERED_WHITESPACE = new Set(["#document", "#document-fragment", "html", "head"]);
const JS_TYPES = new Set([
  "", "text/javascript", "application/javascript", "module", "text/ecmascript", "application/ecmascript",
]);
const JSON_TYPES = new Set(["application/json", "application/ld+json", "importmap", "speculationrules"]);

const escapeText = (s: string) => s.replace(/&/g, "&amp;").replace(/ /g, "&nbsp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/ /g, "&nbsp;").replace(/"/g, "&quot;");

function attr(node: HtmlNode, name: string): string | undefined {
  return node.attrs?.find((a) => a.name === name)?.value;
}

export async function minifyHtml(code: string): Promise<MinifyResult> {
  const { parse, parseFragment } = await import("parse5");
  const warnings: string[] = [];
  const isDocument = /^\s*(?:<!--[\s\S]*?-->\s*)*<(?:!doctype|html|head|body)\b/i.test(code);
  const root = (isDocument ? parse(code) : parseFragment(code)) as unknown as HtmlNode;

  const out: string[] = [];

  async function inlineContent(element: HtmlNode, text: string): Promise<string> {
    if (element.tagName === "style") {
      const result = await minifyCss(text);
      if (result.ok) return result.output;
      warnings.push(`An inline <style> block was left unminified: ${result.error.split(". The CSS")[0]}.`);
      return text;
    }
    if (element.tagName === "script" && attr(element, "src") === undefined) {
      const type = (attr(element, "type") ?? "").trim().toLowerCase();
      if (JS_TYPES.has(type)) {
        const result = await minifyJs(text, { module: type === "module" });
        if (result.ok) return result.output;
        warnings.push(`An inline <script> was left unminified: ${result.error}`);
        return text;
      }
      if (JSON_TYPES.has(type)) {
        const parsed = parseJson(text);
        if (parsed.ok) return formatJson(parsed.value, { indent: "" });
        warnings.push(`An inline JSON <script> was left unminified: ${parsed.error.message}.`);
      }
    }
    return text;
  }

  async function serialize(node: HtmlNode, preserve: boolean) {
    const children = node.nodeName === "template" ? (node.content?.childNodes ?? []) : (node.childNodes ?? []);
    for (const child of children) {
      switch (child.nodeName) {
        case "#text": {
          const value = child.value ?? "";
          if (node.tagName && RAW_TEXT_ELEMENTS.has(node.tagName)) {
            out.push(await inlineContent(node, value));
          } else if (preserve) {
            out.push(escapeText(value));
          } else if (/^[ \t\n\f\r]*$/.test(value) && NO_RENDERED_WHITESPACE.has(node.tagName ?? node.nodeName)) {
            // Whitespace here is never rendered.
          } else {
            out.push(escapeText(value.replace(/[ \t\n\f\r]+/g, " ")));
          }
          break;
        }
        case "#comment": {
          const data = child.data ?? "";
          if (/^\[if\b|<!\[endif\]$/i.test(data)) out.push(`<!--${data}-->`); // conditional comments
          break;
        }
        case "#documentType": {
          let doctype = `<!DOCTYPE ${child.name ?? "html"}`;
          if (child.publicId) doctype += ` PUBLIC "${child.publicId}"`;
          if (child.systemId) doctype += `${child.publicId ? "" : " SYSTEM"} "${child.systemId}"`;
          out.push(`${doctype}>`);
          break;
        }
        default: {
          const tag = child.tagName ?? child.nodeName;
          out.push(`<${tag}`);
          for (const a of child.attrs ?? []) {
            const name = a.prefix ? `${a.prefix}:${a.name}` : a.name;
            out.push(a.value === "" ? ` ${name}` : ` ${name}="${escapeAttr(a.value)}"`);
          }
          out.push(">");
          if (VOID_ELEMENTS.has(tag)) break;
          const keep = preserve || PRESERVE_WHITESPACE.has(tag);
          // The parser drops a newline straight after <pre>/<textarea>/<listing>; restore it.
          const first = child.childNodes?.[0];
          if (PRESERVE_WHITESPACE.has(tag) && first?.nodeName === "#text" && first.value?.startsWith("\n")) {
            out.push("\n");
          }
          await serialize(child, keep);
          out.push(`</${tag}>`);
        }
      }
    }
  }

  await serialize(root, false);
  return { ok: true, output: out.join("").trim(), warnings };
}

export function minify(language: MinifyLanguage, code: string): Promise<MinifyResult> {
  if (language === "js") return minifyJs(code);
  if (language === "css") return minifyCss(code);
  return minifyHtml(code);
}
