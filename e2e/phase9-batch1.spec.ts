import { expect, test } from "@playwright/test";
import { accessibilityViolations, alert, copyAndRead, field, hasHorizontalOverflow, watchForLeaks } from "./helpers";

const PAGES = ["curl-to-code", "url-parser", "html-wysiwyg-editor", "user-agent-parser", "http-status-codes", "keycode-inspector"];

test.describe("Phase 9 batch 1: accessibility and layout", () => {
  for (const slug of PAGES) {
    test(`${slug} has no axe violations and fits a phone screen`, async ({ page }) => {
      await page.goto(`/tools/${slug}`);
      expect(await accessibilityViolations(page)).toEqual([]);
      await page.setViewportSize({ width: 360, height: 800 });
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});

test.describe("cURL to Code Converter", () => {
  test("converts the sample to every language without sending the request", async ({ page }) => {
    await page.goto("/tools/curl-to-code");
    const check = watchForLeaks(page);
    await page.getByRole("button", { name: "Sample" }).click();
    const output = page.locator("textarea[readonly]");
    await expect(output).toHaveValue(/await fetch\("https:\/\/api\.example\.com\/v1\/orders\?expand=items", \{\n  method: "POST",/);
    await expect(output).toHaveValue(/signal: AbortSignal\.timeout\(10000\)/);
    for (const [value, pattern] of [
      ["python", /requests\.post\(/],
      ["php", /curl_setopt_array\(\$ch, \[/],
      ["go", /http\.NewRequest\("POST"/],
      ["ruby", /Net::HTTP::Post\.new\(uri\)/],
      ["node", /import https from "node:https";/],
    ] as const) {
      await page.getByLabel("Language").selectOption(value);
      await expect(output).toHaveValue(pattern);
    }
    expect(await copyAndRead(page, "Copy Node.js (https) code")).toContain("https.request(");
    await expect(page.getByText(/\$API_TOKEN was kept as literal text/)).toBeVisible();
    await expect(page.getByText(/--compressed is not needed/)).toBeVisible();
    await check(["api.example.com/v1/orders"]);
  });

  test("reports unsupported options and rejects malformed commands", async ({ page }) => {
    await page.goto("/tools/curl-to-code");
    const input = field(page, "curl command");
    await input.fill("curl --proxy http://p:1 --digest https://x.test");
    await expect(page.getByText("Unsupported options were not converted")).toBeVisible();
    await expect(alert(page).filter({ hasText: "--proxy, --digest" })).toBeVisible();
    await input.fill("curl -d @secrets.json https://x.test");
    await expect(alert(page)).toContainText("reads the request body from a file");
    await input.fill("curl 'https://x.test");
    await expect(alert(page)).toContainText("never closed");
    await input.fill("rm -rf /");
    await expect(alert(page)).toContainText('start with "curl"');
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(input).toHaveValue("");
  });
});

test.describe("URL Parser", () => {
  test("parses parts and repeated parameters, edits the query, and never requests the URL", async ({ page }) => {
    await page.goto("/tools/url-parser");
    const check = watchForLeaks(page);
    await page.getByRole("button", { name: "Sample" }).click();
    await expect(page.locator('[data-part="hostname"]')).toHaveText("shop.example.com");
    await expect(page.locator('[data-part="port"]')).toHaveText("8443");
    await expect(page.locator('[data-part="password"]')).toHaveText("••••••");
    await expect(page.getByText(/username or password/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Query parameters (4)" })).toBeVisible();
    await expect(page.getByLabel("Parameter 3 value")).toHaveValue("fair trade");

    await page.getByLabel("Parameter 4 value").fill("light & mild");
    await page.getByRole("button", { name: "Remove parameter 1" }).click();
    await page.getByRole("button", { name: "Add parameter" }).click();
    await page.getByLabel("Parameter 4 key").fill("page");
    await page.getByLabel("Parameter 4 value").fill("2");
    await expect(field(page, "Rebuilt URL")).toHaveValue("https://user:secret@shop.example.com:8443/products/caf%C3%A9-beans?tag=organic&tag=fair+trade&q=light+%26+mild&page=2#reviews");
    expect(JSON.parse(await copyAndRead(page, "Copy parameters as JSON"))).toEqual({ tag: ["organic", "fair trade"], q: "light & mild", page: "2" });
    await check(["shop.example.com"]);
  });

  test("explains relative URLs, resolves them with a base, and suggests a scheme", async ({ page }) => {
    await page.goto("/tools/url-parser");
    await field(page, "URL").fill("../img/logo.png?v=3");
    await expect(alert(page)).toContainText("relative URL");
    await page.getByLabel("Base URL for relative URLs (optional)").fill("https://example.com/docs/guide/page.html");
    await expect(page.locator('[data-part="path"]')).toHaveText("/docs/img/logo.png");
    await page.getByLabel("Base URL for relative URLs (optional)").fill("");
    await field(page, "URL").fill("example.com/a?b=c");
    await page.getByRole("button", { name: "Use https://example.com/a?b=c" }).click();
    await expect(page.locator('[data-part="hostname"]')).toHaveText("example.com");
  });
});

test.describe("HTML WYSIWYG Editor", () => {
  test("sanitizes the sample, runs no scripts and loads nothing remote", async ({ page }) => {
    const dialogs: string[] = [];
    page.on("dialog", (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    await page.goto("/tools/html-wysiwyg-editor");
    const check = watchForLeaks(page);
    await page.getByRole("button", { name: "Sample" }).click();
    const output = field(page, "Clean HTML");
    await expect(output).toHaveValue(/<h2>Release notes<\/h2>/);
    const html = await output.inputValue();
    expect(html).not.toMatch(/<script|onclick|javascript:/i);
    expect(html).toContain('<img src="https://example.com/banner.png"');

    const editor = page.locator('iframe[title="Visual HTML editor"]');
    await expect(editor).toHaveAttribute("sandbox", "allow-same-origin");
    await page.getByText("Preview", { exact: true }).click();
    await expect(page.locator('iframe[title="Preview of the HTML"]')).toHaveAttribute("sandbox", "");
    await expect(page.frameLocator('iframe[title="Preview of the HTML"]').getByRole("heading", { name: "Release notes" })).toBeVisible();
    // The remote image must not have been requested.
    await check([]);
    expect(dialogs).toEqual([]);
  });

  test("formats text in the visual editor", async ({ page }) => {
    await page.goto("/tools/html-wysiwyg-editor");
    const body = page.frameLocator('iframe[title="Visual HTML editor"]').locator("body");
    await body.click();
    await page.keyboard.type("Hello editor");
    await page.keyboard.press("ControlOrMeta+A");
    await page.getByRole("button", { name: "Bold" }).click();
    await expect(field(page, "Clean HTML")).toHaveValue(/<(b|strong)>Hello editor<\/(b|strong)>/);
    await page.getByRole("button", { name: "H2 (heading 2)" }).click();
    await expect(field(page, "Clean HTML")).toHaveValue(/<h2>/);
    await page.getByLabel("Link address").fill("javascript:alert(1)");
    await page.getByRole("button", { name: "Link", exact: true }).click();
    await expect(page.getByText("Only http, https, mailto and tel links are allowed.")).toBeVisible();
    await page.getByLabel("Link address").fill("example.com");
    await page.getByRole("button", { name: "Link", exact: true }).click();
    await expect(field(page, "Clean HTML")).toHaveValue(/<a href="https:\/\/example\.com\/">/);
  });

  test("cleans markup written in the source view", async ({ page }) => {
    const dialogs: string[] = [];
    page.on("dialog", (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    await page.goto("/tools/html-wysiwyg-editor");
    await page.getByText("HTML source", { exact: true }).click();
    await field(page, "HTML source").fill('<p>Safe</p><img src=x onerror="alert(1)"><iframe src="https://evil.test"></iframe><style>p{color:red}</style>');
    await expect(page.getByText("Some markup will be removed")).toBeVisible();
    await page.getByText("Preview", { exact: true }).click();
    await expect(field(page, "Clean HTML")).toHaveValue('<p>Safe</p><img src="x">');
    await expect(page.frameLocator('iframe[title="Preview of the HTML"]').getByText("Safe")).toBeVisible();
    expect(dialogs).toEqual([]);
  });
});

test.describe("User-Agent Parser", () => {
  test("parses samples and the current browser", async ({ page }) => {
    await page.goto("/tools/user-agent-parser");
    await page.getByLabel("Sample user agents").selectOption({ label: "Safari on iPhone" });
    await expect(page.locator('[data-ua="browser"]')).toHaveText("Safari 17.5");
    await expect(page.locator('[data-ua="operating system"]')).toHaveText("iOS 17.5");
    await expect(page.locator('[data-ua="device type"]')).toHaveText("Mobile");
    await page.getByLabel("Sample user agents").selectOption({ label: "Googlebot" });
    await expect(page.getByText("Bot or automation")).toBeVisible();

    await page.getByRole("button", { name: "Use my browser" }).click();
    await expect(field(page, "User-agent string")).toHaveValue(await page.evaluate(() => navigator.userAgent));
    await expect(page.locator('[data-ua="browser"]')).toContainText("Chrome");
    await expect(page.getByText("User-agent detection is a heuristic", { exact: true })).toBeVisible();
  });

  test("rejects malformed input", async ({ page }) => {
    await page.goto("/tools/user-agent-parser");
    await field(page, "User-agent string").fill("Mozilla/5.0\nX-Evil: 1");
    await expect(alert(page)).toContainText("control characters");
    await field(page, "User-agent string").fill("x".repeat(2100));
    await expect(alert(page)).toContainText("longer than");
  });
});

test.describe("HTTP Status Code Reference", () => {
  test("looks up codes and filters categories", async ({ page }) => {
    await page.goto("/tools/http-status-codes");
    await expect(page.getByText("63 status codes")).toBeVisible();
    const lookup = page.getByLabel("Look up a status code");
    await lookup.fill("404");
    await expect(page.locator("[data-status]")).toHaveCount(1);
    await expect(page.locator('[data-status="404"]')).toContainText("Not Found");
    await lookup.fill("rate limiting");
    await expect(page.locator("[data-status]")).toHaveCount(1);
    await expect(page.locator('[data-status="429"]')).toBeVisible();
    await lookup.fill("");
    await page.getByRole("button", { name: "5xx Server error" }).click();
    await expect(page.getByRole("button", { name: "5xx Server error" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-status]")).toHaveCount(11);
    await lookup.fill("zzz");
    await expect(page.getByText("No status code matches.")).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator("[data-status]")).toHaveCount(63);
    expect(await copyAndRead(page, "Copy 418 (Unused)")).toBe("418 (Unused)");
  });
});

test.describe("JavaScript Keycode Inspector", () => {
  test("shows key, code, legacy keyCode and modifiers for keydown and keyup", async ({ page }) => {
    await page.goto("/tools/keycode-inspector");
    const area = page.getByRole("application", { name: /Key capture area/ });
    await area.focus();
    await page.keyboard.press("a");
    await expect(page.locator('[data-field="event.key"]')).toHaveText("a");
    await expect(page.locator('[data-field="event.code"]')).toHaveText("KeyA");
    await expect(page.locator('[data-field="event.keyCode"]')).toHaveText("65");
    await expect(page.getByText("legacy").first()).toBeVisible();
    await page.keyboard.press("Shift+ArrowRight");
    await expect(page.locator('[data-field="Modifiers"]')).toHaveText("Shift");
    await expect(page.locator("[data-latest-key]")).toHaveText("ArrowRight");
    const rows = page.locator("[data-key-log] tbody tr");
    // a down/up, Shift down, ArrowRight down/up, Shift up.
    await expect(rows).toHaveCount(6);
    await expect(rows.first()).toContainText("keyup");
    expect(await copyAndRead(page, "Copy condition using event.key")).toBe('event.shiftKey && event.key === "ArrowRight"');
  });

  test("leaves text fields alone and lets Tab move focus out", async ({ page }) => {
    await page.goto("/tools/keycode-inspector");
    const area = page.getByRole("application", { name: /Key capture area/ });
    await area.focus();
    await page.keyboard.press("Tab");
    await expect(area).not.toBeFocused();
    // The Tab keydown itself is logged before focus leaves; nothing after it.
    const rows = page.locator("[data-key-log] tbody tr");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Tab");

    const scratch = page.getByLabel("Scratch field (keys typed here are not captured)");
    await scratch.fill("");
    await scratch.focus();
    await page.keyboard.type("hello");
    await expect(scratch).toHaveValue("hello");
    await expect(rows).toHaveCount(1);
  });

  test("can stop recording keyup and clear the log", async ({ page }) => {
    await page.goto("/tools/keycode-inspector");
    await page.getByRole("checkbox", { name: "Record keyup" }).uncheck();
    await page.getByRole("application", { name: /Key capture area/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-key-log] tbody tr")).toHaveCount(1);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator("[data-key-log]")).toHaveCount(0);
  });
});
