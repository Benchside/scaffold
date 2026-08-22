// Dark mode semantic mapping. Every semantic variable must resolve to a
// primitive token, with no dangling references.
//
// This file covers the static, non-visual half (mirrors light.test.ts).
// The DOM/attribute/media-query behavior half — does
// `[data-theme="dark"]` actually win over `prefers-color-scheme`, does
// removing the attribute fall back to OS preference — needs a real
// browser and lives in dark.browser.test.ts instead (jsdom's
// `prefers-color-scheme` support is incomplete). AA contrast
// verification for the mirrored dark values lives in
// packages/tokens/src/__tests__/semantic-contrast.test.ts, which
// resolves both themes' semantic tokens the same way this file does
// and runs them through the WCAG AA gate.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { extractCssVars, resolveAll, resolveCssVar } from "../resolve-css-vars.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const DARK_CSS_PATH = path.resolve(here, "../dark.css");
const LIGHT_CSS_PATH = path.resolve(here, "../light.css");
const TOKENS_CSS_PATH = path.resolve(here, "../../../tokens/dist/tokens.css");

// Module-scoped (not a closure inside the test) since it captures
// nothing from its call site — just parses an oklch() string.
function chromaOfOklch(oklch: string): number {
  const m = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(oklch);
  expect(m, `expected an oklch() value, got "${oklch}"`).not.toBeNull();
  return parseFloat(m![2]!);
}

// Tokens dark.css redeclares. Deliberately excludes
// border-focus/accent-text (chained tokens that update automatically
// once accent-default/accent-hover are overridden below them — no
// redeclaration needed, see the same header).
const REQUIRED_DARK_TOKENS = [
  // Surface
  "--color-bg-base",
  "--color-bg-subtle",
  "--color-bg-hover",
  "--color-bg-elevated",
  "--color-bg-overlay",
  "--color-bg-inverse",
  // Text
  "--color-text-primary",
  "--color-text-secondary",
  "--color-text-placeholder",
  "--color-text-disabled",
  "--color-text-inverse",
  // Border
  "--color-border-default",
  "--color-border-strong",
  "--color-border-error",
  // Accent
  "--color-accent-default",
  "--color-accent-hover",
  "--color-accent-active",
  "--color-accent-subtle",
  // Status
  "--color-status-success",
  "--color-status-success-bg",
  "--color-status-warning",
  "--color-status-warning-bg",
  "--color-status-error",
  "--color-status-error-hover",
  "--color-status-error-active",
  "--color-status-error-bg",
  "--color-status-info",
  "--color-status-info-bg",
  "--color-status-neutral",
  "--color-status-neutral-bg",
].sort();

// Chained to accent-* — must NOT appear in dark.css (they'd just be
// redundant with, or worse drift from, the light.css chain).
const CHAINED_NOT_REDECLARED = ["--color-border-focus", "--color-accent-text"];

let primitives: Map<string, string>;
let darkVars: Map<string, string>;
let lightVars: Map<string, string>;
let rawDarkCss: string;

beforeAll(() => {
  const tokensCss = readFileSync(TOKENS_CSS_PATH, "utf-8");
  rawDarkCss = readFileSync(DARK_CSS_PATH, "utf-8");
  const lightCss = readFileSync(LIGHT_CSS_PATH, "utf-8");
  primitives = extractCssVars(tokensCss);
  // extractCssVars is a single regex pass over the whole source, so it
  // picks up declarations from both the @media fallback block and the
  // :root[data-theme="dark"] block — fine, since both blocks declare
  // the same values (verified separately below) and this collapses to
  // one Map entry either way.
  darkVars = extractCssVars(rawDarkCss);
  lightVars = extractCssVars(lightCss);
});

