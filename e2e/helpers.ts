import { expect, type Page } from "@playwright/test";

/** Clicks a copy button and returns what reached the clipboard. */
export async function copyAndRead(page: Page, name: string | RegExp): Promise<string> {
  // Start from a known value, then wait until the copy replaces it.
  const sentinel = `__before-copy-${Math.random()}`;
  await page.evaluate((value) => navigator.clipboard.writeText(value), sentinel);
  await page.getByRole("button", { name, exact: typeof name === "string" }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).not.toBe(sentinel);
  return page.evaluate(() => navigator.clipboard.readText());
}

/** The page's own alerts, excluding Next.js's route announcer (which also has role="alert"). */
export function alert(page: Page) {
  return page.locator('[role="alert"]:not(#__next-route-announcer__)');
}

/** A text field by its exact label, ignoring buttons such as "Copy output". */
export function field(page: Page, name: string) {
  return page.getByRole("textbox", { name, exact: true });
}

/**
 * Records every request, console message and page error from now on. Call the
 * returned check with the secrets used in the test: it fails if any of them
 * (raw or URL-encoded) appears in storage, cookies, the page URL, a request
 * URL or body, or a log message, or if any request left the site's origin.
 */
export function watchForLeaks(page: Page) {
  const requests: { url: string; body: string; blocked?: boolean }[] = [];
  const logs: string[] = [];
  const byRequest = new Map<unknown, { url: string; body: string; blocked?: boolean }>();
  page.on("request", (r) => {
    const entry = { url: r.url(), body: r.postData() ?? "" };
    byRequest.set(r, entry);
    requests.push(entry);
  });
  // Attempts the Content-Security-Policy blocked never leave the browser, so they are not leaks.
  page.on("requestfailed", (r) => {
    const entry = byRequest.get(r);
    if (entry && r.failure()?.errorText === "csp") entry.blocked = true;
  });
  page.on("console", (m) => logs.push(m.text()));
  page.on("pageerror", (e) => logs.push(e.message));

  return async (secrets: string[]) => {
    const state = await page.evaluate(async () => ({
      local: JSON.stringify({ ...localStorage }),
      session: JSON.stringify({ ...sessionStorage }),
      cookies: document.cookie,
      databases: "indexedDB" in window && indexedDB.databases ? JSON.stringify(await indexedDB.databases()) : "",
    }));
    const origin = new URL(page.url()).origin;
    const sent = requests.filter((r) => !r.blocked);
    for (const request of sent) {
      const url = new URL(request.url);
      expect(url.origin === origin || url.protocol === "data:" || url.protocol === "blob:", `request to ${request.url}`).toBe(true);
    }
    for (const secret of secrets) {
      for (const form of new Set([secret, encodeURIComponent(secret)])) {
        expect(state.local, "localStorage").not.toContain(form);
        expect(state.session, "sessionStorage").not.toContain(form);
        expect(state.cookies, "cookies").not.toContain(form);
        expect(state.databases, "IndexedDB").not.toContain(form);
        expect(page.url(), "page URL").not.toContain(form);
        for (const request of sent) {
          expect(request.url, "request URL").not.toContain(form);
          expect(request.body, "request body").not.toContain(form);
        }
        for (const log of logs) expect(log, "console").not.toContain(form);
      }
    }
  };
}

/** Makes Web Crypto unavailable, as in an old browser or an insecure (HTTP) page. */
export async function removeWebCrypto(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window.crypto, "subtle", { get: () => undefined, configurable: true });
  });
}

/** Runs axe against WCAG 2 A and AA rules and returns the violations, for a readable failure message. */
export async function accessibilityViolations(page: Page) {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  // Sandboxed frames without scripts cannot be scanned from inside; their titles are still checked on this page.
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).options({ iframes: false }).setLegacyMode(true).analyze();
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")})`);
}

/** True when the page scrolls sideways, which breaks layouts on phones. */
export async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}
