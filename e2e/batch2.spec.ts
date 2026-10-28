import { expect, test } from "@playwright/test";
import { alert, copyAndRead, field } from "./helpers";

test.describe("YAML ↔ JSON ↔ TOML Converter", () => {
  test("converts JSON to YAML and back", async ({ page }) => {
    await page.goto("/tools/yaml-json-toml-converter");
    await field(page, "JSON input").fill('{"name": "app", "ratio": 1.0, "tags": ["a", "yes"]}');
    await page.getByRole("button", { name: "Convert to YAML" }).click();
    await expect(field(page, "YAML output")).toHaveValue('name: app\nratio: 1.0\ntags:\n  - a\n  - "yes"\n');
    expect(await copyAndRead(page, "Copy YAML output")).toContain("ratio: 1.0");
    await page.getByRole("button", { name: "Use as input" }).click();
    await expect(page.getByLabel("From", { exact: true })).toHaveValue("yaml");
    await page.getByRole("button", { name: "Convert to JSON" }).click();
    await expect(field(page, "JSON output")).toHaveValue('{\n  "name": "app",\n  "ratio": 1.0,\n  "tags": [\n    "a",\n    "yes"\n  ]\n}\n');
  });

  test("reports values TOML cannot represent instead of dropping them", async ({ page }) => {
    await page.goto("/tools/yaml-json-toml-converter");
    await page.getByLabel("To", { exact: true }).selectOption("toml");
    await field(page, "JSON input").fill('{"a": 1, "b": null}');
    await page.getByRole("button", { name: "Convert to TOML" }).click();
    await expect(alert(page)).toContainText("TOML has no null value: $.b");
    await expect(field(page, "TOML output")).toHaveValue("");
  });

  test("shows syntax errors with a position and lists warnings", async ({ page }) => {
    await page.goto("/tools/yaml-json-toml-converter");
    await field(page, "JSON input").fill('{\n  "a": 1,\n  "b": \n}');
    await page.getByRole("button", { name: "Convert to YAML" }).click();
    await expect(alert(page)).toContainText("line 4");
    await page.getByLabel("From", { exact: true }).selectOption("toml");
    await page.getByLabel("To", { exact: true }).selectOption("json");
    await page.getByRole("button", { name: "Sample" }).click();
    await page.getByRole("button", { name: "Convert to JSON" }).click();
    await expect(page.getByText("dates and times became strings")).toBeVisible();
    await expect(field(page, "JSON output")).toHaveValue(/"started": "2024-03-15T14:30:00.000Z"/);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(field(page, "TOML input")).toHaveValue("");
  });
});

test.describe("List Converter", () => {
  test("sorts, deduplicates and joins a list", async ({ page }) => {
    await page.goto("/tools/list-converter");
    await field(page, "Input").fill("b\na\n\nb\nC");
    await expect(field(page, "Output")).toHaveValue("b\na\n\nb\nC");
    await page.getByRole("checkbox", { name: "Remove duplicates", exact: true }).check();
    await page.getByRole("checkbox", { name: "Remove empty lines", exact: true }).check();
    await page.getByLabel("Sort", { exact: true }).selectOption("alpha");
    await expect(field(page, "Output")).toHaveValue("a\nb\nC");
    await page.getByLabel("Join output with").selectOption("comma-space");
    await page.getByLabel("Prefix").fill("'");
    await page.getByLabel("Suffix").fill("'");
    await expect(field(page, "Output")).toHaveValue("'a', 'b', 'C'");
    await expect(page.getByText("5 in → 3 out · 1 empty removed · 1 duplicates removed")).toBeVisible();
    expect(await copyAndRead(page, "Copy list output")).toBe("'a', 'b', 'C'");
  });

  test("transposes columns and validates options", async ({ page }) => {
    await page.goto("/tools/list-converter");
    await page.getByText("Columns", { exact: true }).click();
    await field(page, "Input").fill("a\tb\nc\td");
    await page.getByRole("checkbox", { name: "Transpose rows and columns" }).check();
    await expect(field(page, "Output")).toHaveValue("a\tc\nb\td");
    await page.getByLabel("Max item length").fill("0");
    await expect(alert(page)).toContainText("Maximum item length");
  });

  test("sample, reset and clear", async ({ page }) => {
    await page.goto("/tools/list-converter");
    await page.getByRole("button", { name: "Sample" }).click();
    await page.getByLabel("Sort", { exact: true }).selectOption("natural");
    await page.getByRole("checkbox", { name: "Trim whitespace" }).check();
    await page.getByRole("checkbox", { name: "Remove empty lines" }).check();
    await expect(field(page, "Output")).toHaveValue("apple\nApple\nbanana\nbanana\ncherry\nitem9\nitem10");
    await page.getByRole("button", { name: "Reset options" }).click();
    await expect(page.getByLabel("Sort", { exact: true })).toHaveValue("none");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(field(page, "Output")).toHaveValue("");
  });
});

