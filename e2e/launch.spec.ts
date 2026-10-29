import { expect, test, type Page } from "@playwright/test";
import { categories } from "../src/content/categories";
import { availableTools } from "../src/content/tools";
import { tutorials } from "../src/content/tutorials";
import { field } from "./helpers";

// Launch checks: every page loads cleanly, and the tools that had only page-level
// coverage (the first phases) are exercised end to end.

const pages = [
  "/",
  "/tools",
  ...categories.map((c) => `/categories/${c.slug}`),
  ...availableTools.map((t) => `/tools/${t.slug}`),
  "/tutorials",
  ...tutorials.map((t) => `/tutorials/${t.slug}`),
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms",
];

/** Records console errors, uncaught exceptions, failed requests and error responses from now on. */
function watchForProblems(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`exception: ${e.message}`));
  // ERR_ABORTED is a request cancelled on purpose, such as a link prefetch when the page navigates away;
  // a missing or broken asset shows up as an error response or another failure.
  page.on("requestfailed", (r) => {
    if (r.failure()?.errorText !== "net::ERR_ABORTED") problems.push(`failed: ${r.url()} ${r.failure()?.errorText}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  return problems;
}

const SANDBOX_NOTICE = "console: Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed";

/**
 * Playwright injects its own script into every frame, and Chrome logs SANDBOX_NOTICE when that
 * script meets a sandboxed frame without allow-scripts (the HTML WYSIWYG Editor's frames). Plain
 * Chrome logs nothing for the same page, so the notice is removed only after checking that no
 * srcdoc frame on the page allows scripts or contains any script, inline handler or javascript: URL.
 * If one did, the notice could come from the app, and it is kept as a problem.
 */
async function withoutHarnessSandboxNotices(page: Page, found: string[]): Promise<string[]> {
  if (!found.some((p) => p.startsWith(SANDBOX_NOTICE))) return found;
  const sandboxes = await page.locator("iframe[srcdoc]").evaluateAll((frames) => frames.map((f) => f.getAttribute("sandbox")));
  const framesAreInert = sandboxes.length > 0 && sandboxes.every((s) => s !== null && !s.split(/\s+/).includes("allow-scripts"));
  for (const frame of page.frames().slice(1)) {
    const html = await frame.content();
    if (/<script\b|\son[a-z]+\s*=|javascript:/i.test(html)) return found;
  }
  return framesAreInert ? found.filter((p) => !p.startsWith(SANDBOX_NOTICE)) : found;
}

test("every page loads without console errors, exceptions or failed requests, in both themes and on a phone", async ({ page }) => {
  test.setTimeout(300_000);
  const problems = watchForProblems(page);
  for (const [colorScheme, width] of [["light", 1280], ["dark", 390]] as const) {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width, height: 900 });
    for (const path of pages) {
      const before = problems.length;
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const found = problems.slice(before);
      expect(await withoutHarnessSandboxNotices(page, found), `${path} (${colorScheme}, ${width} px)`).toEqual([]);
    }
  }
});

test.describe("tool workflows", () => {
  let problems: string[];
  test.beforeEach(({ page }) => {
    problems = watchForProblems(page);
  });
  test.afterEach(() => {
    expect(problems).toEqual([]);
  });

  test("Word & Character Counter counts and clears", async ({ page }) => {
    await page.goto("/tools/word-counter");
    await field(page, "Your text").fill("One two three.\nFour five.");
    const stat = (label: string) => page.locator("dl > div").filter({ has: page.getByText(label, { exact: true }) }).locator("dd");
    await expect(stat("Words")).toHaveText("5");
    await expect(stat("Sentences")).toHaveText("2");
    await expect(stat("Lines")).toHaveText("2");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(field(page, "Your text")).toHaveValue("");
    await expect(stat("Words")).toHaveText("0");
  });

  test("URL Encoder & Decoder round-trips text", async ({ page }) => {
    await page.goto("/tools/url-encoder-decoder");
    await field(page, "Input").fill("a b&c=é");
    await page.getByRole("button", { name: "Encode" }).click();
    await expect(field(page, "Output")).toHaveValue("a%20b%26c%3D%C3%A9");
    await field(page, "Input").fill("a%20b%26c%3D%C3%A9");
    await page.getByRole("button", { name: "Decode" }).click();
    await expect(field(page, "Output")).toHaveValue("a b&c=é");
  });

  test("Minifier minifies CSS", async ({ page }) => {
    await page.goto("/tools/html-css-js-minifier");
    // The radio is visually hidden; people click its visible label, as here.
    const css = page.getByRole("radio", { name: "CSS", exact: true });
    await page.locator("label").filter({ has: css }).click();
    await expect(css).toBeChecked();
    await field(page, "CSS input").fill("a {\n  color: #ff0000;\n  /* note */\n  margin: 0px;\n}");
    await page.getByRole("button", { name: "Minify CSS" }).click();
    await expect(field(page, "Minified output")).toHaveValue("a{color:red;margin:0}");
  });

  test("Text Case Converter shows every case", async ({ page }) => {
    await page.goto("/tools/text-case-converter");
    await field(page, "Text to convert").fill("user account id");
    await expect(field(page, "camelCase")).toHaveValue("userAccountId");
    await expect(field(page, "snake_case")).toHaveValue("user_account_id");
    await expect(field(page, "kebab-case")).toHaveValue("user-account-id");
  });

  test("Regex Tester highlights matches in a worker", async ({ page }) => {
    await page.goto("/tools/regex-tester");
    await page.getByLabel("Regular expression").fill("\\d+");
    await field(page, "Test text").fill("a1 b22 c333");
    const highlighted = page.getByLabel("Test text with matches highlighted");
    await expect(highlighted.locator("mark")).toHaveText(["1", "22", "333"]);
  });

  test("JWT Decoder decodes header and payload", async ({ page }) => {
    await page.goto("/tools/jwt-decoder");
    // {"alg":"HS256","typ":"JWT"} . {"sub":"42","name":"Ada"} . signature
    await field(page, "JSON Web Token").fill("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsIm5hbWUiOiJBZGEifQ.c2ln");
    // Each decoded part is a <pre> labelled by its panel heading.
    await expect(page.getByLabel("Payload", { exact: true })).toContainText('"name": "Ada"');
    await expect(page.getByLabel("Header", { exact: true })).toContainText('"alg": "HS256"');
  });

  test("JSON to TypeScript generates an interface", async ({ page }) => {
    await page.goto("/tools/json-to-typescript");
    await field(page, "JSON sample").fill('{"id": 1, "name": "Ada", "tags": ["a"]}');
    await page.getByRole("button", { name: "Generate types" }).click();
    const output = field(page, "TypeScript");
    await expect(output).toHaveValue(/id: number;/);
    await expect(output).toHaveValue(/name: string;/);
    await expect(output).toHaveValue(/tags: string\[\];/);
  });

  test("JSON Schema Validator reports errors with their path", async ({ page }) => {
    await page.goto("/tools/json-schema-validator");
    await field(page, "JSON Schema").fill('{"type": "object", "required": ["id"], "properties": {"id": {"type": "integer"}}}');
    await field(page, "JSON data").fill('{"id": "42"}');
    await page.getByRole("button", { name: "Validate", exact: true }).click();
    await expect(page.getByText("$.id").first()).toBeVisible();
    await field(page, "JSON data").fill('{"id": 42}');
    await page.getByRole("button", { name: "Validate", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: /valid/i }).first()).toBeVisible();
  });

  test("XML Formatter formats and rejects invalid XML", async ({ page }) => {
    await page.goto("/tools/xml-formatter");
    await field(page, "XML input").fill("<a><b>1</b></a>");
    await page.getByRole("button", { name: "Format", exact: true }).click();
    await expect(field(page, "Result")).toHaveValue("<a>\n  <b>1</b>\n</a>");
    await field(page, "XML input").fill("<a><b></a>");
    await page.getByRole("button", { name: "Format", exact: true }).click();
    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toBeVisible();
  });

  test("JSON Diff lists changed values by path", async ({ page }) => {
    await page.goto("/tools/json-diff");
    await field(page, "Original JSON").fill('{"a": 1, "b": [1, 2]}');
    await field(page, "Changed JSON").fill('{"b": [1, 3], "a": 1, "c": true}');
    await page.getByRole("button", { name: "Compare" }).click();
    await expect(page.getByText("$.b[1]").first()).toBeVisible();
    await expect(page.getByText("$.c").first()).toBeVisible();
  });

  test("Cron Expression Helper describes a schedule and lists runs", async ({ page }) => {
    await page.goto("/tools/cron-expression-helper");
    await field(page, "Cron expression").fill("0 9 * * 1");
    await expect(page.getByRole("status").filter({ hasText: "At 09:00, on Monday." })).toBeVisible();
    await expect(page.locator("ol li").first()).toBeVisible();
  });

  test("Markdown Editor renders a sanitized preview", async ({ page }) => {
    await page.goto("/tools/markdown-editor");
    await field(page, "Markdown").fill("# Title\n\n**bold** <script>alert(1)</script> [x](javascript:alert(1))");
    const preview = page.getByRole("region", { name: "Preview" });
    await expect(preview.getByRole("heading", { name: "Title" })).toBeVisible();
    await expect(preview.locator("strong")).toHaveText("bold");
    await expect(preview.locator("script")).toHaveCount(0);
    await expect(preview.locator('a[href^="javascript"]')).toHaveCount(0);
  });

  test("PX to REM Converter converts values and CSS", async ({ page }) => {
    await page.goto("/tools/px-to-rem-converter");
    await field(page, "Values or CSS in px").fill("margin: 16px 24px;");
    await expect(field(page, "Result")).toHaveValue("margin: 1rem 1.5rem;");
  });

  test("Flexbox Playground updates the CSS and resets", async ({ page }) => {
    await page.goto("/tools/flexbox-playground");
    const css = page.getByLabel("CSS", { exact: true });
    await page.getByLabel("justify-content").selectOption("space-between");
    await expect(css).toContainText("justify-content: space-between;");
    await page.getByRole("button", { name: "Add item" }).click();
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(css).not.toContainText("space-between");
  });
});
