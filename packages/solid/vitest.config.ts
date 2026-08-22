import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    name: "@benchside/scaffold-solid",
    environment: "jsdom",
    globals: true,
    passWithNoTests: true,
  },
  resolve: { conditions: ["development", "browser"] },
});
