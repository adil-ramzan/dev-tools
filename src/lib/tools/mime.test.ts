import db from "mime-db";
import { describe, expect, it } from "vitest";
import { COMMON_EXTENSIONS, buildIndex, extensionOf, loadMimeIndex, lookup, type LookupResult } from "@/lib/tools/mime";

const index = buildIndex(db);

function usual(query: string): string | undefined {
  const result = lookup(query, index);
  return result.kind === "extension" ? result.types[0]?.type : undefined;
}
const asType = (result: LookupResult) => (result.kind === "type" ? result : null);

describe("extension → type", () => {
  it("finds common types", () => {
    expect(usual("png")).toBe("image/png");
    expect(usual(".PDF")).toBe("application/pdf");
    expect(usual("*.json")).toBe("application/json");
    expect(usual("woff2")).toBe("font/woff2");
  });

  it("chooses the usual type when several share an extension", () => {
    expect(usual("js")).toBe("text/javascript");
    expect(usual("mp4")).toBe("video/mp4");
    expect(usual("mp3")).toBe("audio/mpeg");
    expect(usual("zip")).toBe("application/zip");
    expect(usual("xml")).toBe("application/xml");
    expect(usual("exe")).not.toBe("application/octet-stream");
  });

  it("lists every type for an extension", () => {
    const result = lookup("js", index);
    expect(result.kind === "extension" && result.types.map((t) => t.type)).toEqual(["text/javascript", "application/javascript"]);
  });

  it("reads the last extension of a file name or path", () => {
    expect(extensionOf("C:\\files\\Report.Final.DOCX")).toEqual({ extension: "docx", fromFileName: true });
    expect(extensionOf("archive.tar.gz")).toEqual({ extension: "gz", fromFileName: true });
    expect(extensionOf(".gitignore")).toEqual({ extension: "gitignore", fromFileName: false });
    expect(usual("photo.jpeg")).toBe("image/jpeg");
  });

  it("explains confusing extensions", () => {
    const ts = lookup("ts", index);
    expect(ts.kind === "extension" && ts.note).toMatch(/transport stream/);
    expect(usual("py")).toBe("text/x-python");
  });

  it("returns no types for unknown extensions", () => {
    const result = lookup("notarealext", index);
    expect(result.kind === "extension" && result.types).toEqual([]);
  });

  it("covers every extension in the common list", () => {
    for (const group of COMMON_EXTENSIONS) for (const ext of group.extensions) expect(usual(ext), ext).toBeTruthy();
  });
});

describe("type → extensions", () => {
  it("finds extensions for a type, ignoring case and parameters", () => {
    const result = asType(lookup("Text/HTML; charset=utf-8", index));
    expect(result?.info?.extensions).toEqual(["html", "htm", "shtml"]);
    expect(result?.parameters).toBe("charset=utf-8");
    expect(result?.info?.source).toBe("iana");
    expect(result?.info?.compressible).toBe(true);
  });

  it("suggests similar types when there is no exact match", () => {
    const result = asType(lookup("image/jpg", index));
    expect(result?.info).toBeNull();
    expect(result?.suggestions).toContain("image/jpeg");
  });

  it("reports types without extensions", () => {
    expect(asType(lookup("application/x-www-form-urlencoded", index))?.info?.extensions).toEqual([]);
  });
});

describe("validation", () => {
  it("rejects empty, overlong and invalid queries", () => {
    expect(lookup("", index).kind).toBe("error");
    expect(lookup("a".repeat(300), index).kind).toBe("error");
    expect(lookup("<script>", index).kind).toBe("error");
  });
});

describe("loadMimeIndex", () => {
  it("loads the dataset once", async () => {
    const a = await loadMimeIndex();
    expect(a.types.size).toBeGreaterThan(2000);
    expect(await loadMimeIndex()).toBe(a);
  });
});
