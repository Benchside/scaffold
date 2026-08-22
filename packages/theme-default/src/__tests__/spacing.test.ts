// Semantic spacing tokens (spacing.css).
// Mirrors light.test.ts's pattern — declared-set check, primitive-reference
// shape, no dangling references, full resolved-map snapshot — applied to
// the theme-agnostic spacing layer.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { extractCssVars, resolveAll, resolveCssVar } from "../resolve-css-vars.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const SPACING_CSS_PATH = path.resolve(here, "../spacing.css");
const TOKENS_CSS_PATH = path.resolve(here, "../../../tokens/dist/tokens.css");

const ROLE_SIZES: Record<string, string[]> = {
  inset: ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"],
  stack: ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"],
  inline: ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"],
};

const REQUIRED_SPACING_TOKENS = Object.entries(ROLE_SIZES)
  .flatMap(([role, sizes]) => sizes.map((size) => `--space-${role}-${size}`))
  .sort();

let primitives: Map<string, string>;
let spacing: Map<string, string>;

beforeAll(() => {
  primitives = extractCssVars(readFileSync(TOKENS_CSS_PATH, "utf-8"));
  spacing = extractCssVars(readFileSync(SPACING_CSS_PATH, "utf-8"));
});

describe("spacing.css semantic mapping", () => {
  it("declares exactly the expected token set (inset/stack x8, inline x7)", () => {
    expect([...spacing.keys()].sort()).toEqual(REQUIRED_SPACING_TOKENS);
  });

  it("every token is a var() reference into the --size-* primitive scale, never a raw px literal", () => {
    for (const name of REQUIRED_SPACING_TOKENS) {
      const value = spacing.get(name);
      expect(value, `${name} should be declared`).toBeDefined();
      expect(value, `${name} = "${value}" should reference --size-*`).toMatch(
        /^var\(--size-\d+\)$/,
      );
    }
  });

  it("resolves every token to a primitive with no dangling references", () => {
    for (const name of REQUIRED_SPACING_TOKENS) {
      expect(() => resolveCssVar(name, new Map([...primitives, ...spacing]))).not.toThrow();
    }
  });

  it("each role's scale increases monotonically from xs to its largest size", () => {
    const sizeRe = /^var\(--size-(\d+)\)$/;
    for (const [role, sizes] of Object.entries(ROLE_SIZES)) {
      const values = sizes.map((size) => {
        const raw = spacing.get(`--space-${role}-${size}`)!;
        return Number(sizeRe.exec(raw)![1]);
      });
      for (let i = 1; i < values.length; i++) {
        expect(values[i]!, `${role}: ${sizes[i]} should be > ${sizes[i - 1]}`).toBeGreaterThan(
          values[i - 1]!,
        );
      }
    }
  });

  it("captures the full resolved spacing -> primitive variable map", () => {
    const resolved = resolveAll(spacing, primitives);
    const sorted = Object.fromEntries(
      [...resolved.entries()].sort(([a], [b]) => a.localeCompare(b)),
    );
    expect(sorted).toMatchSnapshot();
  });
});
