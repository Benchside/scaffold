import { describe, expect, it } from "vitest";
import { apcaContrast, meetsApca, checkApcaPairs, APCA_THRESHOLD } from "../build/apca.js";
import type { DtcgOklchColor } from "../build/oklch.js";

// APCA (WCAG3-track) contrast — supplements, does not replace, the
// WCAG2 pipeline in contrast.ts / contrast.test.ts. Same reference
// oklch fixtures as contrast.test.ts (real cool-gray primitives, not
// invented values) so the two test files stay comparable.

const white: DtcgOklchColor = { colorSpace: "oklch", components: [1, 0, 0] };
const black: DtcgOklchColor = { colorSpace: "oklch", components: [0, 0, 0] };
const coolGray50: DtcgOklchColor = { colorSpace: "oklch", components: [0.98, 0.006, 240] };
const coolGray300: DtcgOklchColor = { colorSpace: "oklch", components: [0.82, 0.01, 240] };
const coolGray950: DtcgOklchColor = { colorSpace: "oklch", components: [0.09, 0.006, 240] };

describe("apcaContrast", () => {
  it("matches the reference implementation's known black-on-white / white-on-black values", () => {
    // apca-w3's own documented reference case: black text on a white
    // background is ~106 Lc (positive polarity); the reverse is ~-108.
    expect(apcaContrast(black, white)).toBeCloseTo(106, -1);
    expect(apcaContrast(white, black)).toBeCloseTo(-108, -1);
  });

  it("is zero for a color against itself", () => {
    expect(apcaContrast(coolGray300, coolGray300)).toBeCloseTo(0, 1);
  });

  it("sign flips with polarity: dark-on-light is positive, light-on-dark is negative", () => {
    expect(apcaContrast(coolGray950, coolGray50)).toBeGreaterThan(0);
    expect(apcaContrast(coolGray50, coolGray950)).toBeLessThan(0);
  });

  it("is NOT symmetric in magnitude (unlike WCAG2's ratio) — this is expected APCA behavior, not a bug", () => {
    // APCA deliberately weights light-text-on-dark differently from
    // dark-text-on-light (perceptual research on the two directions of
    // reading contrast), so |Lc(A,B)| != |Lc(B,A)| in general — unlike
    // contrastRatio() in contrast.ts, which is symmetric by
    // construction. Pinning that difference here so nobody "fixes" it
    // into symmetry later.
    const forward = Math.abs(apcaContrast(coolGray950, coolGray50));
    const reverse = Math.abs(apcaContrast(coolGray50, coolGray950));
    expect(forward).not.toBeCloseTo(reverse, 0);
  });
});

describe("meetsApca", () => {
  it.each([
    [70, "body-text" as const, true],
    [50, "body-text" as const, false],
    [50, "large-text" as const, true],
    [40, "large-text" as const, false],
    [20, "non-text" as const, true],
    [10, "non-text" as const, false],
  ])("|Lc|=%s vs %s -> %s", (lc, useCase, expected) => {
    expect(meetsApca(lc, useCase)).toBe(expected);
    expect(meetsApca(-lc, useCase)).toBe(expected); // polarity shouldn't affect pass/fail
  });

  it("defaults to the body-text threshold", () => {
    expect(meetsApca(APCA_THRESHOLD["body-text"])).toBe(true);
    expect(meetsApca(APCA_THRESHOLD["body-text"] - 1)).toBe(false);
  });
});

describe("checkApcaPairs", () => {
  it("mirrors checkContrastPairs' pass/fail shape for the same pairing", () => {
    const [highContrast] = checkApcaPairs([
      { name: "text-primary on bg-base", text: coolGray950, background: coolGray50 },
    ]);
    expect(highContrast?.passes).toBe(true);

    const [lowContrast] = checkApcaPairs([
      { name: "text-disabled on bg-base", text: coolGray300, background: coolGray50 },
    ]);
    expect(lowContrast?.passes).toBe(false);
  });

  it("maps textSize: large to the large-text threshold", () => {
    const [result] = checkApcaPairs([
      { name: "large label", text: coolGray300, background: coolGray50, textSize: "large" },
    ]);
    expect(result?.required).toBe(APCA_THRESHOLD["large-text"]);
  });

  it("accepts a per-pair non-text override for UI-boundary pairings (borders, icons)", () => {
    const [result] = checkApcaPairs(
      [{ name: "border-default on bg-base", text: coolGray300, background: coolGray50 }],
      { "border-default on bg-base": "non-text" },
    );
    expect(result?.required).toBe(APCA_THRESHOLD["non-text"]);
  });
});
