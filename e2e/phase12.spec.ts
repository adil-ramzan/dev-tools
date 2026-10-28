import { expect, test, type Page } from "@playwright/test";
import { accessibilityViolations, alert, copyAndRead, hasHorizontalOverflow, watchForLeaks } from "./helpers";

async function markPage(page: Page) {
  await page.evaluate(() => ((window as unknown as { __noReload: string }).__noReload = "still here"));
}
async function expectSamePage(page: Page) {
  expect(await page.evaluate(() => (window as unknown as { __noReload?: string }).__noReload)).toBe("still here");
  expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);
}

/** A 1×1 PNG, enough to stand in for a local share image. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

test.describe("Open Graph Preview", () => {
  test("accessibility and layout in both themes with previews shown", async ({ page }) => {
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await page.goto("/tools/open-graph-preview");
      await page.getByRole("button", { name: "Sample" }).click();
      await expect(page.locator('[data-card="open-graph"]')).toBeVisible();
      expect(await accessibilityViolations(page), colorScheme).toEqual([]);
      await page.getByRole("button", { name: "Next sample" }).click();
      await expect(page.locator('[data-issue="error"]').first()).toBeVisible();
      expect(await accessibilityViolations(page), `${colorScheme}, with errors`).toEqual([]);
    }
    await page.setViewportSize({ width: 360, height: 800 });
    expect(await hasHorizontalOverflow(page)).toBe(false);
    await page.getByText("Enter fields", { exact: true }).click();
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test("parses HTML, previews cards, cycles samples and never fetches URLs", async ({ page }) => {
    await page.goto("/tools/open-graph-preview");
    await markPage(page);
    const check = watchForLeaks(page);
    const html = page.getByLabel("Page HTML");
    const ogCard = page.locator('[data-card="open-graph"]');

    await page.getByRole("button", { name: "Sample" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Sample 1 of 3: Complete article" })).toBeVisible();
    await expect(ogCard).toContainText("ENGINEERING.ACME.EXAMPLE", { ignoreCase: true });
    await expect(ogCard.locator("[data-card-title]")).toHaveText("How we cut our build time in half");
    await expect(page.locator('[data-card="twitter-large"]')).toContainText("From engineering.acme.example");
    // The image URL is shown as a placeholder, never loaded.
    await expect(ogCard.locator("[data-image-placeholder]")).toContainText("Image not loaded");
    await expect(page.locator('[data-issue="error"], [data-issue="warning"]')).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: /^0 errors, 0 warnings/ })).toBeVisible();

    await page.getByRole("button", { name: "Next sample" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Sample 2 of 3: Common mistakes" })).toBeVisible();
    const errors = page.locator('[data-issue="error"]');
    await expect(errors.filter({ hasText: "og:image" })).toContainText("not an absolute URL");
    await expect(errors.filter({ hasText: "twitter:card" })).toContainText('"large" is not a card type');
    await expect(page.locator('[data-issue="warning"]').filter({ hasText: "appears more than once" })).toHaveCount(1);

    await page.getByRole("button", { name: "Next sample" }).click();
    await expect(page.locator('[data-card="twitter-summary"]')).toContainText("Jane Doe – Software engineer");
    await page.getByRole("button", { name: "Next sample" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Sample 1 of 3" })).toBeVisible();

    // Malformed, hostile and very long input is handled safely.
    await html.fill(`<script>window.__ran = true</script><img src="https://tracker.example/pixel.gif" onerror="window.__ran = true"><meta property="og:title" content="${"Long title ".repeat(30)}"><meta property="og:url" content="javascript:alert(1)"><title>unclosed`);
    await expect(page.locator('[data-issue="error"]').filter({ hasText: "og:url" })).toContainText("not an absolute http(s) URL");
    await expect(page.locator('[data-issue="warning"]').filter({ hasText: "og:title" })).toContainText("329 characters");
    await expect(ogCard.locator("[data-card-title]")).toHaveText(/…$/);
    expect(await page.evaluate(() => (window as unknown as { __ran?: boolean }).__ran)).toBeUndefined();

    await html.fill("x".repeat(1_000_001));
    await expect(alert(page)).toContainText("Too much HTML");

    await page.getByRole("button", { name: "Clear" }).click();
    await expect(html).toHaveValue("");
    await expect(page.getByText("Paste HTML, enter fields or load a sample to see the previews.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Checks" })).toHaveCount(0);
    await expectSamePage(page);
    // watchForLeaks fails on any request that leaves the site, including the sample image URLs and the tracker.
    await check(["engineering.acme.example/og", "tracker.example"]);
  });

  test("builds cards from typed fields and shows a local image", async ({ page }) => {
    await page.goto("/tools/open-graph-preview");
    await markPage(page);
    const check = watchForLeaks(page);
    await page.getByText("Enter fields", { exact: true }).click();
    await page.getByLabel("Title", { exact: true }).fill("Launch week recap");
    await page.getByLabel("Description", { exact: true }).fill("Five days, five releases.");
    await page.getByLabel("Page URL").fill("https://blog.example/launch");
    await expect(page.locator('[data-card="open-graph"] [data-card-title]')).toHaveText("Launch week recap");
    await expect(page.locator('[data-card="open-graph"]')).toContainText("Five days, five releases.");
    await expect(page.locator('[data-card="open-graph"] [data-image-placeholder]')).toHaveCount(0);

    await page.getByLabel("Image URL").fill("https://blog.example/og.png");
    await expect(page.locator('[data-card="open-graph"] [data-image-placeholder]')).toContainText("blog.example");
    await page.getByLabel("Twitter/X card").selectOption("summary");
    await expect(page.locator('[data-card="twitter-summary"]')).toBeVisible();
    expect(await copyAndRead(page, "Copy as HTML meta tags")).toContain('<meta property="og:image" content="https://blog.example/og.png">');

    await page.getByLabel("Page URL").fill("blog.example/launch");
    await expect(page.locator('[data-issue="error"]').filter({ hasText: "Page URL" })).toContainText("left out until fixed");

    await page.getByLabel("Preview image (optional)").setInputFiles({ name: "og.png", mimeType: "image/png", buffer: PNG });
    await expect(page.locator("[data-local-image]")).toHaveText("og.png");
    await expect(page.locator('[data-card="open-graph"] img')).toHaveAttribute("src", /^blob:/);
    await page.getByRole("button", { name: "Remove image" }).click();
    await expect(page.locator('[data-card="open-graph"] [data-image-placeholder]')).toBeVisible();
    await page.getByLabel("Preview image (optional)").setInputFiles({ name: "notes.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
    await expect(alert(page)).toContainText("not supported");

    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue("");
    await expect(alert(page)).toHaveCount(0);
    await expectSamePage(page);
    await check(["blog.example/og.png"]);
  });
});
