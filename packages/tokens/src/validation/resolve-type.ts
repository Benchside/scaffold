// Walks a parsed tokens.json tree and finds every leaf token whose $type
// cannot be resolved — neither declared on the token itself nor inherited
// from any ancestor group's $type.
//
// This check exists because the official DTCG JSON Schema (schema/vendor)
// treats $type as optional at every level: a token with $value but no
// resolvable $type is structurally valid DTCG (ajv will accept it, trying
// each value-shape branch in turn). Scaffold requires every token to have
// a resolvable $type — this module enforces that project-specific rule
// on top of (not instead of) the schema check.

export interface MissingTypeError {
  path: string;
  message: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDollarKey(key: string): boolean {
  return key.startsWith("$");
}

function walk(
  node: Record<string, unknown>,
  path: string,
  inheritedType: string | undefined,
  errors: MissingTypeError[],
): void {
  const ownType = typeof node.$type === "string" ? node.$type : undefined;
  const effectiveType = ownType ?? inheritedType;
  const isToken = Object.prototype.hasOwnProperty.call(node, "$value");

  if (isToken) {
    if (!effectiveType) {
      errors.push({
        path,
        message: `Token "${path}" has no resolvable "$type" (not set on the token or any ancestor group).`,
      });
    }
    // Per DTCG, a token is a leaf — it does not contain nested groups/tokens.
    return;
  }

  for (const key of Object.keys(node)) {
    if (isDollarKey(key)) continue;
    const child = node[key];
    if (isPlainObject(child)) {
      const childPath = path ? `${path}.${key}` : key;
      walk(child, childPath, effectiveType, errors);
    }
  }
}

export function findMissingResolvedTypes(data: unknown): MissingTypeError[] {
  const errors: MissingTypeError[] = [];
  if (!isPlainObject(data)) return errors;
  walk(data, "", undefined, errors);
  return errors;
}
