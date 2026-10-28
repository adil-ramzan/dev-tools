import { findLoneSurrogate } from "@/lib/tools/unicode";

/**
 * "component" uses encodeURIComponent: every reserved character (/ ? # & = …)
 * is escaped, for a single query value or path segment.
 * "full" uses encodeURI: the URL's structure (/ ? # & = :) is kept and only
 * characters that are never valid in a URL are escaped.
 */
export type UrlMode = "component" | "full";

export type UrlResult = { ok: true; output: string } | { ok: false; error: string };

export function encodeUrl(text: string, mode: UrlMode): UrlResult {
  const bad = findLoneSurrogate(text);
  if (bad !== -1) {
    return {
      ok: false,
      error: `The text contains an incomplete Unicode character at position ${bad + 1}, which cannot be percent-encoded.`,
    };
  }
  return { ok: true, output: mode === "component" ? encodeURIComponent(text) : encodeURI(text) };
}

export function decodeUrl(text: string, mode: UrlMode, { plusAsSpace = false } = {}): UrlResult {
  const input = plusAsSpace ? text.replace(/\+/g, " ") : text;
  try {
    return { ok: true, output: mode === "component" ? decodeURIComponent(input) : decodeURI(input) };
  } catch {
    return { ok: false, error: describeMalformed(input) };
  }
}

/** Explains why decoding failed, pointing at the first bad escape. */
function describeMalformed(text: string): string {
  const percent = /%(?![0-9A-Fa-f]{2})/.exec(text);
  if (percent) {
    const shown = text.slice(percent.index, percent.index + 3);
    return `Invalid percent-escape "${shown}" at position ${percent.index + 1}. A % must be followed by two hexadecimal digits (for example %20). To keep a literal %, encode it as %25.`;
  }
  // Every escape is well formed, so some run of escapes is not valid UTF-8.
  const runs = /(?:%[0-9A-Fa-f]{2})+/g;
  for (let match = runs.exec(text); match; match = runs.exec(text)) {
    try {
      decodeURIComponent(match[0]);
    } catch {
      return `The escapes "${match[0].slice(0, 24)}${match[0].length > 24 ? "…" : ""}" at position ${match.index + 1} do not form valid UTF-8 text.`;
    }
  }
  return "The input is not valid percent-encoded text.";
}
