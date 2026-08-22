import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createStyleDictionary } from "../build/style-dictionary.js";

// P3 progressive-enhancement build output. Mirrors
// style-dictionary-build.test.ts's temp-dir pattern so this doesn't
// depend on — or clobber — a prior `pnpm build`.

describe("P3 progressive enhancement (tokens-p3.css)", () => {
  let buildPath: string;
  let css: string;

  beforeAll(async () => {
    buildPath = mkdtempSync(join(tmpdir(), "scaffold-tokens-p3-"));
    const sd = createStyleDictionary(`${buildPath}/`);
    await sd.buildAllPlatforms();
    css = readFileSync(join(buildPath, "tokens-p3.css"), "utf-8");
  });

  afterAll(() => {
    rmSync(buildPath, { recursive: true, force: true });
  });

  it("is emitted as a separate file alongside tokens.css, not merged into it", () => {
    expect(existsSync(join(buildPath, "tokens-p3.css"))).toBe(true);
    const baseCss = readFileSync(join(buildPath, "tokens.css"), "utf-8");
    expect(baseCss).not.toMatch(/@media \(color-gamut: p3\)/);
  });

  it("wraps every override in a single @media (color-gamut: p3) block", () => {
    expect(css).toMatch(/@media \(color-gamut: p3\) {\s*:root {/);
    // exactly one *block opening* (not one per variable) — matching
    // "{ :root {" rather than the bare phrase, since the file's own
    // header comment mentions "@media (color-gamut: p3)" in prose too.
    expect(css.match(/@media \(color-gamut: p3\) {\s*:root {/g)).toHaveLength(1);
  });

  it("uses only valid CSS comment syntax — no `//` line comments, which are invalid CSS and break parsing", () => {
    // Regression test: the header/prose here originally reused
    // GENERATED_FILE_HEADER, a `//`-style constant meant for the JS/TS
    // formats — invalid in a .css file. Every comment must be a /* */
    // block comment instead.
    expect(css).not.toMatch(/^\s*\/\/.*$/m);
  });

  it("includes the deliberately hand-tuned families (blue, and the 0.4.1-retuned seven)", () => {
    for (const fam of ["blue", "teal", "violet", "emerald", "amber", "red", "green", "sky"]) {
      expect(css, `expected at least one --color-${fam}-* override`).toMatch(
        new RegExp(`--color-${fam}-\\d+:`),
      );
    }
  });

  it("does NOT touch families outside the P3 allowlist (unreviewed Tailwind-derived colors)", () => {
    for (const fam of ["cool-gray", "gray", "zinc", "mauve", "yellow", "rose"]) {
      expect(css, `--color-${fam}-* should not appear in the P3 block`).not.toMatch(
        new RegExp(`--color-${fam}-\\d+:`),
      );
    }
  });

  it("every overridden token keeps its sRGB value's lightness and hue, only chroma differs", () => {
    const baseCss = readFileSync(join(buildPath, "tokens.css"), "utf-8");
    const overrides = [
      ...css.matchAll(/--(color-[a-z0-9-]+):\s*oklch\(([\d.]+) ([\d.]+) ([\d.]+)\);/g),
    ];
    expect(overrides.length).toBeGreaterThan(0);
    for (const [, name, l, , h] of overrides) {
      const baseMatch = new RegExp(`--${name}:\\s*oklch\\(([\\d.]+) [\\d.]+ ([\\d.]+)\\);`).exec(
        baseCss,
      );
      expect(baseMatch, `--${name} should also exist in the base tokens.css`).not.toBeNull();
      expect(l).toBe(baseMatch![1]);
      expect(h).toBe(baseMatch![2]);
    }
  });

  it("stays comfortably small — this is a scoped enhancement layer, not a second full palette", () => {
    expect(Buffer.byteLength(css, "utf-8")).toBeLessThan(4 * 1024);
  });
});
