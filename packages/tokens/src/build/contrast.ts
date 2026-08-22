// WCAG contrast-ratio checking for Scaffold's semantic token pairs.
//
// This module is deliberately scoped to the color-value math only: given
// two oklch colors, compute their WCAG contrast ratio and judge it
// against the AA thresholds. It does NOT know about any specific
// semantic pairing (text-primary on bg-base, etc.) — those live in
// `theme-default`. `checkContrastPairs` below is the wiring point: build
// a `ContrastPair[]` from a theme's resolved light/dark semantic tokens
// and pass it in.
//
// Conversion path: OKLCH -> OKLab -> linear sRGB, using the CSS Color 4
// matrices (same ones browsers use). WCAG relative luminance is then
// computed directly from those linear RGB values — WCAG's own
// sRGB-gamma linearization step is skipped because the OKLab -> sRGB
// matrices already produce linear-light output, not gamma-encoded
// sRGB. Sanity-checked against the reference case oklch(1 0 0) (white)
// vs oklch(0 0 0) (black), which must come out to exactly 21:1 — see
// contrast.test.ts.

import type { DtcgOklchColor } from "./oklch.js";

export type WcagTextSize = "normal" | "large";

/** WCAG 2.x AA contrast thresholds: 4.5:1 for normal text, 3:1 for large text. */
export const WCAG_AA_THRESHOLD: Record<WcagTextSize, number> = {
  normal: 4.5,
  large: 3,
};

function component(value: number | "none"): number {
  // "none" is the DTCG/CSS Color 4 way of saying "this channel is
  // undefined" (see oklch.ts) — undefined chroma/hue behaves as 0.
  return value === "none" ? 0 : value;
}

function clamp(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Converts an OKLCH color's channels to linear-light sRGB in [0, 1].
 *  Clamped: Scaffold's palette is authored for sRGB display, but OKLCH
 *  can express colors outside the sRGB gamut, which would otherwise
 *  produce negative or >1 components here. Exported for reuse by
 *  apca.ts, which needs the same oklch -> sRGB path (gamma-encoded,
 *  rather than linear) — one conversion implementation shared by both
 *  contrast algorithms, not two that could drift apart. */
export function oklchToLinearSrgb(color: DtcgOklchColor): [number, number, number] {
  const [lRaw, cRaw, hRaw] = color.components;
  const L = component(lRaw);
  const C = component(cRaw);
  const H = component(hRaw);
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_temp = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_temp = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_temp = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_temp ** 3;
  const m = m_temp ** 3;
  const s = s_temp ** 3;

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return [clamp(r), clamp(g), clamp(bLin)];
}

/** WCAG relative luminance (0 = black, 1 = white) of an oklch color. */
export function relativeLuminance(color: DtcgOklchColor): number {
  const [r, g, bLin] = oklchToLinearSrgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bLin;
}

/** WCAG 2.x contrast ratio between two colors, in [1, 21]. Argument
 *  order doesn't matter — the lighter color is always treated as the
 *  numerator per the WCAG formula. */
export function contrastRatio(a: DtcgOklchColor, b: DtcgOklchColor): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Whether a contrast ratio meets WCAG AA for the given text size. */
export function meetsWcagAA(ratio: number, textSize: WcagTextSize = "normal"): boolean {
  return ratio >= WCAG_AA_THRESHOLD[textSize];
}

/** A single text-on-background pairing to check, e.g. "text-primary on
 *  bg-base". `name` is a free-form label for reporting only. */
export interface ContrastPair {
  name: string;
  text: DtcgOklchColor;
  background: DtcgOklchColor;
  textSize?: WcagTextSize;
}

export interface ContrastCheckResult {
  name: string;
  ratio: number;
  required: number;
  passes: boolean;
}

/** Runs the WCAG AA compliance check across a list of pairs. This is
 *  the entry point 0.4.1/0.4.2/0.4.3 will call once semantic tokens
 *  exist — build the `ContrastPair[]` from resolved semantic-to-primitive
 *  values (e.g. text-primary -> bg-base for both light and dark theme
 *  files) and pass it in here. */
export function checkContrastPairs(pairs: readonly ContrastPair[]): ContrastCheckResult[] {
  return pairs.map(({ name, text, background, textSize = "normal" }) => {
    const ratio = contrastRatio(text, background);
    const required = WCAG_AA_THRESHOLD[textSize];
    return { name, ratio, required, passes: ratio >= required };
  });
}
