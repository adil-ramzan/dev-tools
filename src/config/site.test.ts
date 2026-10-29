import { describe, expect, it } from "vitest";
import { PRODUCTION_SITE_URL, resolveSiteUrl } from "@/config/site";

describe("resolveSiteUrl", () => {
  it("uses the production address in production builds when the variable is unset", () => {
    expect(resolveSiteUrl(undefined, "production")).toBe(PRODUCTION_SITE_URL);
    expect(resolveSiteUrl("  ", "production")).toBe(PRODUCTION_SITE_URL);
    expect(PRODUCTION_SITE_URL).toBe("https://dev-tools.emadilramzan.workers.dev");
  });

  it("uses localhost only outside production builds", () => {
    expect(resolveSiteUrl(undefined, "development")).toBe("http://localhost:3000");
    expect(resolveSiteUrl("http://localhost:3000", "development")).toBe("http://localhost:3000");
  });

  it("normalizes a configured origin to have no trailing slash", () => {
    expect(resolveSiteUrl("https://Example.com/", "production")).toBe("https://example.com");
    expect(resolveSiteUrl(" https://tools.example.org ", "production")).toBe("https://tools.example.org");
  });

  it("rejects localhost and plain HTTP in production builds", () => {
    for (const value of ["http://localhost:3000", "https://localhost", "https://127.0.0.1", "http://example.com"]) {
      expect(() => resolveSiteUrl(value, "production"), value).toThrow(/public https/);
    }
  });

  it("rejects malformed URLs and URLs with a path, query or fragment", () => {
    expect(() => resolveSiteUrl("example.com", "production")).toThrow(/not a valid URL/);
    for (const value of ["https://example.com/tools", "https://example.com/?a=1", "https://example.com/#x", "https://user@example.com"]) {
      expect(() => resolveSiteUrl(value, "production"), value).toThrow(/origin only/);
    }
  });
});
