import { describe, expect, it } from "vitest";
import { maxChromaInGamut, computeP3Enhancement } from "../build/gamut.js";
import type { DtcgOklchColor } from "../build/oklch.js";

// P3 progressive-enhancement layer.

describe("maxChromaInGamut", () => {
  it("returns ~0 chroma at the lightness extremes (white/black can't be saturated)", () => {
    expect(maxChromaInGamut(1, 250, "srgb")).toBeCloseTo(0, 2);
    expect(maxChromaInGamut(0, 250, "srgb")).toBeCloseTo(0, 2);
  });

  it("P3's ceiling is never smaller than sRGB's at the same L/H (P3 is a superset for these primaries)", () => {
    for (const [l, h] of [
      [0.57, 182.5], // teal-ish
      [0.58, 250], // blue
      [0.45, 27.3], // red
      [0.7, 84.4], // amber
    ] as const) {
      const srgb = maxChromaInGamut(l, h, "srgb");
      const p3 = maxChromaInGamut(l, h, "p3");
      expect(p3).toBeGreaterThanOrEqual(srgb);
    }
  });

  it("cyan/teal hues (~180-190deg) have a visibly tighter sRGB ceiling than red/violet at equal lightness — the exact bottleneck the 0.4.1 retuning had to route around", () => {
    const tealCeiling = maxChromaInGamut(0.57, 182.5, "srgb");
    const violetCeiling = maxChromaInGamut(0.57, 292.7, "srgb");
    expect(tealCeiling).toBeLessThan(violetCeiling);
  });
});

describe("computeP3Enhancement", () => {
  it("returns null for achromatic colors (nothing to enhance)", () => {
    const gray: DtcgOklchColor = { colorSpace: "oklch", components: [0.5, 0, "none"] };
    expect(computeP3Enhancement(gray)).toBeNull();
  });

  it("returns null for a color already authored near the sRGB edge with negligible P3 headroom", () => {
    // step 950 sits deep in a corner of the gamut where sRGB and P3
    // ceilings are nearly identical — see tokens-p3.css, which
    // correctly omits *-950 entirely for this reason.
    const nearEdge: DtcgOklchColor = { colorSpace: "oklch", components: [0.09, 0.026, 240] };
    expect(computeP3Enhancement(nearEdge)).toBeNull();
  });

  it("boosts chroma proportionally rather than maxing out to the P3 edge", () => {
    // A deliberately restrained (low relative-to-ceiling) chroma should
    // stay proportionally restrained in P3, not jump to P3's max —
    // otherwise a near-neutral color would visibly re-saturate.
    const restrained: DtcgOklchColor = { colorSpace: "oklch", components: [0.7, 0.05, 250] };
    const enhancement = computeP3Enhancement(restrained, { minGain: 0 });
    const srgbCeiling = maxChromaInGamut(0.7, 250, "srgb");
    const p3Ceiling = maxChromaInGamut(0.7, 250, "p3");
    const expectedRatio = 0.05 / srgbCeiling;
    expect(enhancement).not.toBeNull();
    const actualRatio = enhancement!.c / p3Ceiling;
    // proportional scaling should preserve the "how close to my own
    // ceiling" ratio, not push all the way to 1.0 (the P3 edge)
    expect(actualRatio).toBeCloseTo(expectedRatio, 1);
    expect(actualRatio).toBeLessThan(0.99);
  });

  it("preserves lightness and hue exactly — only chroma changes", () => {
    const color: DtcgOklchColor = { colorSpace: "oklch", components: [0.58, 0.19, 250] };
    const enhancement = computeP3Enhancement(color);
    expect(enhancement).not.toBeNull();
    expect(enhancement!.l).toBe(0.58);
    expect(enhancement!.h).toBe(250);
  });

  it("respects minGain — a tiny headroom doesn't produce an override", () => {
    const color: DtcgOklchColor = { colorSpace: "oklch", components: [0.58, 0.19, 250] };
    expect(computeP3Enhancement(color, { minGain: 10 })).toBeNull();
  });
});
