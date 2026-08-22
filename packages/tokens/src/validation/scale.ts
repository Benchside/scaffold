// Generic helper for pulling an ordered list of token $values out of a
// DTCG group, by explicit key order. Used by non-color scale tests
// (size, radius, font.size, font.weight, font.lineHeight, font.letterSpacing)
// where — unlike color families — keys aren't numerically sortable
// (radius: none/sm/md/lg/xl/2xl/full; font.size: xs/sm/base/lg/xl/2xl/3xl/4xl),
// so the caller supplies the canonical order instead of us inferring one.

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export interface TokenValue<T> {
  key: string;
  value: T;
}

export function getTokenValues<T = unknown>(
  group: unknown,
  order: readonly string[],
): TokenValue<T>[] {
  if (!isPlainObject(group)) {
    throw new Error("Expected a token group (object).");
  }

  return order.map((key) => {
    const token = group[key];
    if (!isPlainObject(token) || !("$value" in token)) {
      throw new Error(`Expected token "${key}" to exist with a $value.`);
    }
    return { key, value: token.$value as T };
  });
}

export interface DimensionValue {
  value: number;
  unit: "px" | "rem";
}

export function isDimensionValue(value: unknown): value is DimensionValue {
  return (
    isPlainObject(value) &&
    typeof value.value === "number" &&
    (value.unit === "px" || value.unit === "rem")
  );
}
