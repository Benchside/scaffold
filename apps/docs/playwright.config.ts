import { defineConfig } from "@playwright/test";

// Visual regression, using this package's own Storybook as the render
// surface: component stories live in packages/react/src/**/*.stories.tsx,
// but the actual pixels get captured by navigating Storybook's iframe
// here, not by re-mounting components in a second harness.
//
// `webServer` boots `storybook dev` itself (same command `pnpm storybook`
// runs) rather than serving a prebuilt storybook-static/ — no extra static
// file server dependency.
export default defineConfig({
  testDir: "./visual",
  testMatch: /.*\.visual\.test\.ts/,
  webServer: {
    command: "pnpm exec storybook dev -p 6006 --ci",
    url: "http://localhost:6006",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  use: {
    baseURL: "http://localhost:6006",
  },
  // Fails if a visual diff exceeds 0.1% pixel difference.
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.001 },
  },
});
