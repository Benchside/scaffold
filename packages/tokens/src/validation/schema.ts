import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

// Vendored, version-pinned copy of the official DTCG Format Module JSON
// Schema (2025.10). Source: https://www.designtokens.org/schemas/2025.10/format.json
// See schema/vendor/README.md for provenance and update instructions.
const SCHEMA_PATH = fileURLToPath(
  new URL("../../schema/vendor/dtcg-format.2025-10.json", import.meta.url),
);

let cachedValidator: ValidateFunction | undefined;

export function getDtcgValidator(): ValidateFunction {
  if (cachedValidator) return cachedValidator;

  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8")) as object;
  // strict: false — the official schema uses draft-07 keywords/formats
  // (e.g. "json-pointer-uri-fragment") that ajv's strict mode flags as
  // unknown; they're informational only and don't affect validation.
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);

  cachedValidator = ajv.compile(schema);
  return cachedValidator;
}
