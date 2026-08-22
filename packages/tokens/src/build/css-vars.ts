// Minimal CSS custom-property parser/resolver, used by
// semantic-contrast.test.ts to resolve theme-default's light.css /
// dark.css semantic tokens down to real primitive oklch() values.
//
// Deliberately a near-duplicate of theme-default's own
// src/resolve-css-vars.ts rather than a shared import: the two packages
// don't have a runtime dependency on each other (tokens is a foundation
// package theme-default depends on, not the reverse), and introducing
// one purely so a test file could share ~40 lines would create exactly
// that reverse coupling. Both copies are test-only tooling, not shipped
// code, so the duplication is contained and low-risk to drift.

const VAR_DECL_RE = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
const VAR_REF_RE = /var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,[^)]*)?\)/;

/** Extracts every `--name: value;` custom property declaration found
 *  anywhere in a CSS source string into a name -> raw-value map. */
export function extractCssVars(css: string): Map<string, string> {
  const vars = new Map<string, string>();
  for (const match of css.matchAll(VAR_DECL_RE)) {
    const name = match[1];
    const rawValue = match[2];
    if (!name) continue;
    vars.set(name, (rawValue ?? "").trim());
  }
  return vars;
}

export class DanglingReferenceError extends Error {
  constructor(
    public readonly referencedFrom: string,
    public readonly missingRef: string,
  ) {
    super(`${referencedFrom} references undefined custom property ${missingRef}`);
    this.name = "DanglingReferenceError";
  }
}

export class CircularReferenceError extends Error {
  constructor(public readonly chain: readonly string[]) {
    super(`Circular custom property reference: ${chain.join(" -> ")}`);
    this.name = "CircularReferenceError";
  }
}

/** Fully resolves a single custom property against a combined lookup
 *  table, following `var(--x)` chains until a literal value is reached. */
export function resolveCssVar(
  name: string,
  vars: ReadonlyMap<string, string>,
  chain: readonly string[] = [],
): string {
  if (chain.includes(name)) {
    throw new CircularReferenceError([...chain, name]);
  }

  const value = vars.get(name);
  if (value === undefined) {
    const referencedFrom = chain.length > 0 ? chain[chain.length - 1]! : name;
    throw new DanglingReferenceError(referencedFrom, name);
  }

  const ref = VAR_REF_RE.exec(value);
  const refName = ref?.[1];
  if (!refName) return value;

  return resolveCssVar(refName, vars, [...chain, name]);
}

/** Resolves every declaration in `subject` against `subject` merged
 *  with `primitives`, returning a name -> fully-resolved-value map. */
export function resolveAll(
  subject: ReadonlyMap<string, string>,
  primitives: ReadonlyMap<string, string>,
): Map<string, string> {
  const combined = new Map<string, string>([...primitives, ...subject]);
  const resolved = new Map<string, string>();
  for (const name of subject.keys()) {
    resolved.set(name, resolveCssVar(name, combined));
  }
  return resolved;
}
