import { describe, expect, it } from "vitest";
import { defaultListOptions, processList, type ListOptions } from "@/lib/tools/list";

function run(input: string, options: Partial<ListOptions> = {}) {
  const result = processList(input, { ...defaultListOptions, ...options });
  if (!result.ok) throw new Error(result.error);
  return result;
}
const out = (input: string, options: Partial<ListOptions> = {}) => run(input, options).output;

describe("defaults", () => {
  it("returns the input unchanged, including empty lines and whitespace", () => {
    const input = "  b\n\na  \n\nb\n";
    expect(out(input)).toBe("  b\n\na  \n\nb\n");
  });

  it("normalizes CRLF line endings to LF", () => {
    expect(out("a\r\nb\rc")).toBe("a\nb\nc");
  });
});

describe("whitespace and empty lines", () => {
  it("trims and removes empty lines only when asked, and counts removals", () => {
    const result = run("  a \n\n   \nb", { trim: true, removeEmpty: true });
    expect(result.output).toBe("a\nb");
    expect(result.stats).toMatchObject({ inputRows: 4, outputRows: 2, removedEmpty: 2 });
  });

  it("treats whitespace-only lines as empty when removing them without trimming", () => {
    expect(out("a\n  \nb", { removeEmpty: true })).toBe("a\nb");
  });
});

describe("sorting", () => {
  const list = "banana\nApple\ncherry\napple\n10 items\n9 items";

  it("sorts alphabetically, naturally, by number and by length", () => {
    expect(out("b\na\nC", { sort: "alpha" })).toBe("a\nb\nC");
    expect(out("item10\nitem9\nitem1", { sort: "natural" })).toBe("item1\nitem9\nitem10");
    expect(out("item10\nitem9\nitem1", { sort: "alpha" })).toBe("item1\nitem10\nitem9");
    expect(out("10\n-2\nx\n3.5\n1e2", { sort: "numeric" })).toBe("-2\n3.5\n10\n1e2\nx");
    expect(out("ccc\na\nbb\n👍👍", { sort: "length" })).toBe("a\nbb\n👍👍\nccc");
  });

  it("sorts in descending order and keeps equal items stable", () => {
    expect(out("a\nc\nb", { sort: "alpha", descending: true })).toBe("c\nb\na");
    expect(out("bb\naa\nc", { sort: "length" })).toBe("c\nbb\naa");
  });

  it("reverses without sorting", () => {
    expect(out(list, { reverse: true }).split("\n")[0]).toBe("9 items");
  });
});

describe("duplicates", () => {
  it("removes duplicates keeping the first occurrence", () => {
    const result = run("b\na\nb\nA\na", { dedupe: true });
    expect(result.output).toBe("b\na\nA");
    expect(result.stats.removedDuplicates).toBe(2);
  });

  it("can ignore case and treats composed and decomposed accents as equal", () => {
    expect(out("Apple\napple\nAPPLE", { dedupe: true, ignoreCase: true })).toBe("Apple");
    expect(out("café\ncafé", { dedupe: true })).toBe("café");
  });
});

describe("case, truncation, prefix and suffix", () => {
  it("changes case", () => {
    expect(out("hello world\nFOO", { caseMode: "upper" })).toBe("HELLO WORLD\nFOO");
    expect(out("hello world", { caseMode: "title" })).toBe("Hello World");
  });

  it("truncates items without splitting emoji", () => {
    const result = run("abcdef\nab\n👍🏽👍🏽👍🏽", { maxLength: 2 });
    expect(result.output).toBe("ab\nab\n👍🏽👍🏽");
    expect(result.stats.truncated).toBe(2);
  });

  it("keeps the first N rows", () => {
    expect(out("a\nb\nc", { limit: 2 })).toBe("a\nb");
    expect(out("a\nb\nc", { limit: 0 })).toBe("");
  });

  it("adds a prefix and suffix to every item", () => {
    expect(out("a\nb", { prefix: "'", suffix: "'," })).toBe("'a',\n'b',");
  });
});

describe("separators", () => {
  it("splits and joins with other separators", () => {
    expect(out("a,b,c", { separator: "comma", output: "newline" })).toBe("a\nb\nc");
    expect(out("a\nb\nc", { output: "comma-space" })).toBe("a, b, c");
    expect(out("a  b c", { separator: "space", output: "semicolon" })).toBe("a;b;c");
    expect(out("a::b", { separator: "custom", customSeparator: "::", output: "custom", customOutput: " | " })).toBe("a | b");
  });

  it("builds a SQL IN list", () => {
    expect(out("1\n2\n3", { prefix: "'", suffix: "'", output: "comma-space" })).toBe("'1', '2', '3'");
  });
});

describe("columns", () => {
  const table = "name\tage\nLin\t31\nAda\t36";

  it("sorts rows by a column", () => {
    expect(out("Lin\t31\nAda\t36\nBo\t5", { mode: "columns", sort: "numeric", sortColumn: 2 })).toBe("Bo\t5\nLin\t31\nAda\t36");
  });

  it("transposes rows and columns", () => {
    expect(out(table, { mode: "columns", transpose: true })).toBe("name\tLin\tAda\nage\t31\t36");
  });

  it("pads ragged rows when transposing and warns", () => {
    const result = run("a,b,c\nd", { mode: "columns", delimiter: "comma", transpose: true });
    expect(result.output).toBe("a,d\nb,\nc,");
    expect(result.warnings[0]).toMatch(/different numbers of columns/);
  });

  it("applies case and truncation to each cell", () => {
    expect(out("abc;def", { mode: "columns", delimiter: "semicolon", caseMode: "upper", maxLength: 2 })).toBe("AB;DE");
  });
});

describe("validation and performance", () => {
  it("rejects invalid numeric options", () => {
    expect(processList("a", { ...defaultListOptions, limit: -1 }).ok).toBe(false);
    expect(processList("a", { ...defaultListOptions, maxLength: 0 }).ok).toBe(false);
    expect(processList("a", { ...defaultListOptions, separator: "custom", customSeparator: "" }).ok).toBe(false);
  });

  it("handles empty input", () => {
    expect(run("").stats.outputRows).toBe(0);
  });

  it("processes 200,000 lines quickly", () => {
    const input = Array.from({ length: 200_000 }, (_, i) => `item ${(i * 7919) % 100_000}`).join("\n");
    const start = performance.now();
    const result = run(input, { dedupe: true, sort: "natural", trim: true });
    expect(result.stats.outputRows).toBe(100_000);
    expect(performance.now() - start).toBeLessThan(3000);
  });
});
