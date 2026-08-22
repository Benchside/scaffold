// Every token must have a non-empty $description. Deliberately separate
// from the DTCG structural schema (which leaves $description optional,
// per spec) and from resolve-type.ts's $type check.

export interface MissingDescriptionError {
  path: string;
  message: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function walk(
  node: Record<string, unknown>,
  path: string,
  errors: MissingDescriptionError[],
): void {
  const isToken = Object.prototype.hasOwnProperty.call(node, "$value");

  if (isToken) {
    const description = node.$description;
    if (typeof description !== "string" || description.trim() === "") {
      errors.push({ path, message: `Token "${path}" has no non-empty "$description".` });
    }
    return;
  }

  for (const key of Object.keys(node)) {
    if (key.startsWith("$")) continue;
    const child = node[key];
    if (isPlainObject(child)) {
      walk(child, path ? `${path}.${key}` : key, errors);
    }
  }
}

export function findMissingDescriptions(data: unknown): MissingDescriptionError[] {
  const errors: MissingDescriptionError[] = [];
  if (!isPlainObject(data)) return errors;
  walk(data, "", errors);
  return errors;
}
