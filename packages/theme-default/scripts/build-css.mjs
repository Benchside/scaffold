#!/usr/bin/env node
// Copies each theme CSS partial into dist/ and exposes it via a
// package.json subpath export (./light.css, ./dark.css, etc.), same
// straight-copy pattern as tailwind-preset/scripts/build.mjs. No
// bundling: consumers `@import` these individually, in order
// (tokens -> light -> dark -> spacing -> typography), same order this
// package's own tests already read them in — see
// packages/tailwind-preset/src/__tests__/fixtures/entry.css.
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const srcDir = path.join(packageRoot, "src");
const distDir = path.join(packageRoot, "dist");

mkdirSync(distDir, { recursive: true });

const cssFiles = readdirSync(srcDir).filter((f) => f.endsWith(".css"));
for (const file of cssFiles) {
  copyFileSync(path.join(srcDir, file), path.join(distDir, file));
}

console.log(`@benchside/scaffold-theme-default: wrote dist/{${cssFiles.join(", ")}}`);
