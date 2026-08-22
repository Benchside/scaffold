// Renders a nested value tree (see nested-tree.ts) as a TypeScript
// object-type literal, e.g. `{ color: { "cool-gray": { "500": string } } }`
// — mapping each leaf to its primitive type (string | number) rather
// than its literal value. Consumers only need
// `Tokens.color["cool-gray"]["500"]` to type-check with full
// IntelliSense; tracking every token's exact value would make the
// generated .d.ts churn on every token value tweak.

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function quoteKey(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

export function buildTypeLiteral(tree: Record<string, unknown>): string {
  const entries = Object.entries(tree).map(([key, value]) => {
    const rendered = isPlainObject(value)
      ? buildTypeLiteral(value)
      : typeof value === "number"
        ? "number"
        : "string";
    return `${quoteKey(key)}: ${rendered};`;
  });
  return `{ ${entries.join(" ")} }`;
}
