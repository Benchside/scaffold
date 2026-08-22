#!/usr/bin/env node
// Replaces tsc's JS emission with oxc-transform-react, which applies
// React Compiler's automatic memoization as part of the same pass that
// strips types and transforms JSX — over 10x faster than
// babel-plugin-react-compiler, and lets components like DataTable's
// context providers get memoized without hand-written useMemo.
// `tsc -b tsconfig.build.json` still runs separately for `.d.ts`
// emission only (see tsconfig.build.json's `emitDeclarationOnly`) —
// nothing here touches type-checking.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "oxc-transform-react";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(here, "../src");
const DIST_DIR = path.resolve(here, "../dist");

const EXCLUDED = [/\.test\.tsx?$/, /(^|\/)__tests__\//];

function collectSourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

const files = collectSourceFiles(SRC_DIR).filter((file) => {
  const relative = path.relative(SRC_DIR, file);
  return !EXCLUDED.some((pattern) => pattern.test(relative));
});

let hadFatal = false;

for (const file of files) {
  const relative = path.relative(SRC_DIR, file);
  const source = readFileSync(file, "utf-8");
  const result = transformSync(relative, source, {
    sourcemap: true,
    jsx: { runtime: "automatic" },
    // Functions that touch a `@tanstack/react-virtual` instance opt
    // themselves out individually via a `"use no memo";` directive (see
    // DataTable.tsx/Combobox.tsx) instead of excluding whole files here —
    // that lets sibling functions in those same files still get compiled.
    reactCompiler: { target: "19" },
  });

  for (const error of result.errors) {
    console.error(`[oxc] ${relative}: ${error.severity} ${error.message}`);
  }
  if (result.fatal) {
    hadFatal = true;
    continue;
  }

  const outPath = path.join(DIST_DIR, relative.replace(/\.tsx?$/, ".js"));
  mkdirSync(path.dirname(outPath), { recursive: true });

  let code = result.code;
  if (result.map) {
    const mapFileName = `${path.basename(outPath)}.map`;
    writeFileSync(path.join(path.dirname(outPath), mapFileName), JSON.stringify(result.map));
    code += `\n//# sourceMappingURL=${mapFileName}\n`;
  }
  writeFileSync(outPath, code);
}

if (hadFatal) {
  console.error("[oxc] build failed: one or more files had fatal errors, see above");
  process.exit(1);
}

console.log(`[oxc] transformed ${files.length} files -> dist/`);
