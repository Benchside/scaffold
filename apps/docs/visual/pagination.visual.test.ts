import { expect, test } from "@playwright/test";

const STORIES = [
  "default",
  "full-composition",
  "truncated",
  "boundaries",
  "with-range-text",
] as const;

function storyUrl(storyId: string, theme: "light" | "dark"): string {
  return `/iframe.html?id=components-pagination--${storyId}&viewMode=story&globals=theme:${theme}`;
}

test.describe("Pagination visual regression", () => {
  for (const story of STORIES) {
    for (const theme of ["light", "dark"] as const) {
      test(`${story} renders consistently in ${theme} mode`, async ({ page }) => {
        await page.goto(storyUrl(story, theme));
        const root = page.locator("#storybook-root");
        await expect(root).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await expect(root).toHaveScreenshot(`pagination-${story}-${theme}.png`);
      });
    }
  }
});
