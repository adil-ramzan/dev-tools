import type { MimeEntry } from "mime-db";

/**
 * MIME type ↔ file extension lookup backed by mime-db, the dataset used by
 * the `mime-types` package (and so by Express and many other servers). It
 * combines types registered with IANA and those used by Apache and nginx.
 * The ~200 KB dataset is loaded only on this tool's page.
 *
 * When several types share an extension, the "usual" one is chosen by source
 * (IANA, then Apache, then nginx), with application/octet-stream last, plus a
 * few overrides for what browsers and servers actually send.
 *
 * A file's extension and declared type are labels: neither proves what the
 * file contains.
 */

export type MimeDb = Record<string, MimeEntry>;

export type MimeSource = "iana" | "apache" | "nginx" | "common";

export type TypeInfo = {
  type: string;
  extensions: string[];
  source: MimeSource | null;
  compressible: boolean | null;
  charset: string | null;
};

export type MimeIndex = {
  types: Map<string, TypeInfo>;
  byExtension: Map<string, string[]>;
};

/** De-facto types for common extensions mime-db does not list. */
const SUPPLEMENT: Record<string, string> = { py: "text/x-python" };

/** Extensions where the type browsers and servers use differs from the source ranking. */
const PREFERRED: Record<string, string> = { mp4: "video/mp4", wav: "audio/wav", xml: "application/xml", rtf: "application/rtf" };

/** Extensions whose type is often confused with something else. */
export const EXTENSION_NOTES: Record<string, string> = {
  ts: "In mime-db, .ts is an MPEG transport stream (video). TypeScript source files have no registered type; servers usually send them as text/plain or application/typescript.",
  py: "Python source has no registered MIME type; text/x-python is the common de-facto type.",
  js: "text/javascript is the current standard (RFC 9239); application/javascript is an older alias.",
  map: "Source maps are JSON documents, so they share application/json.",
};

const SOURCE_RANK: Record<string, number> = { iana: 3, apache: 2, nginx: 1 };

function score(type: string, source: string | undefined): number {
  if (type === "application/octet-stream") return -1;
  return SOURCE_RANK[source ?? ""] ?? 0;
}

export function buildIndex(db: MimeDb): MimeIndex {
  const types = new Map<string, TypeInfo>();
  const byExtension = new Map<string, string[]>();
  const add = (type: string, info: TypeInfo) => {
    types.set(type, info);
    for (const ext of info.extensions) byExtension.set(ext, [...(byExtension.get(ext) ?? []), type]);
  };
  for (const [type, entry] of Object.entries(db)) {
    add(type, {
      type,
      extensions: entry.extensions ?? [],
      source: entry.source ?? null,
      compressible: entry.compressible ?? null,
      charset: entry.charset ?? null,
    });
  }
  for (const [ext, type] of Object.entries(SUPPLEMENT)) {
    if (byExtension.has(ext)) continue;
    const existing = types.get(type);
    if (existing) {
      existing.extensions.push(ext);
      byExtension.set(ext, [type]);
    } else {
      add(type, { type, extensions: [ext], source: "common", compressible: true, charset: null });
    }
  }
  for (const [ext, list] of byExtension) {
    list.sort((a, b) => {
      if (PREFERRED[ext] === a) return -1;
      if (PREFERRED[ext] === b) return 1;
      return score(b, types.get(b)?.source ?? undefined) - score(a, types.get(a)?.source ?? undefined);
    });
  }
  return { types, byExtension };
}

let cached: Promise<MimeIndex> | null = null;

/** Loads mime-db and builds the index once per page. */
export function loadMimeIndex(): Promise<MimeIndex> {
  cached ??= import("mime-db").then((m) => buildIndex(m.default)).catch((error) => {
    cached = null;
    throw error;
  });
  return cached;
}

export type LookupResult =
  | { kind: "extension"; extension: string; fromFileName: boolean; types: TypeInfo[]; note?: string }
  | { kind: "type"; query: string; info: TypeInfo | null; parameters: string | null; suggestions: string[] }
  | { kind: "error"; error: string };

