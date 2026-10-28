// @vitest-environment jsdom
import DOMPurify from "dompurify";
import { describe, expect, it } from "vitest";
import { MAX_OUTPUT_SIDE, SAMPLE_SVG, createSvgSanitizer, inspectSvg, lengthToPx, outputSize, parseViewBox, sanitizeSvg, withPixelSize } from "@/lib/tools/svg-png";

const purify = createSvgSanitizer(DOMPurify, window);
const clean = (svg: string) => sanitizeSvg(svg, purify).svg;
const info = (svg: string) => {
  const r = inspectSvg(svg, window);
  if (!r.ok) throw new Error(r.error);
  return r.info;
};
const NS = 'xmlns="http://www.w3.org/2000/svg"';

describe("lengths and viewBox", () => {
  it("converts absolute units to CSS pixels", () => {
    expect(lengthToPx("24")).toBe(24);
    expect(lengthToPx(" 24px ")).toBe(24);
    expect(lengthToPx("1in")).toBe(96);
    expect(lengthToPx("72pt")).toBe(96);
    expect(lengthToPx("25.4mm")).toBeCloseTo(96);
    expect(lengthToPx("100%")).toBeNull();
    expect(lengthToPx("2em")).toBeNull();
    expect(lengthToPx("0")).toBeNull();
    expect(lengthToPx(null)).toBeNull();
  });

  it("parses viewBox with spaces or commas", () => {
    expect(parseViewBox("0 0 24 12")).toEqual({ x: 0, y: 0, width: 24, height: 12 });
    expect(parseViewBox("-5,-5,10,10")).toEqual({ x: -5, y: -5, width: 10, height: 10 });
    expect(parseViewBox("0 0 0 10")).toBeNull();
    expect(parseViewBox("0 0 10")).toBeNull();
  });
});

describe("inspectSvg", () => {
  it("uses width and height when given", () => {
    expect(info(`<svg ${NS} width="64" height="32"/>`)).toMatchObject({ width: 64, height: 32, source: "attributes" });
  });

  it("falls back to the viewBox, or follows its ratio for one missing side", () => {
    expect(info(`<svg ${NS} viewBox="0 0 24 12"/>`)).toMatchObject({ width: 24, height: 12, source: "viewBox" });
    expect(info(`<svg ${NS} width="48" viewBox="0 0 24 12"/>`)).toMatchObject({ width: 48, height: 24 });
    expect(info(`<svg ${NS} width="100%" height="100%" viewBox="0 0 10 20"/>`)).toMatchObject({ width: 10, height: 20, source: "viewBox" });
  });

  it("uses the CSS default size without either", () => {
    expect(info(`<svg ${NS}/>`)).toMatchObject({ width: 300, height: 150, source: "default" });
  });

  it("rejects empty, malformed, non-SVG and oversized input", () => {
    expect(inspectSvg("  ", window)).toMatchObject({ ok: false, error: expect.stringContaining("Paste SVG") });
    expect(inspectSvg(`<svg ${NS}><g></svg>`, window)).toMatchObject({ ok: false, error: expect.stringContaining("not well-formed") });
    expect(inspectSvg("<html/>", window)).toMatchObject({ ok: false, error: expect.stringContaining("root element") });
    expect(inspectSvg("<svg/>", window)).toMatchObject({ ok: false, error: expect.stringContaining("xmlns") });
    expect(inspectSvg(`<svg ${NS}>${"x".repeat(5 * 1024 * 1024)}</svg>`, window)).toMatchObject({ ok: false, error: expect.stringContaining("larger than 5 MB") });
  });
});

