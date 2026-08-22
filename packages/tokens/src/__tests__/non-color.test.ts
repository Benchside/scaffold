import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getTokenValues, isDimensionValue, type DimensionValue } from "../validation/scale.js";
import { resolveValue } from "../validation/resolve-alias.js";
import { validateTokens } from "../validation/validate.js";

// Non-color primitive tokens (size, radius, font.*).
// Verifies: all spacing values parse as px integers; radius values
// increase monotonically; font-size scale is non-decreasing. Plus sanity
// checks for the other font scales and the overall DTCG/resolved-type
// validity of the whole document.

function loadTokens(): Record<string, unknown> {
  const path = new URL("../../tokens.json", import.meta.url);
  return JSON.parse(readFileSync(path, "utf-8"));
}

const tokens = loadTokens();

describe("size (generic dimension scale)", () => {
  // 2px steps from 0–50 (denser than Tailwind's classic scale, on purpose —
  // primitives go wide, the semantic layer narrows), then Tailwind's
  // classic coarser tail from 52 up, plus 9999 for radius.full to alias.
  const SIZE_STEPS = [
    "0",
    "2",
    "4",
    "6",
    "8",
    "10",
    "12",
    "14",
    "16",
    "18",
    "20",
    "22",
    "24",
    "26",
    "28",
    "30",
    "32",
    "34",
    "36",
    "38",
    "40",
    "42",
    "44",
    "46",
    "48",
    "50",
    "52",
    "56",
    "60",
    "64",
    "72",
    "80",
    "96",
    "112",
    "128",
    "144",
    "160",
    "176",
    "192",
    "208",
    "224",
    "240",
    "256",
    "288",
    "320",
    "384",
    "9999",
  ];
  const values = getTokenValues<DimensionValue>(tokens.size, SIZE_STEPS);

  it("has all 47 steps", () => {
    expect(values).toHaveLength(47);
  });

  it("every value parses as a px integer equal to its own key", () => {
    for (const { key, value } of values) {
      expect(isDimensionValue(value)).toBe(true);
      expect(value.unit).toBe("px");
      expect(Number.isInteger(value.value)).toBe(true);
      expect(value.value).toBe(Number(key));
    }
  });
});

describe("radius", () => {
  // radius no longer carries its own values — every step is a DTCG alias
  // into `size` (radius.md = {size.4}, not a duplicated {value:4,unit:px}),
  // so we resolve through resolveValue() before asserting anything.
  const RADIUS_STEPS = ["none", "sm", "md", "lg", "xl", "2xl", "full"];
  const raw = getTokenValues<string>(tokens.radius, RADIUS_STEPS);
  const values = raw.map(({ key, value }) => ({
    key,
    value: resolveValue(tokens, value) as DimensionValue,
  }));

  it("has all 7 steps from the spec", () => {
    expect(values).toHaveLength(7);
  });

  it("every step is an alias into size, not a duplicated literal value", () => {
    for (const { value: rawValue } of raw) {
      expect(rawValue).toMatch(/^\{size\.\d+\}$/);
    }
  });

  it("increases monotonically from none to full", () => {
    for (let i = 1; i < values.length; i++) {
      const current = values[i];
      const previous = values[i - 1];
      if (!current || !previous) throw new Error("values array shorter than expected");
      expect(current.value.value).toBeGreaterThan(previous.value.value);
    }
  });

  it("resolves to px for every step, including the 9999px 'full' outlier", () => {
    for (const { value } of values) {
      expect(isDimensionValue(value)).toBe(true);
      expect(value.unit).toBe("px");
    }
  });
});

describe("font.size", () => {
  const FONT_SIZE_STEPS = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"];
  const fontSize = (tokens.font as Record<string, unknown>).size;
  const values = getTokenValues<DimensionValue>(fontSize, FONT_SIZE_STEPS);

  it("is non-decreasing from xs to 4xl", () => {
    for (let i = 1; i < values.length; i++) {
      const current = values[i];
      const previous = values[i - 1];
      if (!current || !previous) throw new Error("values array shorter than expected");
      expect(current.value.value).toBeGreaterThanOrEqual(previous.value.value);
    }
  });

  it("uses rem (not px) so the scale respects user font-size preference", () => {
    for (const { value } of values) {
      expect(value.unit).toBe("rem");
    }
  });
});

describe("font.weight", () => {
  const WEIGHT_STEPS = [
    "thin",
    "extralight",
    "light",
    "regular",
    "medium",
    "semibold",
    "bold",
    "extrabold",
    "black",
  ];
  const values = getTokenValues<number>(
    (tokens.font as Record<string, unknown>).weight,
    WEIGHT_STEPS,
  );

  it("covers the full 100–900 OpenType wght range", () => {
    expect(values.map((v) => v.value)).toEqual([100, 200, 300, 400, 500, 600, 700, 800, 900]);
  });
});

describe("font.lineHeight", () => {
  const values = getTokenValues<number>((tokens.font as Record<string, unknown>).lineHeight, [
    "tight",
    "normal",
    "relaxed",
  ]);

  it("matches the unitless multipliers from the spec", () => {
    expect(values.map((v) => v.value)).toEqual([1.25, 1.5, 1.75]);
  });
});

describe("font.letterSpacing", () => {
  const values = getTokenValues<number>((tokens.font as Record<string, unknown>).letterSpacing, [
    "tight",
    "normal",
    "wide",
    "wider",
  ]);

  it("matches the unitless (em-intended) values from the spec", () => {
    expect(values.map((v) => v.value)).toEqual([-0.01, 0, 0.05, 0.1]);
  });
});

describe("font.family", () => {
  it("sans starts with the self-hosted Inter Variable family (falling back to static Inter), mono starts with JetBrains Mono Variable", () => {
    const family = (tokens.font as Record<string, unknown>).family as Record<
      string,
      { $value: string[] }
    >;
    const [sans, mono] = getTokenValues<string[]>(family, ["sans", "mono"]);
    expect(sans?.value[0]).toBe("Inter Variable");
    expect(sans?.value[1]).toBe("Inter");
    expect(mono?.value[0]).toBe("JetBrains Mono Variable");
    expect(mono?.value[1]).toBe("JetBrains Mono");
  });
});

describe("whole document", () => {
  it("is structurally valid DTCG with a resolvable $type on every token, including the new groups", () => {
    const result = validateTokens(tokens);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
