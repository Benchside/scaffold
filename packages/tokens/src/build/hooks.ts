// Wires Scaffold's custom Style Dictionary transforms and formats
// together as a `Config["hooks"]` object, passed directly into the
// StyleDictionary constructor in sd.config.ts. Kept instance-scoped
// (via `hooks`, not `StyleDictionary.registerTransform(...)`) so
// building the token pipeline never mutates global Style Dictionary
// state — safe to construct multiple instances (e.g. from tests) in
// the same process.
//
// Every platform (css, js, ts) shares one transform group,
// "scaffold/base": color and dimension tokens get the exact same
// formatted value everywhere (an oklch() string, a "16px"/"1rem"
// string), and only the *format* differs per platform (CSS custom
// properties vs. a nested JS/TS object). This keeps the three outputs
// from drifting relative to each other.

import type { Config } from "style-dictionary/types";
import { isDtcgOklchColor, formatOklch, parseOklchString } from "./oklch.js";
import { isLetterSpacingToken, formatLetterSpacingEm } from "./letter-spacing.js";
import { buildNestedValueTree, type FlatToken } from "./nested-tree.js";
import { buildTypeLiteral } from "./type-literal.js";
import { computeP3Enhancement } from "./gamut.js";

export const SCAFFOLD_TRANSFORM_GROUP = "scaffold/base";

const GENERATED_FILE_HEADER =
  "// Do not edit directly — generated from tokens.json by Style Dictionary (packages/tokens/sd.config.ts).\n";

export const hooks: Config["hooks"] = {
  transforms: {
    "color/oklch-passthrough": {
      type: "value",
      filter: (token) => token.$type === "color",
      transform: (token) => {
        const value = token.$value;
        if (!isDtcgOklchColor(value)) {
          throw new Error(
            `Color token "${token.path.join(".")}" is not a DTCG oklch color object ` +
              `({colorSpace: "oklch", components: [...]}). Scaffold's primitive palette ` +
              'only supports colorSpace "oklch".',
          );
        }
        return formatOklch(value);
      },
    },
    "letterSpacing/em": {
      type: "value",
      filter: (token) => token.$type === "number" && isLetterSpacingToken(token.path),
      transform: (token) => formatLetterSpacingEm(token.$value as number),
    },
  },
  transformGroups: {
    [SCAFFOLD_TRANSFORM_GROUP]: [
      "attribute/cti",
      "name/kebab",
      // size/rem is unit-preserving despite the name: it keeps whatever
      // unit the DTCG dimension token declares (px for size/radius,
      // rem for font.size) rather than forcing one — verified against
      // Style Dictionary v5.5.1's implementation before relying on it.
      "size/rem",
      "color/oklch-passthrough",
      "fontFamily/css",
      "letterSpacing/em",
    ],
  },
  formats: {
    "javascript/nested-object": ({ dictionary }) => {
      const tree = buildNestedValueTree(dictionary.allTokens as FlatToken[]);
      return (
        GENERATED_FILE_HEADER +
        `export const Tokens = ${JSON.stringify(tree, null, 2)};\n\nexport default Tokens;\n`
      );
    },
    "typescript/nested-object-declarations": ({ dictionary }) => {
      const tree = buildNestedValueTree(dictionary.allTokens as FlatToken[]);
      return (
        GENERATED_FILE_HEADER +
        `export declare const Tokens: ${buildTypeLiteral(tree)};\n\nexport default Tokens;\n`
      );
    },
    // P3 progressive enhancement, added alongside the existing pipeline
    // (not replacing "css/variables" — that format/file stays untouched).
    // This is a second, separate output: a `@media (color-gamut: p3)` override
    // block covering only the color tokens that have *meaningful*
    // headroom beyond sRGB at their authored lightness/hue (most very
    // light, very dark, or near-achromatic steps don't, and are skipped
    // so the block doesn't carry dead weight). Safe to import
    // unconditionally alongside tokens.css — inert on non-P3 displays.
    "css/p3-enhancement": ({ dictionary }) => {
      // Scoped to the families that were deliberately hand-tuned rather
      // than borrowed as-is from Tailwind (blue; teal/violet/emerald/
      // amber/red/green/sky, retuned by the cross-hue
      // perceptual-consistency pass in retune-primitives.ts — the last
      // two added specifically so every semantic `status-*` color, not
      // just warning/error, sits on the same canonical curve). The
      // other ~19 reference families are
      // used incidentally (data-viz reserve, rarely-hit alternates) and
      // haven't had the same scrutiny put into their chroma curves —
      // enhancing them toward a gamut edge nobody deliberately chose
      // isn't a decision this build step should make silently. Revisit
      // this allowlist if/when more families get the same treatment.
      const P3_ENHANCED_FAMILIES = new Set([
        "blue",
        "teal",
        "violet",
        "emerald",
        "amber",
        "red",
        "green",
        "sky",
      ]);
      const lines: string[] = [];
      for (const token of dictionary.allTokens) {
        if (token.path[0] !== "color") continue;
        if (!P3_ENHANCED_FAMILIES.has(String(token.path[1]))) continue;
        const parsed = parseOklchString(String(token.$value));
        if (!parsed) continue;
        const enhancement = computeP3Enhancement(parsed);
        if (!enhancement) continue;
        lines.push(
          `    --${token.name}: oklch(${enhancement.l} ${enhancement.c} ${enhancement.h});`,
        );
      }
      // CSS has no `//` line-comment syntax — only `/* */` block
      // comments are valid. GENERATED_FILE_HEADER (shared with the JS/
      // TS formats above, where `//` is correct) doesn't apply here;
      // this format needs its own CSS-flavored header.
      const CSS_GENERATED_FILE_HEADER =
        "/**\n * Do not edit directly — generated from tokens.json by Style Dictionary" +
        " (packages/tokens/sd.config.ts).\n */\n";
      if (lines.length === 0) {
        return (
          CSS_GENERATED_FILE_HEADER +
          "/* No color in this palette currently has meaningful headroom beyond sRGB in P3. */\n"
        );
      }
      return (
        CSS_GENERATED_FILE_HEADER +
        "/**\n" +
        " * Wider-gamut variants of primitives that have meaningful headroom\n" +
        " * beyond sRGB on a P3-capable display (same lightness/hue as the sRGB\n" +
        " * value in tokens.css, chroma pushed out toward the P3 gamut edge).\n" +
        " * Import this file unconditionally alongside tokens.css — the whole\n" +
        " * block is gated behind @media (color-gamut: p3), so it's inert (and\n" +
        " * costs nothing to parse/apply) on sRGB displays.\n" +
        " */\n" +
        "@media (color-gamut: p3) {\n  :root {\n" +
        lines.join("\n") +
        "\n  }\n}\n"
      );
    },
  },
};
