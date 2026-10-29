import { expect, test, type Page } from "@playwright/test";
import { alert, copyAndRead, field } from "./helpers";

/*
 * Regression tests for actions taken while a tool's library is still
 * loading. The lazily loaded chunk is held back until the test releases
 * it, so the race is reproduced deterministically on any machine.
 */

/** Strings found only in each library's chunk (checked against the build). */
const ENTITIES = /DoubleLongLeftRightArrow/;
const DOMPURIFY = /RETURN_TRUSTED_TYPE/;

async function markPage(page: Page) {
  await page.evaluate(() => ((window as unknown as { __noReload: string }).__noReload = "still here"));
}
async function expectSamePage(page: Page) {
  expect(await page.evaluate(() => (window as unknown as { __noReload?: string }).__noReload)).toBe("still here");
  expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);
}

/**
 * Holds the chunk matching `marker` until `release()` is called (or fails it
 * while `fail` is true). `requested` resolves when the page asks for it,
 * which happens after hydration, so the page is interactive from then on.
 */
async function holdLibrary(page: Page, marker: RegExp) {
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  let markRequested!: () => void;
  const requested = new Promise<void>((resolve) => (markRequested = resolve));
  const state = { fail: false };
  await page.route("**/_next/static/chunks/*.js", async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    if (marker.test(body)) {
      markRequested();
      if (state.fail) return route.abort("failed");
      await released;
    }
    await route.fulfill({ response, body });
  });
  return { requested, release, state };
}

/** Opens a tool without waiting for the load event, which a held chunk would delay. */
async function open(page: Page, slug: string, hold: { requested: Promise<void> }) {
  await page.goto(`/tools/${slug}`, { waitUntil: "domcontentloaded" });
  await hold.requested;
}

