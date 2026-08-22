// One-off primitive retuning script for cross-hue perceptual correction.
//
// Already applied: the 55 values below (teal/violet/emerald/amber/red
// × 11 steps) are already baked into tokens.json as of this commit.
// This script is kept for provenance — re-run it after editing one of
// the 5 families' *hue* values (not lightness/chroma, which this
// script overwrites) to regenerate a consistent ramp, or extend
// FAMILIES_TO_RETUNE to bring more families under the same treatment.
//
// Methodology: matching *absolute* chroma across hues at a shared
// lightness doesn't work — sRGB's gamut is "pinched" around cyan/teal
// hues, so forcing every family into teal's tiny ceiling would crush
// violet/red down to a fraction of their natural vividness. What's
// shared instead is each family's *lightness curve* (`cool-gray`'s own,
// already hand-tuned) and a *relative* vividness target — how close
// each family sits to its own gamut edge at a given step — derived from
// `blue` (the other hand-tuned family), so every corrected family ends
// up "as vivid, relative to what its own hue can physically do, as our
// flagship accent already is."
//
// Run: pnpm --filter @benchside/scaffold-tokens exec tsx src/scripts/retune-primitives.ts [--write]
// Without --write, prints the computed table without touching tokens.json.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { maxChromaInGamut } from "../build/gamut.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = path.resolve(here, "../../tokens.json");
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const FAMILIES_TO_RETUNE = ["teal", "violet", "emerald", "amber", "red", "green", "sky"] as const;

interface TokensJson {
  color: Record<string, Record<string, { $value: { components: [number, number, number] } }>>;
}

function main(): void {
  const write = process.argv.includes("--write");
  const tokens = JSON.parse(readFileSync(TOKENS_PATH, "utf-8")) as TokensJson;

  const canonicalL: Record<number, number> = {};
  for (const step of STEPS) {
    canonicalL[step] = tokens.color["cool-gray"]![String(step)]!.$value.components[0];
  }

  const blueHue = tokens.color.blue!["500"]!.$value.components[2];
  const intensityFraction: Record<number, number> = {};
  for (const step of STEPS) {
    const blueC = tokens.color.blue![String(step)]!.$value.components[1];
    const ceiling = maxChromaInGamut(canonicalL[step]!, blueHue, "srgb");
    intensityFraction[step] = blueC / ceiling;
  }

  const updates: Array<{ fam: string; step: number; l: number; c: number; h: number }> = [];
  for (const fam of FAMILIES_TO_RETUNE) {
    for (const step of STEPS) {
      const [, , h] = tokens.color[fam]![String(step)]!.$value.components;
      const l = canonicalL[step]!;
      const frac = intensityFraction[step]!;
      const ceiling = maxChromaInGamut(l, h, "srgb");
      const c = Math.round(Math.min(frac * ceiling, ceiling * 0.98) * 10000) / 10000;
      updates.push({ fam, step, l: Math.round(l * 1000) / 1000, c, h });
    }
  }

  console.table(updates);

  if (write) {
    for (const { fam, step, l, c, h } of updates) {
      tokens.color[fam]![String(step)]!.$value.components = [l, c, h];
    }
    writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2) + "\n");
    console.log(`\nWrote ${updates.length} updated tokens to ${TOKENS_PATH}`);
  } else {
    console.log("\n(dry run — pass --write to apply)");
  }
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) main();
