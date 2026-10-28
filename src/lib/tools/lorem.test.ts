// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { CLASSIC_OPENING, LIMITS, WORDS, escapeHtml, generateLorem, seeded, type LoremOptions } from "@/lib/tools/lorem";

const gen = (options: Partial<LoremOptions>, seed = 1) => {
  const result = generateLorem({ unit: "paragraphs", count: 3, format: "text", startWithLorem: true, ...options }, seeded(seed));
  if (!result.ok) throw new Error(result.error);
  return result;
};

describe("generateLorem", () => {
  it("generates the requested number of paragraphs, starting with the classic opening", () => {
    const { text } = gen({ count: 4 });
    const paragraphs = text.split("\n\n");
    expect(paragraphs).toHaveLength(4);
    expect(paragraphs[0].startsWith(CLASSIC_OPENING)).toBe(true);
    for (const p of paragraphs) expect(p).toMatch(/^[A-Z][a-z, ]+\.( [A-Z][a-z, ]+\.)+$/);
  });

  it("can start without the classic opening", () => {
    expect(gen({ startWithLorem: false }).text.startsWith("Lorem ipsum dolor sit amet")).toBe(false);
  });

  it("generates exact word counts", () => {
    for (const count of [1, 3, 5, 50, 1000]) {
      const { text, words } = gen({ unit: "words", count });
      expect(text.split(" ")).toHaveLength(count);
      expect(words).toBe(count);
    }
    expect(gen({ unit: "words", count: 3 }).text).toBe("Lorem ipsum dolor");
  });

  it("generates sentences and list items", () => {
    expect(gen({ unit: "sentences", count: 5 }).text.match(/\./g)).toHaveLength(5);
    const list = gen({ unit: "list", count: 6 }).text.split("\n");
    expect(list).toHaveLength(6);
    expect(list.every((l) => l.startsWith("- "))).toBe(true);
  });

  it("uses only words from the vocabulary", () => {
    const vocabulary = new Set(WORDS);
    const used = gen({ unit: "words", count: 500, startWithLorem: false }).text.toLowerCase().split(" ");
    expect(used.every((w) => vocabulary.has(w))).toBe(true);
  });

  it("is reproducible with the same seed and varies with another", () => {
    expect(gen({}, 7).text).toBe(gen({}, 7).text);
    expect(gen({}, 7).text).not.toBe(gen({}, 8).text);
  });

  it("wraps HTML output in well-formed elements", () => {
    const parse = (html: string) => new DOMParser().parseFromString(html, "text/html").body;
    expect(parse(gen({ format: "html", count: 3 }).text).querySelectorAll("p")).toHaveLength(3);
    const list = parse(gen({ unit: "list", format: "html", count: 4 }).text);
    expect(list.querySelectorAll("ul > li")).toHaveLength(4);
    expect(parse(gen({ unit: "sentences", format: "html", count: 2 }).text).children).toHaveLength(1);
  });

  it("validates counts against the limits", () => {
    for (const [unit, max] of Object.entries(LIMITS) as [LoremOptions["unit"], number][]) {
      expect(generateLorem({ unit, count: max + 1, format: "text", startWithLorem: true }).ok).toBe(false);
      expect(generateLorem({ unit, count: max, format: "text", startWithLorem: true }).ok).toBe(true);
    }
    expect(generateLorem({ unit: "words", count: 0, format: "text", startWithLorem: true }).ok).toBe(false);
    expect(generateLorem({ unit: "words", count: 2.5, format: "text", startWithLorem: true }).ok).toBe(false);
  });
});

describe("escapeHtml", () => {
  it("escapes markup characters", () => {
    expect(escapeHtml(`<b class="x">'&'</b>`)).toBe("&lt;b class=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/b&gt;");
  });
});
