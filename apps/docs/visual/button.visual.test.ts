import { expect, test } from "@playwright/test";

const STORIES = ["all-variants", "sizes", "icon-only", "states"] as const;

function storyUrl(storyId: string, theme: "light" | "dark"): string {
  return `/iframe.html?id=components-button--${storyId}&viewMode=story&globals=theme:${theme}`;
}

test.describe("Button visual regression", () => {
  for (const story of STORIES) {
    for (const theme of ["light", "dark"] as const) {
      test(`${story} renders consistently in ${theme} mode`, async ({ page }) => {
        await page.goto(storyUrl(story, theme));
        const root = page.locator("#storybook-root");
        await expect(root).toBeVisible();
        // Loading story includes an animate-spin spinner — freeze it before
        // capture so a mid-rotation frame doesn't make the test flaky.
        await page.addStyleTag({
          content: "*, *::before, *::after { animation: none !important; }",
        });
        await page.evaluate(() => document.fonts.ready);
        await expect(root).toHaveScreenshot(`button-${story}-${theme}.png`);
      });
    }
  }
});
