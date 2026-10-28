/**
 * Slugs for URLs, file names and identifiers. Each line is converted
 * separately. Normalization rules, in order:
 *
 * 1. Unicode NFKC: compatibility forms become ordinary characters
 *    (full-width ｆｕｌｌ → full, the ligature ﬁ → fi, ① → 1).
 * 2. & becomes "and" (optional), and letters that do not decompose are
 *    spelled out: ß → ss, æ → ae, œ → oe, ø → o, ł → l, đ/ð → d, þ → th.
 * 3. ASCII mode: accents are removed by NFD decomposition (é → e, ñ → n),
 *    Greek and Cyrillic are transliterated, and any other letters (such as
 *    Chinese or Arabic) are dropped with a warning. Unicode mode keeps
 *    letters and digits of every script, in NFC form.
 * 4. Apostrophes inside words are removed (don't → dont).
 * 5. Case is changed, then every run of other characters becomes one
 *    separator, with none at the start or end.
 */

export type SlugMode = "url" | "filename" | "identifier";
export type SlugCase = "lower" | "upper" | "preserve";

export type SlugOptions = {
  mode: SlugMode;
  separator: string;
  case: SlugCase;
  /** Keep non-Latin letters instead of transliterating to ASCII. Not used for identifiers. */
  unicode: boolean;
  ampersand: boolean;
  /** Maximum length in characters; 0 for no limit. */
  maxLength: number;
};

export const defaultSlugOptions: SlugOptions = { mode: "url", separator: "-", case: "lower", unicode: false, ampersand: true, maxLength: 0 };

export const SEPARATORS = ["-", "_", ".", ""] as const;

const SPECIAL: Record<string, string> = {
  ß: "ss",
  ẞ: "SS",
  æ: "ae",
  Æ: "AE",
  œ: "oe",
  Œ: "OE",
  ø: "o",
  Ø: "O",
  ł: "l",
  Ł: "L",
  đ: "d",
  Đ: "D",
  ð: "d",
  Ð: "D",
  þ: "th",
  Þ: "TH",
  ı: "i",
};

const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", є: "ye", і: "i", ї: "yi", ґ: "g",
};

const GREEK: Record<string, string> = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x",
  ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
};

/** Windows reserves these names regardless of extension. */
const RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;

function transliterate(char: string): string {
  const lower = char.toLowerCase();
  const mapped = CYRILLIC[lower] ?? GREEK[lower];
  if (mapped === undefined) return char;
  return char !== lower && mapped ? mapped[0].toUpperCase() + mapped.slice(1) : mapped;
}

export type SlugResult = { slug: string; dropped: string[] };

function core(text: string, options: SlugOptions, separator: string): SlugResult {
  const ascii = !options.unicode || options.mode === "identifier";
  let s = text.normalize("NFKC");
  if (options.ampersand) s = s.replace(/\s*&\s*/g, " and ");
  s = s.replace(/[ßẞæÆœŒøØłŁđĐðÐþÞı]/g, (c) => SPECIAL[c]);
  s = s.replace(/(\p{L}\p{M}*)['’ʼ](?=\p{L})/gu, "$1");

  const dropped: string[] = [];
  if (ascii) {
    s = s.normalize("NFD").replace(/\p{M}/gu, "");
    s = s.replace(/[Ͱ-ϿЀ-ӿ]/g, transliterate);
    s = s.replace(/[\p{L}\p{N}]/gu, (c) => {
      if (/[A-Za-z0-9]/.test(c)) return c;
      dropped.push(c);
      return " ";
    });
  } else {
    s = s.normalize("NFC");
  }

  if (options.case === "lower") s = s.toLowerCase();
  else if (options.case === "upper") s = s.toUpperCase();

  const allowed = ascii ? /[A-Za-z0-9]+/g : /[\p{L}\p{M}\p{N}]+/gu;
  const words = s.match(allowed) ?? [];
  return { slug: words.join(separator), dropped };
}

function truncate(slug: string, max: number, separator: string): string {
  const chars = Array.from(slug);
  if (max <= 0 || chars.length <= max) return slug;
  const cut = chars.slice(0, max).join("");
  // End at a word boundary when possible, so the slug does not end in half a word.
  if (!separator || slug.startsWith(separator, cut.length)) return cut;
  const boundary = cut.lastIndexOf(separator);
  return boundary > 0 ? cut.slice(0, boundary) : cut;
}

export function slugify(text: string, options: SlugOptions): SlugResult {
  const separator = options.mode === "identifier" && options.separator !== "" && options.separator !== "_" ? "_" : options.separator;

  if (options.mode === "filename") {
    const match = /^(.*\S)\.([A-Za-z0-9]{1,10})\s*$/.exec(text);
    const base = core(match ? match[1] : text, options, separator);
    const extension = match ? `.${match[2].toLowerCase()}` : "";
    let name = truncate(base.slug, options.maxLength > 0 ? Math.max(1, options.maxLength - extension.length) : 0, separator);
    if (RESERVED.test(name)) name = `${name}${separator || "_"}file`;
    if (!name && extension) name = "file";
    return { slug: name + extension, dropped: base.dropped };
  }

  const result = core(text, options, separator);
  let slug = truncate(result.slug, options.maxLength, separator);
  if (options.mode === "identifier" && /^[0-9]/.test(slug)) slug = `_${slug}`;
  return { slug, dropped: result.dropped };
}

export type SlugLinesResult = { output: string; dropped: string[]; emptyLines: number };

/** Slugifies each line; blank lines stay blank. */
export function slugifyLines(text: string, options: SlugOptions): SlugLinesResult {
  const dropped = new Set<string>();
  let emptyLines = 0;
  const lines = text.split(/\r\n|\r|\n/).map((line) => {
    if (line.trim() === "") return "";
    const result = slugify(line, options);
    result.dropped.forEach((c) => dropped.add(c));
    if (result.slug === "") emptyLines++;
    return result.slug;
  });
  return { output: lines.join("\n"), dropped: [...dropped], emptyLines };
}
