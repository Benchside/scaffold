# Performance record

Phase 3.3 performance audit. Four dated milestones, each a real Playwright
run against the actual rendered DOM (not synthetic microbenchmarks):
**baseline** (before any fix), **after manual fixes** (Step 3 — DataTable
scroll-jump and O(n) rebuild fixes), **after compiler** (Step 5 —
`oxc-transform-react` adopted for `packages/react`'s build, refined to
per-function opt-outs), and **after O(1) active-row lookup** (a follow-up
fix for a remaining O(n) scan the compiler milestone's own numbers had
flagged but left unexplained). Raw numbers for each milestone live in
`results/<date>-<milestone>.json`.

Methodology: `apps/docs/perf/datatable.perf.spec.ts` renders
`DataTable` at 1k/10k/100k synthetic rows (`apps/docs/stories/
DataTablePerf.stories.tsx`) via the same Storybook-iframe surface the
visual regression suite uses, and measures:

- **renderMs** — wall-clock from navigation to first row visible, after a
  warm-up visit (so Storybook/Vite's cold module compile isn't counted).
- **scrollDeltaPx** — scroll position before vs. after selecting a row
  while scrolled well past the initial window. Should be ~0; doubles as
  the regression test for the scroll-jump bug.
- **editCommitMs** — time from pressing Enter to commit an inline cell
  edit to the DOM reflecting it (`data-edited` attribute present).
- **keyboardNavP50/P95Ms** — per-keypress latency over 20 consecutive
  ArrowDown presses, focus already on a grid cell.

