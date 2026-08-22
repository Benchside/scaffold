// Flags any raw color value (hex, rgb, hsl, raw oklch literals) in
// source files, outside tokens.json / theme-*.css. This half covers
// JS/TS/TSX string literals (component code); the CSS half —
// theme-*.css and any future component stylesheets — is a separate
// check (scripts/check-css-tokens.mjs) since oxlint's jsPlugins only run
// against JS/TS ASTs, not CSS.
//
// Also flags raw Tailwind palette utility classes in TSX (`bg-blue-500`)
// that bypass the semantic layer — `bg-accent` is the only sanctioned
// way to reference that color. Arbitrary-value classes like
// `bg-[#3b82f6]` are already caught by the hex/rgb/oklch check above;
// this only adds the *named-palette* case, which the color regex can't
// see (`blue-500` isn't a color literal, it's an identifier).
//
// Exported as plain functions (not just wired into the rule object) so
// they can be unit-tested directly without spinning up oxlint itself —
// see no-hardcoded-colors.test.mjs.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const HARDCODED_COLOR_RE =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\(/;

export function findHardcodedColor(value) {
  if (typeof value !== "string") return null;
  const match = HARDCODED_COLOR_RE.exec(value);
  return match ? match[0] : null;
}

// Every primitive color family — read from tokens.json rather than
// duplicated here, so a new family (e.g. a future biolookup/labgraph
// accent) is covered automatically, no rule update needed.
const here = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = path.resolve(here, "../../packages/tokens/tokens.json");

function loadRawFamilyNames() {
  const tokens = JSON.parse(readFileSync(TOKENS_PATH, "utf-8"));
  return Object.keys(tokens.color).filter((key) => !key.startsWith("$"));
}

// Every Tailwind utility whose value slot is a color.
const COLOR_UTILITY_PREFIXES = [
  "bg",
  "text",
  "border",
  "ring",
  "ring-offset",
  "outline",
  "fill",
  "stroke",
  "decoration",
  "caret",
  "accent",
  "divide",
  "placeholder",
  "from",
  "via",
  "to",
  "shadow",
];

function buildRawTailwindClassRe() {
  const families = loadRawFamilyNames().join("|");
  const prefixes = COLOR_UTILITY_PREFIXES.join("|");
  return new RegExp(
    `^(?:${prefixes})-(?:${families})-(?:50|100|200|300|400|500|600|700|800|900|950)$`,
  );
}

const RAW_TAILWIND_CLASS_RE = buildRawTailwindClassRe();

/** Finds a raw `{utility}-{family}-{step}` Tailwind class (e.g.
 *  `bg-blue-500`) in a whitespace-separated class-list string, ignoring
 *  variant prefixes (`hover:`, `dark:`, ...). Semantic classes
 *  (`bg-accent`, `text-text-secondary`, ...) never match — none of our
 *  primitive family names collide with a semantic token name, and
 *  semantic classes have no trailing numeric step. */
export function findRawTailwindColorClass(value) {
  if (typeof value !== "string") return null;
  for (const token of value.split(/\s+/)) {
    const base = token.split(":").pop();
    if (base && RAW_TAILWIND_CLASS_RE.test(base)) return base;
  }
  return null;
}

const noHardcodedColors = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow hardcoded color literals (hex, rgb, hsl, oklch, ...) and raw Tailwind palette classes (bg-blue-500) — use design tokens instead",
    },
  },
  create(context) {
    return {
      Literal(node) {
        const hardcoded = findHardcodedColor(node.value);
        if (hardcoded) {
          context.report({
            node,
            message: `Hardcoded color "${hardcoded}" — reference a semantic token (var(--color-...)) instead.`,
          });
          return;
        }
        const rawClass = findRawTailwindColorClass(node.value);
        if (rawClass) {
          context.report({
            node,
            message: `Raw Tailwind color class "${rawClass}" — use a semantic token class (e.g. bg-accent) instead.`,
          });
        }
      },
    };
  },
};

export default noHardcodedColors;
