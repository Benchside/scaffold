// Semantic typography tokens (typography.css).
// Mirrors light.test.ts's pattern — declared-set check, primitive-reference
// shape per property, no dangling references, full resolved-map snapshot —
// applied to the theme-agnostic typography layer instead of the
// light/dark color one.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { extractCssVars, resolveAll, resolveCssVar } from "../resolve-css-vars.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const TYPOGRAPHY_CSS_PATH = path.resolve(here, "../typography.css");
const TOKENS_CSS_PATH = path.resolve(here, "../../../tokens/dist/tokens.css");

const ROLES = [
  "heading-1",
  "heading-2",
  "heading-3",
  "heading-4",
  "body-lg",
  "body",
  "body-sm",
  "label",
  "label-lg",
  "caption",
  "data",
  "code",
  "code-lg",
];
// Every role has these five, plus its own `--font-<role>` shorthand.
const CORE_PROPERTIES = ["family", "size", "weight", "line-height", "letter-spacing"];
// Only `data` additionally carries a numeric-alignment variant (see
// typography.css header: sans + tabular-nums instead of switching to
// mono for ordinary numeric results).
const NUMERIC_VARIANT_ROLES = ["data"];

const REQUIRED_TYPOGRAPHY_TOKENS = [
  ...ROLES.flatMap((role) => CORE_PROPERTIES.map((prop) => `--font-${role}-${prop}`)),
  ...ROLES.map((role) => `--font-${role}`),
  ...NUMERIC_VARIANT_ROLES.map((role) => `--font-${role}-numeric-variant`),
].sort();

// Which primitive namespace each property must chain into — the same
// per-property shape check light.test.ts does for color families/steps.
const PRIMITIVE_PATTERN: Record<string, RegExp> = {
  family: /^var\(--font-family-(sans|mono)\)$/,
  size: /^var\(--font-size-(xs|sm|base|lg|xl|2xl|3xl|4xl)\)$/,
  weight:
    /^var\(--font-weight-(thin|extralight|light|regular|medium|semibold|bold|extrabold|black)\)$/,
  "line-height": /^var\(--font-line-height-(tight|normal|relaxed)\)$/,
  "letter-spacing": /^var\(--font-letter-spacing-(tight|normal|wide|wider)\)$/,
};

// The CSS `font` shorthand grammar this token must satisfy:
// `<weight> <size>/<line-height> <family>`. Deliberately does NOT (and
// per the CSS spec, cannot) include letter-spacing — see file header.
const SHORTHAND_PATTERN = (role: string) =>
  new RegExp(
    `^var\\(--font-${role}-weight\\)\\s+var\\(--font-${role}-size\\)\\s+/\\s+var\\(--font-${role}-line-height\\)\\s+var\\(--font-${role}-family\\)$`,
  );

let primitives: Map<string, string>;
let typography: Map<string, string>;

beforeAll(() => {
  primitives = extractCssVars(readFileSync(TOKENS_CSS_PATH, "utf-8"));
  typography = extractCssVars(readFileSync(TYPOGRAPHY_CSS_PATH, "utf-8"));
});

describe("typography.css semantic mapping", () => {
  it("declares exactly the expected token set (13 roles x 5 core properties + shorthand, + data's numeric variant)", () => {
    expect([...typography.keys()].sort()).toEqual(REQUIRED_TYPOGRAPHY_TOKENS);
  });

  it("every core property references the correct primitive namespace", () => {
    for (const role of ROLES) {
      for (const prop of CORE_PROPERTIES) {
        const name = `--font-${role}-${prop}`;
        const value = typography.get(name);
        expect(value, `${name} should be declared`).toBeDefined();
        expect(value, `${name} = "${value}" should match ${PRIMITIVE_PATTERN[prop]}`).toMatch(
          PRIMITIVE_PATTERN[prop]!,
        );
      }
    }
  });

  it("every role's shorthand follows the CSS `font` grammar and chains to that role's own weight/size/line-height/family", () => {
    for (const role of ROLES) {
      const value = typography.get(`--font-${role}`);
      expect(value, `--font-${role} should be declared`).toBeDefined();
      expect(value, `--font-${role} = "${value}"`).toMatch(SHORTHAND_PATTERN(role));
    }
  });

  it("data's numeric-variant is tabular-nums, not a token reference (font-variant-numeric has no primitive scale)", () => {
    expect(typography.get("--font-data-numeric-variant")).toBe("tabular-nums");
  });

  it("resolves every token to a primitive (or, for data-numeric-variant, a literal keyword) with no dangling references", () => {
    for (const name of REQUIRED_TYPOGRAPHY_TOKENS) {
      expect(() => resolveCssVar(name, new Map([...primitives, ...typography]))).not.toThrow();
    }
  });

  it("code/code-lg use the mono family; every other role (including data) uses sans", () => {
    expect(typography.get("--font-code-family")).toBe("var(--font-family-mono)");
    expect(typography.get("--font-code-lg-family")).toBe("var(--font-family-mono)");
    for (const role of ROLES.filter((r) => r !== "code" && r !== "code-lg")) {
      expect(typography.get(`--font-${role}-family`)).toBe("var(--font-family-sans)");
    }
  });

  it("heading sizes are non-increasing from heading-1 to heading-4 (largest first)", () => {
    const order = ["3xl", "2xl", "xl", "lg"];
    const sizeRe = /^var\(--font-size-([a-z0-9]+)\)$/;
    const actual = ["1", "2", "3", "4"].map((n) => {
      const value = typography.get(`--font-heading-${n}-size`)!;
      return sizeRe.exec(value)![1];
    });
    expect(actual).toEqual(order);
  });

  it("captures the full resolved typography -> primitive variable map", () => {
    const resolved = resolveAll(typography, primitives);
    const sorted = Object.fromEntries(
      [...resolved.entries()].sort(([a], [b]) => a.localeCompare(b)),
    );
    expect(sorted).toMatchSnapshot();
  });
});
