// DataTable timing at scale. Renders the synthetic datasets in
// stories/DataTablePerf.stories.tsx (1k/10k/100k rows) via the same
// Storybook-iframe render surface the visual regression suite uses, and
// records wall-clock timings for render, selection (including scroll
// position — this doubles as the regression test for a scroll-jump bug),
// edit commit, and keyboard nav.
//
// Results are relative, before/after numbers across three milestones
// (baseline / after manual fixes / after compiler), not absolute SLAs —
// see performance/PERFORMANCE.md. Every measurement here is a real
// Playwright-driven interaction against the actual rendered DOM, not a
// synthetic microbenchmark.
//
// Each test logs its result as a single `[perf-result] {...}` JSON line
// rather than writing performance/results/*.json itself — that file lives
// outside this package, and this spec should own measuring, not deciding
// where the report goes. The orchestration step that runs this collects
// those lines from the test output.
import { expect, test, type Page } from "@playwright/test";

const MILESTONE = process.env.PERF_MILESTONE ?? "baseline";

interface Scenario {
  rows: string;
  storyExport: "Perf1k" | "Perf10k" | "Perf100k";
}

const SCENARIOS: Scenario[] = [
  { rows: "1k", storyExport: "Perf1k" },
  { rows: "10k", storyExport: "Perf10k" },
  { rows: "100k", storyExport: "Perf100k" },
];

const KEY_NAV_SAMPLES = 20;

async function findStoryId(page: Page, title: string, exportName: string): Promise<string> {
  const res = await page.request.get("/index.json");
  const index = (await res.json()) as {
    entries: Record<string, { id: string; title: string; name: string }>;
  };
  const entry = Object.values(index.entries).find(
    (e) => e.title === title && e.name === exportName,
  );
  if (!entry) throw new Error(`Story not found: ${title} / ${exportName}`);
  return entry.id;
}

function median(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function p95(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * 0.95) - 1]!;
}

