import { describe, expect, it } from "vitest";
import { categories } from "@/content/categories";
import { availableTools, tools } from "@/content/tools";
import { buildIndex, highlight, isEditableTarget, normalize, queryTerms, searchShortcut, searchTools, searchableTools, type SearchableTool } from "@/lib/search";
import type { ToolDefinition } from "@/types/tool";

const index = buildIndex(searchableTools(tools, categories));
const slugs = (query: string) => searchTools(query, index).map((r) => r.slug);

describe("normalize and terms", () => {
  it("lowercases, removes accents and splits on punctuation", () => {
    expect(normalize("Café — JSON/YAML")).toBe("cafe json yaml");
    expect(normalize("Node.js, C# & C++.")).toBe("node.js c# c++");
    expect(queryTerms("  json   JSON  formatter ")).toEqual(["json", "formatter"]);
    expect(queryTerms("   ")).toEqual([]);
    expect(queryTerms("x".repeat(500))[0]).toHaveLength(100);
  });
});

describe("searching the registry", () => {
  it("matches by name and ranks the name match first", () => {
    expect(slugs("json formatter")[0]).toBe("json-formatter");
    expect(slugs("uuid")[0]).toBe("uuid-generator");
    expect(slugs("Regex")[0]).toBe("regex-tester");
  });

  it("matches by keyword", () => {
    // "epoch" appears only in the Unix Timestamp Converter's keywords.
    expect(slugs("epoch")).toContain("unix-timestamp-converter");
    expect(slugs("guid")[0]).toBe("uuid-generator");
    expect(slugs("netmask")).toContain("ipv4-subnet-calculator");
  });

  it("matches by category name", () => {
    const networking = availableTools.filter((t) => t.category === "networking").map((t) => t.slug);
    const found = slugs("networking");
    for (const slug of networking) expect(found).toContain(slug);
    expect(slugs("cryptography")).toContain("bcrypt-hash-verify");
  });

  it("matches by description", () => {
    // Category intros are not searched: "checksums" appears only in the Generators intro.
    expect(slugs("syntax error")).toContain("json-formatter");
    expect(slugs("checksums")).toEqual([]);
  });

  it("requires every word to match and ignores word order and case", () => {
    expect(slugs("CONVERTER base")).toContain("integer-base-converter");
    expect(slugs("json zebra")).toEqual([]);
  });

  it("returns nothing for empty or unmatched queries", () => {
    expect(searchTools("", index)).toEqual([]);
    expect(searchTools("   ", index)).toEqual([]);
    expect(searchTools("qwertyzzz", index)).toEqual([]);
  });

  it("never returns planned tools", () => {
    const planned: ToolDefinition = { slug: "secret-planned", name: "Planned JSON Thing", description: "Not ready.", category: "converters", status: "planned", icon: "braces" };
    const withPlanned = buildIndex(searchableTools([...tools, planned], categories));
    expect(searchTools("planned json thing", withPlanned)).toEqual([]);
    expect(searchTools("json", withPlanned).map((r) => r.slug)).not.toContain("secret-planned");
  });

  it("keeps registry order for equal scores", () => {
    const sample: SearchableTool[] = [
      { slug: "b", name: "Beta tool", description: "", category: "X", keywords: [] },
      { slug: "a", name: "Alpha tool", description: "", category: "X", keywords: [] },
    ];
    expect(searchTools("tool", buildIndex(sample)).map((r) => r.slug)).toEqual(["b", "a"]);
  });

  it("is fast enough to run on every keystroke", () => {
    const start = performance.now();
    for (let i = 0; i < 200; i++) searchTools(["j", "js", "jso", "json f", "conv"][i % 5], index);
    expect((performance.now() - start) / 200).toBeLessThan(5);
  });
});

