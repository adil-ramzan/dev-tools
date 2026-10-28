/**
 * XML well-formedness checking and formatting.
 *
 * The checker follows the XML 1.0 and Namespaces in XML rules for tags,
 * attributes, entity references, comments, CDATA, processing instructions
 * and the DOCTYPE. It does not validate against a DTD or XSD schema.
 *
 * The formatter only changes whitespace between elements. Tags, attributes,
 * text, comments and CDATA are copied exactly as written. Elements with
 * mixed content (text and child elements) or xml:space="preserve" are kept
 * on one line, unchanged, because whitespace there can be meaningful.
 */

export type XmlError = { message: string; line: number; column: number };

type Token =
  | { kind: "decl" | "pi" | "comment" | "cdata" | "doctype"; raw: string; start: number }
  | { kind: "text"; raw: string; start: number }
  | {
      kind: "open";
      raw: string;
      name: string;
      attrs: { name: string; value: string; start: number }[];
      selfClosing: boolean;
      preserve: boolean;
      start: number;
    }
  | { kind: "close"; raw: string; name: string; start: number };

type XmlNode =
  | { kind: "element"; open: Extract<Token, { kind: "open" }>; close: string; children: XmlNode[] }
  | { kind: "text" | "comment" | "cdata" | "pi" | "decl" | "doctype"; raw: string };

export type XmlParseResult = { ok: true; nodes: XmlNode[]; warnings: string[] } | { ok: false; error: XmlError };

const NAME_START = /[A-Za-z_:À-ÖØ-öø-˿Ͱ-ͽͿ-῿‌‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�]/;
const NAME_CHAR = /[A-Za-z0-9_:.\-·À-ÖØ-öø-ͽͿ-῿‌‍‿⁀⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�]/;
const PREDEFINED = new Set(["amp", "lt", "gt", "quot", "apos"]);
const INVALID_CHAR = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/;

class XmlSyntaxError extends Error {
  constructor(
    message: string,
    readonly offset: number,
  ) {
    super(message);
  }
}

function position(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}

function readName(text: string, at: number): string {
  if (!NAME_START.test(text[at] ?? "")) return "";
  let end = at + 1;
  while (end < text.length && NAME_CHAR.test(text[end])) end++;
  return text.slice(at, end);
}

type EntityRules = { declared: Set<string>; externalDtd: boolean; warnings: Set<string> };

/** Checks every & in text or an attribute value starts a valid reference. */
function checkReferences(value: string, offset: number, rules: EntityRules) {
  for (let i = value.indexOf("&"); i !== -1; i = value.indexOf("&", i + 1)) {
    const end = value.indexOf(";", i);
    const ref = end === -1 ? "" : value.slice(i + 1, end);
    if (!ref || /\s/.test(ref)) {
      throw new XmlSyntaxError("A bare & must be written as &amp;", offset + i);
    }
    if (ref.startsWith("#")) {
      const code = /^#x[0-9a-fA-F]+$/.test(ref) ? parseInt(ref.slice(2), 16) : /^#[0-9]+$/.test(ref) ? parseInt(ref.slice(1), 10) : NaN;
      const valid =
        code === 0x9 || code === 0xa || code === 0xd || (code >= 0x20 && code <= 0xd7ff) || (code >= 0xe000 && code <= 0xfffd) || (code >= 0x10000 && code <= 0x10ffff);
      if (!valid) throw new XmlSyntaxError(`&${ref}; is not a valid character reference`, offset + i);
      continue;
    }
    if (readName(ref, 0) !== ref) throw new XmlSyntaxError(`&${ref}; is not a valid entity reference`, offset + i);
    if (PREDEFINED.has(ref) || rules.declared.has(ref)) continue;
    if (rules.externalDtd) {
      rules.warnings.add(`The entity &${ref}; may be defined in the external DTD, which is not loaded, so it was not checked.`);
      continue;
    }
    throw new XmlSyntaxError(`The entity &${ref}; is not defined. Only &amp; &lt; &gt; &quot; &apos; and character references like &#169; are built in`, offset + i);
  }
}

