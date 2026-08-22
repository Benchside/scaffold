import { expect, test } from "@playwright/test";

const STORIES = ["default", "sizes", "decorative"] as const;

function storyUrl(storyId: string, theme: "light" | "dark"): string {
  return `/iframe.html?id=components-spinner--${storyId}&viewMode=story&globals=theme:${theme}`;
}

test.describe("Spinner visual regression", () => {
  for (const story of STORIES) {
    for (const theme of ["light", "dark"] as const) {
      test(`${story} renders consistently in ${theme} mode`, async ({ page }) => {
        await page.goto(storyUrl(story, theme));
        const root = page.locator("#storybook-root");
        await expect(root).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await expect(root).toHaveScreenshot(`spinner-${story}-${theme}.png`);
      });
    }
  }
});
