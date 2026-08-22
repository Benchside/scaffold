// Unit tests for the no-hardcoded-colors rule. Run with
// Node's built-in test runner (`node --test scripts`) rather than
// vitest: this rule lives in scripts/, which isn't part of any
// package's own vitest project (it's repo-wide tooling, not a
// consumable package), and oxlint's jsPlugins loader needs it to stay
// plain, dependency-free JS anyway — pulling in a test framework here
// would mean pulling one into the plugin's own runtime path too.

import { test } from "node:test";
import assert from "node:assert/strict";
import noHardcodedColors, {
  findHardcodedColor,
  findRawTailwindColorClass,
} from "./no-hardcoded-colors.js";

test("findHardcodedColor detects hex literals", () => {
  assert.equal(findHardcodedColor("#ff0000"), "#ff0000");
  assert.equal(findHardcodedColor("#fff"), "#fff");
  assert.equal(findHardcodedColor("background: #1a2b3cff;"), "#1a2b3cff");
});

test("findHardcodedColor detects rgb/rgba/hsl/hsla literals", () => {
  assert.equal(findHardcodedColor("rgb(255, 0, 0)"), "rgb(");
  assert.equal(findHardcodedColor("rgba(0,0,0,0.5)"), "rgba(");
  assert.equal(findHardcodedColor("hsl(200 50% 50%)"), "hsl(");
  assert.equal(findHardcodedColor("hsla(200, 50%, 50%, 1)"), "hsla(");
});

test("findHardcodedColor detects raw oklch/oklab/lab/lch/color() literals", () => {
  assert.equal(findHardcodedColor("oklch(0.7 0.1 250)"), "oklch(");
  assert.equal(findHardcodedColor("oklab(0.7 0.05 -0.02)"), "oklab(");
  assert.equal(findHardcodedColor("lab(50% 40 59.5)"), "lab(");
  assert.equal(findHardcodedColor("lch(52% 58 22)"), "lch(");
  assert.equal(findHardcodedColor("color(display-p3 1 0 0)"), "color(");
});

test("findHardcodedColor ignores non-color strings and var() references", () => {
  assert.equal(findHardcodedColor("var(--color-accent-default)"), null);
  assert.equal(findHardcodedColor("just a normal string"), null);
  assert.equal(findHardcodedColor(42), null);
  assert.equal(findHardcodedColor(undefined), null);
});

test("rule reports a Literal node containing a hardcoded color", () => {
  const reports = [];
  const context = { report: (r) => reports.push(r) };
  const listeners = noHardcodedColors.create(context);

  const node = { value: "#ff0000" };
  listeners.Literal(node);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].node, node);
  assert.match(reports[0].message, /Hardcoded color "#ff0000"/);
});

test("rule does not report a Literal node referencing a semantic token", () => {
  const reports = [];
  const context = { report: (r) => reports.push(r) };
  const listeners = noHardcodedColors.create(context);

  listeners.Literal({ value: "var(--color-accent-default)" });
  listeners.Literal({ value: "bg-accent" });

  assert.equal(reports.length, 0);
});

test("findRawTailwindColorClass detects raw palette utility classes", () => {
  assert.equal(findRawTailwindColorClass("bg-blue-500"), "bg-blue-500");
  assert.equal(findRawTailwindColorClass("rounded-lg bg-blue-500 p-4"), "bg-blue-500");
  assert.equal(findRawTailwindColorClass("text-red-600"), "text-red-600");
  assert.equal(findRawTailwindColorClass("border-cool-gray-200"), "border-cool-gray-200");
});

test("findRawTailwindColorClass sees through variant prefixes", () => {
  assert.equal(findRawTailwindColorClass("hover:bg-blue-500"), "bg-blue-500");
  assert.equal(findRawTailwindColorClass("dark:hover:text-red-600"), "text-red-600");
});

test("findRawTailwindColorClass ignores semantic token classes", () => {
  assert.equal(findRawTailwindColorClass("bg-accent"), null);
  assert.equal(findRawTailwindColorClass("text-text-secondary"), null);
  assert.equal(findRawTailwindColorClass("rounded-lg bg-accent-subtle p-inset-md"), null);
  assert.equal(findRawTailwindColorClass("bg-status-error-bg"), null);
});

test("findRawTailwindColorClass ignores non-color utilities and non-strings", () => {
  assert.equal(findRawTailwindColorClass("rounded-lg p-4 flex items-center"), null);
  assert.equal(findRawTailwindColorClass(42), null);
  assert.equal(findRawTailwindColorClass(undefined), null);
});

test("rule reports a Literal node containing a raw Tailwind color class", () => {
  const reports = [];
  const context = { report: (r) => reports.push(r) };
  const listeners = noHardcodedColors.create(context);

  listeners.Literal({ value: "bg-blue-500" });

  assert.equal(reports.length, 1);
  assert.match(reports[0].message, /Raw Tailwind color class "bg-blue-500"/);
});
