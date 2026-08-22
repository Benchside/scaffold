import { defineConfig } from "@playwright/test";

// Computed-style resolution of `var()` chains through a live
// `[data-theme]` swap isn't something jsdom (used by the vitest suite in
// this package) reliably emulates, so this needs a real browser.
// Scoped to `__tests__/*.browser.test.ts`, same pattern as
// theme-default/playwright.config.ts — ordinary `pnpm test` (vitest)
// stays fast; browser tests run separately via `pnpm test:browser`.
export default defineConfig({
  testDir: "./src/__tests__",
  testMatch: /.*\.browser\.test\.ts/,
});
