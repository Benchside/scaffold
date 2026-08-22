// Verifies: every text/background pairing passes WCAG AA in both light
// and dark mode.
//
// contrast.test.ts only exercises the raw oklch-math half of the
// contrast pipeline (no semantic tokens involved). This file is the
// wiring: build a real ContrastPair[] from theme-default's light.css /
// dark.css semantic tokens, resolved down to primitives, and run both
// light and dark through the same checkContrastPairs gate.
//
// Reads theme-default's source CSS directly by relative path (same
// direction theme-default's own tests already read tokens/dist/tokens.css
// by relative path) rather than importing theme-default as a package —
// tokens is the foundation layer; it has no runtime dependency on
// theme-default, and this is test-only filesystem coupling, not a code
// import.
//
// Dark mode's effective variable set is NOT just dark.css's declared
// vars: border-focus, accent-text, bg-inverse, and text-inverse are
// deliberately *not* redeclared there (see dark.css's header) because
// they chain into other tokens (border-focus -> accent-default) or stay
// fixed across themes (bg-inverse) via light.css's always-on `:root`
// rule. A real browser resolves this via normal CSS cascade; here it's
// simulated with `new Map([...lightVars, ...darkVars])` — dark's
// declarations override light's for any key present in both, and keys
// only declared in light.css (the chained/fixed ones) fall through to
// light's value, which itself still resolves through the merged map, so
// e.g. border-focus correctly picks up dark's accent-default rather than
// light's.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { extractCssVars, resolveAll } from "../build/css-vars.js";
import { parseOklchString, type DtcgOklchColor } from "../build/oklch.js";
import { checkContrastPairs, type ContrastPair, type WcagTextSize } from "../build/contrast.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_CSS_PATH = path.resolve(here, "../../dist/tokens.css");
const LIGHT_CSS_PATH = path.resolve(here, "../../../theme-default/src/light.css");
const DARK_CSS_PATH = path.resolve(here, "../../../theme-default/src/dark.css");

type Mode = "light" | "dark";

let primitives: Map<string, string>;
let lightVars: Map<string, string>;
let darkVars: Map<string, string>;
let resolvedByMode: Record<Mode, Map<string, string>>;

beforeAll(() => {
  primitives = extractCssVars(readFileSync(TOKENS_CSS_PATH, "utf-8"));
  lightVars = extractCssVars(readFileSync(LIGHT_CSS_PATH, "utf-8"));
  darkVars = extractCssVars(readFileSync(DARK_CSS_PATH, "utf-8"));

  const effectiveDarkVars = new Map([...lightVars, ...darkVars]);
  resolvedByMode = {
    light: resolveAll(lightVars, primitives),
    dark: resolveAll(effectiveDarkVars, primitives),
  };
});

function colorOf(resolved: Map<string, string>, name: string): DtcgOklchColor {
  const value = resolved.get(name);
  expect(value, `${name} should resolve to a value`).toBeDefined();
  const parsed = parseOklchString(value!);
  expect(
    parsed,
    `${name}'s resolved value "${value}" should be a bare oklch() string`,
  ).not.toBeNull();
  return parsed!;
}

