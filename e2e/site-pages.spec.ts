import { expect, test, type Page } from "@playwright/test";
import { mainNav, siteConfig } from "../src/config/site";
import { getToolBySlug } from "../src/content/tools";
import { tutorials } from "../src/content/tutorials";
import { accessibilityViolations, field, hasHorizontalOverflow } from "./helpers";

// The About, Contact, Privacy Policy, Terms and Tutorials pages, their navigation and the claims the privacy policy makes.

const sitePages = [
  { path: "/about", h1: "About Developer Tools", title: "About" },
  { path: "/contact", h1: "Contact", title: "Contact" },
  { path: "/privacy-policy", h1: "Privacy Policy", title: "Privacy Policy" },
  { path: "/terms", h1: "Terms of Use", title: "Terms of Use" },
  { path: "/tutorials", h1: "Tutorials", title: "Developer Tutorials" },
  ...tutorials.map((t) => ({ path: `/tutorials/${t.slug}`, h1: t.title, title: t.title })),
];

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("each page renders with its heading, title, description and canonical URL", async ({ page }) => {
  for (const { path, h1, title } of sitePages) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1);
    await expect(page).toHaveTitle(new RegExp(`^${escape(title)} · Developer Tools$`));
    expect(await page.locator('meta[name="description"]').getAttribute("content"), path).toBeTruthy();
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical && new URL(canonical).pathname, path).toBe(path);
    // Tutorials are described as TechArticles; the other pages have nothing to describe that would not be invented.
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(path.startsWith("/tutorials/") ? 1 : 0);
  }
});

test("the header links to Tutorials, and every link on the site pages resolves", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Tutorials" })).toHaveAttribute("href", "/tutorials");
  expect(mainNav.map((i) => i.href)).toContain("/tutorials");

  const links = new Set<string>();
  for (const { path } of sitePages) {
    await page.goto(path);
    for (const href of await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute("href")!))) {
      links.add(href.split(/[?#]/)[0]);
    }
  }
  for (const link of links) expect((await request.get(link)).status(), link).toBe(200);
});

test("the footer shows only the site name, tagline and free-access line, with no link groups, while category links remain elsewhere", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer).toContainText(siteConfig.name);
  await expect(footer).toContainText(siteConfig.tagline);
  await expect(footer).toContainText("100% Free · No Signup · No Subscription");
  await expect(footer.getByRole("navigation")).toHaveCount(0);
  await expect(footer.getByRole("heading")).toHaveCount(0);
  await expect(footer.getByRole("link")).toHaveCount(0);
  // Both lines are centered on desktop and on a phone.
  for (const width of [1280, 360]) {
    await page.setViewportSize({ width, height: 800 });
    const outer = await footer.boundingBox();
    const center = (b: { x: number; width: number }) => b.x + b.width / 2;
    for (const text of await footer.locator("p").all()) {
      await expect(text).toHaveCSS("text-align", "center");
      const box = await text.boundingBox();
      expect(Math.abs(center(box!) - center(outer!)), `${width} px`).toBeLessThan(2);
    }
    expect(await hasHorizontalOverflow(page), `${width} px`).toBe(false);
  }
  // The pages the footer used to link to still exist.
  for (const path of ["/about", "/contact", "/privacy-policy", "/terms", "/tutorials", "/tools"]) {
    expect((await page.request.get(path)).status(), path).toBe(200);
  }
  // Category pages and links outside the footer are unchanged.
  await page.goto("/tools");
  await expect(page.locator('main a[href^="/categories/"]').first()).toBeVisible();
  expect((await page.goto("/categories/encoders-decoders"))?.status()).toBe(200);
});

test("the header marks Tutorials as current on tutorial pages", async ({ page }) => {
  await page.goto(`/tutorials/${tutorials[0].slug}`);
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Tutorials" })).toHaveAttribute("aria-current", "page");
});

