#!/usr/bin/env node
// CLI entry for `pnpm tokens:docs`. Refuses to generate documentation for
// an incomplete token set — every token needs a non-empty $description
// before the reference is worth generating.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { generateMarkdown } from "./generate-markdown";
import { findMissingDescriptions } from "../validation/description.js";

const tokensPath = fileURLToPath(new URL("../../tokens.json", import.meta.url));
const outDir = fileURLToPath(new URL("../../docs", import.meta.url));
const outPath = fileURLToPath(new URL("../../docs/tokens-reference.md", import.meta.url));

function main(): void {
  const data: unknown = JSON.parse(readFileSync(tokensPath, "utf-8"));

  const missing = findMissingDescriptions(data);
  if (missing.length > 0) {
    console.error(
      `Refusing to generate docs — ${missing.length} token(s) are missing a "$description":\n`,
    );
    for (const error of missing) {
      console.error(`  ${error.path || "(root)"}`);
    }
    process.exitCode = 1;
    return;
  }

  const markdown = generateMarkdown(data);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, markdown, "utf-8");
  console.log(`Wrote ${outPath} (${markdown.length} bytes).`);
}

main();
