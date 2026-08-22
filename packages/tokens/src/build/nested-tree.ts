// Rebuilds a plain nested object mirroring tokens.json's own shape from
// Style Dictionary's flat `dictionary.allTokens` list — e.g.
// tree.color["cool-gray"]["500"] — after transforms have already turned
// each token's $value into its final formatted string/number.
//
// This exists because Style Dictionary's built-in JS/TS formats
// (javascript/es6, typescript/es6-declarations) emit a flat list of
// `export const color_cool_gray_500 = ...` bindings, not a single
// nested object — consumers need `Tokens.color['cool-gray']['500']`
// to resolve with full IntelliSense.

export interface FlatToken {
  path: readonly string[];
  $value: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function buildNestedValueTree(tokens: readonly FlatToken[]): Record<string, unknown> {
  const root: Record<string, unknown> = {};

  for (const token of tokens) {
    const path = token.path;
    if (path.length === 0) continue;

    let node = root;
    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i];
      if (!segment) continue;
      const next = node[segment];
      node = isPlainObject(next) ? next : (node[segment] = {});
    }

    const leafKey = path[path.length - 1];
    if (leafKey) node[leafKey] = token.$value;
  }

  return root;
}