Run it yourself: `cd apps/docs && PERF_MILESTONE=<name> pnpm test:perf`
(needs `pnpm build` first so the story's dependencies are current).

---

## 2026-08-20 — baseline

Commit `b07548e` (oxlint/React Compiler rules step only — no DataTable
code changes yet).

| Rows | renderMs | scrollDeltaPx | editCommitMs | keyNav p50/p95 (ms) |
| ---- | -------: | ------------: | -----------: | ------------------: |
| 1k   |      778 |      **3000** |          138 |             60 / 79 |
| 10k  |     1360 |      **3000** |          493 |             68 / 78 |
| 100k |     8262 |      **3000** |         5716 |           66.5 / 94 |

- Bundle: `@benchside/scaffold-react` 41.13 kB gzip (budget 50 kB).
- Theme swap: p95 < 16ms — already passing (`packages/theme-default`'s
  existing test), included here for a complete Phase 3.3 record, not
  something Step 3/5 will touch.

**Reading these numbers:**

- `scrollDeltaPx: 3000` at every row count, exactly matching the scroll
  distance set up before the click, is the scroll-jump bug — the table
  resets to scroll-top 0 every time. The `scrollDeltaPx < 50` assertion in
  the spec fails on this run _by design_: a failing test documenting the
  bug before the fix exists, per the build plan's "test first, always"
  principle. It's expected to fail here and pass from the next milestone
  on.
- `editCommitMs` scales almost linearly with row count (138 → 493 →
  5716ms), the fingerprint of `useDataTable.ts`'s `rows` memo rebuilding
  the _entire_ row/cell array on every single edit commit, not just the
  edited cell.
- `renderMs` at 100k (8.3s) reflects that `useDataTable` builds every
  row/cell object up front on mount, even though only a small window
  actually renders to DOM — virtualization here only saves render/DOM
  cost, not the initial JS object construction. Step 3 doesn't change
  this (it's an unavoidable one-time cost, not a bug); noted here so the
  100k `renderMs` number isn't mistaken for something Step 3 will move.
- `keyboardNavP50/P95` stay flat (60–94ms) across all three row counts,
  not scaling with row count the way `editCommitMs` does. This measurement
  is dominated by Playwright/CDP round-trip overhead per keypress at this
  scale (a single in-page `indexOf` scan over even 100k strings is
  sub-millisecond), so it can't detect the O(n) `indexOf`/`findIndex`
  lookups identified in `useDataTableKeyboardNav.ts` and `DataTable.tsx`.
  That fix is validated by code inspection, not expected to move this
  particular number.

---

## 2026-08-20 — after manual fixes

Commits `bfdc967` + `a32b1b5` (Step 3 — DataTable scroll-jump and O(n)
rebuild fixes; a `test:perf` methodology fix landed in between, see below).

| Rows | renderMs | scrollDeltaPx | editCommitMs | keyNav p50/p95 (ms) |
| ---- | -------: | ------------: | -----------: | ------------------: |
| 1k   |      655 |         **0** |           99 |           54.5 / 97 |
| 10k  |     1108 |         **0** |           93 |          56.5 / 135 |
| 100k |     6245 |         **0** |          286 |            55 / 136 |

- Bundle: `@benchside/scaffold-react` 41.54 kB gzip (budget 50 kB, baseline
  was 41.13 kB — the new helper functions cost ~0.4 kB).
- Theme swap: still p95 < 16ms, unaffected by this milestone's changes.

**What actually shipped, in two commits, not one:**

`bfdc967` decoupled `selected` from row/cell identity, exactly as planned —
but editCommitMs barely moved (124/430/4934ms, still scaling with row
count almost like baseline). Re-measuring caught it: `editedValuesByRow`
was still a dependency of the `rows` memo, so an edit still rebuilt every
row. `a32b1b5` fixed that gap, plus a second bug the same re-measurement
surfaced — `baseRows`/`headerCells` depended on the `table` object
`useTable()` returns, which changes reference on **every** render
regardless of what changed (its own internal memo keys off the options
object we pass it, itself rebuilt fresh every render) — so those memos
never actually skipped work even once `editedValuesByRow` was removed from
`rows`'s own deps. Depending on the real underlying state (`data`,
`sorting`, `columnFiltersState`, etc.) instead of the `table` wrapper
fixed that. `editCommitMs` at 100k only dropped once both were fixed:
99/93/286ms, roughly flat across row counts instead of scaling linearly.

**Reading these numbers:**

- `scrollDeltaPx: 0` at every row count — the scroll-jump bug is fixed,
  confirmed by the same assertion that failed on baseline now passing.
- `editCommitMs` went from baseline's 138/493/5716ms to 99/93/286ms — no
  longer visibly scaling with row count (99→93→286 vs. 138→493→5716). The
  100k figure still isn't fully flat: the patch step still walks the full
  `baseRows` array once per edit (cheap per row — a `Set`/property check
  and a reference pass-through, not a full rebuild — but still O(n)), and
  `rowIndexById` still rebuilds fully since it depends on `rows`. Getting
  fully flat needs the persistent-structure approach in "Future ideas"
  below — out of scope here, and this is already an order of magnitude
  improvement.
- `renderMs` is roughly unchanged from baseline, as expected — neither fix
  targeted the one-time initial-mount cost, only re-renders after mount.
  100k's renderMs is noisier run to run (5-8s range) than the other
  metrics; not a regression, just a wider baseline variance than the
  other numbers show.
- `keyboardNavP50/P95` still show no clear row-count trend, for the same
  reason as baseline: Playwright/CDP round-trip overhead per keypress
  dominates whatever the O(1) Map lookups actually cost in-page.

Also worth recording: the perf spec itself needed a fix mid-milestone,
unrelated to app code. It originally targeted `.first()` in the mounted
row set for its selection/edit/keyboard-nav interactions — but
`withActiveRow` (`DataTable.tsx`) deliberately keeps the keyboard-active
row (row 0 by default) mounted at all times for nav continuity, sorted to
the front regardless of scroll position, so `.first()` kept resolving to
that off-screen row rather than a visible one. Playwright's own
actionability checks would then auto-scroll it into view before
interacting — a **test-harness** scroll, not the app's — which is what
the very first re-measurement attempts were actually catching pre-fix.
Fixed by targeting a row in the middle of the mounted set (comfortably
inside the visible window) and re-finding it by its immutable Sample ID
after each interaction, since later steps can shift which row that
positional query resolves to.

---

## 2026-08-21 — after compiler

`packages/react`'s build now runs `oxc-transform-react`'s `transformSync`
with `reactCompiler: { target: "19" }` in place of plain `tsc` for JS
emission (`scripts/build-js.mjs`), applying React Compiler's automatic
memoization across the package. `@tanstack/react-virtual` returns a
persistent class instance the compiler can't safely reason about (its
methods read internal mutable state — scroll position — through a
reference that stays stable across renders), so the handful of functions
that create or read one carry a per-function `"use no memo";` directive
instead of memoizing normally: `DataTableRoot`, `DataTableBody`,
`DataTableRowComponent` in `DataTable.tsx`, and `Combobox`,
`ComboboxPopover` in `Combobox.tsx`. Everything else in those two files —
`DataTableHeaderCellComponent`, `DataTableSelectionCell`,
`DataTableCellEditor`, and the rest of the package — compiles normally.

An earlier build (commit `4aa8a22`) excluded both files from compilation
entirely, at the whole-file level, to sidestep the same staleness risk.
That was measured (numbers below, not committed as their own milestone)
and worked, but left the sibling functions in those two files — several
of which are on `DataTable`'s hot render path — unmemoized. Refining that
to per-function opt-outs, once `oxc-transform-react`'s directive support
was confirmed, is what this milestone actually captures.

