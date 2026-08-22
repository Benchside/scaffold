#!/usr/bin/env node
// Copies the root LICENSE into each publishable package's own directory.
// npm doesn't hoist a monorepo root LICENSE into an individual package's
// tarball — each package needs its own copy for the tarball to actually
// include one. Wired as each publishable package's own `prepublishOnly`
// (see their package.json scripts) so this always regenerates immediately
// before a real publish, rather than relying on a hand-copied file that
// can silently go stale if the root LICENSE is ever edited (e.g. a
// copyright year bump).

import { copyFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const rootLicense = path.join(repoRoot, "LICENSE");

const PUBLISHABLE_PACKAGES = ["tokens", "theme-default", "tailwind-preset", "react"];

function main() {
  readFileSync(rootLicense); // fail loudly if the root LICENSE is ever missing/moved

  for (const name of PUBLISHABLE_PACKAGES) {
    const dest = path.join(repoRoot, "packages", name, "LICENSE");
    copyFileSync(rootLicense, dest);
    console.log(`copy-license: wrote packages/${name}/LICENSE`);
  }
}

main();
