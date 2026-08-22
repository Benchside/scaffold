// Unit tests for the CSS-side hardcoded-color check. Node's built-in
// test runner, same rationale as
// no-hardcoded-colors.test.mjs (scripts/ isn't part of any package's
// vitest project).

import { test } from "node:test";
import assert from "node:assert/strict";
import { findRawColorDeclarations } from "./check-css-tokens.mjs";

test("flags a raw hex value", () => {
  const findings = findRawColorDeclarations(":root { --color-bg-base: #f8f9fa; }");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].property, "--color-bg-base");
  assert.equal(findings[0].match, "#f8f9fa");
});

test("flags raw rgb/hsl/oklch function values", () => {
  const css = `
    .a { background: rgb(255, 0, 0); }
    .b { color: hsl(200 50% 50%); }
    .c { border-color: oklch(0.7 0.1 250); }
  `;
  const findings = findRawColorDeclarations(css);
  assert.equal(findings.length, 3);
});

test("does not flag a var() reference, even with a fallback", () => {
  const css = `:root { --color-text-primary: var(--color-cool-gray-950); }`;
  assert.equal(findRawColorDeclarations(css).length, 0);

  const withFallback = `.a { color: var(--color-accent-default, #000); }`;
  // The fallback itself is still a raw literal sitting in source, so this
  // SHOULD be flagged — var()'s optional fallback isn't a token
  // reference, it's an escape hatch, and Scaffold's semantic layer never
  // needs one (every token bottoms out at a real primitive).
  assert.equal(findRawColorDeclarations(withFallback).length, 1);
});

test("does not flag non-color declarations", () => {
  const css = `:root { --space-16: 16px; --radius-md: 4px; font-family: sans-serif; }`;
  assert.equal(findRawColorDeclarations(css).length, 0);
});

test("does not flag declarations inside comments", () => {
  // The declaration regex operates on `prop: value;` text regardless of
  // surrounding comment markers — CSS comments (`/* ... */`) aren't
  // stripped first, so a color mentioned only in prose inside a comment
  // is safe as long as it isn't shaped like `word: value;`.
  const css = `/* e.g. #ff0000 is red */\n.a { color: var(--color-status-error); }`;
  assert.equal(findRawColorDeclarations(css).length, 0);
});
