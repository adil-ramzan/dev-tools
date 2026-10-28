/**
 * Tool search for the header: matches a query against the local tool
 * registry only. Nothing is sent anywhere or remembered.
 *
 * Every word of the query must match the tool's name, keywords, category or
 * description (in that order of weight). Results are ranked by where the
 * words matched, then by registry order.
 */

import type { CategoryDefinition, ToolDefinition } from "@/types/tool";

export type SearchableTool = {
  slug: string;
  name: string;
  description: string;
  category: string;
  keywords: string[];
};

export type SearchResult = SearchableTool & { score: number };

/** The tools a visitor can open, with their category names. Planned tools are left out. */
export function searchableTools(tools: ToolDefinition[], categories: CategoryDefinition[]): SearchableTool[] {
  return tools
    .filter((tool) => tool.status === "available")
    .map((tool) => ({
      slug: tool.slug,
      name: tool.name,
      description: tool.description,
      category: categories.find((c) => c.slug === tool.category)?.name ?? tool.category,
      keywords: tool.keywords ?? [],
    }));
}

/** Longer queries are cut, so a pasted essay cannot slow the page down. */
export const MAX_QUERY_LENGTH = 100;

/** Lowercase, without accents, with punctuation such as `-` and `&` treated as spaces. */
export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    // Keep dots inside words such as node.js, but not at the end of a sentence.
    .replace(/\.(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])\./gu, " ")
    .replace(/[^\p{L}\p{N}+#.]+/gu, " ")
    .trim();
}

export function queryTerms(query: string): string[] {
  return [...new Set(normalize(query.slice(0, MAX_QUERY_LENGTH)).split(" ").filter(Boolean))];
}

/** Points for one term in one field: whole word > start of a word > anywhere. */
function fieldScore(field: string, term: string, weight: number): number {
  const index = field.indexOf(term);
  if (index === -1) return 0;
  const atWordStart = index === 0 || field[index - 1] === " ";
  const end = index + term.length;
  const wholeWord = atWordStart && (end === field.length || field[end] === " ");
  return weight * (wholeWord ? 3 : atWordStart ? 2 : 1);
}

type Indexed = { tool: SearchableTool; name: string; keywords: string; category: string; description: string };

/** Precomputes normalized fields once, so each keystroke only compares strings. */
export function buildIndex(tools: SearchableTool[]): Indexed[] {
  return tools.map((tool) => ({
    tool,
    name: normalize(tool.name),
    keywords: normalize(tool.keywords.join(" , ")),
    category: normalize(tool.category),
    description: normalize(tool.description),
  }));
}

export function searchTools(query: string, index: Indexed[]): SearchResult[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  const results: SearchResult[] = [];
  for (const entry of index) {
    let score = 0;
    let matchedAll = true;
    for (const term of terms) {
      const best = Math.max(
        fieldScore(entry.name, term, 8),
        fieldScore(entry.keywords, term, 4),
        fieldScore(entry.category, term, 2),
        fieldScore(entry.description, term, 1),
      );
      if (best === 0) {
        matchedAll = false;
        break;
      }
      score += best;
    }
    if (!matchedAll) continue;
    // The whole query at the start of the name is the strongest signal.
    if (entry.name.startsWith(terms.join(" "))) score += 10;
    results.push({ ...entry.tool, score });
  }
  // Array.prototype.sort is stable, so equal scores keep registry order.
  return results.sort((a, b) => b.score - a.score);
}

export type HighlightPart = { text: string; match: boolean };

/**
 * Splits `text` into parts, marking every case- and accent-insensitive
 * occurrence of a query term at the start of a word. Only used for display;
 * the text content stays the same, so screen readers read it unchanged.
 */
export function highlight(text: string, query: string): HighlightPart[] {
  const terms = queryTerms(query).sort((a, b) => b.length - a.length);
  if (terms.length === 0) return [{ text, match: false }];
  // Compare character by character with accents removed, keeping positions in the original text.
  const chars = Array.from(text);
  const folded = chars.map((c) => c.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase());
  const marked = new Array<boolean>(chars.length).fill(false);
  for (let i = 0; i < chars.length; i++) {
    const startsWord = i === 0 || !/[\p{L}\p{N}]/u.test(chars[i - 1]);
    if (!startsWord) continue;
    for (const term of terms) {
      let j = i;
      let k = 0;
      while (j < chars.length && k < term.length && term.startsWith(folded[j], k) && folded[j] !== "") {
        k += folded[j].length;
        j++;
      }
      if (k >= term.length) {
        for (let m = i; m < j; m++) marked[m] = true;
        break;
      }
    }
  }
  const parts: HighlightPart[] = [];
  chars.forEach((c, i) => {
    const last = parts[parts.length - 1];
    if (last && last.match === marked[i]) last.text += c;
    else parts.push({ text: c, match: marked[i] });
  });
  return parts;
}

/** True when a key press is meant for a text field or other editable element, so `/` must not be taken over. */
export function isEditableTarget(element: { tagName?: string; isContentEditable?: boolean; type?: string; closest?: (selector: string) => unknown } | null): boolean {
  if (!element || !element.tagName) return false;
  if (element.isContentEditable) return true;
  const tag = element.tagName.toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") return !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file"].includes((element.type ?? "text").toLowerCase());
  // Areas that capture every key themselves, such as the Keycode Inspector.
  return Boolean(element.closest?.('[role="application"], [role="textbox"], [contenteditable=""], [contenteditable="true"]'));
}

export type ShortcutEvent = { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean; isComposing?: boolean; defaultPrevented?: boolean };

/**
 * Which search shortcut, if any, a key press is: `/` outside editable
 * elements, or Ctrl+K (⌘+K on Mac) anywhere except key-capturing areas.
 * Other combinations, such as the tools' Ctrl/⌘+Enter, are never matched.
 */
export function searchShortcut(event: ShortcutEvent, target: Parameters<typeof isEditableTarget>[0], isMac: boolean): "slash" | "k" | null {
  if (event.defaultPrevented || event.isComposing) return null;
  if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
    return isEditableTarget(target) ? null : "slash";
  }
  if (event.key.toLowerCase() === "k" && (isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey) && !event.altKey && !event.shiftKey) {
    return target?.closest?.('[role="application"]') ? null : "k";
  }
  return null;
}
