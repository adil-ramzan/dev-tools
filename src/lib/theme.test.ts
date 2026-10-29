import { describe, expect, it } from "vitest";
import { oppositeTheme, parseResolvedTheme, parseThemePreference, themeInitScript } from "@/lib/theme";

describe("theme preferences", () => {
  it("reads stored preferences, treating anything else as system", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("system")).toBe("system");
    expect(parseThemePreference("Dark")).toBe("system");
    expect(parseThemePreference(null)).toBe("system");
    expect(parseResolvedTheme("dark")).toBe("dark");
    expect(parseResolvedTheme("light")).toBe("light");
    expect(parseResolvedTheme(undefined)).toBe("light");
  });

  it("switches between exactly two themes, light and dark", () => {
    expect(oppositeTheme("light")).toBe("dark");
    expect(oppositeTheme("dark")).toBe("light");
    expect(oppositeTheme(oppositeTheme("light"))).toBe("light");
  });
});

describe("theme init script", () => {
  function run(stored: string | null, systemDark: boolean, { storageThrows = false } = {}) {
    const dataset: Record<string, string> = {};
    const env = {
      document: { documentElement: { dataset } },
      localStorage: {
        getItem: () => {
          if (storageThrows) throw new Error("blocked");
          return stored;
        },
      },
      window: { matchMedia: () => ({ matches: systemDark }) },
    };
    new Function("document", "localStorage", "window", themeInitScript)(env.document, env.localStorage, env.window);
    return dataset;
  }

  it("applies the stored choice before paint", () => {
    expect(run("dark", false)).toEqual({ theme: "dark", themePreference: "dark" });
    expect(run("light", true)).toEqual({ theme: "light", themePreference: "light" });
  });

  it("follows the system without a valid stored choice or storage", () => {
    expect(run(null, true)).toEqual({ theme: "dark", themePreference: "system" });
    expect(run("purple", false)).toEqual({ theme: "light", themePreference: "system" });
    expect(run("dark", true, { storageThrows: true })).toEqual({ theme: "dark", themePreference: "system" });
  });
});
