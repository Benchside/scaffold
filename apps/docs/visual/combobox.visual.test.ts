import { expect, test } from "@playwright/test";

const STORIES = ["sizes", "states"] as const;

function storyUrl(storyId: string, theme: "light" | "dark"): string {
  return `/iframe.html?id=components-combobox--${storyId}&viewMode=story&globals=theme:${theme}`;
}

test.describe("Combobox visual regression", () => {
  for (const story of STORIES) {
    for (const theme of ["light", "dark"] as const) {
      test(`${story} renders consistently in ${theme} mode`, async ({ page }) => {
        await page.goto(storyUrl(story, theme));
        const root = page.locator("#storybook-root");
        await expect(root).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await expect(root).toHaveScreenshot(`combobox-${story}-${theme}.png`);
      });
    }
  }

  // The story's own `play` function opens the listbox and arrows 40 rows
  // past the initial window before this test even looks at the page — the
  // only way a virtualization row-misalignment regression (wrong item text
  // at the highlighted row, gaps between rows) would show up in a diff.
  // Portaled outside `#storybook-root`, same reasoning as Menu/Select.
  for (const theme of ["light", "dark"] as const) {
    test(`large-list renders consistently, scrolled 40 rows in, in ${theme} mode`, async ({
      page,
    }) => {
      await page.goto(storyUrl("large-list", theme));
      await expect(page.getByRole("listbox")).toBeVisible();
      await expect(page.getByText("Gene 039", { exact: true })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`combobox-large-list-${theme}.png`);
    });
  }

  // Group headers only show once the listbox is open — the story's own
  // `play` function opens it before this test looks at the page.
  for (const theme of ["light", "dark"] as const) {
    test(`grouped renders consistently, open, in ${theme} mode`, async ({ page }) => {
      await page.goto(storyUrl("grouped", theme));
      await expect(page.getByRole("listbox")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`combobox-grouped-${theme}.png`);
    });
  }

  // The story's own `play` function opens the listbox; this test does the
  // hover itself (matching Tooltip's own visual test) rather than relying
  // on the play function's synthetic hover still reading as "hovering" by
  // the time this separate check runs.
  for (const theme of ["light", "dark"] as const) {
    test(`disabled-with-reason renders consistently, tooltip open, in ${theme} mode`, async ({
      page,
    }) => {
      await page.goto(storyUrl("disabled-with-reason", theme));
      await page.getByRole("option", { name: "PTEN" }).hover();
      await expect(page.getByRole("tooltip")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`combobox-disabled-with-reason-${theme}.png`);
    });
  }

  // The story's own `play` function types "brca" into the debounced fake
  // search and waits for the filtered server response — captures the
  // real, non-jsdom-estimated row heights for the loading indicator and
  // the settled result list in the same visual pass.
  for (const theme of ["light", "dark"] as const) {
    test(`async renders consistently, results loaded, in ${theme} mode`, async ({ page }) => {
      await page.goto(storyUrl("async", theme));
      await expect(page.getByRole("option", { name: "BRCA1" })).toBeVisible();
      // The loading indicator (role="status") and the result list are
      // mutually exclusive renders, never both mounted at once — but
      // under CI load the debounce/fake-network timing can still leave
      // the option visible from a not-yet-fully-settled render. Wait for
      // the indicator to be gone too, not just the option to appear.
      await expect(page.getByRole("status")).not.toBeAttached();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`combobox-async-${theme}.png`);
    });
  }
});
