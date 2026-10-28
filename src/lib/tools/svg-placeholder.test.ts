// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildPlaceholder, escapeXml, svgDataUri, type PlaceholderOptions } from "@/lib/tools/svg-placeholder";

const base: PlaceholderOptions = { width: 600, height: 400, background: "#e2e8f0", foreground: "#475569", text: "", fontSize: 0, font: "sans" };
const svgOf = (options: Partial<PlaceholderOptions>) => {
  const result = buildPlaceholder({ ...base, ...options });
  if (!result.ok) throw new Error(result.error);
  return result;
};
const parse = (svg: string) => new DOMParser().parseFromString(svg, "image/svg+xml");

describe("buildPlaceholder", () => {
  it("builds a well-formed SVG with the dimensions as the default label", () => {
    const { svg, label } = svgOf({});
    expect(label).toBe("600×400");
    const doc = parse(svg);
    expect(doc.querySelector("parsererror")).toBeNull();
    const root = doc.documentElement;
    expect(root.getAttribute("width")).toBe("600");
    expect(root.getAttribute("viewBox")).toBe("0 0 600 400");
    expect(doc.querySelector("rect")?.getAttribute("fill")).toBe("#e2e8f0");
    expect(doc.querySelector("text")?.textContent).toBe("600×400");
  });

  it("escapes text so it can never become markup", () => {
    const evil = `</text><script>alert(1)</script><image href="https://evil.test/x" onload="alert(2)"/>&"'`;
    const { svg } = svgOf({ text: evil });
    const doc = parse(svg);
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.querySelectorAll("script, image")).toHaveLength(0);
    expect(doc.querySelector("text")?.textContent).toBe(evil);
    expect(doc.documentElement.getAttribute("aria-label")).toBe(evil);
    expect(doc.querySelectorAll("*")).toHaveLength(3);
  });

  it("normalizes colors and rejects anything that is not a color", () => {
    expect(svgOf({ background: "rgb(255, 0, 0)", foreground: "#FFF" }).svg).toContain('fill="#ff0000"');
    expect(buildPlaceholder({ ...base, background: 'red" onload="alert(1)' })).toMatchObject({ ok: false, field: "background" });
    expect(buildPlaceholder({ ...base, foreground: "url(#x)" })).toMatchObject({ ok: false, field: "foreground" });
  });

  it("validates dimensions", () => {
    expect(buildPlaceholder({ ...base, width: 0 })).toMatchObject({ ok: false, field: "width" });
    expect(buildPlaceholder({ ...base, height: 4001 })).toMatchObject({ ok: false, field: "height" });
    expect(buildPlaceholder({ ...base, width: 10.5 })).toMatchObject({ ok: false, field: "width" });
    expect(buildPlaceholder({ ...base, width: Number.NaN })).toMatchObject({ ok: false, field: "width" });
    expect(svgOf({ width: 1, height: 1 }).label).toBe("1×1");
    expect(svgOf({ width: 4000, height: 4000 }).label).toBe("4000×4000");
  });

  it("validates text and font size", () => {
    expect(buildPlaceholder({ ...base, text: "x".repeat(201) })).toMatchObject({ ok: false, field: "text" });
    expect(buildPlaceholder({ ...base, text: "a\u0000b" })).toMatchObject({ ok: false, field: "text" });
    expect(buildPlaceholder({ ...base, fontSize: -1 })).toMatchObject({ ok: false, field: "fontSize" });
    expect(svgOf({ fontSize: 48 }).svg).toContain('font-size="48"');
  });

  it("fits automatic font sizes to the image", () => {
    const size = (o: Partial<PlaceholderOptions>) => Number(/font-size="(\d+)"/.exec(svgOf(o).svg)![1]);
    expect(size({ width: 600, height: 400 })).toBeLessThanOrEqual(100);
    expect(size({ width: 100, height: 1000, text: "A long label here" })).toBeLessThan(10);
    expect(size({ width: 1, height: 1 })).toBe(1);
  });

  it("supports Unicode text", () => {
    expect(parse(svgOf({ text: "Grüße 👋 日本" }).svg).querySelector("text")?.textContent).toBe("Grüße 👋 日本");
  });
});

describe("helpers", () => {
  it("escapes all five XML special characters", () => {
    expect(escapeXml(`<a href="x">&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;");
  });

  it("makes a data URI that decodes back to the SVG", () => {
    const { svg } = svgOf({ text: "50% #1 (test)" });
    const uri = svgDataUri(svg);
    expect(uri).toMatch(/^data:image\/svg\+xml,/);
    // Characters that break URLs or CSS url() are encoded.
    expect(uri.slice("data:image/svg+xml,".length)).not.toMatch(/[<>#"()]/);
    expect(decodeURIComponent(uri.slice("data:image/svg+xml,".length))).toBe(svg.replace(/"/g, "'"));
  });
});