test.describe("MIME Type Lookup", () => {
  test("looks up an extension and a type", async ({ page }) => {
    await page.goto("/tools/mime-type-lookup");
    const input = field(page, "Extension, file name or MIME type");
    await expect(page.getByText(/types and .* extensions are available/)).toBeVisible();
    await input.fill("report.PDF");
    await expect(page.locator("[data-mime-type]").first()).toHaveText("application/pdf");
    await input.fill("js");
    await expect(page.locator("[data-mime-type]")).toHaveText(["text/javascript", "application/javascript"]);
    await expect(page.getByText("Usual type")).toBeVisible();
    await input.fill("text/html; charset=utf-8");
    await expect(page.getByRole("button", { name: ".htm", exact: true })).toBeVisible();
    expect(await copyAndRead(page, "Copy text/html")).toBe("text/html");
  });

  test("suggests corrections and explains the limits of extensions", async ({ page }) => {
    await page.goto("/tools/mime-type-lookup");
    await field(page, "Extension, file name or MIME type").fill("image/jpg");
    await page.getByRole("button", { name: "image/jpeg", exact: true }).click();
    await expect(page.locator("[data-mime-type]")).toHaveText("image/jpeg");
    await expect(page.getByText("An extension is a label, not proof")).toBeVisible();
    await page.getByRole("button", { name: /^\.woff2/ }).click();
    await expect(page.locator("[data-mime-type]")).toHaveText("font/woff2");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(field(page, "Extension, file name or MIME type")).toHaveValue("");
  });

  test("is the only page with a lookup field", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("searchbox")).toHaveCount(0);
    await expect(page.getByRole("textbox")).toHaveCount(0);
  });
});

test.describe("Slug Generator", () => {
  test("generates URL slugs per line with accents removed", async ({ page }) => {
    await page.goto("/tools/slug-generator");
    await field(page, "Text").fill("Crème Brûlée & Café!\n\nHello World");
    await expect(field(page, "Slugs")).toHaveValue("creme-brulee-and-cafe\n\nhello-world");
    expect(await copyAndRead(page, "Copy slugs")).toBe("creme-brulee-and-cafe\n\nhello-world");
  });

  test("switches modes, separators and Unicode handling", async ({ page }) => {
    await page.goto("/tools/slug-generator");
    await field(page, "Text").fill("Tokyo 東京 Report.PDF");
    await expect(page.getByText("Some characters have no ASCII equivalent")).toBeVisible();
    await expect(field(page, "Slugs")).toHaveValue("tokyo-report-pdf");
    await page.getByText("File name", { exact: true }).click();
    await expect(field(page, "Slugs")).toHaveValue("tokyo-report.pdf");
    await page.getByRole("checkbox", { name: "Keep non-Latin letters (Unicode slug)" }).check();
    await expect(field(page, "Slugs")).toHaveValue("tokyo-東京-report.pdf");
    await page.getByText("Identifier", { exact: true }).click();
    await expect(field(page, "Slugs")).toHaveValue("tokyo_report_pdf");
    await page.getByText("UPPER", { exact: true }).click();
    await expect(field(page, "Slugs")).toHaveValue("TOKYO_REPORT_PDF");
  });

  test("shows examples and supports sample and clear", async ({ page }) => {
    await page.goto("/tools/slug-generator");
    await expect(page.getByRole("cell", { name: "privet-mir" })).toBeVisible();
    await page.getByRole("button", { name: "Sample" }).click();
    await expect(field(page, "Slugs")).toHaveValue(/^10-tips-for-writing-clean-code\n/);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(field(page, "Slugs")).toHaveValue("");
  });
});