test.describe("HTML Entity Encoder & Decoder while the entity table loads", () => {
  test("encode and decode right after navigation wait and give full results", async ({ page }) => {
    const hold = await holdLibrary(page, ENTITIES);
    await open(page, "html-entity-encoder-decoder", hold);
    await markPage(page);
    const output = field(page, "Output");

    await page.getByLabel("Non-ASCII characters").selectOption("named");
    await page.getByRole("checkbox", { name: "Encode existing entities again", exact: true }).check();
    await field(page, "Input").fill("café &amp;");
    await page.getByRole("button", { name: "Encode" }).click();
    // While loading: a clear pending state, no partial (numeric-only) result, no repeat clicks.
    await expect(page.locator("[data-pending]")).toHaveText("Loading the HTML entity table…");
    await expect(page.getByRole("button", { name: "Encode" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Decode" })).toBeDisabled();
    await expect(output).toHaveValue("");
    await page.waitForTimeout(500);
    await expect(output).toHaveValue("");

    hold.release();
    await expect(output).toHaveValue("caf&eacute; &amp;amp;");
    await expect(page.locator("[data-pending]")).toHaveCount(0);
    expect(await copyAndRead(page, "Copy output")).toBe("caf&eacute; &amp;amp;");

    // Repeated operations without a reload.
    await field(page, "Input").fill("&copy; &#x1F600; &unknown;");
    await page.getByRole("button", { name: "Decode" }).click();
    await expect(output).toHaveValue("© 😀 &unknown;");
    await page.getByLabel("Non-ASCII characters").selectOption("numeric");
    await field(page, "Input").fill("é");
    await page.getByRole("button", { name: "Encode" }).click();
    await expect(output).toHaveValue("&#xE9;");
    await expectSamePage(page);
  });

  test("decode right after navigation waits for the table", async ({ page }) => {
    const hold = await holdLibrary(page, ENTITIES);
    await open(page, "html-entity-encoder-decoder", hold);
    await field(page, "Input").fill("&copy; &#x1F600; &unknown;");
    await page.getByRole("button", { name: "Decode" }).click();
    await expect(page.locator("[data-pending]")).toBeVisible();
    await expect(alert(page)).toHaveCount(0);
    hold.release();
    await expect(field(page, "Output")).toHaveValue("© 😀 &unknown;");
    await expect(page.getByText("Not recognized as HTML references")).toBeVisible();
  });

  test("Clear while loading discards the pending result", async ({ page }) => {
    const hold = await holdLibrary(page, ENTITIES);
    await open(page, "html-entity-encoder-decoder", hold);
    await field(page, "Input").fill("&copy;");
    await page.getByRole("button", { name: "Decode" }).click();
    await expect(page.locator("[data-pending]")).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator("[data-pending]")).toHaveCount(0);
    hold.release();
    await page.waitForTimeout(500);
    await expect(field(page, "Output")).toHaveValue("");
    await expect(field(page, "Input")).toHaveValue("");
    await field(page, "Input").fill("&lt;");
    await page.getByRole("button", { name: "Decode" }).click();
    await expect(field(page, "Output")).toHaveValue("<");
  });

  test("a failed load shows an error instead of a partial result, and retrying works", async ({ page }) => {
    const hold = await holdLibrary(page, ENTITIES);
    hold.state.fail = true;
    await page.goto("/tools/html-entity-encoder-decoder", { waitUntil: "domcontentloaded" });
    await hold.requested;
    await markPage(page);
    await page.getByLabel("Non-ASCII characters").selectOption("named");
    await field(page, "Input").fill("café");
    await page.getByRole("button", { name: "Encode" }).click();
    await expect(alert(page).filter({ hasText: "Could not encode" })).toContainText("The entity table could not be loaded");
    await expect(page.getByText("The entity table could not be loaded").first()).toBeVisible();
    await expect(field(page, "Output")).toHaveValue("");

    hold.state.fail = false;
    hold.release();
    await page.getByRole("button", { name: "Encode" }).click();
    await expect(field(page, "Output")).toHaveValue("caf&eacute;");
    await expect(alert(page)).toHaveCount(0);
    await expectSamePage(page);
  });
});

test.describe("HTML WYSIWYG Editor while DOMPurify loads", () => {
  test("source written and previewed right away is cleaned once the sanitizer is ready", async ({ page }) => {
    const dialogs: string[] = [];
    page.on("dialog", (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    const hold = await holdLibrary(page, DOMPURIFY);
    await open(page, "html-wysiwyg-editor", hold);
    await markPage(page);
    const output = field(page, "Clean HTML");
    const unsafe = '<p>Safe</p><img src=x onerror="alert(1)"><iframe src="https://evil.test"></iframe>';

    await page.getByText("HTML source", { exact: true }).click();
    await field(page, "HTML source").fill(unsafe);
    await page.getByText("Preview", { exact: true }).click();
    // Nothing is cleaned to an empty document while waiting; the user sees why.
    await expect(page.locator("[data-sanitizer-loading]")).toBeVisible();
    await expect(page.getByText("Cleaning your HTML as soon as the sanitizer has loaded…")).toBeVisible();
    await expect(output).toHaveValue("");
    await expect(page.getByRole("button", { name: "Copy HTML" })).toBeDisabled();

    // Going back to the source before the sanitizer arrives keeps what was typed.
    await page.getByText("HTML source", { exact: true }).click();
    await expect(field(page, "HTML source")).toHaveValue(unsafe);
    await page.getByText("Preview", { exact: true }).click();

    hold.release();
    await expect(output).toHaveValue('<p>Safe</p><img src="x">');
    await expect(page.frameLocator('iframe[title="Preview of the HTML"]').getByText("Safe")).toBeVisible();
    expect(await copyAndRead(page, "Copy HTML")).toBe('<p>Safe</p><img src="x">');

    // Repeated edits without a reload.
    await page.getByText("HTML source", { exact: true }).click();
    await field(page, "HTML source").fill('<h2>Again</h2><a href="javascript:alert(2)">x</a>');
    await page.getByText("Visual", { exact: true }).click();
    await expect(output).toHaveValue(/^<h2>Again<\/h2>\s*<a>x<\/a>$/);
    await expect(page.frameLocator('iframe[title="Visual HTML editor"]').getByRole("heading", { name: "Again" })).toBeVisible();
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(output).toHaveValue("");
    expect(dialogs).toEqual([]);
    await expectSamePage(page);
  });

  test("the visual editor opens when the sanitizer is ready, and edits are cleaned", async ({ page }) => {
    const hold = await holdLibrary(page, DOMPURIFY);
    await open(page, "html-wysiwyg-editor", hold);
    await expect(page.locator("[data-sanitizer-loading]")).toHaveText("Loading the editor and HTML sanitizer…");
    await expect(page.getByRole("button", { name: "Bold" })).toBeDisabled();
    hold.release();
    const body = page.frameLocator('iframe[title="Visual HTML editor"]').locator("body");
    await body.click();
    await page.keyboard.type("Typed early");
    await page.keyboard.press("ControlOrMeta+A");
    await page.getByRole("button", { name: "Bold" }).click();
    await expect(field(page, "Clean HTML")).toHaveValue(/<(b|strong)>Typed early<\/(b|strong)>/);
  });

  test("Clear while loading leaves an empty document", async ({ page }) => {
    const hold = await holdLibrary(page, DOMPURIFY);
    await open(page, "html-wysiwyg-editor", hold);
    await page.getByText("HTML source", { exact: true }).click();
    await field(page, "HTML source").fill("<p>Discard me</p>");
    await page.getByText("Visual", { exact: true }).click();
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    hold.release();
    await expect(page.frameLocator('iframe[title="Visual HTML editor"]').locator("body")).toHaveText("");
    await expect(field(page, "Clean HTML")).toHaveValue("");
  });
});
