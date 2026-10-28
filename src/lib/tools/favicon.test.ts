import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { DEFAULT_OPTIONS, buildIco, buildZip, checkColors, checkText, crc32, drawIcon, graphemes, headHtml, manifestJson, pngSize } from "@/lib/tools/favicon";

/** A minimal valid PNG of the given size (one opaque white pixel row repeated). */
function png(width: number, height: number): Uint8Array {
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    out.set(new TextEncoder().encode(type), 4);
    out.set(data, 8);
    view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const raw = new Uint8Array(height * (1 + width * 4)).fill(255);
  for (let y = 0; y < height; y++) raw[y * (1 + width * 4)] = 0;
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", new Uint8Array())];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

describe("text and colors", () => {
  it("counts emoji with modifiers as one character", () => {
    expect(graphemes("👩🏽‍💻A")).toHaveLength(2);
    expect(checkText("👨‍👩‍👧‍👦")).toBeNull();
    expect(checkText("AB")).toBeNull();
  });

  it("rejects empty, long and control text", () => {
    expect(checkText("  ")).toMatch(/Enter/);
    expect(checkText("ABCD")).toMatch(/at most 3/);
    expect(checkText("A\u0007")).toMatch(/control/);
  });

  it("normalizes colors", () => {
    expect(checkColors("#FFF", "rgb(31 79 224)")).toEqual({ ok: true, foreground: "#ffffff", background: "#1f4fe0" });
    expect(checkColors("nope", "#000")).toMatchObject({ ok: false, error: expect.stringContaining("Text color") });
  });
});

describe("crc32", () => {
  it("matches the standard check value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe("ICO", () => {
  it("reads PNG sizes", () => {
    expect(pngSize(png(16, 8))).toEqual({ width: 16, height: 8 });
    expect(pngSize(new Uint8Array(30))).toBeNull();
  });

  it("writes an ICONDIR with one entry per PNG", () => {
    const images = [png(16, 16), png(32, 32), png(256, 256)];
    const ico = buildIco(images);
    const view = new DataView(ico.buffer);
    expect([view.getUint16(0, true), view.getUint16(2, true), view.getUint16(4, true)]).toEqual([0, 1, 3]);
    let expectedOffset = 6 + 16 * 3;
    images.forEach((image, i) => {
      const e = 6 + 16 * i;
      const size = pngSize(image)!.width;
      expect(ico[e]).toBe(size === 256 ? 0 : size);
      expect(ico[e + 1]).toBe(size === 256 ? 0 : size);
      expect(view.getUint16(e + 4, true)).toBe(1);
      expect(view.getUint16(e + 6, true)).toBe(32);
      expect(view.getUint32(e + 8, true)).toBe(image.length);
      expect(view.getUint32(e + 12, true)).toBe(expectedOffset);
      expect(ico.subarray(expectedOffset, expectedOffset + image.length)).toEqual(image);
      expectedOffset += image.length;
    });
    expect(ico.length).toBe(expectedOffset);
  });

  it("rejects non-PNG, oversized and empty input", () => {
    expect(() => buildIco([])).toThrow(RangeError);
    expect(() => buildIco([new Uint8Array(40)])).toThrow(TypeError);
    expect(() => buildIco([png(257, 1)])).toThrow(RangeError);
  });
});

describe("ZIP", () => {
  it("stores files with correct headers, CRCs and a central directory", () => {
    const files = [
      { name: "a.txt", data: new TextEncoder().encode("hello") },
      { name: "ü/b.bin", data: new Uint8Array([0, 1, 2, 255]) },
    ];
    const zip = buildZip(files, new Date(2026, 9, 28, 13, 45, 30));
    const view = new DataView(zip.buffer);
    const decoder = new TextDecoder();
    // End of central directory record.
    const eocd = zip.length - 22;
    expect(view.getUint32(eocd, true)).toBe(0x06054b50);
    expect(view.getUint16(eocd + 10, true)).toBe(2);
    let central = view.getUint32(eocd + 16, true);
    expect(central + view.getUint32(eocd + 12, true)).toBe(eocd);
    for (const file of files) {
      expect(view.getUint32(central, true)).toBe(0x02014b50);
      expect(view.getUint16(central + 8, true)).toBe(0x0800);
      const nameLength = view.getUint16(central + 28, true);
      expect(decoder.decode(zip.subarray(central + 46, central + 46 + nameLength))).toBe(file.name);
      expect(view.getUint32(central + 16, true)).toBe(crc32(file.data));
      // DOS date and time: 2026-10-28 13:45:30.
      expect(view.getUint16(central + 14, true)).toBe(((2026 - 1980) << 9) | (10 << 5) | 28);
      expect(view.getUint16(central + 12, true)).toBe((13 << 11) | (45 << 5) | 15);
      const local = view.getUint32(central + 42, true);
      expect(view.getUint32(local, true)).toBe(0x04034b50);
      expect(view.getUint16(local + 8, true)).toBe(0);
      const localName = view.getUint16(local + 26, true);
      const start = local + 30 + localName;
      expect(zip.subarray(start, start + file.data.length)).toEqual(file.data);
      central += 46 + nameLength;
    }
  });

  it("writes an empty archive", () => {
    const zip = buildZip([]);
    expect(zip.length).toBe(22);
    expect(new DataView(zip.buffer).getUint32(0, true)).toBe(0x06054b50);
  });
});

describe("markup", () => {
  it("builds the manifest and head HTML", () => {
    const manifest = JSON.parse(manifestJson({ name: "My Application Name Here", themeColor: "#1f4fe0", backgroundColor: "#ffffff" }));
    expect(manifest.short_name).toBe("My Applicati");
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(["192x192", "512x512"]);
    expect(JSON.parse(manifestJson({ name: " ", themeColor: "#000000", backgroundColor: "#000000" }))).not.toHaveProperty("name");
    const html = headHtml('#000"><script>');
    expect(html).toContain('<link rel="icon" href="/favicon.ico" sizes="48x48">');
    expect(html).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">');
    expect(html).not.toContain("<script>");
  });
});

describe("drawIcon", () => {
  /** A fake 2D context that records calls. */
  function recorder() {
    const calls: string[] = [];
    const ctx = new Proxy(
      { font: "", fillStyle: "", textAlign: "start", textBaseline: "alphabetic", imageSmoothingQuality: "low" } as Record<string, unknown>,
      {
        get(target, prop: string) {
          if (prop in target) return target[prop];
          return (...args: unknown[]) => {
            calls.push(`${prop}(${args.filter((a) => typeof a !== "object").map((a) => (typeof a === "number" ? Math.round(a) : a)).join(",")})`);
            return prop === "measureText" ? { width: 60, actualBoundingBoxAscent: 70, actualBoundingBoxDescent: 0 } : undefined;
          };
        },
        set(target, prop: string, value) {
          target[prop] = value;
          calls.push(`${prop}=${value}`);
          return true;
        },
      },
    );
    return { ctx: ctx as unknown as Parameters<typeof drawIcon>[0], calls };
  }

  it("fills the shape and centers text scaled to the padded area", () => {
    const { ctx, calls } = recorder();
    drawIcon(ctx, 32, DEFAULT_OPTIONS, { kind: "text" });
    expect(calls).toContain("roundRect(0,0,32,32,6)");
    expect(calls).toContain("fillStyle=#1f4fe0");
    expect(calls).toContain("fillStyle=#ffffff");
    expect(calls.some((c) => c.startsWith("fillText(D,16,"))).toBe(true);
  });

  it("skips the background when transparent and fits images", () => {
    const { ctx, calls } = recorder();
    drawIcon(ctx, 100, { ...DEFAULT_OPTIONS, transparent: true, shape: "circle", padding: 0 }, { kind: "image", image: {} as CanvasImageSource, width: 200, height: 100, fit: "contain" });
    expect(calls).not.toContain("fillStyle=#1f4fe0");
    expect(calls).toContain("arc(50,50,50,0,6)");
    expect(calls).toContain("drawImage(0,25,100,50)");
  });
});
