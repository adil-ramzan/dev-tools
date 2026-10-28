import { deflateSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import { expect, test, type Download, type Page } from "@playwright/test";
import { accessibilityViolations, alert, copyAndRead, hasHorizontalOverflow, watchForLeaks } from "./helpers";

async function markPage(page: Page) {
  await page.evaluate(() => ((window as unknown as { __noReload: string }).__noReload = "still here"));
}
async function expectSamePage(page: Page) {
  expect(await page.evaluate(() => (window as unknown as { __noReload?: string }).__noReload)).toBe("still here");
  expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** A solid-color RGBA PNG, built here so the tests need no fixture files. */
function makePng(width: number, height: number, rgba = [40, 120, 220, 255]): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), 8 + data.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => rgba).flat())]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.concat(Array(height).fill(row)))), chunk("IEND", Buffer.alloc(0))]);
}

async function downloaded(download: Download): Promise<Buffer> {
  return readFile((await download.path())!);
}

function pngDimensions(png: Buffer) {
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/** File names in a ZIP, read from its central directory. */
function zipEntries(zip: Buffer): Map<string, Buffer> {
  const eocd = zip.length - 22;
  expect(zip.readUInt32LE(eocd)).toBe(0x06054b50);
  const entries = new Map<string, Buffer>();
  let p = zip.readUInt32LE(eocd + 16);
  for (let i = 0; i < zip.readUInt16LE(eocd + 10); i++) {
    const nameLength = zip.readUInt16LE(p + 28);
    const name = zip.subarray(p + 46, p + 46 + nameLength).toString();
    const size = zip.readUInt32LE(p + 24);
    const local = zip.readUInt32LE(p + 42);
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    entries.set(name, zip.subarray(start, start + size));
    p += 46 + nameLength;
  }
  return entries;
}

const PAGES = ["svg-to-png-converter", "favicon-generator", "screenshot-beautifier"];

test.describe("Phase 11 batch 2: accessibility and layout with results shown", () => {
  for (const slug of PAGES) {
    test(slug, async ({ page }) => {
      for (const colorScheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme });
        await page.goto(`/tools/${slug}`);
        if (slug === "svg-to-png-converter") {
          await page.getByRole("button", { name: "Sample" }).click();
          await expect(page.locator("[data-png-preview]")).toBeVisible();
        } else if (slug === "favicon-generator") {
          await expect(page.locator("[data-favicon-previews] img")).toHaveCount(6);
        } else {
          await page.locator('input[type="file"]').setInputFiles({ name: "shot.png", mimeType: "image/png", buffer: makePng(320, 200) });
          await expect(page.locator("[data-result]")).toBeVisible();
        }
        expect(await accessibilityViolations(page), colorScheme).toEqual([]);
      }
      await page.setViewportSize({ width: 360, height: 800 });
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});

test.describe("SVG to PNG Converter", () => {
  test("converts at chosen sizes, sanitizes, blocks external loads and clears", async ({ page }) => {
    await page.goto("/tools/svg-to-png-converter");
    await markPage(page);
    const check = watchForLeaks(page);
    const markup = page.getByLabel("SVG markup");
    const size = page.locator("[data-png-size]");

    await page.getByRole("button", { name: "Sample" }).click();
    await expect(size).toContainText("240×240 px");
    await expect(page.getByText("120×120 px from the viewBox")).toBeVisible();

    await page.getByRole("group", { name: "Output size" }).getByText("Width", { exact: true }).click();
    await page.getByLabel("Width (px)").fill("1000");
    await expect(size).toContainText("1000×1000 px");
    await page.getByRole("group", { name: "Output size" }).getByText("Exact", { exact: true }).click();
    await page.getByLabel("Height (px)").fill("100");
    await page.getByLabel("Width (px)").fill("300");
    await expect(size).toContainText("300×100 px");
    await page.getByLabel("Transparent background").uncheck();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PNG" }).click();
    const png = await downloaded(await download);
    expect(pngDimensions(png)).toEqual({ width: 300, height: 100 });
    expect((await download).suggestedFilename()).toBe("image.png");
    await expect(page.getByRole("status").filter({ hasText: "Downloaded image.png (300×100 pixels" })).toBeVisible();

    await page.getByLabel("Width (px)").fill("9000");
    await expect(alert(page)).toContainText("at most 8,192 pixels");
    await expect(page.getByRole("button", { name: "Download PNG" })).toBeDisabled();
    await page.getByRole("button", { name: "Reset settings" }).click();
    await expect(size).toContainText("240×240 px");

    // Scripts, handlers and external references are removed and never requested.
    await markup.fill(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="40" height="20" onload="fetch('https://evil.example/onload')"><script>fetch("https://evil.example/script")</script><image href="https://evil.example/img.png" width="10" height="10"/><style>@import url(https://evil.example/s.css);</style><rect width="40" height="20" fill="red"/></svg>`,
    );
    await expect(page.getByText(/unsafe or external items? (was|were) removed/)).toBeVisible();
    await expect(size).toContainText("80×40 px");

    await markup.fill("<svg><g></svg>");
    await expect(alert(page)).toContainText("not well-formed");
    await page.getByLabel("SVG file").setInputFiles({ name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"><circle cx="16" cy="16" r="16"/></svg>') });
    await expect(page.getByText("logo.svg · 64×32 px from width and height")).toBeVisible();
    await expect(size).toContainText("128×64 px");
    await page.getByLabel("SVG file").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(alert(page)).toContainText("notes.txt is not an SVG file.");

    await page.getByRole("button", { name: "Clear" }).click();
    await expect(markup).toHaveValue("");
    await expect(page.locator("[data-png-preview]")).toHaveCount(0);
    await expect(alert(page)).toHaveCount(0);
    await expectSamePage(page);
    await check([]);
  });
});

test.describe("Favicon Generator", () => {
  test("draws every size, packages a real ICO and ZIP, and takes images", async ({ page }) => {
    await page.goto("/tools/favicon-generator");
    await markPage(page);
    const check = watchForLeaks(page);
    const previews = page.locator("[data-favicon-previews] img");
    await expect(previews).toHaveCount(6);
    await expect(previews.first()).toHaveAttribute("data-size", "16");

    const zipDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download all (.zip)" }).click();
    expect((await zipDownload).suggestedFilename()).toBe("favicons.zip");
    const entries = zipEntries(await downloaded(await zipDownload));
    expect([...entries.keys()]).toEqual([
      "favicon.ico",
      "favicon-16x16.png",
      "favicon-32x32.png",
      "favicon-48x48.png",
      "apple-touch-icon.png",
      "android-chrome-192x192.png",
      "android-chrome-512x512.png",
      "site.webmanifest",
      "head.html",
    ]);
    expect(pngDimensions(entries.get("apple-touch-icon.png")!)).toEqual({ width: 180, height: 180 });
    expect(pngDimensions(entries.get("android-chrome-512x512.png")!)).toEqual({ width: 512, height: 512 });
    const ico = entries.get("favicon.ico")!;
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2), ico.readUInt16LE(4)]).toEqual([0, 1, 3]);
    expect([ico[6], ico[22], ico[38]]).toEqual([16, 32, 48]);
    expect(pngDimensions(ico.subarray(ico.readUInt32LE(6 + 12)))).toEqual({ width: 16, height: 16 });
    expect(JSON.parse(entries.get("site.webmanifest")!.toString()).theme_color).toBe("#1f4fe0");

    await page.getByLabel("Text (1 to 3 characters)").fill("ABCD");
    await expect(alert(page)).toContainText("at most 3 characters");
    await expect(page.getByRole("button", { name: "Download all (.zip)" })).toBeDisabled();
    await page.getByLabel("Text (1 to 3 characters)").fill("🚀");
    await expect(alert(page)).toHaveCount(0);
    await expect(previews).toHaveCount(6);
    await page.getByLabel("App name for the manifest (optional)").fill("Rocket");
    await expect(page.getByLabel("site.webmanifest")).toHaveValue(/"name": "Rocket"/);
    expect(await copyAndRead(page, "Copy HTML favicon links")).toContain('<link rel="manifest" href="/site.webmanifest">');

    await page.getByRole("group", { name: "Source" }).getByText("Image", { exact: true }).click();
    await expect(page.getByText("Choose an image to see the icons.")).toBeVisible();
    const file = page.locator('input[type="file"]');
    await file.setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: makePng(600, 300) });
    await expect(page.locator("[data-image-info]")).toContainText("logo.png · 600×300 px");
    await expect(previews).toHaveCount(6);
    const icoDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "favicon.ico" }).click();
    expect((await icoDownload).suggestedFilename()).toBe("favicon.ico");
    const one = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download favicon-32x32.png" }).click();
    expect(pngDimensions(await downloaded(await one))).toEqual({ width: 32, height: 32 });

    await file.setInputFiles({ name: "broken.png", mimeType: "image/png", buffer: Buffer.from("not really a png") });
    await expect(alert(page)).toContainText("could not be decoded");

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByLabel("Text (1 to 3 characters)")).toHaveValue("D");
    await expect(previews).toHaveCount(6);
    await expect(alert(page)).toHaveCount(0);
    await expectSamePage(page);
    await check([]);
  });
});