describe("highlight", () => {
  const marked = (text: string, query: string) => highlight(text, query).filter((p) => p.match).map((p) => p.text);

  it("marks query words at word starts, keeping the original text", () => {
    expect(marked("JSON Formatter & Validator", "json val")).toEqual(["JSON", "Val"]);
    expect(highlight("JSON Formatter", "form").map((p) => p.text).join("")).toBe("JSON Formatter");
    expect(marked("Café Tools", "cafe")).toEqual(["Café"]);
  });

  it("does not mark matches inside words or for empty queries", () => {
    expect(marked("Base64 Encoder", "code")).toEqual([]);
    expect(highlight("Base64", "")).toEqual([{ text: "Base64", match: false }]);
  });
});

describe("shortcuts", () => {
  const key = (k: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean; defaultPrevented: boolean; isComposing: boolean }> = {}) => ({
    key: k,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...mods,
  });
  const el = (tagName: string, extra: Partial<{ type: string; isContentEditable: boolean; inside: string }> = {}) => ({
    tagName,
    type: extra.type,
    isContentEditable: extra.isContentEditable ?? false,
    closest: (selector: string) => (extra.inside && selector.includes(extra.inside) ? {} : null),
  });

  it("knows which elements take typing", () => {
    expect(isEditableTarget(el("TEXTAREA"))).toBe(true);
    expect(isEditableTarget(el("INPUT", { type: "text" }))).toBe(true);
    expect(isEditableTarget(el("INPUT", { type: "number" }))).toBe(true);
    expect(isEditableTarget(el("SELECT"))).toBe(true);
    expect(isEditableTarget(el("DIV", { isContentEditable: true }))).toBe(true);
    expect(isEditableTarget(el("DIV", { inside: '[role="application"]' }))).toBe(true);
    expect(isEditableTarget(el("INPUT", { type: "checkbox" }))).toBe(false);
    expect(isEditableTarget(el("BUTTON"))).toBe(false);
    expect(isEditableTarget(el("BODY"))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });

  it("takes / only outside text fields", () => {
    expect(searchShortcut(key("/"), el("BODY"), false)).toBe("slash");
    expect(searchShortcut(key("/"), el("BUTTON"), false)).toBe("slash");
    expect(searchShortcut(key("/"), el("TEXTAREA"), false)).toBeNull();
    expect(searchShortcut(key("/"), el("INPUT", { type: "text" }), false)).toBeNull();
    expect(searchShortcut(key("/", { ctrlKey: true }), el("BODY"), false)).toBeNull();
    expect(searchShortcut(key("/", { defaultPrevented: true }), el("BODY"), false)).toBeNull();
    expect(searchShortcut(key("/", { isComposing: true }), el("BODY"), false)).toBeNull();
  });

  it("takes Ctrl+K on Windows and Linux and ⌘+K on Mac, even in text fields", () => {
    expect(searchShortcut(key("k", { ctrlKey: true }), el("TEXTAREA"), false)).toBe("k");
    expect(searchShortcut(key("K", { ctrlKey: true }), el("BODY"), false)).toBe("k");
    expect(searchShortcut(key("k", { metaKey: true }), el("BODY"), false)).toBeNull();
    expect(searchShortcut(key("k", { metaKey: true }), el("INPUT"), true)).toBe("k");
    expect(searchShortcut(key("k", { ctrlKey: true }), el("BODY"), true)).toBeNull();
    expect(searchShortcut(key("k", { ctrlKey: true, shiftKey: true }), el("BODY"), false)).toBeNull();
    expect(searchShortcut(key("k", { ctrlKey: true }), el("DIV", { inside: '[role="application"]' }), false)).toBeNull();
  });

  it("never takes Ctrl/⌘+Enter or plain keys", () => {
    expect(searchShortcut(key("Enter", { ctrlKey: true }), el("TEXTAREA"), false)).toBeNull();
    expect(searchShortcut(key("Enter", { metaKey: true }), el("TEXTAREA"), true)).toBeNull();
    expect(searchShortcut(key("k"), el("BODY"), false)).toBeNull();
    expect(searchShortcut(key("s", { ctrlKey: true }), el("BODY"), false)).toBeNull();
  });
});