// Text/background pairs that must meet WCAG AA (4.5:1 normal, 3:1 large)
// in both themes, covering every semantic pairing actually used across
// components (Surface/Text/Accent/Status groups).
function buildTextPairs(resolved: Map<string, string>): ContrastPair[] {
  const c = (name: string) => colorOf(resolved, name);
  return [
    {
      name: "text-primary on bg-base",
      text: c("--color-text-primary"),
      background: c("--color-bg-base"),
    },
    {
      name: "text-primary on bg-subtle",
      text: c("--color-text-primary"),
      background: c("--color-bg-subtle"),
    },
    {
      name: "text-primary on bg-elevated",
      text: c("--color-text-primary"),
      background: c("--color-bg-elevated"),
    },
    {
      name: "text-secondary on bg-base",
      text: c("--color-text-secondary"),
      background: c("--color-bg-base"),
    },
    {
      name: "text-secondary on bg-subtle",
      text: c("--color-text-secondary"),
      background: c("--color-bg-subtle"),
    },
    // Selected rows / info banners use accent.subtle as a tinted
    // background — the risk case: dark accent-subtle (blue-800) is a
    // fairly dark, saturated fill, not a light tint like light mode's
    // blue-50.
    {
      name: "text-primary on accent-subtle",
      text: c("--color-text-primary"),
      background: c("--color-accent-subtle"),
    },
    {
      name: "accent-text on bg-base",
      text: c("--color-accent-text"),
      background: c("--color-bg-base"),
    },
    // Tooltip / dark Toast — fixed across themes, included for regression
    // coverage rather than assumed safe.
    {
      name: "text-inverse on bg-inverse",
      text: c("--color-text-inverse"),
      background: c("--color-bg-inverse"),
    },
    {
      name: "status-success on status-success-bg",
      text: c("--color-status-success"),
      background: c("--color-status-success-bg"),
    },
    {
      name: "status-warning on status-warning-bg",
      text: c("--color-status-warning"),
      background: c("--color-status-warning-bg"),
    },
    {
      name: "status-error on status-error-bg",
      text: c("--color-status-error"),
      background: c("--color-status-error-bg"),
    },
    {
      name: "status-info on status-info-bg",
      text: c("--color-status-info"),
      background: c("--color-status-info-bg"),
    },
    {
      name: "status-neutral on status-neutral-bg",
      text: c("--color-status-neutral"),
      background: c("--color-status-neutral-bg"),
    },
  ];
}

// Non-text UI component contrast (WCAG 1.4.11-equivalent: 3:1, not
// 4.5:1). `checkContrastPairs`'s WcagTextSize only models "normal"/"large"
// (4.5/3), so "large" is reused here as the 3:1 proxy — same numeric bar,
// different category, see apca.ts for the same tradeoff made explicitly
// for APCA's own non-text bucket.
//
// Only border-focus is checked here, not border-default: SC 1.4.11 only
// requires 3:1 for boundaries essential to identifying a UI component
// (focus indicators are the canonical case, and are non-negotiable).
// Plain dividers/zebra-row borders are decorative and exempt — and
// border-default (cool-gray-200/700) is deliberately subtle by design,
// not a bug. A dedicated input-border contrast check belongs at the
// component level, once `Input`'s actual visual treatment (e.g. whether
// it leans on a background-color difference instead of a border) exists
// — not here, at the token layer.
function buildNonTextPairs(resolved: Map<string, string>): ContrastPair[] {
  const c = (name: string) => colorOf(resolved, name);
  const textSize: WcagTextSize = "large";
  return [
    {
      name: "border-focus on bg-base",
      text: c("--color-border-focus"),
      background: c("--color-bg-base"),
      textSize,
    },
  ];
}

describe.each<Mode>(["light", "dark"])("%s mode semantic contrast", (mode) => {
  it("every text/background pairing meets WCAG AA", () => {
    const resolved = resolvedByMode[mode];
    const results = checkContrastPairs(buildTextPairs(resolved));
    const failures = results.filter((r) => !r.passes);
    expect(failures, `failing pairs: ${JSON.stringify(failures)}`).toEqual([]);
  });

  it("every non-text (border/focus) pairing meets the 3:1 UI-component bar", () => {
    const resolved = resolvedByMode[mode];
    const results = checkContrastPairs(buildNonTextPairs(resolved));
    const failures = results.filter((r) => !r.passes);
    expect(failures, `failing pairs: ${JSON.stringify(failures)}`).toEqual([]);
  });

  // text-disabled is intentionally exempt from AA (see light.css's
  // comment and packages/tokens/src/__tests__/contrast.test.ts, which
  // pins the light-mode case). Asserted here as a known failure, not
  // silently excluded, so a future change that accidentally makes it
  // pass — or a change that makes some *other* pairing start failing
  // silently alongside it — doesn't go unnoticed.
  it("text-disabled on bg-base is a known, accepted AA failure (not a regression)", () => {
    const resolved = resolvedByMode[mode];
    const [result] = checkContrastPairs([
      {
        name: "text-disabled on bg-base",
        text: colorOf(resolved, "--color-text-disabled"),
        background: colorOf(resolved, "--color-bg-base"),
      },
    ]);
    expect(result?.passes).toBe(false);
  });
});
