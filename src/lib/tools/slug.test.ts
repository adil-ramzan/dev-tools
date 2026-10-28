import { describe, expect, it } from "vitest";
import { defaultSlugOptions, slugify, slugifyLines, type SlugOptions } from "@/lib/tools/slug";

const slug = (text: string, options: Partial<SlugOptions> = {}) => slugify(text, { ...defaultSlugOptions, ...options }).slug;

describe("URL slugs", () => {
  it("lowercases and joins words with hyphens", () => {
    expect(slug("Hello, World! How are you?")).toBe("hello-world-how-are-you");
    expect(slug("  --Already--slugged--  ")).toBe("already-slugged");
  });

  it("removes accents and spells out special letters", () => {
    expect(slug("Crème Brûlée à la carte")).toBe("creme-brulee-a-la-carte");
    expect(slug("Straße Æsir Øresund Łódź þing")).toBe("strasse-aesir-oresund-lodz-thing");
  });

  it("applies NFKC to compatibility characters", () => {
    expect(slug("ｆｕｌｌ ｗｉｄｔｈ ﬁle ①")).toBe("full-width-file-1");
  });

  it("treats composed and decomposed input the same", () => {
    expect(slug("Café")).toBe(slug("Café"));
  });

  it("handles ampersands and apostrophes", () => {
    expect(slug("Tom & Jerry's")).toBe("tom-and-jerrys");
    expect(slug("Tom & Jerry’s", { ampersand: false })).toBe("tom-jerrys");
    expect(slug("don't stop")).toBe("dont-stop");
  });

  it("transliterates Greek and Cyrillic", () => {
    expect(slug("Привет мир")).toBe("privet-mir");
    expect(slug("Αθήνα")).toBe("athina");
  });

  it("drops letters with no ASCII equivalent and reports them", () => {
    const result = slugify("Tokyo 東京 2024", defaultSlugOptions);
    expect(result.slug).toBe("tokyo-2024");
    expect(result.dropped).toEqual(["東", "京"]);
  });

  it("keeps letters of every script in Unicode mode", () => {
    expect(slug("Tokyo 東京 Café", { unicode: true })).toBe("tokyo-東京-café");
    expect(slugify("東京", { ...defaultSlugOptions, unicode: true }).dropped).toEqual([]);
  });

  it("supports other separators and case options", () => {
    expect(slug("Hello World", { separator: "_" })).toBe("hello_world");
    expect(slug("Hello World", { separator: "." })).toBe("hello.world");
    expect(slug("Hello World", { separator: "" })).toBe("helloworld");
    expect(slug("Hello World", { case: "preserve" })).toBe("Hello-World");
    expect(slug("Hello World", { case: "upper" })).toBe("HELLO-WORLD");
  });

  it("truncates at a word boundary", () => {
    expect(slug("the quick brown fox", { maxLength: 12 })).toBe("the-quick");
    expect(slug("the quick brown fox", { maxLength: 9 })).toBe("the-quick");
    expect(slug("supercalifragilistic", { maxLength: 5 })).toBe("super");
  });

  it("returns an empty slug for punctuation only", () => {
    expect(slug("!!! ???")).toBe("");
  });

  it("never outputs characters unsafe in URLs", () => {
    const nasty = `<script>alert("x")</script> ../../etc/passwd %00 ‮ \t`;
    expect(slug(nasty)).toMatch(/^[a-z0-9-]*$/);
  });
});

describe("file names", () => {
  it("keeps the extension and lowercases it", () => {
    expect(slug("My Report (Final).PDF", { mode: "filename" })).toBe("my-report-final.pdf");
    expect(slug("archive.tar.gz", { mode: "filename" })).toBe("archive-tar.gz");
  });

  it("avoids Windows reserved names", () => {
    expect(slug("CON.txt", { mode: "filename" })).toBe("con-file.txt");
    expect(slug("nul", { mode: "filename" })).toBe("nul-file");
  });

  it("strips path separators", () => {
    expect(slug("../../secret/notes.md", { mode: "filename" })).toBe("secret-notes.md");
  });

  it("keeps the extension within the length limit", () => {
    expect(slug("a very long document title.docx", { mode: "filename", maxLength: 15 })).toBe("a-very.docx");
  });
});

describe("identifiers", () => {
  it("uses underscores and avoids a leading digit", () => {
    expect(slug("2nd Place Winner", { mode: "identifier" })).toBe("_2nd_place_winner");
    expect(slug("user-id", { mode: "identifier", separator: "-" })).toBe("user_id");
    expect(slug("max retries", { mode: "identifier", case: "upper" })).toBe("MAX_RETRIES");
  });

  it("is always ASCII", () => {
    expect(slug("Café 東京", { mode: "identifier", unicode: true })).toBe("cafe");
  });
});

describe("slugifyLines", () => {
  it("converts each line and keeps blank lines", () => {
    const result = slugifyLines("First Post\n\nSecond Post\n東京", defaultSlugOptions);
    expect(result.output).toBe("first-post\n\nsecond-post\n");
    expect(result.emptyLines).toBe(1);
    expect(result.dropped).toEqual(["東", "京"]);
  });
});
