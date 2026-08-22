import { expect, test, type Locator } from "@playwright/test";

const STORIES = ["sizes", "states"] as const;

function storyUrl(storyId: string, theme: "light" | "dark"): string {
  return `/iframe.html?id=components-switch--${storyId}&viewMode=story&globals=theme:${theme}`;
}

async function thumbGaps(control: Locator) {
  const thumb = control.locator('[data-scope="switch"][data-part="thumb"]');
  const trackBox = await control.boundingBox();
  const thumbBox = await thumb.boundingBox();
  if (!trackBox || !thumbBox) throw new Error("missing bounding box");
  return {
    left: thumbBox.x - trackBox.x,
    right: trackBox.x + trackBox.width - (thumbBox.x + thumbBox.width),
  };
}

test.describe("Switch visual regression", () => {
  for (const story of STORIES) {
    for (const theme of ["light", "dark"] as const) {
      test(`${story} renders consistently in ${theme} mode`, async ({ page }) => {
        await page.goto(storyUrl(story, theme));
        const root = page.locator("#storybook-root");
        await expect(root).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await expect(root).toHaveScreenshot(`switch-${story}-${theme}.png`);
      });
    }
  }

  // The thumb's gap to the track edge it's flush against should be the same
  // pixel value whether it's flush-left (unchecked) or flush-right
  // (checked) — regardless of track size. A translate distance that's only
  // correct for one specific size (rather than derived from the track's own
  // width/height) breaks this symmetry for every other size.
  test("thumb sits an equal distance from the track edge in both states, across every size", async ({
    page,
  }) => {
    await page.goto(storyUrl("sizes", "light"));
    await expect(page.locator("#storybook-root")).toBeVisible();
    const controls = page.locator('[data-scope="switch"][data-part="control"]');
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const control = controls.nth(i);
      const unchecked = await thumbGaps(control);
      await control.click();
      await page.waitForTimeout(200); // past the 150ms slide transition
      const checked = await thumbGaps(control);
      expect(checked.right).toBeCloseTo(unchecked.left, 0);
    }
  });
});