function tokenize(text: string, rules: EntityRules): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const bad = INVALID_CHAR.exec(text);
  if (bad) throw new XmlSyntaxError(`Character U+${bad[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")} is not allowed in XML`, bad.index);

  while (i < text.length) {
    if (text[i] !== "<") {
      const end = text.indexOf("<", i);
      const raw = text.slice(i, end === -1 ? text.length : end);
      const cdataEnd = raw.indexOf("]]>");
      if (cdataEnd !== -1) throw new XmlSyntaxError('"]]>" is not allowed in text. Write it as ]]&gt;', i + cdataEnd);
      checkReferences(raw, i, rules);
      tokens.push({ kind: "text", raw, start: i });
      i += raw.length;
      continue;
    }
    const start = i;
    if (text.startsWith("<!--", i)) {
      const end = text.indexOf("-->", i + 4);
      if (end === -1) throw new XmlSyntaxError("This comment is never closed with -->", start);
      const body = text.slice(i + 4, end);
      const dashes = body.indexOf("--");
      if (dashes !== -1 || body.endsWith("-")) throw new XmlSyntaxError('Comments cannot contain "--" or end with "-"', i + 4 + (dashes === -1 ? body.length - 1 : dashes));
      i = end + 3;
      tokens.push({ kind: "comment", raw: text.slice(start, i), start });
    } else if (text.startsWith("<![CDATA[", i)) {
      const end = text.indexOf("]]>", i);
      if (end === -1) throw new XmlSyntaxError("This CDATA section is never closed with ]]>", start);
      i = end + 3;
      tokens.push({ kind: "cdata", raw: text.slice(start, i), start });
    } else if (text.startsWith("<!DOCTYPE", i)) {
      let depth = 0;
      let quote = "";
      let j = i + 9;
      for (; j < text.length; j++) {
        const c = text[j];
        if (quote) {
          if (c === quote) quote = "";
        } else if (c === '"' || c === "'") quote = c;
        else if (c === "[") depth++;
        else if (c === "]") depth--;
        else if (c === ">" && depth === 0) break;
      }
      if (j >= text.length) throw new XmlSyntaxError("The DOCTYPE declaration is never closed", start);
      i = j + 1;
      const raw = text.slice(start, i);
      for (const m of raw.matchAll(/<!ENTITY\s+([^\s%]+)/g)) rules.declared.add(m[1]);
      rules.externalDtd = /^<!DOCTYPE\s+\S+\s+(SYSTEM|PUBLIC)\b/.test(raw);
      tokens.push({ kind: "doctype", raw, start });
    } else if (text.startsWith("<!", i)) {
      throw new XmlSyntaxError("Unknown markup. Expected a comment <!-- -->, CDATA <![CDATA[ ]]> or <!DOCTYPE>", start);
    } else if (text.startsWith("<?", i)) {
      const end = text.indexOf("?>", i);
      if (end === -1) throw new XmlSyntaxError("This processing instruction is never closed with ?>", start);
      const target = readName(text, i + 2);
      if (!target) throw new XmlSyntaxError("A processing instruction must start with a name, such as <?xml-stylesheet", i + 2);
      i = end + 2;
      const raw = text.slice(start, i);
      if (target.toLowerCase() === "xml") {
        if (start !== 0 && !(start === 1 && text[0] === "﻿")) {
          throw new XmlSyntaxError("The XML declaration <?xml ... ?> must be at the very start of the document, before any spaces or line breaks", start);
        }
        if (target !== "xml") throw new XmlSyntaxError(`The XML declaration must be written in lowercase: <?xml`, start);
        if (!/^<\?xml\s+version\s*=\s*(["'])1\.\d+\1/.test(raw)) throw new XmlSyntaxError('The XML declaration must start with version="1.0"', start);
        tokens.push({ kind: "decl", raw, start });
      } else {
        tokens.push({ kind: "pi", raw, start });
      }
    } else if (text[i + 1] === "/") {
      const name = readName(text, i + 2);
      if (!name) throw new XmlSyntaxError("Expected an element name after </", i + 2);
      let j = i + 2 + name.length;
      while (/\s/.test(text[j] ?? "")) j++;
      if (text[j] !== ">") throw new XmlSyntaxError(`Expected > to close the end tag </${name}>`, j);
      i = j + 1;
      tokens.push({ kind: "close", raw: text.slice(start, i), name, start });
    } else {
      const name = readName(text, i + 1);
      if (!name) throw new XmlSyntaxError(text[i + 1] === undefined || /\s/.test(text[i + 1]) ? "A < must be written as &lt; in text" : `"${text[i + 1]}" cannot start an element name`, i + 1);
      let j = i + 1 + name.length;
      const attrs: { name: string; value: string; start: number }[] = [];
      let preserve = false;
      for (;;) {
        const hadSpace = /\s/.test(text[j] ?? "");
        while (/\s/.test(text[j] ?? "")) j++;
        const c = text[j];
        if (c === undefined) throw new XmlSyntaxError(`The start tag <${name}> is never closed with >`, start);
        if (c === ">" || (c === "/" && text[j + 1] === ">")) break;
        if (!hadSpace) throw new XmlSyntaxError("Attributes must be separated by whitespace", j);
        const attr = readName(text, j);
        if (!attr) throw new XmlSyntaxError(`Unexpected "${c}" in the start tag of <${name}>`, j);
        if (attrs.some((a) => a.name === attr)) throw new XmlSyntaxError(`The attribute "${attr}" appears twice on <${name}>`, j);
        const attrStart = j;
        j += attr.length;
        while (/\s/.test(text[j] ?? "")) j++;
        if (text[j] !== "=") throw new XmlSyntaxError(`The attribute "${attr}" needs a value, such as ${attr}="..."`, j);
        j++;
        while (/\s/.test(text[j] ?? "")) j++;
        const quote = text[j];
        if (quote !== '"' && quote !== "'") throw new XmlSyntaxError(`The value of "${attr}" must be in quotes`, j);
        const valueEnd = text.indexOf(quote, j + 1);
        if (valueEnd === -1) throw new XmlSyntaxError(`The value of "${attr}" is never closed with ${quote}`, j);
        const value = text.slice(j + 1, valueEnd);
        const lt = value.indexOf("<");
        if (lt !== -1) throw new XmlSyntaxError(`Attribute values cannot contain <. Write it as &lt;`, j + 1 + lt);
        checkReferences(value, j + 1, rules);
        if (attr === "xml:space" && value === "preserve") preserve = true;
        attrs.push({ name: attr, value, start: attrStart });
        j = valueEnd + 1;
      }
      const selfClosing = text[j] === "/";
      i = j + (selfClosing ? 2 : 1);
      tokens.push({ kind: "open", raw: text.slice(start, i), name, attrs, selfClosing, preserve, start });
    }
  }
  return tokens;
}

/** Namespace prefixes declared by a start tag's xmlns:p="uri" attributes. */
function declaredPrefixes(attrs: { name: string; value: string; start: number }[]): string[] {
  const prefixes: string[] = [];
  for (const a of attrs) {
    if (!a.name.startsWith("xmlns:")) continue;
    const prefix = a.name.slice(6);
    if (prefix === "xmlns") throw new XmlSyntaxError('The prefix "xmlns" is reserved and cannot be declared', a.start);
    if (a.value === "") throw new XmlSyntaxError(`The namespace prefix "${prefix}" cannot be declared with an empty URI`, a.start);
    prefixes.push(prefix);
  }
  return prefixes;
}

export function parseXml(input: string): XmlParseResult {
  const rules: EntityRules = { declared: new Set(), externalDtd: false, warnings: new Set() };
  try {
    if (input.trim() === "") throw new XmlSyntaxError("The input is empty", 0);
    const tokens = tokenize(input, rules);
    const root: XmlNode[] = [];
    const stack: { node: Extract<XmlNode, { kind: "element" }>; scope: Set<string>; preserve: boolean }[] = [];
    let rootSeen = false;
    let doctypeSeen = false;

    for (const token of tokens) {
      const parent = stack[stack.length - 1];
      const siblings = parent ? parent.node.children : root;
      if (token.kind === "open") {
        if (!parent && rootSeen) throw new XmlSyntaxError(`A document can have only one root element, but <${token.name}> follows the first one`, token.start);
        const scope = new Set(parent?.scope ?? ["xml"]);
        for (const prefix of declaredPrefixes(token.attrs)) scope.add(prefix);
        const qnames = [{ name: token.name, start: token.start + 1 }, ...token.attrs];
        for (const qname of qnames) {
          const colon = qname.name.indexOf(":");
          if (colon === -1) continue;
          const prefix = qname.name.slice(0, colon);
          if (prefix === "xmlns") continue;
          if (colon === 0 || colon === qname.name.length - 1 || qname.name.indexOf(":", colon + 1) !== -1) {
            throw new XmlSyntaxError(`"${qname.name}" is not a valid name: a namespace prefix and local name are separated by a single colon`, qname.start);
          }
          if (!scope.has(prefix)) throw new XmlSyntaxError(`The namespace prefix "${prefix}" in "${qname.name}" is not declared. Add xmlns:${prefix}="..." to this or a parent element`, qname.start);
        }
        const node: Extract<XmlNode, { kind: "element" }> = { kind: "element", open: token, close: "", children: [] };
        siblings.push(node);
        if (!parent) rootSeen = true;
        if (!token.selfClosing) stack.push({ node, scope, preserve: (parent?.preserve ?? false) || token.preserve });
        continue;
      }
      if (token.kind === "close") {
        if (!parent) throw new XmlSyntaxError(`The end tag </${token.name}> has no matching start tag`, token.start);
        if (parent.node.open.name !== token.name) {
          const at = position(input, parent.node.open.start);
          throw new XmlSyntaxError(`Expected </${parent.node.open.name}> (opened on line ${at.line}) but found </${token.name}>`, token.start);
        }
        parent.node.close = token.raw;
        stack.pop();
        continue;
      }
      if (!parent) {
        if (token.kind === "text" && token.raw.trim() !== "") {
          throw new XmlSyntaxError(rootSeen ? "Text is not allowed after the root element" : "Text is not allowed before the root element", token.start + token.raw.search(/\S/));
        }
        if (token.kind === "cdata") throw new XmlSyntaxError("CDATA sections are only allowed inside an element", token.start);
        if (token.kind === "doctype") {
          if (rootSeen || doctypeSeen) throw new XmlSyntaxError("The DOCTYPE must appear once, before the root element", token.start);
          doctypeSeen = true;
        }
        if (token.kind === "text") continue;
      } else if (token.kind === "doctype") {
        throw new XmlSyntaxError("The DOCTYPE must appear before the root element", token.start);
      }
      siblings.push({ kind: token.kind, raw: token.raw });
    }
    if (stack.length) {
      const open = stack[stack.length - 1].node.open;
      throw new XmlSyntaxError(`The element <${open.name}> is never closed`, open.start);
    }
    if (!rootSeen) throw new XmlSyntaxError("The document has no root element", 0);
    return { ok: true, nodes: root, warnings: [...rules.warnings] };
  } catch (error) {
    if (error instanceof XmlSyntaxError) return { ok: false, error: { message: error.message, ...position(input, error.offset) } };
    throw error;
  }
}

function serialize(node: XmlNode): string {
  if (node.kind !== "element") return node.raw;
  if (node.open.selfClosing) return node.open.raw;
  return node.open.raw + node.children.map(serialize).join("") + node.close;
}

export type XmlIndent = "2" | "4" | "tab" | "minify";

/** Formats a parsed document. Only whitespace between elements changes. */
export function formatXml(nodes: XmlNode[], indent: XmlIndent): string {
  const unit = indent === "tab" ? "\t" : indent === "4" ? "    " : indent === "2" ? "  " : "";
  const newline = indent === "minify" ? "" : "\n";
  const out: string[] = [];

  function write(node: XmlNode, level: number) {
    const pad = unit.repeat(level);
    if (node.kind === "text") return; // Only whitespace-only text reaches here.
    if (node.kind !== "element" || node.open.selfClosing) {
      out.push(pad, node.kind === "element" ? node.open.raw : node.raw, newline);
      return;
    }
    const children = node.children;
    const hasText = children.some((c) => (c.kind === "text" && c.raw.trim() !== "") || c.kind === "cdata");
    const hasElements = children.some((c) => c.kind !== "text" && c.kind !== "cdata");
    if (children.length === 0 || node.open.preserve || (hasText && hasElements) || !hasElements) {
      // Empty, text-only, mixed content or xml:space="preserve": copy exactly.
      out.push(pad, serialize(node), newline);
      return;
    }
    out.push(pad, node.open.raw, newline);
    for (const child of children) write(child, level + 1);
    out.push(pad, node.close, newline);
  }

  for (const node of nodes) write(node, 0);
  return out.join("").replace(/\n$/, "");
}
