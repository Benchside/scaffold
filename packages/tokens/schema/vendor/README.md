# Vendored DTCG schema

`dtcg-format.2025-10.json` is a byte-for-byte copy of the official Design
Tokens Community Group (DTCG) Format Module JSON Schema, version 2025.10.

- Source: https://www.designtokens.org/schemas/2025.10/format.json
- Fetched: 2026-08-15
- Draft: JSON Schema draft-07

## Why vendored instead of fetched at runtime

The schema is bundled as a single file — every sub-schema it `$ref`s
(`token.json`, `group.json`, `values/color.json`, etc.) is inlined under
`definitions` with a matching `$id`, so Ajv resolves all of them from this
one file without any network access. That makes `pnpm tokens:validate`
work offline and keeps CI runs from depending on designtokens.org being up.

## What this schema does and does not check

It validates DTCG structural correctness: token vs. group shape, and that
each token's `$value` matches the shape required by its `$type` (or, if
`$type` is absent, that `$value` matches at least one recognized value
shape). It does **not** require every token to have a resolvable `$type` —
DTCG allows a token with `$value` and no `$type` anywhere in its ancestry,
as long as `$value` happens to match some type's shape. Scaffold requires
a resolvable `$type` on every token; that stricter rule is enforced
separately in `src/validation/resolve-type.ts`, not in this schema.

## Updating

DTCG 2025.10 is a draft, not a stable release — expect breaking changes.
To update: re-fetch `https://www.designtokens.org/schemas/2025.10/format.json`
(or whatever the current draft/stable URL is), replace this file, update
the version/date above, and re-run `pnpm --filter @benchside/scaffold-tokens test`
to catch any fixture breakage before bumping the pin.
