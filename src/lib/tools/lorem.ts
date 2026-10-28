/**
 * Lorem ipsum placeholder text from the traditional vocabulary (derived from
 * Cicero's "De finibus bonorum et malorum"). Text is generated locally with a
 * pseudo-random source; it is filler, not secret, so Math.random is fine.
 */

export const WORDS = (
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua " +
  "enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in " +
  "reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa " +
  "qui officia deserunt mollit anim id est laborum pellentesque habitant morbi tristique senectus netus malesuada fames ac " +
  "turpis egestas vestibulum tortor quam feugiat vitae ultricies eget mauris pharetra sem neque viverra justo nec ultrices " +
  "dui sapien nunc mattis enim praesent elementum facilisis leo vel fringilla urna porttitor rhoncus mi bibendum arcu cursus " +
  "euismod lacinia at quisque id diam volutpat commodo sed egestas aliquam faucibus purus gravida"
).split(" ");

export const CLASSIC_OPENING = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

export type LoremUnit = "paragraphs" | "sentences" | "words" | "list";
export type LoremFormat = "text" | "html";

export const LIMITS: Record<LoremUnit, number> = { paragraphs: 100, sentences: 1000, words: 10_000, list: 200 };

export type LoremOptions = { unit: LoremUnit; count: number; format: LoremFormat; startWithLorem: boolean };

type Random = () => number;

/** A small seeded generator (mulberry32), for reproducible output in tests. */
export function seeded(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (random: Random, min: number, max: number) => min + Math.floor(random() * (max - min + 1));

function words(random: Random, n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    let word = WORDS[Math.floor(random() * WORDS.length)];
    // Avoid the same word twice in a row.
    if (word === out[out.length - 1]) word = WORDS[(WORDS.indexOf(word) + 1) % WORDS.length];
    out.push(word);
  }
  return out;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function sentence(random: Random): string {
  const list = words(random, between(random, 6, 14));
  // Occasionally add a comma, as in real prose.
  if (list.length > 7 && random() < 0.5) list[between(random, 2, list.length - 4)] += ",";
  return `${capitalize(list.join(" "))}.`;
}

function paragraph(random: Random): string {
  return Array.from({ length: between(random, 4, 7) }, () => sentence(random)).join(" ");
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export type LoremResult = { ok: true; text: string; words: number } | { ok: false; error: string };

export function generateLorem({ unit, count, format, startWithLorem }: LoremOptions, random: Random = Math.random): LoremResult {
  const max = LIMITS[unit];
  if (!Number.isInteger(count) || count < 1 || count > max) return { ok: false, error: `Enter a whole number from 1 to ${max.toLocaleString("en-US")}.` };

  let items: string[];
  if (unit === "words") {
    const list = words(random, count);
    if (startWithLorem) list.splice(0, Math.min(count, 5), ...["lorem", "ipsum", "dolor", "sit", "amet"].slice(0, Math.min(count, 5)));
    items = [capitalize(list.join(" "))];
  } else {
    const make = unit === "paragraphs" ? () => paragraph(random) : unit === "list" ? () => sentence(random).replace(/\.$/, "") : () => sentence(random);
    items = Array.from({ length: count }, make);
    if (startWithLorem) {
      if (unit === "paragraphs") items[0] = `${CLASSIC_OPENING} ${items[0]}`;
      else if (unit === "list") items[0] = CLASSIC_OPENING.replace(/\.$/, "");
      else items[0] = CLASSIC_OPENING;
    }
  }

  const wordCount = items.join(" ").split(/\s+/).filter(Boolean).length;
  let text: string;
  if (format === "html") {
    const esc = items.map(escapeHtml);
    if (unit === "list") text = `<ul>\n${esc.map((i) => `  <li>${i}</li>`).join("\n")}\n</ul>`;
    else if (unit === "paragraphs") text = esc.map((p) => `<p>${p}</p>`).join("\n");
    else text = `<p>${esc.join(" ")}</p>`;
  } else {
    text = unit === "paragraphs" ? items.join("\n\n") : unit === "list" ? items.map((i) => `- ${i}`).join("\n") : items.join(" ");
  }
  return { ok: true, text, words: wordCount };
}
