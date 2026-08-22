import { expect, test } from "@playwright/test";

function storyUrl(storyId: string, theme: "light" | "dark"): string {
  return `/iframe.html?id=components-menu--${storyId}&viewMode=story&globals=theme:${theme}`;
}

test.describe("Menu visual regression", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`default renders consistently, closed, in ${theme} mode`, async ({ page }) => {
      await page.goto(storyUrl("default", theme));
      const root = page.locator("#storybook-root");
      await expect(root).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(root).toHaveScreenshot(`menu-default-${theme}.png`);
    });

    // The open popover is portaled to `document.body`, outside
    // `#storybook-root`'s own (trigger-sized) layout box — a locator
    // screenshot of the root would crop it out, so this captures the full
    // page instead (matching the Select/Tabs pattern would only work for
    // closed-state stories).
    test(`all-variants renders consistently, open, in ${theme} mode`, async ({ page }) => {
      await page.goto(storyUrl("all-variants", theme));
      await expect(page.getByRole("menu")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`menu-all-variants-${theme}.png`);
    });

    test(`context-trigger renders consistently, opened by right-click, in ${theme} mode`, async ({
      page,
    }) => {
      await page.goto(storyUrl("context-trigger", theme));
      const target = page.getByText("Right-click this area");
      await expect(target).toBeVisible();
      await target.click({ button: "right" });
      await expect(page.getByRole("menu")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`menu-context-trigger-${theme}.png`);
    });
  }
});