describe("dark.css semantic mapping", () => {
  it("declares exactly the mirrored token set (excludes fixed-across-themes and chained tokens)", () => {
    expect([...darkVars.keys()].sort()).toEqual(REQUIRED_DARK_TOKENS);
  });

  it("does not redeclare border-focus/accent-text (chained, updates automatically)", () => {
    for (const name of CHAINED_NOT_REDECLARED) {
      expect(darkVars.has(name), `${name} should not appear in dark.css`).toBe(false);
    }
  });

  it("declares every token as a var() reference, never a raw literal", () => {
    for (const name of REQUIRED_DARK_TOKENS) {
      const value = darkVars.get(name);
      expect(value, `${name} should be declared`).toBeDefined();
      expect(value, `${name} should be a var() reference, got "${value}"`).toMatch(
        /^var\(--color-[a-z0-9-]+\)$/,
      );
    }
  });

  it("resolves every declared token to a primitive with no dangling references", () => {
    for (const name of REQUIRED_DARK_TOKENS) {
      expect(() => resolveCssVar(name, new Map([...primitives, ...darkVars]))).not.toThrow();
    }
  });

  it("every resolved value is a real primitive oklch() value from tokens.css", () => {
    const resolved = resolveAll(darkVars, primitives);
    for (const name of REQUIRED_DARK_TOKENS) {
      expect(resolved.get(name)).toMatch(/^oklch\(/);
    }
  });

  it('both the @media fallback block and the :root[data-theme="dark"] block declare identical values for every token', () => {
    // Two separate regex extractions, one per block, by slicing the
    // source around each selector — a stricter check than the merged
    // `darkVars` map above, which would silently hide a mismatch since
    // a later duplicate key simply overwrites the map entry.
    const mediaBlockMatch = /@media \(prefers-color-scheme: dark\) {\s*:root {([\s\S]*?)}\s*}/.exec(
      rawDarkCss,
    );
    const attrBlockMatch = /:root\[data-theme="dark"\] {([\s\S]*?)}/.exec(rawDarkCss);
    expect(mediaBlockMatch, "expected an @media (prefers-color-scheme: dark) block").not.toBeNull();
    expect(attrBlockMatch, 'expected a :root[data-theme="dark"] block').not.toBeNull();

    const mediaVars = extractCssVars(mediaBlockMatch![1]!);
    const attrVars = extractCssVars(attrBlockMatch![1]!);
    expect([...mediaVars.keys()].sort()).toEqual(REQUIRED_DARK_TOKENS);
    expect(Object.fromEntries(mediaVars)).toEqual(Object.fromEntries(attrVars));
  });

  it('uses :root[data-theme="dark"], not the bare [data-theme="dark"], so it always outranks the @media fallback\'s :root regardless of source order', () => {
    expect(rawDarkCss).toMatch(/:root\[data-theme="dark"\]\s*{/);
    expect(rawDarkCss).not.toMatch(/(?<!:root)\[data-theme="dark"\]/);
  });

  // Tokens that deliberately do NOT follow pure index-mirroring, and
  // exactly what they resolve to instead (see dark.css header, point
  // 3): measured near-invisibility at 900/950 (contrast ~1.00-1.13:1,
  // both in our own curve and stock Tailwind's) meant several bg/-bg
  // tokens step back to 800, and bg-hover/border-default to 700 —
  // trading a bit of mirror-purity for an actually-visible surface
  // stack, the same trick Tailwind's own dark-mode guidance uses
  // (skip adjacent steps at the dark end rather than placing them
  // side by side).
  const DELIBERATE_OVERRIDES: Record<string, string> = {
    "--color-bg-subtle": "var(--color-cool-gray-800)",
    "--color-bg-hover": "var(--color-cool-gray-700)",
    "--color-bg-elevated": "var(--color-cool-gray-800)",
    "--color-bg-overlay": "var(--color-cool-gray-950)",
    "--color-border-default": "var(--color-cool-gray-700)",
    "--color-accent-subtle": "var(--color-blue-800)",
    "--color-status-success-bg": "var(--color-green-800)",
    "--color-status-warning-bg": "var(--color-amber-800)",
    "--color-status-error-bg": "var(--color-red-800)",
    "--color-status-info-bg": "var(--color-sky-800)",
    "--color-status-neutral-bg": "var(--color-cool-gray-800)",
  };

  it("every mirrored token's primitive step is the light-mode step reflected around the 11-step scale (50<->950, ..., 500 self-mirrors)", () => {
    const MIRROR: Record<string, string> = {
      "50": "950",
      "100": "900",
      "200": "800",
      "300": "700",
      "400": "600",
      "500": "500",
      "600": "400",
      "700": "300",
      "800": "200",
      "900": "100",
      "950": "50",
    };
    const PURELY_MIRRORED = REQUIRED_DARK_TOKENS.filter((n) => !(n in DELIBERATE_OVERRIDES));
    const STEP_RE = /var\(--color-([a-z-]+)-(\d+)\)/;

    for (const name of PURELY_MIRRORED) {
      const lightValue = lightVars.get(name);
      const darkValue = darkVars.get(name);
      expect(lightValue, `light.css should declare ${name}`).toBeDefined();
      expect(darkValue, `dark.css should declare ${name}`).toBeDefined();

      const lightMatch = STEP_RE.exec(lightValue!);
      const darkMatch = STEP_RE.exec(darkValue!);
      expect(
        lightMatch,
        `${name}'s light value "${lightValue}" should match family-step`,
      ).not.toBeNull();
      expect(
        darkMatch,
        `${name}'s dark value "${darkValue}" should match family-step`,
      ).not.toBeNull();

      const [, lightFam, lightStep] = lightMatch!;
      const [, darkFam, darkStep] = darkMatch!;
      expect(darkFam, `${name} should keep the same family in both themes`).toBe(lightFam);
      expect(
        darkStep,
        `${name}: light step ${lightStep} should mirror to ${MIRROR[lightStep!]}, got ${darkStep}`,
      ).toBe(MIRROR[lightStep!]);
    }
  });

  it("every deliberate override resolves to its documented (non-mirrored) value", () => {
    for (const [name, expected] of Object.entries(DELIBERATE_OVERRIDES)) {
      expect(darkVars.get(name), `${name} should be a deliberate override`).toBe(expected);
    }
  });

  it("bg-overlay is fixed at cool-gray-950 in both themes (a scrim shouldn't invert)", () => {
    expect(lightVars.get("--color-bg-overlay")).toBe("var(--color-cool-gray-950)");
    expect(darkVars.get("--color-bg-overlay")).toBe("var(--color-cool-gray-950)");
  });

  it("bg-elevated shares bg-subtle's step rather than a mirrored copy of light mode's ==bg-base compromise", () => {
    expect(darkVars.get("--color-bg-elevated")).toBe(darkVars.get("--color-bg-subtle"));
    expect(darkVars.get("--color-bg-elevated")).not.toBe(darkVars.get("--color-bg-base"));
  });

  it("bg-hover shares border-default's step, mirroring light.css's own bg-hover/border-default precedent", () => {
    expect(darkVars.get("--color-bg-hover")).toBe(darkVars.get("--color-border-default"));
  });

  it("every -bg token backed off from 900/950 has meaningfully more chroma than a mirrored 900/950 value would (the actual 'visibly tinted' signal, not just contrast ratio)", () => {
    // Regression guard for the bug this whole set of overrides exists
    // to fix: status-*-bg mirrored to 950 measured at ~1.00-1.002:1
    // contrast against bg-base — indistinguishable from plain
    // background. Re-deriving exact chroma here would just
    // re-implement the primitive build; instead assert against
    // tokens.css's own resolved oklch() values directly.
    const resolved = resolveAll(darkVars, primitives);
    for (const name of [
      "--color-status-success-bg",
      "--color-status-warning-bg",
      "--color-status-error-bg",
      "--color-status-info-bg",
    ]) {
      const c = chromaOfOklch(resolved.get(name)!);
      expect(
        c,
        `${name} should carry a clearly visible tint, not a near-950 sliver`,
      ).toBeGreaterThan(0.04);
    }
  });

  it("captures the full resolved dark semantic -> primitive variable map", () => {
    const resolved = resolveAll(darkVars, primitives);
    const sorted = Object.fromEntries(
      [...resolved.entries()].sort(([a], [b]) => a.localeCompare(b)),
    );
    expect(sorted).toMatchSnapshot();
  });
});
