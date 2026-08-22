import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  relativeLuminance,
  meetsWcagAA,
  checkContrastPairs,
  WCAG_AA_THRESHOLD,
  type WcagTextSize,
} from "../build/contrast.js";
import type { DtcgOklchColor } from "../build/oklch.js";

// Unit tests for the contrast-ratio math, scoped to raw oklch color
// values (no semantic tokens yet — see contrast.ts header for why the
// semantic-pair wiring is deferred). Test colors below are real
// primitives from tokens.json's cool-gray family, not invented values,
// so this exercises the actual palette Scaffold ships.

const white: DtcgOklchColor = { colorSpace: "oklch", components: [1, 0, 0] };
const black: DtcgOklchColor = { colorSpace: "oklch", components: [0, 0, 0] };

// color.cool-gray.* from tokens.json
const coolGray50: DtcgOklchColor = { colorSpace: "oklch", components: [0.98, 0.006, 240] };
const coolGray300: DtcgOklchColor = { colorSpace: "oklch", components: [0.82, 0.01, 240] };
const coolGray500: DtcgOklchColor = { colorSpace: "oklch", components: [0.57, 0.012, 240] };
const coolGray950: DtcgOklchColor = { colorSpace: "oklch", components: [0.09, 0.006, 240] };

describe("relativeLuminance", () => {
  it("returns 1 for white and 0 for black", () => {
    expect(relativeLuminance(white)).toBeCloseTo(1, 10);
    expect(relativeLuminance(black)).toBeCloseTo(0, 10);
  });

  it("treats a 'none' hue/chroma component as 0 (achromatic)", () => {
    const achromaticGray: DtcgOklchColor = { colorSpace: "oklch", components: [0.5, 0, "none"] };
    expect(() => relativeLuminance(achromaticGray)).not.toThrow();
  });
});

describe("contrastRatio", () => {
  it("returns exactly 21:1 for white on black (the WCAG maximum)", () => {
    expect(contrastRatio(white, black)).toBeCloseTo(21, 10);
  });

  it("returns 1:1 for a color against itself", () => {
    expect(contrastRatio(coolGray500, coolGray500)).toBeCloseTo(1, 10);
  });

  it("is symmetric regardless of argument order", () => {
    expect(contrastRatio(coolGray950, coolGray50)).toBeCloseTo(
      contrastRatio(coolGray50, coolGray950),
      10,
    );
  });

  it("matches the expected ratio for cool-gray-950 on cool-gray-50", () => {
    // Computed independently from the same oklch -> linear-sRGB matrices;
    // pinned here so a future change to the conversion math is caught.
    expect(contrastRatio(coolGray950, coolGray50)).toBeCloseTo(19.554, 3);
  });
});

describe("meetsWcagAA", () => {
  it.each<[number, WcagTextSize, boolean]>([
    [4.5, "normal", true],
    [4.49, "normal", false],
    [3, "large", true],
    [2.99, "large", false],
  ])("ratio %s vs %s text -> %s", (ratio, textSize, expected) => {
    expect(meetsWcagAA(ratio, textSize)).toBe(expected);
  });

  it("defaults to normal text (4.5:1) when no size is given", () => {
    expect(meetsWcagAA(WCAG_AA_THRESHOLD.normal)).toBe(true);
    expect(meetsWcagAA(WCAG_AA_THRESHOLD.normal - 0.01)).toBe(false);
  });
});

describe("checkContrastPairs", () => {
  it("passes a high-contrast pairing (cool-gray-950 text on cool-gray-50 bg)", () => {
    const [result] = checkContrastPairs([
      { name: "text-primary on bg-base", text: coolGray950, background: coolGray50 },
    ]);
    expect(result?.passes).toBe(true);
    expect(result?.required).toBe(4.5);
  });

  it("fails a low-contrast pairing (cool-gray-300 text on cool-gray-50 bg)", () => {
    const [result] = checkContrastPairs([
      { name: "text-disabled on bg-base", text: coolGray300, background: coolGray50 },
    ]);
    expect(result?.passes).toBe(false);
  });

  it("fails an intentionally low-contrast value, and passes once restored", () => {
    // cool-gray-500 on cool-gray-50 sits at ~4.21:1 — fails normal-text
    // AA (4.5:1) but passes large-text AA (3:1), so it also exercises
    // the text-size distinction.
    const lowContrast = checkContrastPairs([
      { name: "text-primary on bg-base", text: coolGray500, background: coolGray50 },
    ])[0];
    expect(lowContrast?.passes).toBe(false);

    const restored = checkContrastPairs([
      { name: "text-primary on bg-base", text: coolGray950, background: coolGray50 },
    ])[0];
    expect(restored?.passes).toBe(true);

    const asLargeText = checkContrastPairs([
      {
        name: "text-primary on bg-base",
        text: coolGray500,
        background: coolGray50,
        textSize: "large",
      },
    ])[0];
    expect(asLargeText?.passes).toBe(true);
  });

  it("checks multiple pairs independently", () => {
    const results = checkContrastPairs([
      { name: "high-contrast", text: coolGray950, background: coolGray50 },
      { name: "low-contrast", text: coolGray300, background: coolGray50 },
    ]);
    expect(results.map((r) => r.passes)).toEqual([true, false]);
  });
});
