import { expect, test, type Page } from "@playwright/test";
import { hasHorizontalOverflow } from "./helpers";

// The theme toggle switches between light and dark on every click, on every kind of page.

const LIGHT_BG = "rgb(249, 248, 244)";
const DARK_BG = "rgb(12, 17, 26)";
const LABEL = {
  light: "Theme: light. Switch to dark theme",
  dark: "Theme: dark. Switch to light theme",
};

const toggle = (page: Page) => page.locator(".theme-toggle");

/** The theme on <html>, the page background, and the toggle's name and visible icon all agree. */
async function expectTheme(page: Page, theme: "light" | "dark") {
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await expect(page.locator("body")).toHaveCSS("background-color", theme === "dark" ? DARK_BG : LIGHT_BG);
  await expect(toggle(page)).toHaveAccessibleName(LABEL[theme]);
  await expect(toggle(page).locator(`[data-theme-option="${theme}"]`)).toBeVisible();
  await expect(toggle(page).locator(`[data-theme-option="${theme === "dark" ? "light" : "dark"}"]`)).toBeHidden();
}

const stored = (page: Page) => page.evaluate(() => localStorage.getItem("theme"));

test("offers exactly two themes, light and dark, with no system option", async ({ page }) => {
  await page.goto("/");
  const options = toggle(page).locator("[data-theme-option]");
  await expect(options).toHaveCount(2);
  expect(await options.evaluateAll((els) => els.map((el) => el.getAttribute("data-theme-option")))).toEqual(["light", "dark"]);
  await expect(toggle(page)).not.toContainText(/system/i);
  await expect(page.locator("header")).not.toContainText(/system/i);
});

test("Light → Dark → Light switches the whole page and stores each choice", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  // Before any choice, the system theme is shown and nothing is stored.
  await expectTheme(page, "light");
  expect(await stored(page)).toBeNull();

  await toggle(page).click();
  await expectTheme(page, "dark");
  expect(await stored(page)).toBe("dark");

  await toggle(page).click();
  await expectTheme(page, "light");
  expect(await stored(page)).toBe("light");
  // An explicit choice wins over a later change of the system theme.
  await page.emulateMedia({ colorScheme: "dark" });
  await expectTheme(page, "light");
});

test("Dark → Light → Dark switches the whole page and stores each choice", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/tools/json-formatter");
  await expectTheme(page, "dark");

  await toggle(page).click();
  await expectTheme(page, "light");
  expect(await stored(page)).toBe("light");

  await toggle(page).click();
  await expectTheme(page, "dark");
  expect(await stored(page)).toBe("dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expectTheme(page, "dark");
});

test("the chosen theme survives reloads and navigation, and is applied before the page is drawn", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  // Records the theme on <html> when the body first exists, before any app script or hydration runs.
  await page.addInitScript(() => {
    const record = () => {
      const w = window as unknown as { __themeAtBody?: string | null };
      if (document.body && w.__themeAtBody === undefined) w.__themeAtBody = document.documentElement.dataset.theme ?? null;
    };
    new MutationObserver(record).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/");
  await toggle(page).click();
  await expectTheme(page, "dark");

  const paths = ["/tools/json-formatter", "/categories/text-tools", "/tutorials", "/tutorials/calculate-ipv4-subnet", "/about", "/contact", "/privacy-policy", "/terms", "/tools", "/"];
  for (const path of paths) {
    await page.goto(path);
    expect(await page.evaluate(() => (window as unknown as { __themeAtBody?: string }).__themeAtBody), path).toBe("dark");
    await expectTheme(page, "dark");
  }
  await page.reload();
  await expectTheme(page, "dark");

  // Client-side navigation keeps it too.
  await page.getByRole("link", { name: "Word & Character Counter" }).first().click();
  await expect(page).toHaveURL(/\/tools\/word-counter$/);
  await expectTheme(page, "dark");

  await toggle(page).click();
  await expectTheme(page, "light");
  await page.reload();
  await expectTheme(page, "light");
});

test("works from the keyboard with a visible focus ring, and leaves no hydration errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/about");
  await page.waitForLoadState("networkidle");

  for (let i = 0; i < 30 && !(await toggle(page).evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(toggle(page)).toBeFocused();
  await expect(toggle(page)).toHaveCSS("outline-style", "solid");

  await page.keyboard.press("Enter");
  await expectTheme(page, "dark");
  await page.keyboard.press("Space");
  await expectTheme(page, "light");
  await expect(toggle(page)).toBeFocused();
  expect(errors).toEqual([]);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

  test("tapping switches the theme without breaking the layout", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/tutorials/calculate-ipv4-subnet");
    await expect(toggle(page)).toBeVisible();
    await toggle(page).tap();
    await expectTheme(page, "dark");
    expect(await hasHorizontalOverflow(page)).toBe(false);
    await page.goto("/categories/networking");
    await expectTheme(page, "dark");
    await toggle(page).tap();
    await expectTheme(page, "light");
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });
});
