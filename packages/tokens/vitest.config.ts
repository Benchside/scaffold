import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { name: "@benchside/scaffold-tokens", environment: "node", passWithNoTests: true },
});
