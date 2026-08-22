// Gamut-boundary math for the P3 progressive-enhancement layer.
//
// Uses culori (a maintained, widely-used color-science library)
// rather than hand-rolled matrices, specifically for gamut membership
// checks — getting oklch->P3 boundary math exactly right by hand is
// easy to get subtly wrong, and this is exactly the kind of primitive
// a real library should own. contrast.ts's own oklch->linear-sRGB
// matrices stay as they are (WCAG luminance math, a different
// concern, already tested against known reference values) — this
// module is only for "how far can this hue go before it leaves gamut
// X", used by the retuning script and the P3 build format below.
import { inGamut, type Oklch } from "culori";
import type { DtcgOklchColor } from "./oklch.js";

export type Gamut = "srgb" | "p3";

const gamutCheckers: Record<Gamut, (c: Oklch) => boolean> = {
  srgb: inGamut("rgb"),
  p3: inGamut("p3"),
};

/** Largest chroma at a fixed lightness/hue that's still displayable in
 *  the given gamut, found via binary search (culori's gamut check is
 *  the source of truth; this just searches it). */
export function maxChromaInGamut(
  l: number,
  h: number,
  gamut: Gamut,
  { maxC = 0.5, precision = 0.0003 }: { maxC?: number; precision?: number } = {},
): number {
  const inThisGamut = gamutCheckers[gamut];
  let lo = 0;
  let hi = maxC;
  if (inThisGamut({ mode: "oklch", l, c: hi, h })) return hi;
  while (hi - lo > precision) {
    const mid = (lo + hi) / 2;
    if (inThisGamut({ mode: "oklch", l, c: mid, h })) lo = mid;
    else hi = mid;
  }
  return lo;
}

export interface P3Enhancement {
  l: number;
  c: number;
  h: number;
}

/** Given a color already inside the sRGB gamut, returns a P3-boosted
 *  variant of the *same* lightness/hue if P3's ceiling meaningfully
 *  exceeds sRGB's at that L/H — otherwise `null` (nothing worth
 *  overriding).
 *
 *  Scales chroma *proportionally* — `newC = c * (p3Ceiling /
 *  srgbCeiling)`, clamped to a small margin under the P3 ceiling —
 *  rather than maxing every color out to its P3 gamut edge. That
 *  distinction matters: naively pushing every token to its P3 edge
 *  visibly re-saturates colors that are deliberately near-neutral
 *  (e.g. cool-gray's low-chroma steps would gain a noticeable blue
 *  tint). Proportional scaling preserves how vivid a color already is
 *  *relative to its own sRGB ceiling* — a color already authored near
 *  its sRGB edge (as this build's hand-tuned families are, see
 *  retune.mjs) ends up near its P3 edge too; a deliberately restrained
 *  color stays proportionally restrained in P3 as well. */
export function computeP3Enhancement(
  color: DtcgOklchColor,
  { minGain = 0.01, edgeMargin = 0.97 }: { minGain?: number; edgeMargin?: number } = {},
): P3Enhancement | null {
  const [l, , h] = color.components;
  if (l === "none" || h === "none") return null;
  const c = color.components[1];
  if (c === "none" || c <= 0) return null;

  const srgbCeiling = maxChromaInGamut(l, h, "srgb");
  const p3Ceiling = maxChromaInGamut(l, h, "p3");
  if (srgbCeiling <= 0) return null;

  const proportional = c * (p3Ceiling / srgbCeiling);
  const boosted = Math.min(proportional, p3Ceiling * edgeMargin);
  if (boosted - c <= minGain) return null;
  return { l, c: Math.round(boosted * 10000) / 10000, h };
}
