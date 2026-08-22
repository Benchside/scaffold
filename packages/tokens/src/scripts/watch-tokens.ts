// `pnpm watch` entry point for local development. Rebuilds
// dist/tokens.{css,js,d.ts} whenever tokens.json changes. See
// src/build/watch.ts for the watcher itself; this script just wires it
// to the console and keeps the process alive.

import { watchTokens } from "../build/watch.js";

console.log("[tokens] watching tokens.json for changes (Ctrl+C to stop)");

watchTokens({
  onBuild: (durationMs) => {
    console.log(`[tokens] rebuilt dist/tokens.{css,js,d.ts} in ${durationMs.toFixed(1)}ms`);
  },
  onError: (error) => {
    console.error("[tokens] build failed:", error);
  },
});
