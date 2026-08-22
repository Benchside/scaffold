import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@benchside/scaffold-react",
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: true,
    // `tsc -b` shouldn't emit test files into dist (see tsconfig's
    // exclude), but this guards against a stale dist/ still containing them
    // from before that was added — running the same test twice in one
    // jsdom worker causes real cross-file flakiness (shared document focus
    // state), not just redundant work.
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
