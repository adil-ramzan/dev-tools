import { expect, test, type Page } from "@playwright/test";
import { accessibilityViolations, alert, copyAndRead, hasHorizontalOverflow, watchForLeaks } from "./helpers";

const PAGES = ["password-generator", "http-header-analyzer", "meta-tag-generator"];

async function markPage(page: Page) {
  await page.evaluate(() => ((window as unknown as { __noReload: string }).__noReload = "still here"));
}
async function expectSamePage(page: Page) {
  expect(await page.evaluate(() => (window as unknown as { __noReload?: string }).__noReload)).toBe("still here");
  expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);
}

test.describe("Phase 11 batch 1: accessibility and layout with results shown", () => {
  for (const slug of PAGES) {
    test(slug, async ({ page }) => {
      for (const colorScheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme });
        await page.goto(`/tools/${slug}`);
        if (slug !== "password-generator") await page.getByRole("button", { name: "Sample" }).click();
        await expect(page.locator("main")).toBeVisible();
        expect(await accessibilityViolations(page), colorScheme).toEqual([]);
      }
      await page.setViewportSize({ width: 360, height: 800 });
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});

test.describe("Password Generator", () => {
  test("generates on load and on change, honors exclusions, and never leaks", async ({ page }) => {
    await page.goto("/tools/password-generator");
    await markPage(page);
    const check = watchForLeaks(page);
    const output = page.getByLabel("Generated password", { exact: true });
    await expect(output).toHaveValue(/^.{20}$/);
    const first = await output.inputValue();
    await expect(page.locator("[data-strength]")).toHaveText("Very strong");
    await expect(page.locator("[data-entropy]")).toContainText("130 bits");

    await page.getByRole("button", { name: "Generate new" }).click();
    await expect(output).not.toHaveValue(first);
    const second = await output.inputValue();
    expect(await copyAndRead(page, "Copy password")).toBe(second);

    await page.getByRole("switch", { name: "Symbols (!@#…)" }).click();
    await page.getByRole("switch", { name: /^Exclude ambiguous/ }).click();
    await page.getByLabel("Also exclude these characters").fill("abc");
    await page.getByLabel("How many").fill("10");
    await page.getByRole("spinbutton", { name: /Length/ }).fill("12");
    const many = page.getByLabel("Generated passwords", { exact: true });
    await expect(many).toHaveValue(/^([A-Za-z0-9]{12}\n){9}[A-Za-z0-9]{12}$/);
    const passwords = (await many.inputValue()).split("\n");
    for (const p of passwords) {
      expect(p).not.toMatch(/[Il1|O0oabc]/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[0-9]/);
    }

    await page.getByRole("spinbutton", { name: /Length/ }).fill("4");
    await page.getByRole("switch", { name: "Symbols (!@#…)" }).click();
    await page.getByLabel("Also exclude these characters").fill("");
    await page.getByLabel("How many").fill("1");
    await expect(output).toHaveValue(/^.{4}$/);
    await page.getByRole("switch", { name: "Numbers (0–9)" }).click();
    await page.getByLabel("Also exclude these characters").fill("ABCDEFGHJKLMNPQRSTUVWXYZ");
    await expect(alert(page)).toContainText("uppercase letters set is excluded");
    await expect(page.getByRole("button", { name: "Generate new" })).toBeDisabled();

    await page.getByRole("button", { name: "Reset settings" }).click();
    await expect(output).toHaveValue(/^.{20}$/);
    await expect(alert(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(output).toHaveValue("");
    await page.getByRole("button", { name: "Generate new" }).click();
    const last = await output.inputValue();
    expect(last).toHaveLength(20);

    await page.evaluate(() => {
      crypto.getRandomValues = () => {
        throw new Error("generator unavailable");
      };
    });
    await page.getByRole("button", { name: "Generate new" }).click();
    await expect(alert(page)).toContainText("generator unavailable");
    await expectSamePage(page);
    await check([first, second, last, ...passwords]);
  });
});

test.describe("HTTP Header Analyzer", () => {
  test("explains pasted headers, flags problems and clears", async ({ page }) => {
    await page.goto("/tools/http-header-analyzer");
    await markPage(page);
    const check = watchForLeaks(page);
    const input = page.getByLabel("Response headers");
    await page.getByRole("button", { name: "Sample" }).click();
    await expect(page.getByRole("status").filter({ hasText: /11 headers · HTTP\/2 200 OK · \d+ errors?/ })).toBeVisible();
    await expect(page.locator('[data-finding="error"]').first()).toContainText("Wildcard origin with credentials");
    await expect(page.locator("[data-caching-summary]")).toContainText("fresh for 10 minutes in browsers");
    await expect(page.locator('[data-check="X-Content-Type-Options"]')).toContainText("Missing");
    await expect(page.locator('[data-check="Strict-Transport-Security"]')).toContainText("Present");
    await expect(page.getByText("Which origin may read this response from JavaScript (CORS).")).toBeVisible();
    expect(await copyAndRead(page, "Copy report of findings")).toContain("[Error] Wildcard origin with credentials");

    await input.fill("HTTP/1.1 200 OK\nContent-Type: application/json\nCache-Control: no-store\nbroken line\nSet-Cookie: id=secret-cookie-123; SameSite=None");
    await expect(page.getByText("1 line was not read as headers")).toBeVisible();
    await expect(page.locator('[data-finding="error"]')).toContainText(["Cookie id: SameSite=None without Secure"]);
    await expect(page.locator("[data-caching-summary]")).toContainText("Not stored by any cache.");
    const findings = page.locator("[data-finding]");
    await expect(findings.filter({ hasText: "No Strict-Transport-Security" })).toHaveCount(1);
    await page.getByLabel("Served over HTTPS").uncheck();
    await expect(findings.filter({ hasText: "No Strict-Transport-Security" })).toHaveCount(0);

    await input.fill("just some words");
    await expect(page.getByText("No headers found")).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(input).toHaveValue("");
    await expect(page.getByRole("heading", { name: "Findings" })).toHaveCount(0);
    await expectSamePage(page);
    await check(["secret-cookie-123"]);
  });
});

test.describe("Meta Tag Generator", () => {
  test("builds escaped tags, validates fields, copies, downloads and clears", async ({ page }) => {
    await page.goto("/tools/meta-tag-generator");
    await markPage(page);
    const check = watchForLeaks(page);
    const output = page.getByLabel("HTML for the <head>");
    await expect(output).toHaveValue(/^<meta charset="utf-8">\n<meta name="viewport"[^\n]*$/);

    await page.getByRole("button", { name: "Sample" }).click();
    await expect(output).toHaveValue(/<meta property="og:image" content="https:\/\/acme.example\/og\/home.png">/);
    await expect(output).toHaveValue(/<meta name="twitter:card" content="summary_large_image">/);

    await page.getByLabel("Title", { exact: true }).fill('Fish & "Chips" <Shop>');
    await expect(output).toHaveValue(/<title>Fish &amp; &quot;Chips&quot; &lt;Shop&gt;<\/title>/);
    await expect(page.getByText(/Short titles/)).toBeVisible();

    await page.getByLabel("Canonical URL").fill("acme.example/page");
    await expect(page.getByText("Use an absolute http(s) URL, such as https://example.com/page.")).toBeVisible();
    await expect(page.getByLabel("Canonical URL")).toHaveAttribute("aria-invalid", "true");
    await expect(output).not.toHaveValue(/canonical/);
    await page.getByLabel("Canonical URL").fill("https://acme.example/page");
    await expect(output).toHaveValue(/<link rel="canonical" href="https:\/\/acme.example\/page">/);

    await page.getByLabel("Allow search engines to index this page").uncheck();
    await expect(output).toHaveValue(/<meta name="robots" content="noindex, follow">/);
    await page.getByLabel("Twitter/X card").selectOption("summary");
    await expect(output).toHaveValue(/twitter:card" content="summary">/);

    const copied = await copyAndRead(page, "Copy HTML meta tags");
    expect(copied).toBe(await output.inputValue());
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download" }).click();
    expect((await download).suggestedFilename()).toBe("meta-tags.html");

    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Allow search engines to index this page")).toBeChecked();
    await expect(output).toHaveValue(/^<meta charset="utf-8">\n<meta name="viewport"[^\n]*$/);
    await expectSamePage(page);
    // The share image URL is shown as text only; it must never be requested.
    await check(["acme.example/og/home.png"]);
  });
});
