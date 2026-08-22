import { describe, expect, it } from "vitest";
import { formatDataTableNumber } from "./format";

describe("formatDataTableNumber", () => {
  it("formats with a fixed number of decimals by default precision mode", () => {
    expect(formatDataTableNumber(12.3456, { precision: 2 }).text).toBe("12.35");
  });

  it("formats with significant figures when precisionMode is significantFigures", () => {
    expect(
      formatDataTableNumber(12.3456, { precision: 3, precisionMode: "significantFigures" }).text,
    ).toBe("12.3");
    expect(
      formatDataTableNumber(0.0012345, { precision: 3, precisionMode: "significantFigures" }).text,
    ).toBe("0.00123");
  });

  it("defaults to no forced precision when none is given", () => {
    expect(formatDataTableNumber(12.3, {}).text).toBe("12.3");
    expect(formatDataTableNumber(12, {}).text).toBe("12");
  });

  it("returns the unit separately from the formatted text", () => {
    const result = formatDataTableNumber(12.4, { precision: 1, unit: "ng/mL" });
    expect(result.text).toBe("12.4");
    expect(result.unit).toBe("ng/mL");
  });

  it("omits unit from the result when not given", () => {
    expect(formatDataTableNumber(12.4, {}).unit).toBeUndefined();
  });

  it("defaults range to in-range when no rangeCheck is given", () => {
    expect(formatDataTableNumber(12.4, {}).range).toBe("in-range");
  });

  it("uses rangeCheck to classify the value", () => {
    const format = {
      rangeCheck: (v: number) =>
        v < 5 ? ("low" as const) : v > 20 ? ("high" as const) : ("in-range" as const),
    };
    expect(formatDataTableNumber(2, format).range).toBe("low");
    expect(formatDataTableNumber(25, format).range).toBe("high");
    expect(formatDataTableNumber(10, format).range).toBe("in-range");
  });

  it("formats negative numbers correctly", () => {
    expect(formatDataTableNumber(-7.891, { precision: 2 }).text).toBe("-7.89");
  });

  it("formats zero correctly", () => {
    expect(formatDataTableNumber(0, { precision: 2 }).text).toBe("0.00");
  });
});
