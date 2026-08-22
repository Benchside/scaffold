// @theme inline mapping: compiles a fixture importing the preset and
// asserts that utility classes are generated for the semantic tokens,
// with computed styles referencing CSS variables (not baked values).
// This repo's actual spacing tokens are role-based (`p-inset-md`, not
// `p-16`) and typography is decomposed per-namespace (see src/index.css
// header) — the assertions below use the equivalent classes for this
// token system.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { compileFixture } from "./compile.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(here, "fixtures/entry.css");

describe("@theme inline mapping", () => {
  test("generates a utility class for every sampled semantic token, referencing a CSS variable", async () => {
    const css = await compileFixture(FIXTURE);

    // varName is the fully-resolved semantic/primitive variable —
    // `@theme inline` follows the reference chain through our preset's
    // intermediate key (e.g. `--color-bg`) at build time, so the
    // generated utility lands directly on the underlying token
    // (`--color-bg-base`). That's the mechanism that makes `[data-theme]`
    // swaps work: the surviving var() still resolves live, it just skips
    // the middleman.
    const cases: Array<{ selector: string; property: string; varName: string }> = [
      { selector: ".bg-bg", property: "background-color", varName: "--color-bg-base" },
      {
        selector: ".bg-bg-subtle",
        property: "background-color",
        varName: "--color-bg-subtle",
      },
      { selector: ".text-text", property: "color", varName: "--color-text-primary" },
      {
        selector: ".text-text-secondary",
        property: "color",
        varName: "--color-text-secondary",
      },
      { selector: ".bg-accent", property: "background-color", varName: "--color-accent-default" },
      {
        selector: ".bg-accent-subtle",
        property: "background-color",
        varName: "--color-accent-subtle",
      },
      {
        selector: ".border-status-error",
        property: "border-color",
        varName: "--color-status-error",
      },
      {
        selector: ".bg-status-error-bg",
        property: "background-color",
        varName: "--color-status-error-bg",
      },
      { selector: ".p-inset-md", property: "padding", varName: "--space-inset-md" },
      { selector: ".gap-inline-sm", property: "gap", varName: "--space-inline-sm" },
      { selector: ".rounded-lg", property: "border-radius", varName: "--radius-lg" },
      { selector: ".rounded-full", property: "border-radius", varName: "--radius-full" },
      { selector: ".font-mono", property: "font-family", varName: "--font-family-mono" },
    ];

    for (const { selector, property, varName } of cases) {
      const escaped = selector.replace(/([.\\])/g, "\\$1");
      const ruleMatch = css.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`));
      expect(ruleMatch, `expected a rule for ${selector} (escaped: ${escaped})`).not.toBeNull();
      const body = ruleMatch![1]!;
      expect(body, `${selector} should declare ${property}`).toMatch(
        new RegExp(`${property}:\\s*var\\(${varName}\\)`),
      );
    }
  });

  test("decomposes a composite typography token into independent text/font-weight/tracking utilities", async () => {
    const css = await compileFixture(FIXTURE);

    const textRule = css.match(/\.text-heading-1\s*\{([^}]*)\}/);
    expect(textRule, "expected a .text-heading-1 rule").not.toBeNull();
    expect(textRule![1]).toMatch(/font-size:\s*var\(--font-heading-1-size\)/);
    expect(textRule![1]).toMatch(/line-height:\s*var\([^)]*--font-heading-1-line-height\)/);

    const weightRule = css.match(/\.font-heading-1\s*\{([^}]*)\}/);
    expect(weightRule, "expected a .font-heading-1 rule").not.toBeNull();
    expect(weightRule![1]).toMatch(/font-weight:\s*var\(--font-heading-1-weight\)/);

    const trackingRule = css.match(/\.tracking-heading-1\s*\{([^}]*)\}/);
    expect(trackingRule, "expected a .tracking-heading-1 rule").not.toBeNull();
    expect(trackingRule![1]).toMatch(/letter-spacing:\s*var\(--font-heading-1-letter-spacing\)/);
  });

  test("does not bake any resolved value — every generated declaration stays a var() chain", async () => {
    const css = await compileFixture(FIXTURE);

    // A baked value would show up as a raw oklch()/px literal directly on
    // a background-color/color/padding/border-radius declaration inside
    // one of our sampled rules, instead of a var(--...) reference.
    const bgBgRule = css.match(/\.bg-bg\s*\{([^}]*)\}/)![1]!;
    expect(bgBgRule).not.toMatch(/background-color:\s*oklch\(/);
    expect(bgBgRule).toMatch(/background-color:\s*var\(--color-bg-base\)/);
  });
});
