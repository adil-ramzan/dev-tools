import { beforeAll, describe, expect, it } from "vitest";
import { checkColors, checkRender, drawToCanvas, generateQr, loadQr, toSvg, utf8ByteString, type QrMatrix } from "@/lib/tools/qr";

let qrcode: Awaited<ReturnType<typeof loadQr>>;
beforeAll(async () => {
  qrcode = await loadQr();
});
const make = (text: string, level: "L" | "M" | "Q" | "H" = "M"): QrMatrix => {
  const result = generateQr(text, level, qrcode);
  if (!result.ok) throw new Error(result.error);
  return result.qr;
};

/** Reads the 8-bit byte-mode payload back out of the library, for checking the encoding. */
function encodedBytes(text: string): number[] {
  const qr = qrcode(0, "L");
  qr.addData(utf8ByteString(text), "Byte");
  return qrcode.stringToBytes(utf8ByteString(text));
}

describe("generateQr", () => {
  it("creates a square matrix whose size matches the version", () => {
    const qr = make("https://example.com");
    expect(qr.modules.length).toBe(17 + 4 * qr.version);
    expect(qr.modules.every((row) => row.length === qr.modules.length)).toBe(true);
  });

  it("has the three finder patterns in the corners", () => {
    const { modules } = make("finder");
    const n = modules.length;
    for (const [r, c] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
      expect(modules[r][c] && modules[r][c + 6] && modules[r + 6][c] && modules[r + 6][c + 6]).toBe(true);
      expect(modules[r + 1][c + 1]).toBe(false);
      expect(modules[r + 3][c + 3]).toBe(true);
    }
  });

  it("is deterministic and grows with more data or stronger error correction", () => {
    expect(make("same")).toEqual(make("same"));
    expect(make("x".repeat(200)).version).toBeGreaterThan(make("x").version);
    expect(make("x".repeat(100), "H").version).toBeGreaterThan(make("x".repeat(100), "L").version);
  });

  it("encodes non-ASCII text as UTF-8 bytes", () => {
    expect(encodedBytes("€😀")).toEqual(Array.from(new TextEncoder().encode("€😀")));
    expect(make("Grüße €").modules.length).toBeGreaterThan(0);
  });

  it("explains when the text is too long", () => {
    expect(generateQr("x".repeat(2953), "L", qrcode).ok).toBe(true);
    expect(generateQr("x".repeat(2954), "L", qrcode)).toMatchObject({ ok: false, error: expect.stringContaining("too long") });
    expect(generateQr("x".repeat(1300), "H", qrcode)).toMatchObject({ ok: false, error: expect.stringContaining("High") });
  });

  it("rejects empty text and lone surrogates", () => {
    expect(generateQr("", "M", qrcode).ok).toBe(false);
    expect(generateQr("a\uD800", "M", qrcode).ok).toBe(false);
  });
});

describe("toSvg", () => {
  const qr: QrMatrix = { version: 0, modules: [[true, true, false], [false, true, false], [true, false, true]] };

  it("draws runs of dark modules in one path inside the margin", () => {
    const svg = toSvg(qr, { size: 300, margin: 1, foreground: "#000000", background: "#ffffff" });
    expect(svg).toContain('viewBox="0 0 5 5"');
    expect(svg).toContain('width="300" height="300"');
    expect(svg).toContain('<rect width="5" height="5" fill="#ffffff"/>');
    expect(svg).toContain('d="M1 1h2v1h-2zM2 2h1v1h-1zM1 3h1v1h-1zM3 3h1v1h-1z"');
  });

  it("omits the background when transparent", () => {
    expect(toSvg(qr, { size: 100, margin: 0, foreground: "#112233", background: "transparent" })).not.toContain("<rect");
  });
});

describe("drawToCanvas", () => {
  it("fills whole-pixel squares for each dark module", () => {
    const calls: number[][] = [];
    const ctx = { fillStyle: "", clearRect() {}, fillRect: (x: number, y: number, w: number, h: number) => calls.push([x, y, w, h]) };
    drawToCanvas(ctx, { version: 0, modules: [[true, false], [false, true]] }, { size: 40, margin: 1, foreground: "#000000", background: "#ffffff" });
    expect(calls).toEqual([[0, 0, 40, 40], [10, 10, 10, 10], [20, 20, 10, 10]]);
  });
});

describe("checks", () => {
  it("normalizes colors and warns about low contrast and inverted codes", () => {
    expect(checkColors({ foreground: "#000", background: "#FFF" })).toEqual({ ok: true, foreground: "#000000", background: "#ffffff", warnings: [] });
    expect(checkColors({ foreground: "#bbbbbb", background: "#ffffff" })).toMatchObject({ ok: true, warnings: [expect.stringContaining("contrast")] });
    expect(checkColors({ foreground: "#ffffff", background: "#000000" })).toMatchObject({ ok: true, warnings: [expect.stringContaining("inverted")] });
    expect(checkColors({ foreground: "#000", background: "transparent" })).toMatchObject({ ok: true, background: "transparent" });
  });

  it("rejects invalid or translucent colors", () => {
    expect(checkColors({ foreground: "nope", background: "#fff" }).ok).toBe(false);
    expect(checkColors({ foreground: "#000", background: "url(x)" }).ok).toBe(false);
    expect(checkColors({ foreground: "rgba(0,0,0,0.5)", background: "#fff" }).ok).toBe(false);
  });

  it("validates size and margin", () => {
    expect(checkRender({ size: 256, margin: 4 })).toBeNull();
    expect(checkRender({ size: 32, margin: 4 })).toMatch(/64 to 2048/);
    expect(checkRender({ size: 5000, margin: 4 })).toMatch(/64 to 2048/);
    expect(checkRender({ size: 256, margin: -1 })).toMatch(/margin/);
    expect(checkRender({ size: 256.5, margin: 4 })).toMatch(/whole number/);
  });
});

describe("scannability", () => {
  /** Renders the matrix to RGBA pixels and decodes it with an independent QR reader. */
  async function decode(text: string, level: "L" | "M" | "Q" | "H") {
    const { default: jsQR } = await import("jsqr");
    const { modules } = make(text, level);
    const scale = 4;
    const margin = 4;
    const size = (modules.length + margin * 2) * scale;
    const data = new Uint8ClampedArray(size * size * 4).fill(255);
    modules.forEach((row, y) =>
      row.forEach((dark, x) => {
        if (!dark) return;
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++) {
            const i = (((y + margin) * scale + dy) * size + (x + margin) * scale + dx) * 4;
            data[i] = data[i + 1] = data[i + 2] = 0;
          }
      }),
    );
    return jsQR(data, size, size)?.data;
  }

  it.each([
    ["https://example.com/path?q=1&r=2", "M"],
    ["Grüße aus München € 😀 日本語", "Q"],
    ["WIFI:T:WPA;S:My Network;P:secret;;", "H"],
    ["x".repeat(500), "L"],
  ] as const)("decodes %s back to the same text", async (text, level) => {
    expect(await decode(text, level)).toBe(text);
  });
});