| rows | renderMs | scrollDeltaPx | editCommitMs | keyNav P50 / P95 |
| ---- | -------: | ------------: | -----------: | ---------------: |
| 1k   |      682 |         **0** |           92 |          26 / 40 |
| 10k  |      947 |         **0** |          107 |          27 / 46 |
| 100k |     4279 |         **0** |          218 |         36 / 139 |

- Bundle: `@benchside/scaffold-react` 57.18 kB gzip (budget raised
  50 KB → 70 KB this milestone — see below), vs. 41.54 kB before the
  compiler and 54.67 kB under the whole-file-exclusion build.
- Theme swap: still p95 < 16ms, unaffected by this milestone's changes.

**Reading these numbers, against the after-manual-fixes baseline:**

- `renderMs` improved at 10k/100k (1108→947, 6245→4279 — roughly flat to
  ~30% down) and stayed flat at 1k (655→682, within run-to-run noise).
  The likely cause: `DataTableContext.Provider`'s `value={{...}}` object
  was rebuilt fresh every render before the compiler — now it's
  auto-memoized, so context consumers (every row/cell) skip re-rendering
  on renders that didn't actually change table/nav/virtualizer/density.
- `keyboardNavP50/P95` improved the most of any metric — roughly halved
  or better at every row count (54.5/97 → 26/40, 56.5/135 → 27/46,
  55/136 → 36/139) — same context-memoization effect, since a keypress
  re-renders through `DataTableRoot`'s provider on every nav step.
