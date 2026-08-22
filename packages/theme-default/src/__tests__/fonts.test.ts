// fonts.css — self-hosted @font-face.
//
// fonts.css itself only re-exports two npm packages via bare-specifier
// `@import`, which is valid for a bundler (Vite/webpack/etc. resolve
// CSS `@import` of a package specifier the same way they resolve a JS
// import) but not for a raw browser loading the file directly — that's
// why this isn't wired into fixtures/theme.html alongside light.css/
// dark.css: theme-default's own `build` step (bundling this package
// for consumption) is still a stub, so there's no bundler in this repo
// yet to exercise that resolution against. What CAN be verified without
// one: fonts.css references the right packages/files, and the family
// names those packages actually declare still match what
// tokens.json's font.family.sans/mono primitives expect as their first
// entry — a fontsource major-version bump that silently renamed the
// family would otherwise break that link invisibly.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const FONTS_CSS_PATH = path.resolve(here, "../fonts.css");
const TOKENS_JSON_PATH = path.resolve(here, "../../../tokens/tokens.json");

// Resolved via Node's own module resolution (not a guessed relative
// path into node_modules) so this doesn't depend on pnpm's hoisting
// layout, which places direct dependencies in this package's own
// node_modules rather than the repo root's.
const require = createRequire(import.meta.url);
const INTER_CSS_PATH = require.resolve("@fontsource-variable/inter/wght.css");
const JETBRAINS_MONO_CSS_PATH = require.resolve("@fontsource-variable/jetbrains-mono/wght.css");

function extractFontFamilyNames(css: string): Set<string> {
  const names = new Set<string>();
  for (const match of css.matchAll(/font-family:\s*'([^']+)'/g)) {
    names.add(match[1]!);
  }
  return names;
}

describe("fonts.css", () => {
  it("imports both self-hosted variable-font packages by their weight-axis stylesheet", () => {
    const fontsCss = readFileSync(FONTS_CSS_PATH, "utf-8");
    expect(fontsCss).toMatch(/@import\s+["']@fontsource-variable\/inter\/wght\.css["'];/);
    expect(fontsCss).toMatch(/@import\s+["']@fontsource-variable\/jetbrains-mono\/wght\.css["'];/);
  });

  it("the installed Inter Variable package declares the family name tokens.json's font.family.sans expects first", () => {
    const interCss = readFileSync(INTER_CSS_PATH, "utf-8");
    const families = extractFontFamilyNames(interCss);
    expect(families).toEqual(new Set(["Inter Variable"]));

    const tokens = JSON.parse(readFileSync(TOKENS_JSON_PATH, "utf-8"));
    expect(tokens.font.family.sans.$value[0]).toBe("Inter Variable");
  });

  it("the installed JetBrains Mono Variable package declares the family name tokens.json's font.family.mono expects first", () => {
    const monoCss = readFileSync(JETBRAINS_MONO_CSS_PATH, "utf-8");
    const families = extractFontFamilyNames(monoCss);
    expect(families).toEqual(new Set(["JetBrains Mono Variable"]));

    const tokens = JSON.parse(readFileSync(TOKENS_JSON_PATH, "utf-8"));
    expect(tokens.font.family.mono.$value[0]).toBe("JetBrains Mono Variable");
  });

  it("both installed packages cover the full weight range their primitive font.weight scale uses (100-900 sans, 100-800 mono)", () => {
    const interCss = readFileSync(INTER_CSS_PATH, "utf-8");
    const monoCss = readFileSync(JETBRAINS_MONO_CSS_PATH, "utf-8");
    // Every @font-face block in these files declares the same
    // font-weight range (one range per script-subset block, all
    // identical) — spot-check the first occurrence of each.
    expect(interCss).toMatch(/font-weight:\s*100 900;/);
    expect(monoCss).toMatch(/font-weight:\s*100 800;/);
  });
});
