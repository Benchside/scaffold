import type { ErrorObject } from "ajv";
import { getDtcgValidator } from "./schema.js";
import { findMissingResolvedTypes } from "./resolve-type.js";

export interface TokenValidationError {
  /** "schema" = fails the official DTCG structural schema.
   *  "missing-type" = structurally valid DTCG, but no token in Scaffold
   *  may have an unresolved $type (see resolve-type.ts). */
  code: "schema" | "missing-type";
  /** Dot-separated token/group path, e.g. "color.cool-gray.50". Empty
   *  string for document-level schema errors. */
  path: string;
  message: string;
}

export interface TokenValidationResult {
  valid: boolean;
  errors: TokenValidationError[];
}

function ajvErrorToPath(error: ErrorObject): string {
  return error.instancePath.replace(/^\//, "").split("/").filter(Boolean).join(".");
}

function formatSchemaErrors(errors: ErrorObject[] | null | undefined): TokenValidationError[] {
  if (!errors) return [];
  return errors.map((error) => ({
    code: "schema" as const,
    path: ajvErrorToPath(error),
    message: `${error.instancePath || "(root)"} ${error.message ?? "is invalid"}`.trim(),
  }));
}

/**
 * Validates a parsed tokens.json document against:
 *  1. The official DTCG Format Module JSON Schema (structural correctness).
 *  2. Scaffold's own rule that every token must have a resolvable $type,
 *     inherited from an ancestor group if not set directly (see
 *     resolve-type.ts for why this can't be expressed in (1) alone).
 *
 * Schema errors are collected even when a resolved-type error also exists
 * at the same path, so a single run surfaces everything wrong with the
 * document rather than stopping at the first problem.
 */
export function validateTokens(data: unknown): TokenValidationResult {
  const validate = getDtcgValidator();
  const schemaValid = validate(data);
  const errors: TokenValidationError[] = [
    ...formatSchemaErrors(schemaValid ? undefined : validate.errors),
    ...findMissingResolvedTypes(data).map((e): TokenValidationError => ({
      code: "missing-type",
      path: e.path,
      message: e.message,
    })),
  ];

  return { valid: errors.length === 0, errors };
}
