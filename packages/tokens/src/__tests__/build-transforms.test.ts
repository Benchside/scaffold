import { describe, expect, it } from "vitest";
import { isDtcgOklchColor, formatOklch, type DtcgOklchColor } from "../build/oklch.js";
import { isLetterSpacingToken, formatLetterSpacingEm } from "../build/letter-spacing.js";
import { buildNestedValueTree } from "../build/nested-tree.js";
import { buildTypeLiteral } from "../build/type-literal.js";

// Unit tests for the pure helpers behind the Style Dictionary config
// (sd.config.ts / src/build/hooks.ts). The full-pipeline test (build
// tokens.json -> dist/tokens.css and check the literal output) is in
// style-dictionary-build.test.ts — these tests isolate the tricky parts
// so a pipeline-level failure is easy to localize.

describe("isDtcgOklchColor / formatOklch", () => {
  it("accepts a standard three-number oklch color", () => {
    const value: DtcgOklchColor = { colorSpace: "oklch", components: [0.57, 0.012, 240] };
    expect(isDtcgOklchColor(value)).toBe(true);
    expect(formatOklch(value)).toBe("oklch(0.57 0.012 240)");
  });

  it("accepts a 'none' hue component (achromatic grays, e.g. color.zinc.50)", () => {
    const value: DtcgOklchColor = { colorSpace: "oklch", components: [0.985, 0, "none"] };
    expect(isDtcgOklchColor(value)).toBe(true);
    expect(formatOklch(value)).toBe("oklch(0.985 0 none)");
  });

  it("rejects a non-oklch color space", () => {
    expect(isDtcgOklchColor({ colorSpace: "srgb", components: [1, 0, 0] })).toBe(false);
  });

  it("rejects a legacy string color value", () => {
    // oxlint-disable-next-line
    expect(isDtcgOklchColor("#ff0000")).toBe(false);
  });

  it("includes an alpha channel only when present and not fully opaque", () => {
    const opaque: DtcgOklchColor = { colorSpace: "oklch", components: [0.5, 0.1, 100] };
    expect(formatOklch({ ...opaque, alpha: 1 })).toBe("oklch(0.5 0.1 100)");
    expect(formatOklch({ ...opaque, alpha: 0.5 })).toBe("oklch(0.5 0.1 100 / 0.5)");
  });
});

describe("isLetterSpacingToken / formatLetterSpacingEm", () => {
  it("matches font.letterSpacing.* paths only", () => {
    expect(isLetterSpacingToken(["font", "letterSpacing", "tight"])).toBe(true);
    expect(isLetterSpacingToken(["font", "lineHeight", "tight"])).toBe(false);
    expect(isLetterSpacingToken(["color", "blue", "500"])).toBe(false);
  });

  it("appends 'em' to the raw unitless number", () => {
    expect(formatLetterSpacingEm(-0.01)).toBe("-0.01em");
    expect(formatLetterSpacingEm(0)).toBe("0em");
  });
});

describe("buildNestedValueTree", () => {
  it("rebuilds a nested object from a flat token list", () => {
    const tree = buildNestedValueTree([
      { path: ["color", "cool-gray", "500"], $value: "oklch(0.57 0.012 240)" },
      { path: ["radius", "lg"], $value: "var(--size-8)" },
    ]);
    expect(tree).toEqual({
      color: { "cool-gray": { "500": "oklch(0.57 0.012 240)" } },
      radius: { lg: "var(--size-8)" },
    });
  });
});

describe("buildTypeLiteral", () => {
  it("renders string/number leaves and quotes non-identifier keys", () => {
    const literal = buildTypeLiteral({
      color: { "cool-gray": { "500": "oklch(0.57 0.012 240)" } },
      font: { weight: { regular: 400 } },
    });
    expect(literal).toBe(
      '{ color: { "cool-gray": { "500": string; }; }; font: { weight: { regular: number; }; }; }',
    );
  });
});
