// Watch mode. Style Dictionary v5.5.1 has no built-in watcher (its CLI
// only supports one-shot `build`/`clean`, and the
// programmatic StyleDictionary class has no `.watch()` method) — this
// hand-rolls one with `node:fs.watch` on tokens.json, debounced so a
// single save (which some editors emit as several fs events — a
// content write plus a metadata/rename event) triggers exactly one
// rebuild.
//
// Watching a *file* with `fs.watch` is not reliably file-scoped across
// platforms — on some OS/Node combinations it's implemented as a watch
// on the containing directory, filtered by filename. tokens.json's
// directory also contains dist/, which every rebuild writes to. If the
// underlying watch is directory-scoped, our own build output can look
// like "tokens.json changed" and re-trigger itself indefinitely. To
// stay correct regardless of which platform behavior we're on, every
// scheduled rebuild first re-reads tokens.json and diffs it against
// the content the last build actually used — a rebuild only runs when
// that content genuinely changed.

import { readFileSync, watch, type FSWatcher } from "node:fs";
import { createStyleDictionary } from "./style-dictionary.js";

export interface WatchHandle {
  close(): void;
}

export interface WatchOptions {
  /** Path to the source tokens.json to watch. Defaults to "tokens.json"
   *  (resolved relative to process.cwd(), matching createStyleDictionary's
   *  own default) — overridable so tests can point at an isolated temp
   *  file instead of the real package source. */
  tokensPath?: string;
  /** Passed straight through to createStyleDictionary. */
  buildPath?: string;
  /** Coalesces the fs events a single save can emit into one rebuild. */
  debounceMs?: number;
  /** Called after each successful rebuild with the wall-clock duration
   *  (ms) from "file change observed" to "build finished". Not called
   *  when a scheduled rebuild is skipped because tokens.json's content
   *  hadn't actually changed. */
  onBuild?: (durationMs: number) => void;
  onError?: (error: unknown) => void;
  /** Build once immediately when the watcher starts, before waiting on
   *  any change — so running `pnpm watch` on its own (without a prior
   *  `pnpm build`) still produces a fresh dist/tokens.{css,js,d.ts}
   *  right away, matching the conventional watch-mode UX of tools like
   *  `tsc --watch`. Defaults to true. Tests that establish their own
   *  baseline build before constructing the watcher set this to false,
   *  to isolate "did a *change* trigger a rebuild" from "did starting
   *  the watcher trigger one." */
  buildOnStart?: boolean;
}

export function watchTokens(options: WatchOptions = {}): WatchHandle {
  const {
    tokensPath = "tokens.json",
    buildPath,
    debounceMs = 50,
    onBuild,
    onError,
    buildOnStart = true,
  } = options;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let building = false;
  let pending = false;
  // Content of tokens.json as of the last build that actually ran.
  // `undefined` until the first build, so that build is never skipped.
  let lastBuiltContent: string | undefined;

  const readTokensContent = (): string | undefined => {
    try {
      return readFileSync(tokensPath, "utf-8");
    } catch {
      // Some editors save via write-temp-file-then-rename; tokens.json
      // can be momentarily missing between the two steps. Treat that as
      // "nothing to build yet" rather than an error — the rename's own
      // fs event will schedule another check right after.
      return undefined;
    }
  };

  const runBuild = () => {
    if (building) {
      // A change arrived mid-build — queue exactly one follow-up check
      // rather than overlapping two Style Dictionary runs against the
      // same output files.
      pending = true;
      return;
    }

    const content = readTokensContent();
    if (content === undefined) return;
    if (content === lastBuiltContent) {
      // The file event fired, but tokens.json's content is identical
      // to what we already built — skip. This is what breaks the
      // directory-scoped-watch self-trigger loop described above, and
      // also absorbs ordinary duplicate saves.
      return;
    }

    building = true;
    const start = performance.now();
    Promise.resolve(createStyleDictionary(buildPath, tokensPath).buildAllPlatforms())
      .then(() => {
        lastBuiltContent = content;
        onBuild?.(performance.now() - start);
      })
      .catch((error) => onError?.(error))
      .finally(() => {
        building = false;
        if (pending) {
          pending = false;
          runBuild();
        }
      });
  };

  const scheduleBuild = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(runBuild, debounceMs);
  };

  const watcher: FSWatcher = watch(tokensPath, scheduleBuild);

  if (buildOnStart) runBuild();

  return {
    close: () => {
      if (timer) clearTimeout(timer);
      watcher.close();
    },
  };
}
