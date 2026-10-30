import { describe, expect, it } from "vitest";
import { FREE_NOTE, pageMetadata, withFreeNote } from "@/lib/metadata";

describe("withFreeNote", () => {
  it("adds the note when the description still fits in a search snippet", () => {
    expect(withFreeNote("Convert px to rem.")).toBe(`Convert px to rem. ${FREE_NOTE}`);
  });

  it("leaves long descriptions and those that already mention it unchanged", () => {
    const long = "x".repeat(150);
    expect(withFreeNote(long)).toBe(long);
    expect(withFreeNote(long, Infinity)).toBe(`${long} ${FREE_NOTE}`);
    expect(withFreeNote("A free JSON formatter.")).toBe("A free JSON formatter.");
  });
});

describe("pageMetadata", () => {
  it("uses the description for sharing unless a social description is given", () => {
    const base = { title: "T", description: "Snippet.", path: "/x" };
    expect(pageMetadata(base).openGraph?.description).toBe("Snippet.");
    const shared = pageMetadata({ ...base, socialDescription: "Shared." });
    expect(shared.description).toBe("Snippet.");
    expect(shared.openGraph?.description).toBe("Shared.");
    expect(shared.twitter?.description).toBe("Shared.");
  });
});
