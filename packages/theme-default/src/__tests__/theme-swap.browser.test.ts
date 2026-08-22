/// <reference lib="dom" />
// Runtime theme swap: mount a DOM with [data-theme="light"], assert
// semantic variables, swap to [data-theme="dark"], and assert new values
// resolve correctly with no page reload. Measures swap latency (< 16ms,
// one frame), no flash of unstyled content, and that all semantic
// variables update atomically.
//
// dark.browser.test.ts already covers attribute-vs-media-query
// precedence for a single token (bg-base). This file is scoped to what
// that doesn't: a wider cross-section of tokens checked together (not
// just one), the actual latency measurement, and the "no reload / no
// flash" guarantees.
//
// Expected values are computed the same way semantic-contrast.test.ts
// does — resolve light.css / dark.css against tokens.css, with
// dark's declarations overriding light's for the effective-dark map, so
// light-only chained/fixed tokens (border-focus, accent-text, ...) fall
// through and still resolve correctly against dark's overrides — rather
// than hardcoding expected oklch() literals in this file too.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { extractCssVars, resolveAll } from "../resolve-css-vars.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_URL = `file://${path.resolve(here, "fixtures/theme.html")}`;
const TOKENS_CSS_PATH = path.resolve(here, "../../../tokens/dist/tokens.css");
const LIGHT_CSS_PATH = path.resolve(here, "../light.css");
const DARK_CSS_PATH = path.resolve(here, "../dark.css");

const primitives = extractCssVars(readFileSync(TOKENS_CSS_PATH, "utf-8"));
const lightVars = extractCssVars(readFileSync(LIGHT_CSS_PATH, "utf-8"));
const darkVarsRaw = extractCssVars(readFileSync(DARK_CSS_PATH, "utf-8"));
const effectiveDarkVars = new Map([...lightVars, ...darkVarsRaw]);

const resolvedLight = resolveAll(lightVars, primitives);
const resolvedDark = resolveAll(effectiveDarkVars, primitives);

// One token per semantic group (Surface, Text, Border, Accent, Status),
// deliberately including a couple whose light/dark values are known to
// coincide (accent-default stays blue-500 in both — see dark.css's
// header) alongside ones that clearly differ, so this can't pass by
// every sampled token happening to differ between themes.
const SAMPLE_TOKENS = [
  "--color-bg-base",
  "--color-bg-elevated",
  "--color-text-primary",
  "--color-text-secondary",
  "--color-border-default",
  "--color-accent-default",
  "--color-accent-hover",
  "--color-status-error",
  "--color-status-error-bg",
];

async function readVars(page: Page, names: readonly string[]): Promise<Record<string, string>> {
  return page.evaluate((varNames) => {
    const style = getComputedStyle(document.documentElement);
    const out: Record<string, string> = {};
    for (const name of varNames) out[name] = style.getPropertyValue(name).trim();
    return out;
  }, names);
}

test.describe("theme-default runtime theme swap", () => {
  test("swapping [data-theme] updates every sampled semantic variable atomically, with no page reload", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await page.goto(FIXTURE_URL);
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      // In-memory marker a page reload would wipe — proves the swap
      // below happened in-place, not via navigation.
      document.documentElement.dataset.scaffoldTestMarker = "still-here";
    });

    const beforeSwap = await readVars(page, SAMPLE_TOKENS);
    for (const name of SAMPLE_TOKENS) {
      expect(beforeSwap[name], name).toBe(resolvedLight.get(name));
    }

    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));

    const afterSwap = await readVars(page, SAMPLE_TOKENS);
    for (const name of SAMPLE_TOKENS) {
      expect(afterSwap[name], name).toBe(resolvedDark.get(name));
    }

    const marker = await page.evaluate(() => document.documentElement.dataset.scaffoldTestMarker);
    expect(marker, "a page reload would have cleared this in-memory marker").toBe("still-here");

    await context.close();
  });

  test("swap latency: p95 < 16ms (one frame) across 10 consecutive toggles", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await page.goto(FIXTURE_URL);

    const durationsMs = await page.evaluate(() => {
      const root = document.documentElement;
      const samples: number[] = [];
      for (let i = 0; i < 10; i++) {
        const next = i % 2 === 0 ? "dark" : "light";
        const start = performance.now();
        root.setAttribute("data-theme", next);
        // Forces synchronous style recalculation — the same resolution
        // a real paint needs before it can draw the new frame.
        getComputedStyle(root).getPropertyValue("--color-bg-base");
        samples.push(performance.now() - start);
      }
      return samples;
    });

    const sorted = durationsMs.sort((a, b) => a - b);
    const p95Index = Math.ceil(sorted.length * 0.95) - 1;
    const p95 = sorted[p95Index]!;
    expect(p95, `swap durations (ms): ${JSON.stringify(durationsMs)}`).toBeLessThan(16);

    await context.close();
  });

  test("no flash of unstyled content: computed style already reflects the new theme immediately after the attribute mutation", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await page.goto(FIXTURE_URL);
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));

    // No yield/await between the mutation and the read below — if
    // there were an intermediate frame where the attribute was set but
    // the custom property hadn't resolved yet (the "flash"), this
    // synchronous read would catch the stale (light) value instead of
    // dark.
    const immediatelyAfterSwap = await page.evaluate(() => {
      const root = document.documentElement;
      root.setAttribute("data-theme", "dark");
      return getComputedStyle(root).getPropertyValue("--color-bg-base").trim();
    });

    expect(immediatelyAfterSwap).toBe(resolvedDark.get("--color-bg-base"));

    await context.close();
  });
});
