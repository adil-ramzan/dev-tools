import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { categories } from "@/content/categories";
import { availableTools, tools } from "@/content/tools";

describe("tool registry", () => {
  it("lists all 64 tools as available, with unique slugs", () => {
    expect(tools).toHaveLength(64);
    expect(availableTools).toHaveLength(tools.length);
    expect(new Set(tools.map((t) => t.slug)).size).toBe(tools.length);
  });

  it("has a route for every tool and a tool for every route", () => {
    const routes = readdirSync("src/app/tools").filter((d) => statSync(join("src/app/tools", d)).isDirectory());
    expect(routes.sort()).toEqual(tools.map((t) => t.slug).sort());
    for (const tool of tools) expect(existsSync(join("src/app/tools", tool.slug, "page.tsx")), tool.slug).toBe(true);
  });

  it("puts every tool in a published category", () => {
    const slugs = new Set(categories.map((c) => c.slug));
    for (const tool of tools) expect(slugs.has(tool.category), tool.slug).toBe(true);
  });
});

describe("no reloads", () => {
  /** Every source file under a folder. */
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : /\.(tsx?|mjs)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
    });

  it("never reloads the page or the route to reset a tool", () => {
    for (const file of files("src")) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/location\.reload\s*\(|router\.refresh\s*\(|location\.(href|assign|replace)\s*[=(]/);
    }
  });
});
