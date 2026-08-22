#!/usr/bin/env node
// CLI entry for `pnpm tokens:validate`. Delegates to the same
// validateTokens() function the vitest suite exercises, so the CLI and the
// tests can never drift apart on what counts as valid.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateTokens } from "../validation/validate.js";

const tokensPath = fileURLToPath(new URL("../../tokens.json", import.meta.url));

function main(): void {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(tokensPath, "utf-8"));
  } catch (error) {
    console.error(`Could not read/parse ${tokensPath}:`);
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }

  const result = validateTokens(data);

  if (result.valid) {
    console.log(`tokens.json is valid (${tokensPath}).`);
    return;
  }

  console.error(`tokens.json is invalid (${tokensPath}):\n`);
  for (const error of result.errors) {
    const location = error.path ? error.path : "(root)";
    console.error(`  [${error.code}] ${location} — ${error.message}`);
  }
  console.error(`\n${result.errors.length} error(s) found.`);
  process.exitCode = 1;
}

main();
