import { expect, test } from "@playwright/test";

const STORIES = ["all-variants", "interactive"] as const;

function storyUrl(storyId: string, theme: "light" | "dark"): string {
  return `/iframe.html?id=components-card--${storyId}&viewMode=story&globals=theme:${theme}`;
}

test.describe("Card visual regression", () => {
  for (const story of STORIES) {
    for (const theme of ["light", "dark"] as const) {
      test(`${story} renders consistently in ${theme} mode`, async ({ page }) => {
        await page.goto(storyUrl(story, theme));
        const root = page.locator("#storybook-root");
        await expect(root).toBeVisible();
        await expect(root).toHaveScreenshot(`card-${story}-${theme}.png`);
      });
    }
  }
});
