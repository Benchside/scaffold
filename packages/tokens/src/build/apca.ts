// APCA (Accessible Perceptual Contrast Algorithm) support — added
// alongside the existing WCAG 2.x contrast pipeline (contrast.ts).
//
// This SUPPLEMENTS contrast.ts, it does not replace it: WCAG 2.x AA is
// the pass/fail authority for CI. APCA is the contrast
// model expected to anchor WCAG 3 / Silver, and reports its result on
// a different scale (a signed "Lc" value, roughly -108..106, not a
// ratio) with a different, perceptually-corrected algorithm — useful
// forward-looking visibility on top of the WCAG2 numbers, not a
// second gate.
//
// Uses apca-w3, the reference implementation published by the
// algorithm's author (Myndex) — the polynomial/exponent constants in
// the real spec are easy to get subtly wrong by hand, so this wraps
// the authoritative implementation rather than reimplementing it.

import { APCAcontrast, sRGBtoY } from "apca-w3";
import type { DtcgOklchColor } from "./oklch.js";
import { oklchToLinearSrgb, type ContrastPair } from "./contrast.js";

// sRGB EOTF^-1 (linear-light -> gamma-encoded, the standard piecewise
// curve) — apca-w3's sRGBtoY expects gamma-encoded 8bpc sRGB (it does
// its own linearization internally), whereas contrast.ts's
// oklchToLinearSrgb produces *linear*-light values for the WCAG
// formula. Both algorithms start from the same oklch -> linear-sRGB
// conversion; this is the one extra step APCA needs on top of it.
function linearToGamma(value: number): number {
  const v = Math.min(1, Math.max(0, value));
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
}

function toSrgb8bpc(color: DtcgOklchColor): [number, number, number] {
  const [r, g, b] = oklchToLinearSrgb(color);
  return [linearToGamma(r) * 255, linearToGamma(g) * 255, linearToGamma(b) * 255];
}

/** APCA "Lc" contrast between text and background colors. Sign is
 *  meaningful (do not take the absolute value blindly when comparing
 *  against a threshold table): positive means dark text on a light
 *  background, negative means light text on a dark background — see
 *  `meetsApca`, which handles this correctly. */
export function apcaContrast(text: DtcgOklchColor, background: DtcgOklchColor): number {
  const textY = sRGBtoY(toSrgb8bpc(text));
  const bgY = sRGBtoY(toSrgb8bpc(background));
  return APCAcontrast(textY, bgY);
}

export type ApcaUseCase = "body-text" | "large-text" | "non-text";

// A simplified subset of APCA's readability guidance (Myndex's
// published Lc reference numbers), not the full Silver-conformance
// font-size/weight lookup table — that table needs a font size and
// weight per pairing, which Scaffold's contrast pairs (semantic token
// pairs, not typeset text) don't carry. These three buckets cover what
// Scaffold's own pairings actually are: normal body copy, large/bold
// text, and non-text UI (borders, icons, focus rings — WCAG 2.x
// 1.4.11-equivalent territory). Revisit with the full table if/when a
// component's actual rendered font size needs a precise verdict.
export const APCA_THRESHOLD: Record<ApcaUseCase, number> = {
  "body-text": 60,
  "large-text": 45,
  "non-text": 15,
};

/** Whether an Lc value meets the APCA threshold for a use case. Takes
 *  the absolute value — APCA's sign encodes polarity (light-on-dark vs
 *  dark-on-light), not pass/fail, and both polarities are legitimate. */
export function meetsApca(lc: number, useCase: ApcaUseCase = "body-text"): boolean {
  return Math.abs(lc) >= APCA_THRESHOLD[useCase];
}

export interface ApcaCheckResult {
  name: string;
  lc: number;
  required: number;
  passes: boolean;
}

/** APCA counterpart to contrast.ts's `checkContrastPairs` — same
 *  `ContrastPair[]` input (reused, not duplicated, so a single pair
 *  list can be checked against both algorithms), reported alongside
 *  rather than merged into the WCAG2 result shape, since the two
 *  algorithms report fundamentally different units (a ratio vs. an
 *  Lc score) and callers that only care about the WCAG2 gate shouldn't
 *  have to know APCA exists. `textSize: "normal"` maps to APCA's
 *  "body-text" bucket, `"large"` to "large-text" — set `useCase`
 *  directly on a pair's check via the third parameter for "non-text"
 *  (borders, icons) pairings, which contrast.ts's WcagTextSize has no
 *  equivalent for. */
export function checkApcaPairs(
  pairs: readonly ContrastPair[],
  useCaseOverrides: Readonly<Record<string, ApcaUseCase>> = {},
): ApcaCheckResult[] {
  return pairs.map(({ name, text, background, textSize = "normal" }) => {
    const useCase = useCaseOverrides[name] ?? (textSize === "large" ? "large-text" : "body-text");
    const lc = apcaContrast(text, background);
    const required = APCA_THRESHOLD[useCase];
    return { name, lc, required, passes: Math.abs(lc) >= required };
  });
}
