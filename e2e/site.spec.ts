import { expect, test } from "@playwright/test";
import { categories } from "../src/content/categories";
import { availableTools, tools } from "../src/content/tools";

// Regression checks across every tool page, listing and category: the registry drives all of them.

test("every available tool page renders with its name, metadata and canonical URL", async ({ page }) => {
  test.setTimeout(120_000);
  for (const tool of availableTools) {
    const response = await page.goto(`/tools/${tool.slug}`);
    expect(response?.status(), tool.slug).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(tool.name);
    await expect(page).toHaveTitle(new RegExp(tool.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    expect(await page.locator('meta[name="description"]').getAttribute("content"), tool.slug).toBeTruthy();
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toContain(`/tools/${tool.slug}`);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  }
});

test("internal links on tool, category and listing pages resolve", async ({ page, request }) => {
  test.setTimeout(180_000);
  const paths = ["/", "/tools", ...categories.map((c) => `/categories/${c.slug}`), ...availableTools.map((t) => `/tools/${t.slug}`)];
  const links = new Set<string>();
  for (const path of paths) {
    await page.goto(path);
    for (const href of await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute("href")!))) {
      links.add(href.split(/[?#]/)[0]);
    }
  }
  for (const link of links) {
    expect((await request.get(link)).status(), link).toBe(200);
  }
});

test("the homepage and directory list every tool with derived counts and only the header search", async ({ page }) => {
  for (const path of ["/", "/tools"]) {
    await page.goto(path);
    // The shared header search is the only search; the listings themselves have no search field.
    await expect(page.getByRole("combobox", { name: "Search tools" })).toHaveCount(1);
    await expect(page.locator("main").getByRole("searchbox")).toHaveCount(0);
    await expect(page.locator('main input[type="search"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: new RegExp(`^All tools\\s*${tools.length}$`) })).toBeVisible();
    for (const category of categories) {
      const count = tools.filter((t) => t.category === category.slug).length;
      await expect(page.getByRole("button", { name: new RegExp(`^${category.shortName}\\s*${count}$`) })).toBeVisible();
    }
    for (const tool of availableTools) {
      await expect(page.locator(`a[href="/tools/${tool.slug}"]`).first()).toBeAttached();
    }
  }
});

test("category pages show their tool counts", async ({ page }) => {
  for (const category of categories) {
    const count = tools.filter((t) => t.category === category.slug).length;
    await page.goto(`/categories/${category.slug}`);
    await expect(page.getByText(`${count} ${count === 1 ? "tool" : "tools"} in this category`)).toBeVisible();
  }
});

test("the sitemap lists every available tool", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const tool of availableTools) expect(xml).toContain(`/tools/${tool.slug}<`);
});

test("an unknown tool returns 404", async ({ request }) => {
  expect((await request.get("/tools/not-a-tool")).status()).toBe(404);
});
