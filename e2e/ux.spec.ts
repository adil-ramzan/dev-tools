import { expect, test, type Page } from "@playwright/test";
import { tools } from "../src/content/tools";
import { accessibilityViolations, alert, field, hasHorizontalOverflow } from "./helpers";

/** Marks the page so a reload (which would discard the marker) is detectable. */
async function markPage(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __noReload: string }).__noReload = "still here";
  });
}

/** Fails if the page was reloaded or navigated since markPage. */
async function expectSamePage(page: Page) {
  expect(await page.evaluate(() => (window as unknown as { __noReload?: string }).__noReload)).toBe("still here");
  expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);
}

test.describe("every tool: accessibility in both themes and layout", () => {
  for (const tool of tools) {
    test(tool.slug, async ({ page }) => {
      for (const colorScheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme });
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(`/tools/${tool.slug}`);
        expect(await accessibilityViolations(page), `${colorScheme} theme`).toEqual([]);
      }
      await page.setViewportSize({ width: 360, height: 800 });
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});

test.describe("repeat operations without reloading", () => {
  test("JSON Formatter: format, edit, format again, clear, and use Ctrl+Enter", async ({ page }) => {
    await page.goto("/tools/json-formatter");
    await markPage(page);
    const input = field(page, "JSON input");
    const output = field(page, "Result");
    await input.fill('{"a":1}');
    await page.getByRole("button", { name: "Format", exact: true }).click();
    await expect(output).toHaveValue('{\n  "a": 1\n}');
    await input.fill('{"b":[true,null]}');
    await input.press("ControlOrMeta+Enter");
    await expect(output).toHaveValue('{\n  "b": [\n    true,\n    null\n  ]\n}');
    await input.fill('{"broken":');
    await input.press("ControlOrMeta+Enter");
    await expect(alert(page)).toContainText("Invalid JSON");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(input).toHaveValue("");
    await expect(output).toHaveValue("");
    await expect(alert(page)).toHaveCount(0);
    await input.fill("[1]");
    await page.getByRole("button", { name: "Minify" }).click();
    await expect(output).toHaveValue("[1]");
    await expectSamePage(page);
  });

  test("Base64: encode, decode the result, clear and encode new text", async ({ page }) => {
    await page.goto("/tools/base64-encoder-decoder");
    await markPage(page);
    await field(page, "Input").fill("first");
    await page.getByRole("button", { name: "Encode" }).click();
    await expect(field(page, "Output")).toHaveValue("Zmlyc3Q=");
    await page.getByRole("button", { name: "Use as input" }).click();
    await page.getByRole("button", { name: "Decode" }).click();
    await expect(field(page, "Output")).toHaveValue("first");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(field(page, "Input")).toHaveValue("");
    await expect(field(page, "Output")).toHaveValue("");
    await field(page, "Input").fill("second");
    await page.getByRole("button", { name: "Encode" }).click();
    await expect(field(page, "Output")).toHaveValue("c2Vjb25k");
    await expectSamePage(page);
  });

  test("SQL Formatter and CSV converter run repeatedly with Ctrl+Enter", async ({ page }) => {
    await page.goto("/tools/sql-formatter");
    await markPage(page);
    await field(page, "SQL input").fill("select a from t");
    await field(page, "SQL input").press("ControlOrMeta+Enter");
    await expect(field(page, "Formatted SQL")).toHaveValue(/^SELECT\n  a\nFROM\n  t$/);
    await field(page, "SQL input").fill("select b from u");
    await page.getByRole("button", { name: "Format SQL" }).click();
    await expect(field(page, "Formatted SQL")).toHaveValue(/^SELECT\n  b\nFROM\n  u$/);
    await expectSamePage(page);

    await page.goto("/tools/csv-json-converter");
    await markPage(page);
    await field(page, "CSV input").fill("a\n1");
    await page.getByRole("button", { name: "Convert to JSON" }).click();
    await expect(field(page, "JSON output")).toHaveValue('[\n  {\n    "a": "1"\n  }\n]');
    await field(page, "CSV input").fill("b\n2");
    await field(page, "CSV input").press("ControlOrMeta+Enter");
    await expect(field(page, "JSON output")).toHaveValue('[\n  {\n    "b": "2"\n  }\n]');
    await expectSamePage(page);
  });

  test("Diff Checker: compare, change, compare again, swap and clear", async ({ page }) => {
    await page.goto("/tools/diff-checker");
    await markPage(page);
    await field(page, "Original").fill("one\ntwo");
    await field(page, "Changed").fill("one\nthree");
    await page.getByRole("button", { name: "Compare" }).click();
    await expect(page.getByText("−1 removed", { exact: true })).toBeVisible();
    await field(page, "Changed").fill("one\ntwo\nthree");
    await field(page, "Changed").press("ControlOrMeta+Enter");
    await expect(page.getByText("+1 added", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Swap" }).click();
    await expect(field(page, "Original")).toHaveValue("one\ntwo\nthree");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(field(page, "Original")).toHaveValue("");
    await expect(field(page, "Changed")).toHaveValue("");
    await expectSamePage(page);
  });

  test("YAML ↔ JSON ↔ TOML and Text Encryption run repeatedly", async ({ page }) => {
    await page.goto("/tools/yaml-json-toml-converter");
    await markPage(page);
    await field(page, "JSON input").fill('{"a":1}');
    await page.getByRole("button", { name: "Convert to YAML" }).click();
    await expect(field(page, "YAML output")).toHaveValue("a: 1\n");
    await field(page, "JSON input").fill('{"b":2}');
    await field(page, "JSON input").press("ControlOrMeta+Enter");
    await expect(field(page, "YAML output")).toHaveValue("b: 2\n");
    await expectSamePage(page);

    await page.goto("/tools/text-encryption");
    await markPage(page);
    await field(page, "Text to encrypt").fill("first secret");
    await page.getByLabel("Password", { exact: true }).fill("a long passphrase");
    await page.getByLabel("Confirm password").fill("a long passphrase");
    await field(page, "Text to encrypt").press("ControlOrMeta+Enter");
    await expect(field(page, "Encrypted text")).toHaveValue(/^v1\./);
    const first = await field(page, "Encrypted text").inputValue();
    await page.getByRole("button", { name: "Encrypt", exact: true }).click();
    await expect(field(page, "Encrypted text")).not.toHaveValue(first);
    await expect(field(page, "Encrypted text")).toHaveValue(/^v1\./);
    await expectSamePage(page);
  });

  test("generators show a result at once and regenerate in place", async ({ page }) => {
    await page.goto("/tools/uuid-generator");
    await markPage(page);
    const uuids = field(page, "1 UUID");
    await expect(uuids).toHaveValue(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const first = await uuids.inputValue();
    await page.getByRole("button", { name: "Generate new" }).click();
    await expect(uuids).not.toHaveValue(first);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(field(page, "UUIDs")).toHaveValue("");
    await page.getByRole("button", { name: "Generate" }).click();
    await expect(field(page, "1 UUID")).toHaveValue(/^[0-9a-f-]{36}$/);
    await expectSamePage(page);

    await page.goto("/tools/ulid-generator");
    await markPage(page);
    await expect(field(page, "1 ULID")).toHaveValue(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/);
    await expectSamePage(page);

    await page.goto("/tools/token-generator");
    await markPage(page);
    const token = page.getByRole("textbox", { name: "Generated token" });
    await expect(token).toHaveValue(/^.{64}$/);
    const before = await token.inputValue();
    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(token).not.toHaveValue(before);
    await expectSamePage(page);

    await page.goto("/tools/lorem-ipsum-generator");
    await markPage(page);
    const text = field(page, "Text");
    await expect(text).toHaveValue(/^Lorem ipsum/);
    const lorem = await text.inputValue();
    await page.getByRole("button", { name: "Regenerate" }).click();
    await expect(text).not.toHaveValue(lorem);
    await page.getByText("Words", { exact: true }).click();
    await page.getByLabel("How many").fill("4");
    await expect(text).toHaveValue("Lorem ipsum dolor sit");
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByLabel("How many")).toHaveValue("3");
    await expect(text).toHaveValue(/\n\n.*\n\n/);
    await expectSamePage(page);
  });

  test("QR code: change text and settings, then reset settings", async ({ page }) => {
    await page.goto("/tools/qr-code-generator");
    await markPage(page);
    await field(page, "Text or URL").fill("first");
    const preview = page.locator("[data-qr-preview]");
    await expect(preview).toBeVisible();
    const firstSrc = await preview.getAttribute("src");
    await field(page, "Text or URL").fill("second");
    await expect(preview).not.toHaveAttribute("src", firstSrc!);
    await page.getByLabel("Error correction").selectOption("H");
    await page.getByRole("checkbox", { name: "Transparent background" }).check();
    await page.getByRole("button", { name: "Reset settings" }).click();
    await expect(page.getByLabel("Error correction")).toHaveValue("M");
    await expect(page.getByRole("checkbox", { name: "Transparent background" })).not.toBeChecked();
    await expect(page.getByRole("button", { name: "Reset settings" })).toBeDisabled();
    await expect(field(page, "Text or URL")).toHaveValue("second");
    await expectSamePage(page);
  });

  test("visual tools reset to their starting state", async ({ page }) => {
    await page.goto("/tools/color-converter");
    await markPage(page);
    const color = field(page, "Color (HEX, RGB or HSL)");
    await color.fill("#ff0000");
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(color).toHaveValue("#1f4fe0");
    await expectSamePage(page);

    await page.goto("/tools/css-gradient-generator");
    await markPage(page);
    const gradientCss = page.locator('pre[aria-labelledby="gradient-css-label"]');
    const initial = await gradientCss.textContent();
    await page.getByRole("button", { name: "Add color stop" }).click();
    await expect(gradientCss).not.toHaveText(initial!);
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(gradientCss).toHaveText(initial!);
    await expectSamePage(page);

    await page.goto("/tools/css-box-shadow-generator");
    await markPage(page);
    const shadowCss = page.locator('pre[aria-labelledby="shadow-css-label"]');
    const shadow = await shadowCss.textContent();
    await page.getByRole("button", { name: "Add layer" }).click();
    await expect(shadowCss).not.toHaveText(shadow!);
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(shadowCss).toHaveText(shadow!);
    await expectSamePage(page);

    await page.goto("/tools/unix-timestamp-converter");
    await markPage(page);
    await page.getByRole("button", { name: "Now" }).first().click();
    await page.getByRole("button", { name: "Clear" }).first().click();
    await expect(field(page, "Unix timestamp")).toHaveValue("");
    await expectSamePage(page);
  });

  test("benchmark: run, restore the example and run again", async ({ page }) => {
    await page.goto("/tools/javascript-benchmark");
    await markPage(page);
    await expect(page.getByRole("button", { name: "Run benchmark" })).toBeEnabled();
    await page.getByLabel("Samples per case").fill("5");
    await page.getByRole("button", { name: "Clear" }).click();
    await page.getByLabel("Code for case 1").fill("1 + 1;");
    await page.getByRole("button", { name: "Run benchmark" }).click();
    await expect(page.locator("[data-bench-results] > li")).toHaveCount(1, { timeout: 20_000 });
    await page.getByRole("button", { name: "Restore example" }).click();
    await expect(page.getByLabel("Name of case 3")).toHaveValue("reduce");
    await page.getByRole("button", { name: "Run benchmark" }).click();
    await expect(page.locator("[data-bench-results] > li")).toHaveCount(3, { timeout: 20_000 });
    await expectSamePage(page);
  });

  test("live tools update for each new input", async ({ page }) => {
    await page.goto("/tools/hash-generator");
    await markPage(page);
    await field(page, "Text to hash").fill("abc");
    await expect(page.locator('output[data-algorithm="md5"]')).toHaveText("900150983cd24fb0d6963f7d28e17f72");
    await field(page, "Text to hash").fill("abcd");
    await expect(page.locator('output[data-algorithm="md5"]')).toHaveText("e2fc714c4727ee9395f324cd2e7f331f");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator('output[data-algorithm="md5"]')).toHaveText("d41d8cd98f00b204e9800998ecf8427e");
    await expectSamePage(page);

    await page.goto("/tools/password-strength-analyzer");
    await markPage(page);
    const pw = page.getByLabel("Password", { exact: true });
    await pw.fill("password1");
    await expect(page.locator("[data-strength-score]")).toHaveText("Very weak");
    await pw.fill("x7#Kp9$mQ2vL!nB4-Zq");
    await expect(page.locator("[data-strength-score]")).toHaveText("Very strong");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator("[data-strength-score]")).toHaveCount(0);
    await expectSamePage(page);
  });
});

test.describe("compact help", () => {
  test("FAQ answers and notices expand on request and stay in the page", async ({ page }) => {
    await page.goto("/tools/rsa-key-pair-generator");
    const question = page.getByRole("heading", { name: "2048 or 4096 bits?" });
    const answer = page.getByText(/2048-bit RSA is considered secure until about 2030/);
    await expect(answer).toBeAttached();
    await expect(answer).toBeHidden();
    await question.click();
    await expect(answer).toBeVisible();
    const notice = page.getByText("The private key is sensitive and unencrypted");
    await expect(notice).toBeVisible();
    const detail = page.locator("details").filter({ hasText: "The private key is sensitive and unencrypted" }).getByText(/never commit it to source control/);
    await expect(detail).toBeHidden();
    await notice.click();
    await expect(detail).toBeVisible();
    // The FAQ structured data still lists every question.
    const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    expect(jsonLd.mainEntity.length).toBe(4);
  });
});
