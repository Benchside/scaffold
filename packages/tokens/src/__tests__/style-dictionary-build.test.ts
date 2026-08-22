import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createStyleDictionary } from "../build/style-dictionary.js";

// Verifies: running the build produces dist/tokens.css containing
// --color-cool-gray-500, with the value matching the source oklch string
// exactly (no transformation loss).
//
// Builds into a throwaway temp directory (not packages/tokens/dist)
// so this test doesn't depend on — or clobber — a prior `pnpm build`.

function loadTokens(): Record<string, unknown> {
  const path = new URL("../../tokens.json", import.meta.url);
  return JSON.parse(readFileSync(path, "utf-8"));
}

describe("Style Dictionary build", () => {
  let buildPath: string;

  beforeAll(async () => {
    buildPath = mkdtempSync(join(tmpdir(), "scaffold-tokens-build-"));
    const sd = createStyleDictionary(`${buildPath}/`);
    await sd.buildAllPlatforms();
  });

  afterAll(() => {
    rmSync(buildPath, { recursive: true, force: true });
  });

  it("produces all three declared outputs", () => {
    expect(existsSync(join(buildPath, "tokens.css"))).toBe(true);
    expect(existsSync(join(buildPath, "tokens.js"))).toBe(true);
    expect(existsSync(join(buildPath, "tokens.d.ts"))).toBe(true);
  });

  it("tokens.css contains --color-cool-gray-500 with the source oklch components, unchanged", () => {
    const css = readFileSync(join(buildPath, "tokens.css"), "utf-8");
    const tokens = loadTokens();
    const source = (
      tokens as {
        color: { "cool-gray": { "500": { $value: { components: [number, number, number] } } } };
      }
    ).color["cool-gray"]["500"].$value.components;

    const match = css.match(/--color-cool-gray-500:\s*(oklch\([^)]+\));/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe(`oklch(${source[0]} ${source[1]} ${source[2]})`);
  });

  it("passes 'none' hue components through for achromatic grays instead of throwing", () => {
    const css = readFileSync(join(buildPath, "tokens.css"), "utf-8");
    expect(css).toMatch(/--color-zinc-50:\s*oklch\(0\.985 0 none\);/);
  });

  it("keeps radius as a var() reference into size, not a baked literal", () => {
    const css = readFileSync(join(buildPath, "tokens.css"), "utf-8");
    expect(css).toMatch(/--radius-lg:\s*var\(--size-8\);/);
  });

  it("keeps tokens.css under the 30kb budget", () => {
    const css = readFileSync(join(buildPath, "tokens.css"), "utf-8");
    expect(Buffer.byteLength(css, "utf-8")).toBeLessThan(30 * 1024);
  });

  it("has no duplicate CSS custom property names", () => {
    const css = readFileSync(join(buildPath, "tokens.css"), "utf-8");
    const names = [...css.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("tokens.js exposes a nested Tokens object reachable as Tokens.color['cool-gray']['500']", async () => {
    const mod = (await import(join(buildPath, "tokens.js"))) as {
      Tokens: { color: { "cool-gray": { "500": string } } };
    };
    expect(mod.Tokens.color["cool-gray"]["500"]).toMatch(/^oklch\(/);
  });
});
