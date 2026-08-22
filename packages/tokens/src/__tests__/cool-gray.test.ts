import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getOklchSteps } from "../validation/color-scale.js";
import { validateTokens } from "../validation/validate.js";

// Cool gray scale (custom). Verifies: all 11 steps exist; lightness
// decreases monotonically 50→950; chroma stays within 0.006–0.014; every
// step is a structurally valid oklch value (checked separately via the
// DTCG schema in validate.ts — see the last test below).

function loadTokens(): unknown {
  const path = new URL("../../tokens.json", import.meta.url);
  return JSON.parse(readFileSync(path, "utf-8"));
}

describe("color.cool-gray", () => {
  const tokens = loadTokens() as { color: { "cool-gray": unknown } };
  const steps = getOklchSteps(tokens.color["cool-gray"]);

  it("defines all 11 steps (50–950)", () => {
    expect(steps.map((s) => s.step)).toEqual([
      50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
    ]);
  });

  it("decreases lightness monotonically from step 50 to 950", () => {
    for (let i = 1; i < steps.length; i++) {
      const current = steps[i];
      const previous = steps[i - 1];
      if (!current || !previous) throw new Error("steps array shorter than expected");
      expect(current.l).toBeLessThan(previous.l);
    }
  });

  it("keeps chroma within 0.006–0.014 for every step", () => {
    for (const step of steps) {
      expect(step.c).toBeGreaterThanOrEqual(0.006);
      expect(step.c).toBeLessThanOrEqual(0.014);
    }
  });

  it("holds hue constant at 240 for every step", () => {
    for (const step of steps) {
      expect(step.h).toBe(240);
    }
  });

  it("peaks chroma at step 500, matching the curve shape every family uses", () => {
    // The curve plateaus at its max across 400–600 (symmetric around 500),
    // so "peaks at 500" means 500 reaches the family's max chroma — not
    // that it's the sole step to do so.
    const maxChroma = Math.max(...steps.map((s) => s.c));
    const step500 = steps.find((s) => s.step === 500);
    expect(step500?.c).toBe(maxChroma);
  });

  it("is structurally valid DTCG and has a resolvable $type on every token", () => {
    const result = validateTokens(tokens);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
