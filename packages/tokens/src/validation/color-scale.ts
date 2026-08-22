// Small helper for pulling an ordered list of oklch steps out of a DTCG
// color family group (e.g. tokens.color["cool-gray"]), used by per-family
// tests like cool-gray.test.ts to check monotonicity/range invariants
// without each test re-implementing the same tree-walking.

export interface OklchStep {
  step: number;
  l: number;
  c: number;
  h: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads every numeric-keyed child of a color family group as an oklch step.
 * Throws (rather than silently skipping) on a malformed entry — for a test
 * helper, a loud failure beats a scale silently missing a step.
 */
export function getOklchSteps(family: unknown): OklchStep[] {
  if (!isPlainObject(family)) {
    throw new Error("Expected a color family group (object).");
  }

  const steps: OklchStep[] = [];

  for (const key of Object.keys(family)) {
    if (key.startsWith("$")) continue;
    if (!/^\d+$/.test(key)) {
      throw new Error(`Unexpected non-numeric step key "${key}" in color family.`);
    }

    const token = family[key];
    if (!isPlainObject(token) || !isPlainObject(token.$value)) {
      throw new Error(`Step "${key}" is missing a $value object.`);
    }

    const { colorSpace, components } = token.$value;
    if (colorSpace !== "oklch") {
      throw new Error(`Step "${key}" is not an oklch value (colorSpace: ${String(colorSpace)}).`);
    }
    if (!Array.isArray(components) || components.length !== 3) {
      throw new Error(`Step "${key}" does not have exactly 3 oklch components.`);
    }

    const [l, c, h] = components as [number, number, number];
    steps.push({ step: Number(key), l, c, h });
  }

  return steps.toSorted((a, b) => a.step - b.step);
}
