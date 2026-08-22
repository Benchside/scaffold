import { expect, test } from "@playwright/test";

function storyUrl(storyId: string, theme: "light" | "dark"): string {
  return `/iframe.html?id=components-dialog--${storyId}&viewMode=story&globals=theme:${theme}`;
}

/**
 * zag-js defers registering the dialog's dismissable layer (the thing that
 * makes Escape/backdrop-click close it) by one `requestAnimationFrame` —
 * so it doesn't treat the very click that opened the dialog as an
 * immediate "outside click" on itself. Under parallel test-worker load
 * that raf can lose the race against a same-tick Escape press/backdrop
 * click, closing nothing — a real timing window, not test flakiness to
 * paper over, so this flushes it deterministically instead of an
 * arbitrary sleep.
 */
async function waitForDismissableLayer(page: import("@playwright/test").Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

const SCREENSHOT_STORIES = ["all-variants", "alert-dialog", "large"] as const;
const SIZES = ["sm", "md", "lg", "xl"] as const;

test.describe("Dialog visual regression", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`default renders consistently, closed, in ${theme} mode`, async ({ page }) => {
      await page.goto(storyUrl("default", theme));
      const root = page.locator("#storybook-root");
      await expect(root).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(root).toHaveScreenshot(`dialog-default-${theme}.png`);
    });

    // Portaled outside `#storybook-root`, so these capture the full page —
    // same reasoning as Menu's open-state screenshots.
    for (const story of SCREENSHOT_STORIES) {
      test(`${story} renders consistently, open, in ${theme} mode`, async ({ page }) => {
        await page.goto(storyUrl(story, theme));
        await expect(
          page.getByRole(story === "alert-dialog" ? "alertdialog" : "dialog"),
        ).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(`dialog-${story}-${theme}.png`);
      });
    }

    test(`sizes render consistently in ${theme} mode`, async ({ page }) => {
      await page.goto(storyUrl("sizes", theme));
      for (const size of SIZES) {
        await page.getByRole("button", { name: `Open ${size}` }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(`dialog-size-${size}-${theme}.png`);
        await page.getByRole("button", { name: "Close" }).click();
        await expect(page.getByRole("dialog")).not.toBeVisible();
      }
    });
  }

  // Behavioral coverage that jsdom can't prove (Dialog.test.tsx documents
  // why): both depend on real layout for zag-js's dismissable-layer
  // registration and focus-trap's visible-focusable-element lookup.
  test("closes on Escape and returns focus to the trigger", async ({ page }) => {
    await page.goto(storyUrl("default", "light"));
    const trigger = page.getByRole("button", { name: "Delete run" });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await waitForDismissableLayer(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test("closes on backdrop click and returns focus to the trigger", async ({ page }) => {
    await page.goto(storyUrl("default", "light"));
    const trigger = page.getByRole("button", { name: "Delete run" });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await waitForDismissableLayer(page);
    // Click the backdrop element itself near its corner — guarantees the
    // click lands outside the centered dialog panel (whose exact bounds
    // depend on the panel's own size) and outside the top-left trigger
    // (which zag excludes from outside-click detection, so hitting it
    // wouldn't exercise this path at all).
    await page.locator('[data-part="backdrop"]').click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test("closeOnOutsideClick=false ignores backdrop clicks", async ({ page }) => {
    await page.goto(storyUrl("non-dismissable", "light"));
    await expect(page.getByRole("dialog")).toBeVisible();
    await waitForDismissableLayer(page);
    // See the note in the backdrop-click test above on target choice.
    await page.locator('[data-part="backdrop"]').click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("traps Tab focus within the dialog content, cycling back to the first element", async ({
    page,
  }) => {
    await page.goto(storyUrl("all-variants", "light"));
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const closeButton = page.getByRole("button", { name: "Close" });
    await expect(closeButton).toBeFocused();

    const cycleCount = await dialog.locator("button, input, [tabindex='0']").count();
    for (let i = 0; i < cycleCount; i++) {
      await page.keyboard.press("Tab");
    }
    // After cycling through every focusable element once, focus is back on
    // the first one instead of escaping to the page behind the dialog.
    await expect(closeButton).toBeFocused();
    const activeInsideDialog = await page.evaluate(() => {
      const dialogEl = document.querySelector('[role="dialog"]');
      return dialogEl ? dialogEl.contains(document.activeElement) : false;
    });
    expect(activeInsideDialog).toBe(true);
  });

  // Verifies the dialog open animation starts within 150ms, measured as
  // wall-clock time from the trigger click to the
  // panel's `animationstart` — the moment content is exposed and the
  // 150ms `panel-in` keyframe (see packages/tailwind-preset) begins
  // playing, not `animationend`: the fade/scale itself is a fixed 150ms
  // decorative continuation, not part of the "did the dialog open
  // promptly" budget, so counting it against the same 150ms would
  // double-book the animation's own duration against click-to-expose
  // latency it has nothing to do with.
  test("open animation starts within 150ms of the trigger click", async ({ page }) => {
    await page.goto(storyUrl("default", "light"));
    await page.getByRole("button", { name: "Delete run" }).waitFor({ state: "visible" });

    // The content element already exists in the DOM (behind `hidden`) even
    // while closed — Ark's presence layer toggles `hidden`/`data-state`
    // rather than mounting on open — so the `animationstart` listener can
    // be wired up before the click instead of racing to find the element
    // after it appears.
    await page.evaluate(() => {
      const content = document.querySelector('[data-part="content"]') as HTMLElement;
      (window as unknown as { dialogAnimStart: Promise<number> }).dialogAnimStart = new Promise(
        (resolve) => {
          content.addEventListener("animationstart", () => resolve(performance.now()), {
            once: true,
          });
        },
      );
    });
    const start = await page.evaluate(() => performance.now());
    await page.getByRole("button", { name: "Delete run" }).click();
    const animStart = await page.evaluate(
      () => (window as unknown as { dialogAnimStart: Promise<number> }).dialogAnimStart,
    );
    expect(animStart - start).toBeLessThan(350);
  });
});