describe("sanitizeSvg", () => {
  it("keeps ordinary drawing, gradients and fragment references", () => {
    const out = clean(SAMPLE_SVG);
    expect(out).toContain("linearGradient");
    expect(out).toContain('fill="url(#g)"');
    expect(clean(`<svg ${NS}><symbol id="s"/><use href="#s"/></svg>`)).toContain('href="#s"');
  });

  it("removes scripts, event handlers and foreignObject", () => {
    const out = clean(`<svg ${NS} onload="alert(1)"><script>alert(2)</script><rect onclick="x()"/><foreignObject><div>hi</div></foreignObject><a href="javascript:alert(3)"><text>t</text></a></svg>`);
    expect(out).not.toMatch(/script|onload|onclick|foreignObject|javascript/i);
    expect(out).toContain("<rect");
  });

  it("drops every external resource reference", () => {
    const out = clean(
      `<svg ${NS} xmlns:xlink="http://www.w3.org/1999/xlink"><image href="https://evil.example/a.png"/><image xlink:href="//evil.example/b.png"/><use href="https://evil.example/s.svg#x"/><rect style="fill:url(https://evil.example/p)"/><style>@import url(https://evil.example/c.css); rect { fill: url("https://evil.example/f") } circle { fill: url(#ok) }</style></svg>`,
    );
    expect(out).not.toContain("evil.example");
    expect(out).toContain("url(#ok)");
  });

  it("keeps raster data: images but not SVG or HTML data URIs", () => {
    expect(clean(`<svg ${NS}><image href="data:image/png;base64,iVBORw0KGgo="/></svg>`)).toContain("data:image/png");
    expect(clean(`<svg ${NS}><image href="data:image/svg+xml,&lt;svg/&gt;"/></svg>`)).not.toContain("data:");
    expect(clean(`<svg ${NS}><image href="data:text/html,hi"/></svg>`)).not.toContain("data:");
  });

  it("counts what was removed", () => {
    expect(sanitizeSvg(`<svg ${NS}><script/></svg>`, purify).removed).toBeGreaterThan(0);
    expect(sanitizeSvg(SAMPLE_SVG, purify).removed).toBe(0);
  });
});

describe("outputSize", () => {
  const base = { width: 120, height: 60 };
  it("scales and keeps the aspect ratio", () => {
    expect(outputSize(base, { mode: "scale", scale: 2, width: 0, height: 0 })).toEqual({ ok: true, width: 240, height: 120 });
    expect(outputSize(base, { mode: "width", scale: 1, width: 1000, height: 0 })).toEqual({ ok: true, width: 1000, height: 500 });
    expect(outputSize(base, { mode: "height", scale: 1, width: 0, height: 33 })).toEqual({ ok: true, width: 66, height: 33 });
    expect(outputSize(base, { mode: "custom", scale: 1, width: 64, height: 64 })).toEqual({ ok: true, width: 64, height: 64 });
    expect(outputSize({ width: 1, height: 1000 }, { mode: "scale", scale: 0.1, width: 0, height: 0 })).toEqual({ ok: true, width: 1, height: 100 });
  });

  it("rejects bad values and caps the size", () => {
    expect(outputSize(base, { mode: "scale", scale: 0, width: 0, height: 0 })).toMatchObject({ ok: false });
    expect(outputSize(base, { mode: "scale", scale: 17, width: 0, height: 0 })).toMatchObject({ ok: false });
    expect(outputSize(base, { mode: "width", scale: 1, width: Number.NaN, height: 0 })).toMatchObject({ ok: false, error: expect.stringContaining("width") });
    expect(outputSize(base, { mode: "custom", scale: 1, width: 10, height: -1 })).toMatchObject({ ok: false, error: expect.stringContaining("height") });
    expect(outputSize(base, { mode: "width", scale: 1, width: MAX_OUTPUT_SIDE + 1, height: 0 })).toMatchObject({ ok: false, error: expect.stringContaining("at most 8,192") });
    expect(outputSize(base, { mode: "width", scale: 1, width: 8000, height: 0 })).toMatchObject({ ok: false, error: expect.stringContaining("megapixels") });
  });
});

describe("withPixelSize", () => {
  it("sets the pixel size and adds a viewBox when missing", () => {
    const svg = `<svg ${NS} width="10" height="5"><rect width="10" height="5"/></svg>`;
    const out = withPixelSize(svg, info(svg), 100, 50, window);
    const root = new DOMParser().parseFromString(out, "image/svg+xml").documentElement;
    expect(root.getAttribute("width")).toBe("100");
    expect(root.getAttribute("height")).toBe("50");
    expect(root.getAttribute("viewBox")).toBe("0 0 10 5");
  });

  it("keeps an existing viewBox", () => {
    const svg = `<svg ${NS} viewBox="-1 -1 2 2"/>`;
    expect(withPixelSize(svg, info(svg), 64, 64, window)).toContain('viewBox="-1 -1 2 2"');
  });
});
