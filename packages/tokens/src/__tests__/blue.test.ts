import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getOklchSteps } from "../validation/color-scale.js";
import { validateTokens } from "../validation/validate.js";
import { parseOklchString } from "../build/oklch.js";
import { contrastRatio } from "../build/contrast.js";

// Blue scale (custom, balanced accent): step 500 chroma = 0.190 ± 0.002;
// all values parseable as oklch. Held to the same monotonic-lightness /
// constant-hue shape invariants as cool-gray, for consistency across the
// two custom families.
//
// Step 500 lightness is tuned to 54.5%, not the more "balanced" 58% a
// pure hue/chroma target would suggest: 500 is accent-default, i.e. the
// color a solid primary button fills with white text, and 58% only
// clears 3.99:1 contrast against text-inverse — below WCAG AA's 4.5:1 for
// normal text. 400 and 600 are shifted by the same amount to keep step
// spacing even. Chroma target (0.190 ± 0.002) is unaffected.

function loadTokens(): unknown {
  const path = new URL("../../tokens.json", import.meta.url);
  return JSON.parse(readFileSync(path, "utf-8"));
}

describe("color.blue", () => {
  const tokens = loadTokens() as { color: { blue: unknown; "cool-gray": unknown } };
  const steps = getOklchSteps(tokens.color.blue);
  const step500 = steps.find((s) => s.step === 500);

  it("defines all 11 steps (50–950)", () => {
    expect(steps.map((s) => s.step)).toEqual([
      50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
    ]);
  });

  it("has chroma 0.190 ± 0.002 at step 500", () => {
    expect(step500?.c).toBeGreaterThanOrEqual(0.188);
    expect(step500?.c).toBeLessThanOrEqual(0.192);
  });

  it("has lightness 54.5% ± 1% at step 500 (tuned for WCAG AA contrast — see note above)", () => {
    expect(step500?.l).toBeGreaterThanOrEqual(0.535);
    expect(step500?.l).toBeLessThanOrEqual(0.555);
  });

  it("text-inverse on accent-default (500) meets WCAG AA 4.5:1 for normal text", () => {
    const textInverse = parseOklchString("oklch(0.98 0.006 240)")!;
    const accent500 = parseOklchString(`oklch(${step500?.l} ${step500?.c} ${step500?.h})`)!;
    expect(contrastRatio(textInverse, accent500)).toBeGreaterThanOrEqual(4.5);
  });

  it("decreases lightness monotonically from step 50 to 950", () => {
    for (let i = 1; i < steps.length; i++) {
      const current = steps[i];
      const previous = steps[i - 1];
      if (!current || !previous) throw new Error("steps array shorter than expected");
      expect(current.l).toBeLessThan(previous.l);
    }
  });

  it("holds hue constant at 250 for every step", () => {
    for (const step of steps) {
      expect(step.h).toBe(250);
    }
  });

  it("peaks chroma at step 500", () => {
    const maxChroma = Math.max(...steps.map((s) => s.c));
    expect(step500?.c).toBe(maxChroma);
  });

  it("does not share its step-500 value with cool-gray's step-500", () => {
    const coolGray500 = getOklchSteps(tokens.color["cool-gray"]).find((s) => s.step === 500);
    expect(step500).not.toEqual(coolGray500);
  });

  it("is structurally valid DTCG and has a resolvable $type on every token", () => {
    const result = validateTokens(tokens);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