test("the directory lists every tutorial, and tutorials and tools link to each other", async ({ page }) => {
  await page.goto("/tutorials");
  const list = page.getByRole("list", { name: "Tutorials" });
  await expect(list.getByRole("heading", { level: 2 })).toHaveText(tutorials.map((t) => t.title));

  for (const tutorial of tutorials) {
    await list.getByRole("link", { name: tutorial.title }).click();
    await expect(page).toHaveURL(new RegExp(`/tutorials/${tutorial.slug}$`));
    const main = getToolBySlug(tutorial.tools[0])!;

    // The call to action opens the main tool, and the tool exists and works as a page.
    await page.getByRole("link", { name: `Open the ${main.name}` }).first().click();
    await expect(page).toHaveURL(new RegExp(`/tools/${main.slug}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(main.name);
    // The tool page links back to the tutorial.
    await expect(page.getByRole("link", { name: tutorial.title })).toHaveAttribute("href", `/tutorials/${tutorial.slug}`);

    await page.goto(`/tutorials/${tutorial.slug}`);
    const aside = page.getByRole("complementary");
    for (const slug of tutorial.tools) {
      await expect(aside.getByRole("link", { name: getToolBySlug(slug)!.name })).toHaveAttribute("href", `/tools/${slug}`);
    }
    await page.goto("/tutorials");
  }
});

test("the subnet tutorial's worked example matches the calculator", async ({ page }) => {
  const tutorial = tutorials.find((t) => t.slug === "calculate-ipv4-subnet")!;
  await page.goto("/tools/ipv4-subnet-calculator");
  await page.getByLabel("IPv4 address").fill(tutorial.example.input);
  await expect(page.locator('[data-subnet="network address"]')).toHaveText("10.20.30.32/27");
  await expect(page.locator('[data-subnet="broadcast address"]')).toHaveText("10.20.30.63");
  await expect(page.locator('[data-subnet="first usable address"]')).toHaveText("10.20.30.33");
  await expect(page.locator('[data-subnet="last usable address"]')).toHaveText("10.20.30.62");
  await expect(page.locator('[data-subnet="usable hosts"]')).toHaveText("30");
});

test("the contact page offers no form and no invented address", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.locator("main form")).toHaveCount(0);
  await expect(page.locator("main textarea, main input")).toHaveCount(0);
  await expect(page.locator('main a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.getByText("A contact address has not been published yet.")).toBeVisible();
});

test("the sitemap lists the new pages, and unknown tutorials return 404", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const { path } of sitePages) expect(xml, path).toContain(`${path}<`);
  expect(xml).toContain("/tools/json-formatter<");
  expect((await request.get("/tutorials/not-a-tutorial")).status()).toBe(404);
  expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap:");
});

test.describe("accessibility in both themes and layout", () => {
  for (const { path } of sitePages) {
    test(path, async ({ page }) => {
      for (const colorScheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme });
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(path);
        expect(await accessibilityViolations(page), `${colorScheme} theme`).toEqual([]);
      }
      for (const width of [360, 768]) {
        await page.setViewportSize({ width, height: 800 });
        expect(await hasHorizontalOverflow(page), `${width} px`).toBe(false);
      }
    });
  }
});

/** Collects every request the page makes from now on. */
function recordRequests(page: Page) {
  const urls: string[] = [];
  page.on("request", (r) => urls.push(r.url()));
  return urls;
}

// The privacy policy says: no cookies, no third-party requests, and only the theme in local storage.
test("pages make no third-party requests, set no cookies and store only the theme", async ({ page, context }) => {
  const urls = recordRequests(page);
  const paths = ["/", "/tools", "/tutorials", "/about", "/privacy-policy", "/tools/json-formatter", "/tools/markdown-editor", "/tools/password-generator", "/tools/html-entity-encoder-decoder"];
  for (const path of paths) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  // Use a tool, which loads its library on demand.
  await field(page, "Input").fill("<b>&</b>");
  await page.getByRole("button", { name: "Encode" }).click();
  await expect(field(page, "Output")).toHaveValue("&lt;b&gt;&amp;&lt;/b&gt;");

  const origin = new URL(page.url()).origin;
  for (const url of urls) {
    const { protocol, origin: requestOrigin } = new URL(url);
    expect(requestOrigin === origin || protocol === "data:" || protocol === "blob:", url).toBe(true);
  }
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => document.cookie)).toBe("");
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);

  // Choosing Light or Dark stores only that choice, under "theme".
  await page.locator(".theme-toggle").click();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual({ theme: "dark" });
  await page.locator(".theme-toggle").click();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual({ theme: "light" });
  expect(await context.cookies()).toEqual([]);
});
