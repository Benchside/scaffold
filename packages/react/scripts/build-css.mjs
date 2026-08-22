#!/usr/bin/env node
// Compiles src/style-entry.css into a self-contained dist/style.css: the
// real Tailwind v4 engine (same @tailwindcss/postcss used by
// packages/tailwind-preset's own tests and by apps/docs's Storybook
// build), scanning this package's own component source for classes
// actually used. Bundles both the generated utility classes AND the
// underlying variable definitions (tokens/theme-default), so a consumer
// only needs this one file — no separate CSS imports, no Tailwind config,
// no @source.
//
// Font asset handling is the one place this needs its own step:
// @tailwindcss/postcss correctly rewrites each @font-face url() to be
// relative to `to` (verified directly — the rewritten path resolves to
// the real .woff2 in this repo's pnpm store), but that path only works
// *here*, inside this monorepo's node_modules layout. A consumer
// installing the published package would get a dist/style.css whose
// url()s point at a pnpm store path that doesn't exist in their project.
// So every url() gets resolved once (relative to dist/, matching what
// @tailwindcss/postcss already guarantees), the real file copied into
// dist/fonts/, and the declaration rewritten to the new relative path —
// making the published package genuinely self-contained rather than
// working by monorepo coincidence.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const here = path.dirname(fileURLToPath(import.meta.url));
const from = path.resolve(here, "../src/style-entry.css");
const to = path.resolve(here, "../dist/style.css");
const distDir = path.dirname(to);
const fontsDir = path.join(distDir, "fonts");

const css = readFileSync(from, "utf-8");
const compiled = await postcss([tailwindcss()]).process(css, { from, to });

mkdirSync(fontsDir, { recursive: true });

const inlined = compiled.css.replace(/url\(([^)]+)\)/g, (match, rawUrl) => {
  if (/^(data:|https?:)/.test(rawUrl)) return match;
  const sourcePath = path.resolve(distDir, rawUrl);
  const fileName = path.basename(sourcePath);
  copyFileSync(sourcePath, path.join(fontsDir, fileName));
  return `url(fonts/${fileName})`;
});

writeFileSync(to, inlined);

console.log(`[css] compiled style-entry.css -> dist/style.css (${inlined.length} bytes)`);
