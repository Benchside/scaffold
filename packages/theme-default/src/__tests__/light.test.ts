// Light mode semantic mapping. Every semantic variable must resolve to a
// primitive token (no dangling references); a snapshot test captures the
// full resolved variable map.
//
// The token set covers what every component actually needs, beyond the
// core surface/text/border/accent/status groups: bg-hover, bg-inverse,
// text-placeholder, border-error, status-error-hover/-active, and
// status-neutral-bg. `border-focus` and `accent-text` are deliberately
// chained semantic references rather than direct primitive references,
// so per-tool theme packages only ever need to override
// accent-default/accent-hover/accent-active/accent-subtle and everything
// downstream follows automatically.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { extractCssVars, resolveAll, resolveCssVar } from "../resolve-css-vars.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const LIGHT_CSS_PATH = path.resolve(here, "../light.css");
const TOKENS_CSS_PATH = path.resolve(here, "../../../tokens/dist/tokens.css");

// Full semantic token set (33): 32 from the 0.4.1 audit, plus
// text-on-solid (added when Tooltip's consumption of bg-inverse/
// text-inverse revealed those two tokens were conflating "contrasts
// with the page" (Tooltip, wants theme-inverting) with "contrasts with
// a solid accent/status fill" (Button's primary/destructive text,
// wants fixed) — text-on-solid takes over the latter job with its own
// name, freeing bg-inverse/text-inverse to actually invert per theme
// (see theme-default/dark.css).
const REQUIRED_SEMANTIC_TOKENS = [
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
  "--color-text-on-solid",
  // Border
  "--color-border-default",
  "--color-border-strong",
  "--color-border-focus",
  "--color-border-error",
  // Accent
  "--color-accent-default",
  "--color-accent-hover",
  "--color-accent-active",
  "--color-accent-subtle",
  "--color-accent-text",
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

// Tokens that intentionally chain to another semantic token rather
// than a primitive directly (so per-tool accent overrides propagate).
// Everything else must reference a primitive var directly.
const CHAINED_TOKENS: Record<string, string> = {
  "--color-border-focus": "var(--color-accent-default)",
  "--color-accent-text": "var(--color-accent-hover)",
};

let primitives: Map<string, string>;
let semantics: Map<string, string>;

beforeAll(() => {
  const tokensCss = readFileSync(TOKENS_CSS_PATH, "utf-8");
  const lightCss = readFileSync(LIGHT_CSS_PATH, "utf-8");
  primitives = extractCssVars(tokensCss);
  semantics = extractCssVars(lightCss);
});

describe("light.css semantic mapping", () => {
  it("declares exactly the semantic token set from the 0.4.1 audit", () => {
    expect([...semantics.keys()].sort()).toEqual(REQUIRED_SEMANTIC_TOKENS);
  });

  it("declares every semantic token as a var() reference, never a raw literal", () => {
    for (const name of REQUIRED_SEMANTIC_TOKENS) {
      const value = semantics.get(name);
      expect(value, `${name} should be declared`).toBeDefined();
      expect(value, `${name} should be a var() reference, got "${value}"`).toMatch(
        /^var\(--color-[a-z0-9-]+\)$/,
      );
    }
  });

  it("chains border-focus and accent-text to accent tokens (not fixed primitives) so per-tool theme overrides cascade automatically", () => {
    for (const [name, expected] of Object.entries(CHAINED_TOKENS)) {
      expect(semantics.get(name)).toBe(expected);
    }
  });

  it("every non-chained token resolves directly to a primitive (one hop)", () => {
    for (const name of REQUIRED_SEMANTIC_TOKENS) {
      if (name in CHAINED_TOKENS) continue;
      expect(semantics.get(name)).toMatch(/^var\(--color-[a-z-]+-\d+\)$/);
    }
  });

  it("resolves every semantic token to a primitive with no dangling references", () => {
    for (const name of REQUIRED_SEMANTIC_TOKENS) {
      expect(() => resolveCssVar(name, new Map([...primitives, ...semantics]))).not.toThrow();
    }
  });

  it("every resolved value is a real primitive oklch() value from tokens.css", () => {
    const resolved = resolveAll(semantics, primitives);
    for (const name of REQUIRED_SEMANTIC_TOKENS) {
      expect(resolved.get(name)).toMatch(/^oklch\(/);
    }
  });

  it("throws DanglingReferenceError for a semantic token pointing at a nonexistent primitive", () => {
    const broken = new Map(semantics);
    broken.set("--color-bg-base", "var(--color-cool-gray-1000)");
    expect(() =>
      resolveCssVar("--color-bg-base", new Map([...primitives, ...broken])),
    ).toThrowError(/references undefined custom property --color-cool-gray-1000/);
  });

  it("throws DanglingReferenceError if a chained token's target is removed", () => {
    const broken = new Map(semantics);
    broken.delete("--color-accent-default");
    expect(() =>
      resolveCssVar("--color-border-focus", new Map([...primitives, ...broken])),
    ).toThrowError(/references undefined custom property --color-accent-default/);
  });

  it("captures the full resolved semantic -> primitive variable map", () => {
    const resolved = resolveAll(semantics, primitives);
    const sorted = Object.fromEntries(
      [...resolved.entries()].sort(([a], [b]) => a.localeCompare(b)),
    );
    expect(sorted).toMatchSnapshot();
  });
});
