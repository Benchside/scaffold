import { defineConfig } from "@playwright/test";

// `[data-theme]` attribute precedence over `prefers-color-scheme`, and
// the OS-preference fallback when no attribute is set, need a real
// browser to test — jsdom (used by the vitest suite in this package) only
// partially implements — `prefers-color-scheme` emulation in
// particular isn't reliable there. This config is scoped to just
// `__tests__/*.browser.test.ts` so the ordinary `pnpm test` (vitest)
// run stays fast and dependency-light; browser tests run separately
// via `pnpm test:browser`.
// Chromium resolution is left to Playwright's normal lookup
// (respects PLAYWRIGHT_BROWSERS_PATH when set, e.g. this repo's cloud
// dev environment; otherwise its own managed install).
export default defineConfig({
  testDir: "./src/__tests__",
  testMatch: /.*\.browser\.test\.ts/,
});