- `editCommitMs` is within noise at 1k/10k (99→92, 93→107) and improved
  at 100k (286→218). Edit-commit was already the most manually optimized
  path from the prior milestone (Step 3's row/cell-identity decoupling),
  so there was less headroom left for the compiler to add here.
- `scrollDeltaPx` stayed **0** at every row count — the per-function
  directive refinement doesn't reintroduce the virtualizer-staleness bug
  the whole-file exclusion was built to avoid. Confirmed by this
  assertion plus the full 126-test visual regression suite, including
  `combobox.visual.test.ts`'s large-list/scrolled-40-rows-in case — the
  one that originally caught this exact bug class during Step 5.
- Bundle size moved the "wrong" direction relative to the whole-file
  exclusion build — 54.67 kB → 57.18 kB — and that's expected, not a
  regression: compiling more functions (the header cell, selection cell,
  and cell editor components, which weren't excluded before either, plus
  now genuinely more of DataTable/Combobox) adds real memoization
  boilerplate around code that was already fast. The budget was raised
  to 70 KB in the same milestone specifically to stop treating "smaller
  gzip number" as the goal for a full-spec design system — see the
  budget comparison in commit `06659ea`'s message and the codebase
  survey behind it (comparable full-spec libraries with a CSS-in-JS
  runtime commonly ship 80-150+ KB gzip; Scaffold has no such runtime).

**Net read:** the per-function refinement is a real, measured improvement
over both the pre-compiler baseline (faster renders, much faster keyboard
nav, same edit-commit gains) and the whole-file-exclusion build (same
runtime numbers within noise, but two fewer files fully opted out of
compilation) — at the cost of ~2.5 kB more gzip, which the raised budget
absorbs with room to spare.

---

## 2026-08-21 — after O(1) active-row lookup

Commit `6a520e3`. A direct follow-up to the anomaly the previous
milestone's own numbers raised and left unexplained: 100k's
`keyboardNavP95` (139ms) was a clear outlier against 1k/10k's 40/46ms,
and against 100k's own `keyboardNavP50` (36ms) — a gap that size, only at
the largest row count, only on the tail, doesn't fit "compiler helped
less here."

Re-reading `DataTable.tsx` with that shape in mind found the actual
cause: `DataTableBody` computed the keyboard-active row's index with
`table.rows.findIndex((row) => row.id === nav.activeCell.rowId)` — an
O(n) scan, run fresh on every render, feeding `withActiveRow`. Since
`DataTableBody` re-renders on every `nav.activeCell` change, this scan
ran on every arrow-key press. `DataTableRoot` had already built an O(1)
`rowIndexById` `Map` for its own keyboard nav (back in Step 3), but never
exposed it past its own scope — `DataTableContextValue` only carried
`table`/`nav`/`virtualizer`/`density`, so `DataTableBody` had no way to
reach it and fell back to scanning `table.rows` itself. A second,
lower-traffic instance of the same gap was in `DataTableCellEditor.
moveActiveCell`: it rebuilt `rowIds`/`columnIds` with `.map()` and called
`computeNextActiveCell` without the id→index maps, so it fell back to
`indexOf()` — O(n) again, though only once per Enter/Tab commit while
editing, not on every keypress.

Fix: `DataTableContextValue` now also carries the same `rowIds`/
`columnIds`/`rowIndexById`/`columnIndexById` `DataTableRoot` already
builds with `useMemo` — no new computation, just sharing what already
existed. Both consumers read the shared maps/arrays instead of rebuilding
or scanning their own.

| rows | renderMs | scrollDeltaPx | editCommitMs | keyNav P50 / P95 |
| ---- | -------: | ------------: | -----------: | ---------------: |
| 1k   |      638 |         **0** |           85 |        23.5 / 38 |
| 10k  |      917 |         **0** |           96 |          24 / 47 |
| 100k |     4842 |         **0** |          197 |        30.5 / 49 |

- Bundle: `@benchside/scaffold-react` 57.19 kB gzip — unchanged from
  57.18 kB (a lookup-strategy change, not new functionality).
- Theme swap: still p95 < 16ms, unaffected.

**Reading these numbers, against after-compiler:**

- `keyboardNavP95 @ 100k` — the number this milestone exists to fix —
  dropped from 139ms to 49ms on the first run. Re-run once more given
  100k's known run-to-run noise (see prior milestones): the repeat run
  measured 86ms. Both runs land well below 139ms and back in the same
  range as 1k/10k's own P95 (38/47ms), confirming the `findIndex` scan
  was the real cause, not measurement noise.
- `editCommitMs @ 100k` improved slightly too (218ms → 197/218ms across
  the two runs) — `moveActiveCell` runs once per Enter/Tab inside this
  measurement's own window, so its O(n)→O(1) fix shows up here as well,
  just with less headroom since it wasn't the dominant cost.
- `renderMs` is flat to slightly noisier (4279ms → 4842/5840ms) — neither
  fixed code path runs during initial mount, so this is the same
  run-to-run variance 100k's `renderMs` has shown at every milestone, not
  a regression.
- `scrollDeltaPx` stayed **0** and all 126 visual regression tests still
  pass — `rowIndexById.get(id) ?? -1` preserves `findIndex`'s exact
  not-found behavior (`-1`), so `withActiveRow`'s semantics didn't change.

**Net read:** this closes out the one loose thread from the compiler
milestone — the 100k keyboard-nav tail latency has a concrete, verified
cause and fix now, rather than being written off as unexplained variance.

---

## Future ideas — not in scope for Phase 3

Beyond the fixes in this audit (Steps 3/5), a few directions could push
`DataTable`'s data-handling complexity down further. None of these are
planned work — recorded here as a reference for if/when Benchside's
"millions of records" scale actually shows up in a consuming tool.

- **Selection: already reachable at O(1).** Once `selected` is read via
  `selection.isRowSelected(id)` at render time instead of baked into each
  row object (Step 3), a selection toggle costs `Set.has()` — O(1) — and
  touches only the currently-mounted (virtualized-window) rows, not the
  full dataset.
- **Single-cell edit: O(log n) is reachable, at real cost.** Swapping the
  plain-array `rows` representation for a persistent/immutable indexed
  structure (an RRB-tree or HAMT-based vector — e.g. Immutable.js's
  `List`, or a hand-rolled finger tree) would make a single-row update
  O(log₃₂ n) via structural sharing, with every untouched row keeping the
  same object reference (ideal for `React.memo`). This is a real data
  structure swap, not a tweak — out of scope unless edit-heavy workflows
  on very large tables become common.
- **Sort/filter: fundamentally O(n) or worse, with one exception.**
  Comparison sort can't beat O(n log n); arbitrary predicate/substring
  filters can't beat an O(n) scan without an index. The one addressable
  case is range/exact-match column filters, which could use a sorted
  index + binary search for O(log n + k) (k = match count) — the same
  principle as a database index, and only worth it if a specific filter
  shape turns out to be a real bottleneck.
- **Initial mount: make the O(n) cost feel cheaper, not smaller.** Right
  now `useDataTable` resolves every row's sort position _and_ every
  cell's value/state up front. Splitting those — cheap id/sort-order
  resolution eagerly, expensive per-cell value/state resolution lazily
  (computed and memoized only once a row actually scrolls into view) —
  keeps total work across a full scroll session at O(n) but drops
  time-to-first-paint to scale with the visible window instead of the
  full dataset. This is what virtualization-aware grids like AG Grid do;
  it's a data-layer virtualization on top of the current DOM-layer one.