/** Extracts the extension from ".png", "png", "*.png" or a file name such as "photo.final.JPG". */
export function extensionOf(query: string): { extension: string; fromFileName: boolean } | null {
  const name = query.trim().split(/[\\/]/).pop() ?? "";
  const cleaned = name.replace(/^\*?\./, "");
  if (cleaned === "") return null;
  const dot = cleaned.lastIndexOf(".");
  const extension = (dot === -1 ? cleaned : cleaned.slice(dot + 1)).toLowerCase();
  return extension ? { extension, fromFileName: dot !== -1 } : null;
}

/**
 * Types close to an unknown one: types registered for its subtype used as an
 * extension (image/jpg → image/jpeg), its x- variant or the variant without x-,
 * and types containing the query.
 */
function suggest(type: string, index: MimeIndex): string[] {
  const [top, sub = ""] = type.replace(/\*$/, "").split("/");
  const bare = sub.replace(/^x-/, "");
  const fromExtension = (index.byExtension.get(bare) ?? []).filter((t) => t.startsWith(`${top}/`));
  const variants = [`${top}/${bare}`, `${top}/x-${bare}`].filter((t) => index.types.has(t));
  const containing = [...index.types.keys()].filter((t) => sub !== "" && t.includes(type.replace(/\*$/, ""))).sort((a, b) => a.length - b.length);
  return [...new Set([...fromExtension, ...variants, ...containing])].filter((t) => t !== type).slice(0, 10);
}

export function lookup(query: string, index: MimeIndex): LookupResult {
  const text = query.trim();
  if (text === "") return { kind: "error", error: "Enter a file extension such as png, a file name such as report.pdf, or a MIME type such as image/png." };
  if (text.length > 255) return { kind: "error", error: "The query is too long. Enter a single extension, file name or MIME type." };

  if (text.includes("/") && !/[\\]/.test(text) && /^[a-z0-9][\w.+-]*\/[\w.+*-]*(\s*;.*)?$/i.test(text)) {
    const [base, ...params] = text.split(";");
    const type = base.trim().toLowerCase();
    const info = index.types.get(type) ?? null;
    const suggestions = info ? [] : suggest(type, index);
    return { kind: "type", query: type, info, parameters: params.length ? params.join(";").trim() : null, suggestions };
  }

  const ext = extensionOf(text);
  if (!ext) return { kind: "error", error: "Enter a file extension such as png or a file name such as report.pdf." };
  if (!/^[a-z0-9][a-z0-9_+-]*$/.test(ext.extension)) {
    return { kind: "error", error: `".${ext.extension}" is not a valid file extension. Use letters, digits, -, _ and +.` };
  }
  const types = (index.byExtension.get(ext.extension) ?? []).map((t) => index.types.get(t)!);
  return { kind: "extension", ...ext, types, note: EXTENSION_NOTES[ext.extension] };
}

export const COMMON_EXTENSIONS: { label: string; extensions: string[] }[] = [
  { label: "Web", extensions: ["html", "css", "js", "mjs", "json", "xml", "svg", "wasm", "webmanifest"] },
  { label: "Documents", extensions: ["pdf", "txt", "md", "csv", "docx", "xlsx", "pptx", "odt", "rtf"] },
  { label: "Images", extensions: ["png", "jpg", "gif", "webp", "avif", "ico", "bmp", "tiff", "heic"] },
  { label: "Audio", extensions: ["mp3", "wav", "ogg", "flac", "aac", "m4a", "opus", "weba"] },
  { label: "Video", extensions: ["mp4", "webm", "mov", "mkv", "avi", "ogv"] },
  { label: "Fonts", extensions: ["woff2", "woff", "ttf", "otf"] },
  { label: "Archives", extensions: ["zip", "gz", "tar", "7z", "rar"] },
  { label: "Developer", extensions: ["yaml", "toml", "sql", "sh", "py", "map", "jsonld", "ics"] },
];
