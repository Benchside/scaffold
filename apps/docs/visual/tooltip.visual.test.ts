import { expect, test } from "@playwright/test";

function storyUrl(storyId: string, theme: "light" | "dark"): string {
  return `/iframe.html?id=components-tooltip--${storyId}&viewMode=story&globals=theme:${theme}`;
}

test.describe("Tooltip visual regression", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`default renders consistently, closed, in ${theme} mode`, async ({ page }) => {
      await page.goto(storyUrl("default", theme));
      const root = page.locator("#storybook-root");
      await expect(root).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(root).toHaveScreenshot(`tooltip-default-${theme}.png`);
    });

    // Portaled outside `#storybook-root`, so this captures the full page —
    // same reasoning as Menu/Select/Dialog's open-state screenshots.
    test(`all-variants renders consistently, open, in ${theme} mode`, async ({ page }) => {
      await page.goto(storyUrl("all-variants", theme));
      await expect(page.getByRole("tooltip")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`tooltip-all-variants-${theme}.png`);
    });

    test(`shows on hover over a disabled control, in ${theme} mode`, async ({ page }) => {
      await page.goto(storyUrl("on-disabled-control", theme));
      await page.getByRole("button", { name: "Start run" }).hover();
      await expect(page.getByRole("tooltip")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`tooltip-on-disabled-control-${theme}.png`);
    });
  }

  test("shows on focus and hides on Escape", async ({ page }) => {
    await page.goto(storyUrl("default", "light"));
    const trigger = page.getByRole("button");
    await trigger.focus();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    const tooltipId = await tooltip.getAttribute("id");
    expect(tooltipId).toBeTruthy();
    await expect(trigger).toHaveAttribute("aria-describedby", tooltipId!);
    await page.keyboard.press("Escape");
    await expect(tooltip).not.toBeVisible();
  });
});
