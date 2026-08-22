// font.letterSpacing tokens are stored as unitless numbers ($type:
// "number" — see tokens.json's own $description: "interpreted as em in
// the CSS build ... Stored as plain numbers because DTCG dimension
// tokens only support px/rem units, not em"). No built-in Style
// Dictionary transform applies a unit to a bare "number"-typed token —
// this is the one genuinely custom *value* transform the pipeline needs.
// (Color and dimension both have DTCG-aware built-ins: `color/oklch`
// (bypassed in oklch.ts for precision, not because it's missing) and
// `size/rem`; fontFamily arrays are handled by the built-in
// `fontFamily/css`.)
//
// font.lineHeight is also $type "number" but must stay unitless (CSS
// line-height is a unitless multiplier by design) — filtering on the
// token's path, not just $type, keeps this transform from touching it.

export function isLetterSpacingToken(path: readonly string[]): boolean {
  return path[0] === "font" && path[1] === "letterSpacing";
}

export function formatLetterSpacingEm(value: number): string {
  return `${value}em`;
}
