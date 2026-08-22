// Minimal CSS custom-property parser/resolver used to verify the
// semantic token layer (light.css / dark.css): every semantic variable
// must resolve to a primitive token, with no dangling references.
//
// Deliberately not a full CSS parser: Scaffold's token/theme files are
// hand-authored and only ever contain flat `--name: value;` custom
// property declarations (see tokens/dist/tokens.css and
// theme-default/src/light.css) — no nesting, no other declarations
// mixed in, no at-rules that matter for this check. A single global
// regex pass over the source text is sufficient and keeps this
// dependency-free.

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
 *  table, following `var(--x)` chains until a literal value (e.g.
 *  `oklch(...)`) is reached.
 *
 *  Throws `DanglingReferenceError` if `name`, or anything it
 *  transitively references, isn't declared anywhere in `vars`; throws
 *  `CircularReferenceError` if resolution loops back on a variable
 *  already in the current chain. */
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
 *  with `primitives`, returning a name -> fully-resolved-value map.
 *  This is the entry point theme-default's tests use to verify a
 *  semantic layer bottoms out in real primitive token values. */
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
