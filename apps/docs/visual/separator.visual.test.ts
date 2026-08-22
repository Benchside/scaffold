import { expect, test } from "@playwright/test";

function storyUrl(theme: "light" | "dark"): string {
  return `/iframe.html?id=components-separator--all-variants&viewMode=story&globals=theme:${theme}`;
}

test.describe("Separator visual regression", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`all-variants renders consistently in ${theme} mode`, async ({ page }) => {
      await page.goto(storyUrl(theme));
      const root = page.locator("#storybook-root");
      await expect(root).toBeVisible();
      // The vertical separators' length comes from `self-stretch` against a
      // text row's height, which shifts slightly until the self-hosted
      // variable fonts finish loading — wait so the screenshot isn't racy.
      await page.evaluate(() => document.fonts.ready);
      await expect(root).toHaveScreenshot(`separator-all-variants-${theme}.png`);
    });
  }
});