for (const scenario of SCENARIOS) {
  test(`DataTable @ ${scenario.rows} rows`, async ({ page }) => {
    const storyId = await findStoryId(page, "Perf/DataTable", scenario.storyExport);
    const url = `/iframe.html?id=${storyId}&viewMode=story`;

    // Warm-up navigation: Storybook dev compiles each story's module graph
    // on first visit (Vite cold transform), which would otherwise get
    // counted as DataTable's own render cost. Timed navigation below is a
    // second, already-compiled visit.
    await page.goto(url);
    await expect(page.locator('[role="grid"]')).toBeVisible({ timeout: 30_000 });

    const renderStart = Date.now();
    await page.goto(url);
    const grid = page.locator('[role="grid"]');
    await expect(grid).toBeVisible({ timeout: 30_000 });
    // Both the header and the virtualized body render `role="rowgroup"` >
    // `role="row"` (WAI-ARIA grid structure) — DataTable.Header always
    // mounts before DataTable.Body in this story, so the body is the
    // second rowgroup. Scoping to it (rather than `grid.locator('[role=
    // "row"]').first()`, which would resolve to the header row) is what
    // makes every locator below target actual data, not the header.
    const body = grid.locator('[role="rowgroup"]').nth(1);
    await expect(body.locator('[role="row"]').first()).toBeVisible();
    const renderMs = Date.now() - renderStart;

    // Scroll well past the initial window, then select a row inside the
    // now-visible (scrolled) range — reproduces the scroll-jump bug: a
    // selection toggle rebuilding `rows` shouldn't move the scroll
    // position at all.
    await grid.evaluate((el) => {
      el.scrollTop = 3000;
    });
    await page.waitForTimeout(50);
    const scrollBefore = await grid.evaluate((el) => el.scrollTop);

    // `body`'s FIRST mounted row is not necessarily a visible one:
    // `withActiveRow` (DataTable.tsx) deliberately keeps the
    // keyboard-active row mounted at all times for nav continuity — by
    // default that's row 0, sorted to the front regardless of scroll
    // position — so it's still `.first()` after scrolling away from it.
    // The middle of the mounted set is comfortably inside the visible
    // window, away from both that boundary and the tail edge of the
    // overscan range — `.last()` sits right at that tail edge and is
    // often only partially visible, which makes Playwright's own
    // actionability check auto-scroll it fully into view before clicking,
    // a test-harness nudge that isn't part of what's being measured here.
    const initialRowCount = await body.locator('[role="row"]').count();
    const initialTargetRow = body.locator('[role="row"]').nth(Math.floor(initialRowCount / 2));
    // A live query, though, and later interactions below (selecting,
    // editing, moving the active cell) can shift which row that resolves
    // to. Pinning to this row's Sample ID — immutable, globally unique,
    // never the thing being edited — and re-finding by that keeps every
    // subsequent locator pointed at the *same* row regardless of where it
    // ends up in the mounted set.
    const stableSampleId = (
      await initialTargetRow.locator('[role="gridcell"]').nth(1).textContent()
    )?.trim();
    const targetRow = body
      .locator('[role="row"]')
      .filter({ has: page.locator('[role="gridcell"]', { hasText: stableSampleId! }) });

    // Checkbox renders as a <label> (Ark UI convention) wrapping a
    // visible, `aria-hidden` styled control div plus the real
    // (accessibility-tree) input. A real user's click lands on the
    // visible control and reaches the input via native label forwarding.
    await targetRow.locator('[data-part="control"]').click();
    await page.waitForTimeout(100);
    const scrollAfter = await grid.evaluate((el) => el.scrollTop);
    const scrollDeltaPx = Math.abs(scrollAfter - scrollBefore);

    // Edit-commit latency: double-click the target row's Name cell (column
    // order: selection, sampleId, name, concentration — nth(2) is Name) to
    // open the inline editor, change the value, commit with Enter.
    const nameCell = targetRow.locator('[role="gridcell"]').nth(2);
    await nameCell.scrollIntoViewIfNeeded();
    await nameCell.dblclick();
    const editor = page.getByRole("textbox", { name: "Edit name" });
    await expect(editor).toBeVisible();
    await editor.fill("Edited value");
    const editStart = Date.now();
    await editor.press("Enter");
    await expect(nameCell).toHaveAttribute("data-edited", "");
    const editCommitMs = Date.now() - editStart;

    // Keyboard-navigation latency: focus a cell, then repeatedly press
    // ArrowDown, timing each individual keypress-to-DOM-update round trip.
    const sampleIdCell = targetRow.locator('[role="gridcell"]').nth(1);
    await sampleIdCell.click();
    await expect(sampleIdCell).toHaveAttribute("data-active", "");

    // The active cell's own text content (its Sample ID, unique per row)
    // identifies which cell is active — `data-active` is always present as
    // an empty-string flag on exactly one cell, so its *value* can't tell
    // two different active cells apart, only whether one currently exists.
    const activeCellText = () => page.evaluate(() => document.activeElement?.textContent ?? null);

    const keyNavSamples: number[] = [];
    for (let i = 0; i < KEY_NAV_SAMPLES; i++) {
      const before = await activeCellText();
      const start = Date.now();
      await page.keyboard.press("ArrowDown");
      await expect.poll(activeCellText, { timeout: 5_000 }).not.toBe(before);
      keyNavSamples.push(Date.now() - start);
    }

    // eslint-disable-next-line no-console -- captured by the orchestration step that runs this spec
    console.log(
      `[perf-result] ${JSON.stringify({
        milestone: MILESTONE,
        rows: scenario.rows,
        renderMs,
        scrollDeltaPx,
        editCommitMs,
        keyboardNavP50Ms: median(keyNavSamples),
        keyboardNavP95Ms: p95(keyNavSamples),
      })}`,
    );

    expect(
      scrollDeltaPx,
      "selecting a row while scrolled should not move the scroll position",
    ).toBeLessThan(50);
  });
}
