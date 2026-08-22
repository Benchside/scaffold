// The typed, testable half of the Style Dictionary config.
// Split out from sd.config.ts (which stays a thin invoker at the
// package root, per Style Dictionary convention) because
// packages/tokens/tsconfig.json scopes `rootDir`/`include` to `src` —
// a file outside `src` can't be imported by anything tsc typechecks,
// including this factory's own tests.

import StyleDictionary from "style-dictionary";
import { hooks, SCAFFOLD_TRANSFORM_GROUP } from "./hooks.js";

export function createStyleDictionary(
  buildPath = "dist/",
  tokensPath = "tokens.json",
): StyleDictionary {
  return new StyleDictionary({
    source: [tokensPath],
    hooks,
    platforms: {
      css: {
        transformGroup: SCAFFOLD_TRANSFORM_GROUP,
        buildPath,
        options: {
          // Aliased tokens (radius -> size) stay as `var(--size-8)`
          // refs in CSS rather than being baked to a literal `8px` —
          // keeps the relationship visible and overridable at runtime,
          // consistent with the "tokens all the way down" design
          // principle.
          outputReferences: true,
          // Per-token $description comments alone push tokens.css from
          // ~16kb to ~35kb — over the CSS size budget on their own.
          // Descriptions are already published via the generated
          // docs/tokens-reference.md; omitting them here avoids
          // duplicating that content into every consuming app's CSS
          // bundle.
          formatting: { commentStyle: "none" },
        },
        files: [
          { destination: "tokens.css", format: "css/variables" },
          // Separate file, not appended to tokens.css: keeps the
          // already-tested base css/variables output (including its
          // outputReferences var()-preserving behavior for radius ->
          // size aliases) completely untouched. Consumers import both
          // unconditionally — see "css/p3-enhancement" in hooks.ts.
          { destination: "tokens-p3.css", format: "css/p3-enhancement" },
        ],
      },
      js: {
        transformGroup: SCAFFOLD_TRANSFORM_GROUP,
        buildPath,
        files: [{ destination: "tokens.js", format: "javascript/nested-object" }],
      },
      ts: {
        transformGroup: SCAFFOLD_TRANSFORM_GROUP,
        buildPath,
        files: [
          {
            destination: "tokens.d.ts",
            format: "typescript/nested-object-declarations",
          },
        ],
      },
    },
  });
}
