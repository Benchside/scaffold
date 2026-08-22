import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getOklchSteps } from "../validation/color-scale.js";
import { validateTokens } from "../validation/validate.js";

// These 25 families are taken as-is from the installed tailwindcss@4.3.3
// package (not hand-designed like cool-gray/blue — the peak-at-500
// convention the custom families follow isn't forced onto borrowed ones).
//
// Verifies: each family has exactly 11 steps (50–950); no two families
// (including cool-gray/blue) share an identical step-500 value; all values
// are valid oklch; total token count matches the expected count — 25
// reference + 2 custom = 27 families, 27 × 11 = 297 primitive colors.

const REFERENCE_FAMILIES = [
  "teal",
  "violet",
  "emerald",
  "green",
  "amber",
  "orange",
  "red",
  "sky",
  "rose",
  "yellow",
  "lime",
  "cyan",
  "indigo",
  "purple",
  "fuchsia",
  "pink",
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "taupe",
  "mauve",
  "mist",
  "olive",
] as const;

function loadTokens(): Record<string, Record<string, unknown>> {
  const path = new URL("../../tokens.json", import.meta.url);
  return JSON.parse(readFileSync(path, "utf-8"));
}

describe("reference color families", () => {
  const tokens = loadTokens();
  const color = tokens.color as Record<string, unknown>;

  it.each(REFERENCE_FAMILIES)("%s has exactly 11 steps (50–950)", (family) => {
    const steps = getOklchSteps(color[family]);
    expect(steps.map((s) => s.step)).toEqual([
      50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
    ]);
  });

  it("no two families (25 reference + 2 custom) share an identical step-500 value", () => {
    const allFamilies = [...REFERENCE_FAMILIES, "cool-gray", "blue"];
    const step500s = allFamilies.map((family) => {
      const steps = getOklchSteps(color[family]);
      const step500 = steps.find((s) => s.step === 500);
      return `${family}:${step500?.l}_${step500?.c}_${step500?.h}`;
    });
    const values = step500s.map((entry) => entry.split(":")[1]);
    expect(new Set(values).size).toBe(values.length);
  });

  it("has the expected total primitive color count: 27 families × 11 steps = 297", () => {
    const familyNames = Object.keys(color).filter((k) => !k.startsWith("$"));
    expect(familyNames.length).toBe(27);
    const totalTokens = familyNames.reduce(
      (sum, family) => sum + getOklchSteps(color[family]).length,
      0,
    );
    expect(totalTokens).toBe(297);
  });

  it("is entirely structurally valid DTCG with a resolvable $type on every token", () => {
    const result = validateTokens(tokens);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
