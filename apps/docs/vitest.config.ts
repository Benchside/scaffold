import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "docs",
    environment: "jsdom",
    passWithNoTests: true,
    // *.visual.test.ts and *.perf.spec.ts files use @playwright/test's own
    // test/expect (run separately via `pnpm test:browser` / `pnpm
    // test:perf`, see playwright.config.ts / playwright.perf.config.ts) —
    // excluded here so vitest doesn't try to execute them too.
    exclude: [...configDefaults.exclude, "**/*.visual.test.ts", "**/*.perf.spec.ts"],
  },
});
