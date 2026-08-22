// Style Dictionary v5 entry point.
//
// tokens.json -> dist/tokens.css (CSS Custom Properties)
//              -> dist/tokens.js  (nested JS object, Tokens.color["cool-gray"]["500"])
//              -> dist/tokens.d.ts (matching TypeScript declaration)
//
// Deliberately thin: the actual config lives in src/build/style-dictionary.ts
// (typechecked and unit tested — this file sits outside packages/tokens's
// tsconfig `rootDir`, so it can't be imported by anything tsc covers).
// Run directly via `pnpm build` (-> `tsx sd.config.ts`).

import { createStyleDictionary } from "./src/build/style-dictionary.js";

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const sd = createStyleDictionary();
  await sd.buildAllPlatforms();
}
