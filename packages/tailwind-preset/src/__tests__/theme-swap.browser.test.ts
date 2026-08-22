/// <reference lib="dom" />
// Runtime swap verification: renders an element with `bg-accent`,
// asserts the computed background references
// `var(--color-accent-default)`, swaps `[data-theme]`, and asserts the
// computed value updates without a class change.
// (The "references var(...)" half — that the utility's declared value
// stays a live custom-property chain rather than a baked color — is
// already proven at the CSS-source level by theme-mapping.test.ts. This
// file covers what only a real browser can show: the swap actually
// takes effect at runtime, and no DOM class mutation is involved.)

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { compileFixture } from "./compile.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_URL = `file://${path.resolve(here, "fixtures/swap.html")}`;

test.beforeAll(async () => {
  const css = await compileFixture(path.resolve(here, "fixtures/swap-entry.css"));
  writeFileSync(path.resolve(here, "fixtures/compiled-swap.css"), css);
});

async function readState(page: Page) {
  return page.evaluate(() => {
    const accent = document.getElementById("accent-box")!;
    const bg = document.getElementById("bg-box")!;
    return {
      accentColor: getComputedStyle(accent).backgroundColor,
      accentClassName: accent.className,
      bgColor: getComputedStyle(bg).backgroundColor,
      bgClassName: bg.className,
    };
  });
}

test.describe("tailwind-preset runtime theme swap", () => {
  test("swapping [data-theme] updates computed styles without any DOM class mutation", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await page.goto(FIXTURE_URL);
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));

    const beforeSwap = await readState(page);
    expect(beforeSwap.bgColor).not.toBe("");
    expect(beforeSwap.accentColor).not.toBe("");

    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    const afterSwap = await readState(page);

    // bg-bg genuinely differs between light (cool-gray-50) and dark
    // (cool-gray-950) — proves the swap actually re-resolves styles,
    // not just that nothing crashed.
    expect(afterSwap.bgColor).not.toBe(beforeSwap.bgColor);

    // bg-accent is deliberately unchanged by design (blue-500 in both
    // themes, see theme-default/src/dark.css's header) — included
    // specifically so this test can't pass by every sampled utility
    // happening to differ between themes.
    expect(afterSwap.accentColor).toBe(beforeSwap.accentColor);

    // No DOM class mutation: the swap is driven entirely by the
    // `[data-theme]` attribute re-resolving the same `var()` chain,
    // never by adding/removing/replacing a className.
    expect(afterSwap.bgClassName).toBe(beforeSwap.bgClassName);
    expect(afterSwap.accentClassName).toBe(beforeSwap.accentClassName);
    expect(afterSwap.bgClassName).toBe("bg-bg");
    expect(afterSwap.accentClassName).toBe("bg-accent");

    await context.close();
  });
});
