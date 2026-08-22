#!/usr/bin/env node
// No-hardcoded-values lint rule, CSS half. oxlint's jsPlugins
// (scripts/oxlint-plugins/no-hardcoded-colors.js) only run against
// JS/TS ASTs, so component/theme CSS needs a separate check: every
// declaration value in a scanned `.css` file must be a `var(...)`
// reference (or a non-color value, e.g. `4px`) — never a raw
// hex/rgb/hsl/oklch literal.
//
// Scope: flags CSS *outside* tokens.json and theme-*.css. In practice
// that means:
//   - packages/tokens/tokens.json is JSON, not CSS — out of scope for
//     this script by construction (see the JSON $value literals it's
//     allowed to hold).
//   - packages/tokens/dist/**/*.css (tokens.css, tokens-p3.css) is the
//     Style Dictionary *build output* — this is where primitive raw
//     values legitimately live (that's the whole point of the
//     primitive layer). Excluded below.
//   - packages/theme-default/src/{light,dark}.css are the hand-authored
//     "theme-*.css" allowed to hold semantic tokens... except they
//     don't hold raw literals at all (semantic tokens are var()-chains
//     all the way to a primitive) — so nothing is special-cased for
//     them here. If a future edit introduces a raw literal there, this
//     script SHOULD catch it; today's reality (only generated primitive
//     CSS holds raw values) isn't an intentional carve-out for
//     hand-authored theme files.
//   - Everything else under node_modules/dist/.turbo/coverage is build
//     output or a dependency, not source — excluded.

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const EXCLUDED_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".turbo",
  "dist",
  "coverage",
  "test-results",
  "storybook-static",
  "_to_delete",
]);

// The declaration-level raw-literal check, analogous to
// no-hardcoded-colors.js's HARDCODED_COLOR_RE but scoped to CSS
// declaration *values* (so it doesn't also need to dodge comments,
// selectors, or property names the way a whole-file regex would).
const DECL_RE = /([a-zA-Z-]+)\s*:\s*([^;{}]+);/g;
const RAW_COLOR_VALUE_RE =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\(/;
// Deliberately does NOT allow a `var(--x, fallback)` second argument to
// short-circuit the check: the fallback is still a raw literal sitting
// in source once the outer var() text is skipped, and Scaffold's
// semantic layer never needs one (every token already bottoms out at a
// real primitive) — see check-css-tokens.test.mjs.
const VAR_ONLY_RE = /^var\(\s*--[a-zA-Z0-9-]+\s*\)$/;

export function findRawColorDeclarations(css) {
  const findings = [];
  for (const match of css.matchAll(DECL_RE)) {
    const [, property, rawValue] = match;
    const value = rawValue.trim();
    if (VAR_ONLY_RE.test(value)) continue;
    const colorMatch = RAW_COLOR_VALUE_RE.exec(value);
    if (colorMatch) {
      findings.push({ property, value, match: colorMatch[0] });
    }
  }
  return findings;
}

function walkCssFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIR_NAMES.has(entry)) continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walkCssFiles(full));
    } else if (entry.endsWith(".css")) {
      files.push(full);
    }
  }
  return files;
}

function main() {
  const files = walkCssFiles(repoRoot);
  let violationCount = 0;

  for (const file of files) {
    const css = readFileSync(file, "utf-8");
    const findings = findRawColorDeclarations(css);
    if (findings.length === 0) continue;

    violationCount += findings.length;
    const relPath = path.relative(repoRoot, file);
    for (const { property, value, match } of findings) {
      console.error(
        `${relPath}: "${property}: ${value};" — hardcoded color "${match}" (use var(--color-...) instead)`,
      );
    }
  }

  if (violationCount > 0) {
    console.error(`\n${violationCount} hardcoded color value(s) found in CSS.`);
    process.exitCode = 1;
    return;
  }

  console.log(`check-css-tokens: ${files.length} CSS file(s) scanned, no hardcoded colors found.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
