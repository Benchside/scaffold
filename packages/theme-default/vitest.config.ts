import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@benchside/scaffold-theme-default",
    environment: "node",
    passWithNoTests: true,
    // *.browser.test.ts files use @playwright/test's own test/expect
    // (run separately via `pnpm test:browser`, see playwright.config.ts)
    // — excluded here so vitest doesn't try to execute them too.
    exclude: [...configDefaults.exclude, "**/*.browser.test.ts"],
  },
});
