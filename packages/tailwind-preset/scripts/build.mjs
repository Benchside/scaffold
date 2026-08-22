#!/usr/bin/env node
// The preset's only shipped artifact is a CSS partial (`@theme inline`,
// see src/index.css's header for why there's no JS API) — "build" is a
// straight copy into dist/, no bundler needed.
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(packageRoot, "src/index.css");
const distDir = path.join(packageRoot, "dist");

mkdirSync(distDir, { recursive: true });
copyFileSync(src, path.join(distDir, "index.css"));

console.log("@benchside/scaffold-tailwind: dist/index.css written");
