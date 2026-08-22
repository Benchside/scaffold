// Formats a DTCG structured oklch color value into a CSS oklch() string
// with zero conversion loss: components are emitted exactly as authored
// in tokens.json.
//
// Style Dictionary's own built-in `color/oklch` transform is NOT usable
// for this — it round-trips every color through colorjs.io's internal
// oklch <-> XYZ pipeline even when the source is already oklch, which
// measurably drifts the values (observed on `color.cool-gray.500`:
// authored [0.57, 0.012, 240] came back as
// oklch(0.5688 0.0125 243.79) — hue off by ~3.8deg). That's an
// unacceptable transformation loss, so this module bypasses colorjs.io
// entirely — every color token in tokens.json declares colorSpace
// "oklch", so no other color space needs handling.
//
// Components (and alpha) may be the literal string "none" instead of a
// number — the CSS Color 4 / DTCG way of saying "this channel is
// undefined," used here for a handful of achromatic near-white grays
// (e.g. color.zinc.50, color.neutral.50) where chroma is 0 and hue is
// therefore meaningless. `oklch(0.985 0 none)` is valid CSS and must be
// passed through as-is, not rejected as malformed.

type OklchComponent = number | "none";

export interface DtcgOklchColor {
  colorSpace: "oklch";
  components: [OklchComponent, OklchComponent, OklchComponent];
  alpha?: number | "none";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isComponentValue(value: unknown): value is OklchComponent {
  return typeof value === "number" || value === "none";
}

export function isDtcgOklchColor(value: unknown): value is DtcgOklchColor {
  if (!isPlainObject(value)) return false;
  if (value.colorSpace !== "oklch") return false;
  const { components, alpha } = value;
  if (alpha !== undefined && !isComponentValue(alpha)) return false;
  return Array.isArray(components) && components.length === 3 && components.every(isComponentValue);
}

/** Renders a DTCG oklch color object as a CSS `oklch()` function string. */
export function formatOklch(value: DtcgOklchColor): string {
  const [l, c, h] = value.components;
  const base = `oklch(${l} ${c} ${h})`;
  if (value.alpha === undefined || value.alpha === 1) return base;
  return `oklch(${l} ${c} ${h} / ${value.alpha})`;
}

const OKLCH_STRING_RE = /^oklch\(\s*([\d.]+)\s+([\d.]+|none)\s+([\d.]+|none)\s*\)$/;

function toOklchComponent(s: string): number | "none" {
  return s === "none" ? "none" : Number(s);
}

/** Parses a CSS `oklch(L C H)` string (as produced by `formatOklch`, with
 *  no alpha component) back into a DTCG oklch color object. Used by the
 *  P3-enhancement build format, which only has access to each token's
 *  already-transformed `$value` string, not its pre-transform DTCG
 *  object. Returns `null` for anything that isn't a bare 3-component
 *  oklch() string (e.g. non-color tokens, or oklch with alpha). */
export function parseOklchString(value: string): DtcgOklchColor | null {
  const match = OKLCH_STRING_RE.exec(value.trim());
  if (!match) return null;
  const [, l, c, h] = match;
  return {
    colorSpace: "oklch",
    components: [toOklchComponent(l!), toOklchComponent(c!), toOklchComponent(h!)],
  };
}
