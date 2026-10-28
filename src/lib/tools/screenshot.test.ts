import { describe, expect, it } from "vitest";
import { DEFAULT_BEAUTIFY, checkOptions, drawScreenshot, frameBarHeight, gradientLine, layout, type BeautifyOptions } from "@/lib/tools/screenshot";
import { checkDimensions, checkImageFile } from "@/lib/image";

const options = (overrides: Partial<BeautifyOptions>): BeautifyOptions => ({ ...DEFAULT_BEAUTIFY, ...overrides });

describe("layout", () => {
  it("adds padding around the image at its own resolution", () => {
    const r = layout(800, 600, options({ padding: 50 }));
    expect(r).toEqual({ ok: true, layout: { width: 900, height: 700, bar: 0, window: { x: 50, y: 50, width: 800, height: 600 }, image: { x: 50, y: 50, width: 800, height: 600 } } });
  });

  it("adds a title bar for the browser frame", () => {
    const bar = frameBarHeight(1000);
    expect(bar).toBe(35);
    const r = layout(1000, 500, options({ padding: 0, frame: "dark" }));
    expect(r).toMatchObject({ ok: true, layout: { width: 1000, height: 535, window: { height: 535 }, image: { y: 35 } } });
    expect(frameBarHeight(100)).toBe(24);
    expect(frameBarHeight(10000)).toBe(96);
  });

  it("refuses results over the canvas limit", () => {
    expect(layout(4096, 4096, options({ padding: 10 }))).toMatchObject({ ok: false, error: expect.stringContaining("megapixel limit") });
    expect(layout(8000, 100, options({ padding: 200 }))).toMatchObject({ ok: false });
  });

  it("validates settings", () => {
    expect(checkOptions(DEFAULT_BEAUTIFY)).toBeNull();
    expect(checkOptions(options({ padding: -1 }))).toMatch(/Padding/);
    expect(checkOptions(options({ radius: 97 }))).toMatch(/Corner radius/);
    expect(checkOptions(options({ shadowOpacity: Number.NaN }))).toMatch(/Shadow opacity/);
    expect(checkOptions(options({ color2: "nope" }))).toMatch(/not a valid color/);
    expect(checkOptions(options({ background: "solid", color2: "nope" }))).toBeNull();
    expect(checkOptions(options({ background: "transparent", color1: "nope" }))).toBeNull();
  });
});

describe("gradientLine", () => {
  it("matches CSS gradient angles", () => {
    const round = (v: number[]) => v.map((n) => Math.round(n * 100) / 100 + 0);
    expect(round(gradientLine(90, 200, 100))).toEqual([0, 50, 200, 50]);
    expect(round(gradientLine(180, 200, 100))).toEqual([100, 0, 100, 100]);
    expect(round(gradientLine(0, 200, 100))).toEqual([100, 100, 100, 0]);
    // 45° on a square runs corner to corner.
    expect(round(gradientLine(45, 100, 100))).toEqual([0, 100, 100, 0]);
  });
});

describe("drawScreenshot", () => {
  function recorder() {
    const calls: string[] = [];
    const gradient = { addColorStop: (o: number, c: string) => calls.push(`stop(${o},${c})`) };
    const state: Record<string, unknown> = { fillStyle: "", shadowColor: "", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0, imageSmoothingQuality: "low" };
    const ctx = new Proxy(state, {
      get(target, prop: string) {
        if (prop in target) return target[prop];
        return (...args: unknown[]) => {
          calls.push(`${prop}(${args.filter((a) => typeof a !== "object").map((a) => (typeof a === "number" ? Math.round(a) : a)).join(",")})`);
          return prop === "createLinearGradient" ? gradient : undefined;
        };
      },
      set(target, prop: string, value) {
        target[prop] = value;
        if (typeof value !== "object") calls.push(`${prop}=${value}`);
        return true;
      },
    });
    return { ctx: ctx as unknown as Parameters<typeof drawScreenshot>[0], calls };
  }
  const image = {} as CanvasImageSource;

  it("draws the gradient, the shadow, the clipped window and the image at full size", () => {
    const { ctx, calls } = recorder();
    const r = layout(400, 300, DEFAULT_BEAUTIFY);
    if (!r.ok) throw new Error(r.error);
    drawScreenshot(ctx, image, r.layout, DEFAULT_BEAUTIFY);
    expect(calls).toContain("stop(0,#6366f1)");
    expect(calls).toContain("stop(1,#ec4899)");
    expect(calls).toContain("shadowColor=rgba(0, 0, 0, 0.35)");
    expect(calls).toContain("shadowBlur=48");
    expect(calls).toContain("roundRect(64,64,400,300,12)");
    expect(calls).toContain("clip()");
    expect(calls).toContain("drawImage(64,64,400,300)");
  });

  it("skips the background and shadow when off, and draws the frame dots", () => {
    const { ctx, calls } = recorder();
    const o = options({ background: "transparent", shadowOpacity: 0, frame: "light", radius: 96 });
    const r = layout(100, 60, o);
    if (!r.ok) throw new Error(r.error);
    drawScreenshot(ctx, image, r.layout, o);
    expect(calls.filter((c) => c.startsWith("fillRect(0,0"))).toHaveLength(0);
    expect(calls.some((c) => c.startsWith("shadowColor"))).toBe(false);
    expect(calls).toContain("fillStyle=#ff5f57");
    // The radius is capped at half the window's shorter side.
    expect(calls).toContain(`roundRect(64,64,100,${60 + r.layout.bar},${Math.round((60 + r.layout.bar) / 2)})`);
    expect(calls).toContain(`drawImage(64,${64 + r.layout.bar},100,60)`);
  });
});

describe("image file checks", () => {
  it("accepts common raster images and rejects others", () => {
    expect(checkImageFile({ name: "a.png", type: "image/png", size: 1000 })).toEqual({ ok: true });
    expect(checkImageFile({ name: "a", type: "", size: 1000 })).toEqual({ ok: true });
    expect(checkImageFile({ name: "a.svg", type: "image/svg+xml", size: 1000 })).toMatchObject({ ok: false, error: expect.stringContaining("not supported") });
    expect(checkImageFile({ name: "a.png", type: "image/png", size: 0 })).toMatchObject({ ok: false, error: expect.stringContaining("empty") });
    expect(checkImageFile({ name: "a.png", type: "image/png", size: 26 * 1024 * 1024 })).toMatchObject({ ok: false, error: expect.stringContaining("limit") });
  });

  it("limits decoded pixels", () => {
    expect(checkDimensions(4000, 3000)).toEqual({ ok: true });
    expect(checkDimensions(10000, 5000)).toMatchObject({ ok: false, error: expect.stringContaining("megapixels") });
    expect(checkDimensions(0, 10)).toMatchObject({ ok: false });
  });
});