test.describe("Screenshot Beautifier", () => {
  test("lays out, frames, pastes, exports at full resolution and clears", async ({ page }) => {
    await page.goto("/tools/screenshot-beautifier");
    await markPage(page);
    const check = watchForLeaks(page);
    const size = page.locator("[data-result-size]");
    await page.locator('input[type="file"]').setInputFiles({ name: "shot.png", mimeType: "image/png", buffer: makePng(400, 300) });
    await expect(page.locator("[data-image-info]")).toHaveText("shot.png · 400×300 px");
    await expect(size).toContainText("528×428 px");

    await page.getByLabel("Window frame").selectOption("dark");
    await expect(size).toContainText("528×452 px");
    await page.getByRole("spinbutton", { name: /^Padding/ }).fill("0");
    await page.getByRole("group", { name: "Background", exact: true }).getByText("None", { exact: true }).click();
    await expect(size).toContainText("400×324 px");

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PNG" }).click();
    expect((await download).suggestedFilename()).toBe("shot-beautified.png");
    expect(pngDimensions(await downloaded(await download))).toEqual({ width: 400, height: 324 });

    await page.getByRole("button", { name: "Copy image" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Copied the image to the clipboard." })).toBeVisible();
    expect(await page.evaluate(async () => (await navigator.clipboard.read())[0].types)).toContain("image/png");

    await page.getByRole("button", { name: "Reset settings" }).click();
    await expect(size).toContainText("528×428 px");

    // Paste an image from the clipboard anywhere on the page.
    await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 50;
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
      const data = new DataTransfer();
      data.items.add(new File([blob], "pasted.png", { type: "image/png" }));
      document.body.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    });
    await expect(page.locator("[data-image-info]")).toHaveText("pasted.png · 100×50 px");
    await expect(size).toContainText("228×178 px");

    await page.locator('input[type="file"]').setInputFiles({ name: "huge.png", mimeType: "image/png", buffer: makePng(4000, 4000) });
    await expect(alert(page)).toContainText("megapixel limit");
    // A file that fails to decode is reported, and the previous image stays loaded.
    await page.locator('input[type="file"]').setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("nope") });
    await expect(alert(page).filter({ hasText: "could not be decoded" })).toBeVisible();
    await expect(page.locator("[data-image-info]")).toHaveText("huge.png · 4000×4000 px");

    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator("[data-result]")).toHaveCount(0);
    await expect(page.getByText("Choose, drop or paste a screenshot to start.")).toBeVisible();
    await expectSamePage(page);
    await check([]);
  });
});
