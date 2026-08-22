import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createStyleDictionary } from "../build/style-dictionary.js";
import { watchTokens, type WatchHandle } from "../build/watch.js";

// Verifies: modifying a token value triggers a watch-mode rebuild within
// 500ms, and the output CSS reflects the updated value.
//
// Runs against an isolated temp tokens.json (not packages/tokens's own
// tokens.json) so the test never touches the real source file and
// can't leave it modified if an assertion throws.

function minimalTokens(hue: number) {
  return {
    color: {
      $type: "color",
      brand: {
        $value: { colorSpace: "oklch", components: [0.5, 0.1, hue] },
        $description: "test token for watch-mode tests",
      },
    },
  };
}

describe("watchTokens", () => {
  let dir: string;
  let handle: WatchHandle | undefined;

  afterEach(() => {
    handle?.close();
    handle = undefined;
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("rebuilds within 500ms of a tokens.json change and reflects the new value", async () => {
    dir = mkdtempSync(join(tmpdir(), "scaffold-tokens-watch-"));
    const tokensPath = join(dir, "tokens.json");
    const buildPath = `${join(dir, "dist")}/`;

    writeFileSync(tokensPath, JSON.stringify(minimalTokens(200), null, 2));

    // Build once up front, mirroring real usage (`pnpm build` then
    // `pnpm watch`) — the watcher itself only reacts to *changes*.
    await createStyleDictionary(buildPath, tokensPath).buildAllPlatforms();
    expect(readFileSync(join(buildPath, "tokens.css"), "utf-8")).toMatch(
      /--color-brand:\s*oklch\(0\.5 0\.1 200\);/,
    );

    const rebuilt = new Promise<number>((resolve, reject) => {
      handle = watchTokens({
        tokensPath,
        buildPath,
        debounceMs: 10,
        buildOnStart: false, // isolate the change-triggered rebuild from the startup build (tested separately below)
        onBuild: resolve,
        onError: reject,
      });
    });

    // Give fs.watch a moment to attach before writing, so the change
    // isn't missed by a not-yet-registered watcher.
    await new Promise((resolve) => setTimeout(resolve, 50));
    writeFileSync(tokensPath, JSON.stringify(minimalTokens(210), null, 2));

    const durationMs = await rebuilt;
    expect(durationMs).toBeLessThan(500);

    const css = readFileSync(join(buildPath, "tokens.css"), "utf-8");
    expect(css).toMatch(/--color-brand:\s*oklch\(0\.5 0\.1 210\);/);
  });

  it("coalesces rapid successive writes into a single rebuild", async () => {
    dir = mkdtempSync(join(tmpdir(), "scaffold-tokens-watch-"));
    const tokensPath = join(dir, "tokens.json");
    const buildPath = `${join(dir, "dist")}/`;
    writeFileSync(tokensPath, JSON.stringify(minimalTokens(0), null, 2));
    await createStyleDictionary(buildPath, tokensPath).buildAllPlatforms();

    let buildCount = 0;
    const builds: number[] = [];
    handle = watchTokens({
      tokensPath,
      buildPath,
      debounceMs: 50,
      buildOnStart: false, // isolated below; here we only care about coalescing writes
      onBuild: (durationMs) => {
        buildCount++;
        builds.push(durationMs);
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    for (let i = 1; i <= 5; i++) {
      writeFileSync(tokensPath, JSON.stringify(minimalTokens(i), null, 2));
    }

    // Wait comfortably past the debounce window plus one build.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(buildCount).toBe(1);
  });

  it("does not rebuild when a filesystem event fires but tokens.json's content is unchanged", async () => {
    // Regression test: on some platforms, `fs.watch` on a single file
    // is effectively directory-scoped, so our own dist/ writes can
    // fire a "change" event for tokens.json even though tokens.json
    // itself never changed — without the content check this loops
    // forever (build -> fs event -> build -> ...).
    dir = mkdtempSync(join(tmpdir(), "scaffold-tokens-watch-"));
    const tokensPath = join(dir, "tokens.json");
    const buildPath = `${join(dir, "dist")}/`;
    const content = JSON.stringify(minimalTokens(50), null, 2);
    writeFileSync(tokensPath, content);

    let buildCount = 0;
    // buildOnStart: true (the default) — the watcher's own initial
    // build is what primes its "last content built" cache. A build
    // done via a separate createStyleDictionary(...) call, outside the
    // watcher, wouldn't be visible to that cache and would make this
    // test's premise (content already built once) false.
    const firstBuild = new Promise<void>((resolve, reject) => {
      handle = watchTokens({
        tokensPath,
        buildPath,
        debounceMs: 10,
        onBuild: () => {
          buildCount++;
          resolve();
        },
        onError: reject,
      });
    });
    await firstBuild;
    expect(buildCount).toBe(1);

    // Re-write the exact same bytes — simulates a spurious fs event
    // with no real content change.
    writeFileSync(tokensPath, content);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(buildCount).toBe(1);

    // A genuine change still rebuilds as normal.
    writeFileSync(tokensPath, JSON.stringify(minimalTokens(60), null, 2));
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(buildCount).toBe(2);
  });

  it("builds immediately on start, without waiting for a change (buildOnStart defaults to true)", async () => {
    dir = mkdtempSync(join(tmpdir(), "scaffold-tokens-watch-"));
    const tokensPath = join(dir, "tokens.json");
    const buildPath = `${join(dir, "dist")}/`;
    writeFileSync(tokensPath, JSON.stringify(minimalTokens(300), null, 2));

    // No manual createStyleDictionary(...).buildAllPlatforms() call here —
    // dist/ doesn't exist until watchTokens() itself builds it, mirroring
    // a developer running `pnpm watch` without having run `pnpm build` first.
    const builtOnStart = new Promise<number>((resolve, reject) => {
      handle = watchTokens({
        tokensPath,
        buildPath,
        onBuild: resolve,
        onError: reject,
      });
    });

    const durationMs = await builtOnStart;
    expect(durationMs).toBeLessThan(500);
    expect(readFileSync(join(buildPath, "tokens.css"), "utf-8")).toMatch(
      /--color-brand:\s*oklch\(0\.5 0\.1 300\);/,
    );
  });
});
