// Resolves DTCG curly-brace alias references ("{group.token}") to the
// value they point at. Needed because the `radius` group references
// `size` instead of duplicating raw px values (radius.md = {size.4}, not
// its own {value:4,unit:"px"}). Deliberately narrow: only resolves plain
// dot-path aliases inside this one tokens.json document, with cycle
// detection. Full cross-token alias resolution (semantic layer) is out
// of scope here.

const ALIAS_PATTERN = /^\{([^${}.][^{}.]*(?:\.[^${}.][^{}.]*)*)\}$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAlias(value: unknown): string[] | undefined {
  if (typeof value !== "string") return undefined;
  const match = ALIAS_PATTERN.exec(value);
  return match?.[1] ? match[1].split(".") : undefined;
}

function getByPath(root: unknown, path: string[]): unknown {
  let node: unknown = root;
  for (const segment of path) {
    if (!isPlainObject(node)) {
      throw new Error(`Alias path "${path.join(".")}" does not resolve — stopped at "${segment}".`);
    }
    node = node[segment];
  }
  return node;
}

/**
 * Resolves a token's $value, following curly-brace aliases (recursively,
 * with cycle detection) until a literal value is reached.
 */
export function resolveValue(
  root: unknown,
  value: unknown,
  seen: Set<string> = new Set(),
): unknown {
  const path = parseAlias(value);
  if (!path) return value;

  const pathKey = path.join(".");
  if (seen.has(pathKey)) {
    throw new Error(`Circular alias reference detected at "{${pathKey}}".`);
  }
  seen.add(pathKey);

  const target = getByPath(root, path);
  if (!isPlainObject(target) || !("$value" in target)) {
    throw new Error(`Alias "{${pathKey}}" does not point at a token.`);
  }

  return resolveValue(root, target.$value, seen);
}
