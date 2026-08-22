// Bundle size gate: measures generated CSS size from the preset alone
// (no components), gated at 5kb gzipped.
//
// "Preset alone" is measured as dist/index.css — the `@theme inline`
// declaration block itself, which is the package's entire shipped
// artifact (see src/index.css's header: no JS, CSS-only). This is the
// right thing to gate: Tailwind only emits utility CSS for classes a
// consumer's own build actually scans and uses, so there's no
// "preset's utilities" byte cost to measure independent of a
// consumer — the fixed cost every consumer pays just by importing the
// preset is exactly this declaration block.
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST_CSS_PATH = path.resolve(here, "../../dist/index.css");
const BUDGET_BYTES = 5 * 1024;

describe("bundle size gate", () => {
  test("dist/index.css gzipped is under the 5kb budget", () => {
    const css = readFileSync(DIST_CSS_PATH, "utf-8");
    const gzipped = gzipSync(css);

    // eslint-disable-next-line no-console -- deliberate: reports the
    // measured size in build/CI output.
    console.log(
      `@benchside/scaffold-tailwind: dist/index.css is ${css.length}b raw, ` +
        `${gzipped.length}b gzipped (budget: ${BUDGET_BYTES}b)`,
    );

    expect(gzipped.length).toBeLessThan(BUDGET_BYTES);
  });
});