test.describe("String Obfuscator", () => {
  test("masks values per line and copies the result", async ({ page }) => {
    await page.goto("/tools/string-obfuscator");
    await field(page, "Text to mask").fill("sk_live_abcdef123\nabc");
    await expect(field(page, "Masked")).toHaveValue("sk*************23\n***");
    await expect(page.getByText("1 value was masked completely")).toBeVisible();
    expect(await copyAndRead(page, "Copy masked text")).toBe("sk*************23\n***");
  });

  test("keeps email domains and punctuation, hides length, validates the mask", async ({ page }) => {
    await page.goto("/tools/string-obfuscator");
    await page.getByRole("checkbox", { name: "Keep email domains" }).check();
    await field(page, "Text to mask").fill("ada.lovelace@example.com");
    await expect(field(page, "Masked")).toHaveValue("ad********ce@example.com");
    await page.getByLabel("Fixed mask length").fill("3");
    await expect(field(page, "Masked")).toHaveValue("ad***ce@example.com");
    await page.getByLabel("Mask character").fill("##");
    await expect(alert(page)).toContainText("single visible character");
  });

  test("shows the warning and supports sample and clear", async ({ page }) => {
    await page.goto("/tools/string-obfuscator");
    await expect(page.getByText("Masking is not encryption or anonymization")).toBeVisible();
    await page.getByRole("button", { name: "Sample" }).click();
    await expect(field(page, "Masked")).toHaveValue(/^sk\*+dc\n/);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(field(page, "Masked")).toHaveValue("");
  });
});

test.describe("ULID Generator", () => {
  const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

  test("generates sorted ULIDs in bulk and copies them", async ({ page }) => {
    await page.goto("/tools/ulid-generator");
    await page.getByRole("spinbutton", { name: "How many" }).fill("20");
    await page.getByRole("button", { name: "Generate" }).click();
    const value = await field(page, "20 ULIDs").inputValue();
    const ids = value.split("\n");
    expect(ids).toHaveLength(20);
    for (const id of ids) expect(id).toMatch(ULID);
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(20);
    expect(await copyAndRead(page, "Copy ULIDs")).toBe(value);
  });

  test("validates the count and supports lowercase and clear", async ({ page }) => {
    await page.goto("/tools/ulid-generator");
    await page.getByRole("spinbutton", { name: "How many" }).fill("0");
    await expect(page.getByRole("button", { name: "Generate" })).toBeDisabled();
    await page.getByRole("spinbutton", { name: "How many" }).fill("1");
    await page.getByRole("checkbox", { name: "Lowercase" }).check();
    await page.getByRole("button", { name: "Generate" }).click();
    await expect(field(page, "1 ULID")).toHaveValue(/^[0-7][0-9a-hjkmnp-tv-z]{25}$/);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(field(page, "ULIDs")).toHaveValue("");
  });

  test("decodes the timestamp of a ULID and rejects invalid ones", async ({ page }) => {
    await page.goto("/tools/ulid-generator");
    await field(page, "ULID").fill("01ARYZ6S41TSV4RRFFQ69G5FAV");
    await expect(page.locator('[data-ulid="time"]')).toContainText("2016-07-30T22:36:16.385Z");
    await field(page, "ULID").fill("01ARYZ6S41TSV4RRFFQ69G5FAU");
    await expect(page.getByText('"U" at position 26 is not a ULID character')).toBeVisible();
  });
});
