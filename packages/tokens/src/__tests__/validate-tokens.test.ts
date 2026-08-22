import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateTokens } from "../validation/validate.js";

function loadFixture(name: string): unknown {
  const path = new URL(`../../__fixtures__/${name}`, import.meta.url);
  return JSON.parse(readFileSync(path, "utf-8"));
}

describe("validateTokens", () => {
  it("passes a well-formed DTCG document with a resolvable $type", () => {
    const result = validateTokens(loadFixture("valid.json"));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("fails when a token has no $type — on itself or any ancestor group", () => {
    const result = validateTokens(loadFixture("invalid-missing-type.json"));
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "missing-type",
        path: "color.cool-gray.50",
      }),
    );
  });

  it("passes again once $type is restored (inherited from the ancestor group)", () => {
    const fixed = loadFixture("invalid-missing-type.json") as Record<string, unknown>;
    const color = fixed.color as Record<string, unknown>;
    color.$type = "color";

    const result = validateTokens(fixed);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("still fails on a structurally invalid DTCG document even with $type resolvable", () => {
    const result = validateTokens({
      color: {
        $type: "color",
        "cool-gray": {
          50: {
            // components out of range for oklch (L must be 0-1, not 0-100)
            $value: { colorSpace: "oklch", components: [98.5, 0.006, 240] },
          },
        },
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "schema")).toBe(true);
  });
});
