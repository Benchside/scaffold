import { expect, test } from "@playwright/test";

function storyUrl(storyId: string, theme: "light" | "dark"): string {
  return `/iframe.html?id=components-toast--${storyId}&viewMode=story&globals=theme:${theme}`;
}

test.describe("Toast visual regression", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`default renders consistently, closed, in ${theme} mode`, async ({ page }) => {
      await page.goto(storyUrl("default", theme));
      const root = page.locator("#storybook-root");
      await expect(root).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(root).toHaveScreenshot(`toast-default-${theme}.png`);
    });

    // Portaled outside `#storybook-root`, so this captures the full page —
    // same reasoning as Menu/Select/Dialog/Tooltip's open-state screenshots.
    test(`all-variants renders consistently, open, in ${theme} mode`, async ({ page }) => {
      await page.goto(storyUrl("all-variants", theme));
      await expect(page.getByRole("alert").first()).toBeVisible();
      await expect(page.getByRole("status").first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`toast-all-variants-${theme}.png`);
    });
  }

  test("fires a success toast with role=status when the button is clicked", async ({ page }) => {
    await page.goto(storyUrl("default", "light"));
    await page.getByRole("button", { name: "Fire success toast" }).click();
    const toastEl = page.getByRole("status");
    await expect(toastEl).toBeVisible();
    await expect(toastEl).toHaveText(/Calibration complete/);
  });
});
