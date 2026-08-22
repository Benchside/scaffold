import { defineConfig } from "@playwright/test";

// A separate config from playwright.config.ts (visual regression)
// because these specs measure timing, not pixels: no
// screenshot threshold, and a longer per-test timeout to cover the 100k-row
// scenarios. Same Storybook-iframe render surface as the visual suite, for
// the same reason: real components, not a second reimplementation.
export default defineConfig({
  testDir: "./perf",
  testMatch: /.*\.perf\.spec\.ts/,
  timeout: 90_000,
  webServer: {
    command: "pnpm exec storybook dev -p 6006 --ci",
    url: "http://localhost:6006",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  use: {
    baseURL: "http://localhost:6006",
  },
});
