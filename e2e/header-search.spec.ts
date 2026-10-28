import { expect, test, type Page } from "@playwright/test";
import { accessibilityViolations, hasHorizontalOverflow, watchForLeaks } from "./helpers";

const search = (page: Page) => page.getByRole("combobox", { name: "Search tools" });
const options = (page: Page) => page.getByRole("listbox", { name: "Matching tools" }).getByRole("option");

/** Marks the page so a full reload (which would discard the marker) is detectable. */
async function markPage(page: Page) {
  await page.evaluate(() => ((window as unknown as { __noReload: string }).__noReload = "still here"));
}
async function expectNoReload(page: Page) {
  expect(await page.evaluate(() => (window as unknown as { __noReload?: string }).__noReload)).toBe("still here");
}

test.describe("Header search", () => {
  test("finds tools as you type, announces counts and shows an empty state", async ({ page }) => {
    await page.goto("/tools");
    await markPage(page);
    const check = watchForLeaks(page);
    const input = search(page);
    await expect(input).toHaveAttribute("aria-expanded", "false");

    await input.fill("json");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await expect(options(page).first()).toContainText("JSON");
    const count = await options(page).count();
    expect(count).toBeGreaterThan(3);
    await expect(page.getByRole("status").filter({ hasText: `${count} tools found` })).toBeAttached();
    // The matching word is highlighted, and each result names its category.
    await expect(options(page).first().locator("mark").first()).toHaveText(/json/i);
    await expect(options(page).first()).toContainText("·");

    await input.fill("epoch");
    await expect(options(page).first()).toContainText("Unix Timestamp Converter");
    await input.fill("networking");
    await expect(options(page).filter({ hasText: "IPv4 Subnet Calculator" })).toHaveCount(1);

    await input.fill("zzqqxx");
    await expect(page.getByText("No tools match “zzqqxx”.")).toBeVisible();
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("status").filter({ hasText: "No tools match." })).toBeAttached();

    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(input).toHaveValue("");
    await expect(input).toBeFocused();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Clear search" })).toHaveCount(0);

    expect(page.url()).not.toContain("json");
    await expectNoReload(page);
    await check(["zzqqxx", "epoch"]);
  });

  test("moves through results with the keyboard and opens one with Enter", async ({ page }) => {
    await page.goto("/");
    await markPage(page);
    const input = search(page);
    await input.fill("uuid");
    await input.press("ArrowDown");
    const first = options(page).first();
    await expect(first).toHaveAttribute("aria-selected", "true");
    await expect(input).toHaveAttribute("aria-activedescendant", (await first.getAttribute("id"))!);

    await input.fill("converter");
    await input.press("ArrowDown");
    await input.press("ArrowDown");
    await expect(options(page).nth(1)).toHaveAttribute("aria-selected", "true");
    await input.press("ArrowUp");
    await input.press("ArrowUp");
    // Wraps around from the first option to the last.
    await expect(options(page).last()).toHaveAttribute("aria-selected", "true");

    await input.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(input).toHaveValue("converter");
    await input.press("Escape");
    await expect(input).toHaveValue("");

    await input.fill("uuid gen");
    await input.press("ArrowDown");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/tools\/uuid-generator$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("UUID Generator");
    await expect(input).toHaveValue("");
    // Client-side navigation: the page was not reloaded.
    await expectNoReload(page);
  });

  test("opens a result on click and closes on outside click", async ({ page }) => {
    await page.goto("/");
    await markPage(page);
    const input = search(page);
    await input.fill("regex");
    await expect(options(page).first()).toBeVisible();
    await page.locator("main h1").click();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await input.click();
    await expect(options(page).first()).toBeVisible();
    await options(page).filter({ hasText: "Regex Tester" }).click();
    await expect(page).toHaveURL(/\/tools\/regex-tester$/);
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expectNoReload(page);
  });

  test("focuses with / and Ctrl+K without taking over typing or Ctrl+Enter", async ({ page }) => {
    await page.goto("/tools/json-formatter");
    const input = search(page);
    await page.locator("main h1").click();
    await page.keyboard.press("/");
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("");

    // In a text field, / is typed and Ctrl+Enter still runs the tool.
    const json = page.getByRole("textbox", { name: "JSON input", exact: true });
    await json.fill('{"a":1}');
    await json.press("/");
    await expect(json).toHaveValue('{"a":1}/');
    await expect(json).toBeFocused();
    await json.fill('{"a":1}');
    await json.press("ControlOrMeta+Enter");
    await expect(page.getByRole("textbox", { name: "Result", exact: true })).toHaveValue('{\n  "a": 1\n}');
    await expect(json).toBeFocused();

    // Ctrl/⌘+K works from anywhere, including text fields.
    await json.press("ControlOrMeta+k");
    await expect(input).toBeFocused();
    await input.press("Escape");
    await expect(input).not.toBeFocused();
  });

  test("the Keycode Inspector still receives / and Ctrl+K", async ({ page }) => {
    await page.goto("/tools/keycode-inspector");
    const area = page.locator("[data-key-capture]");
    await area.focus();
    await page.keyboard.press("/");
    await expect(area).toBeFocused();
    await expect(page.locator("[data-latest-key]")).toHaveText("/");
  });

  test("on a phone, expands below the header without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/");
    await markPage(page);
    const input = search(page);
    await expect(input).toBeHidden();
    const toggle = page.getByRole("button", { name: "Search tools" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    // Navigation and the theme toggle stay available.
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
    await expect(page.locator(".theme-toggle")).toBeVisible();

    await toggle.click();
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
    await input.fill("base64");
    await expect(options(page).first()).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
    const box = await page.getByRole("listbox").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
    expect(await accessibilityViolations(page)).toEqual([]);

    await options(page).first().click();
    await expect(page).toHaveURL(/\/tools\/base64-/);
    await expect(input).toBeHidden();

    await page.keyboard.press("/");
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
    await input.press("Escape");
    await expect(input).toBeHidden();
    await expect(page.getByRole("button", { name: "Search tools" })).toBeFocused();
    await expectNoReload(page);
  });

  test("passes accessibility checks with results open in both themes", async ({ page }) => {
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await page.goto("/tools");
      await search(page).fill("hash");
      await search(page).press("ArrowDown");
      await expect(options(page).first()).toHaveAttribute("aria-selected", "true");
      expect(await accessibilityViolations(page), colorScheme).toEqual([]);
      await search(page).fill("nothing-matches-this");
      await expect(page.getByText(/No tools match/).first()).toBeVisible();
      expect(await accessibilityViolations(page), `${colorScheme}, empty`).toEqual([]);
    }
  });
});
