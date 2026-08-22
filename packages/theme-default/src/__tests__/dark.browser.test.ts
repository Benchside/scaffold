/// <reference lib="dom" />
// The rest of this package's tsconfig has no "dom" lib (its runtime
// code and vitest tests are Node-only) — this file's page.evaluate()
// callbacks execute in an actual browser, so they need `document` /
// `getComputedStyle` typed even though nothing here runs in Node.
//
// Verifies: [data-theme] attribute application, and that system dark
// mode preference is respected when no explicit override is set.
// dark.test.ts covers the static (string-level) half; this file is the
// real-DOM half — actual `getComputedStyle` values in an actual browser, under both
// an OS dark-mode preference (via Playwright's `colorScheme`
// emulation) and an explicit `data-theme` attribute, including the
// case that specifically motivated the `:root[data-theme="dark"]`
// specificity fix (explicit theme against an *opposing* OS
// preference).

import { fileURLToPath } from "node:url";
import path from "node:path";
import { expect, test } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_URL = `file://${path.resolve(here, "fixtures/theme.html")}`;

async function getBgBase(page: import("@playwright/test").Page): Promise<string> {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--color-bg-base").trim(),
  );
}

test.describe("theme-default dark/light DOM behavior", () => {
  test("system preference: light OS + no attribute -> light bg-base", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await page.goto(FIXTURE_URL);
    expect(await getBgBase(page)).toBe("oklch(0.98 0.006 240)"); // cool-gray-50
    await context.close();
  });

  test("system preference: dark OS + no attribute -> dark bg-base", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto(FIXTURE_URL);
    expect(await getBgBase(page)).toBe("oklch(0.09 0.006 240)"); // cool-gray-950
    await context.close();
  });

  test('explicit data-theme="dark" wins over a light OS preference', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await page.goto(FIXTURE_URL);
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    expect(await getBgBase(page)).toBe("oklch(0.09 0.006 240)"); // cool-gray-950, not light
    await context.close();
  });

  test('explicit data-theme="light" wins over a dark OS preference (the specificity fix this test exists for)', async ({
    browser,
  }) => {
    // This is the case that motivated switching both files from bare
    // `[data-theme="..."]` to `:root[data-theme="..."]`: without it,
    // this assertion's outcome would depend on <link> order in
    // fixtures/theme.html (light.css is linked before dark.css there)
    // rather than being correct by specificity regardless of order.
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto(FIXTURE_URL);
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    expect(await getBgBase(page)).toBe("oklch(0.98 0.006 240)"); // cool-gray-50, not dark
    await context.close();
  });

  test("removing the data-theme attribute falls back to OS preference again", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto(FIXTURE_URL);
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    expect(await getBgBase(page)).toBe("oklch(0.98 0.006 240)");
    await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
    expect(await getBgBase(page)).toBe("oklch(0.09 0.006 240)"); // back to dark, from OS
    await context.close();
  });
});
