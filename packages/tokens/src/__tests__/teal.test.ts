import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getOklchSteps } from "../validation/color-scale.js";
import { parseOklchString } from "../build/oklch.js";
import { contrastRatio } from "../build/contrast.js";

// teal-500 is the Calc theme's accent-default. Shape/uniqueness/validity
// are already covered generically by reference-families.test.ts — this
// file only pins the contrast fix applied alongside blue's (see
// blue.test.ts's note): teal-500 is tuned to L=0.535 (not the more
// "balanced" L=0.57), because text-inverse on a solid teal-500 fill
// otherwise only clears 4.01:1, below WCAG AA's 4.5:1.

function loadTokens(): unknown {
  const path = new URL("../../tokens.json", import.meta.url);
  return JSON.parse(readFileSync(path, "utf-8"));
}

describe("color.teal", () => {
  const tokens = loadTokens() as { color: { teal: unknown } };
  const step500 = getOklchSteps(tokens.color.teal).find((s) => s.step === 500);

  it("text-inverse on accent-default (500) meets WCAG AA 4.5:1 for normal text", () => {
    const textInverse = parseOklchString("oklch(0.98 0.006 240)")!;
    const accent500 = parseOklchString(`oklch(${step500?.l} ${step500?.c} ${step500?.h})`)!;
    expect(contrastRatio(textInverse, accent500)).toBeGreaterThanOrEqual(4.5);
  });
});
