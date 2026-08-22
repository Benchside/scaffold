# Contributing to @benchside/scaffold

## Monorepo layout

A pnpm workspace managed with [Turborepo](https://turborepo.com):

| Package                          | What it is                                                   |
| -------------------------------- | ------------------------------------------------------------ |
| `packages/tokens`                | Primitive design tokens (DTCG `tokens.json` → CSS/JS/TS)     |
| `packages/theme-default`         | Semantic token layer (light + dark)                          |
| `packages/tailwind-preset`       | Tailwind v4 preset exposing semantic tokens as utilities     |
| `packages/react`                 | React components                                             |
| `packages/solid`, `packages/vue` | Solid/Vue components (in progress)                           |
| `apps/docs`                      | Storybook — component gallery, docs, visual regression suite |

Common commands, run from the repo root (each fans out per-package via
`turbo run <task>`, respecting the dependency graph in `turbo.json`):

```sh
pnpm install       # also registers lefthook (see below)
pnpm build         # turbo run build
pnpm test          # turbo run test (unit)
pnpm test:browser  # turbo run test:browser (Playwright — visual regression etc.)
pnpm typecheck     # turbo run typecheck
pnpm lint          # oxlint + the no-hardcoded-colors CSS check
```

To work on a single package without building the whole graph, use pnpm's
`--filter`: `pnpm --filter @benchside/scaffold-react test`.

## Git Hooks (lefthook)

This project uses [lefthook](https://github.com/evilmartians/lefthook) to run checks locally before code is committed. It's installed as an npm devDependency, so it's set up automatically:

```sh
pnpm install
```

This registers:

- a **`pre-commit`** hook that runs `lint-staged` (oxlint + Prettier on staged files) and `pnpm typecheck`
- a **`commit-msg`** hook that validates your commit message against the Conventional Commits rules via `commitlint` — the same check that runs in CI

## Commit Conventions

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <short summary>
```

**Types**

| Type       | When to use                          |
| ---------- | ------------------------------------ |
| `feat`     | New feature or behavior              |
| `fix`      | Bug fix                              |
| `test`     | Adding or updating tests only        |
| `refactor` | Code change with no behavior change  |
| `perf`     | Performance improvement              |
| `docs`     | Documentation only                   |
| `chore`    | Build scripts, dependencies, tooling |
| `ci`       | CI configuration changes             |

**Scopes** (optional but encouraged)

`tokens`, `theme`, `tailwind`, `react`, `solid`, `vue`, `docs`, `repo`

**Examples**

```
feat(tokens): add oklch primitive palette for cool-gray
fix(react): correct focus ring color in dark mode
test(solid): add render test for Button
docs: update package structure in README
chore(ci): cache pnpm store in GitHub Actions
```

Breaking changes: append `!` after the type/scope and add a `BREAKING CHANGE:` footer.

```
feat(tokens)!: rename color.accent.default to color.accent.primary

BREAKING CHANGE: consuming themes must update their `[data-theme]` overrides to the new token name
```

## Releasing

Versioning and npm publishing are handled by [Changesets](https://github.com/changesets/changesets),
automated end-to-end except for two deliberate human checkpoints: reviewing the
version bump, and approving the actual publish.

**Every PR that changes a publishable package's behavior** (`tokens`, `theme-default`,
`tailwind-preset`, or `react`) needs a changeset:

```bash
pnpm changeset
```

Answer its prompts — which package(s) changed, what kind of bump, a short summary —
and commit the generated `.changeset/*.md` file as part of your PR. The Changesets bot
comments on every PR and its check is required to merge, so a PR without one (real or
empty) won't pass.

**Doesn't need a version bump** (internal refactor, test-only, docs-only, CI config)?
Record that explicitly instead of skipping it:

```bash
pnpm changeset add --empty
```

**Picking a bump type** — same judgment call every semver-based project makes, caught
again at PR review and once more when the automated "Version Packages" PR is reviewed
before merge, so a wrong guess isn't a one-way door:

| Bump    | When                                                       |
| ------- | ---------------------------------------------------------- |
| `patch` | Bug fix, no API change                                     |
| `minor` | New component, new prop, new export — backward compatible  |
| `major` | Removed or renamed a prop/export, changed default behavior |

**What happens after merge** — you don't need to do any of this yourself, just know
the shape of it: a GitHub Action opens/updates a "Version Packages" PR bumping
versions and CHANGELOGs from accumulated changesets; merging _that_ PR triggers a
second workflow that pauses for a maintainer's approval, then builds and publishes to
npm.

**Prerelease releases** (alpha/beta/rc) are a maintainer-only mode, not something each
changeset opts into individually:

```bash
pnpm changeset pre enter beta   # every version now gets a -beta.N suffix,
                                 # published under npm's `beta` dist-tag
pnpm changeset pre exit         # ends the cycle; the next version is the real one
```

## Using AI Coding Tools

AI-assisted contributions are welcome — plenty of this codebase, including this file,
was written with one. This section sets expectations for using them on this project
specifically, not a general policy on whether to use them.

**You're responsible for what you submit.** Whether a line came from autocomplete, a
chat prompt, or your own typing, once it's in a PR it's yours: you should understand
it, be able to explain any part of it in review, and not submit something you can't
defend. "The AI wrote it that way" isn't an answer to a review question.

**Disclose it for large AI-generated changes.** If AI generated the majority of a
PR's diff with minimal line-by-line authorship on your part — a new component, a new
package, a substantial refactor — say so in the PR description (tool name optional,
e.g. "Drafted with AI assistance; reviewed and tested by me"). Small
autocomplete-assisted edits where you're driving don't need a note.

**Everything else in this file still applies, no exceptions.** Tests, changesets, the
Component Architecture Pattern below — none of it is negotiable because of how the
code was drafted.

**Watch for token bypasses specifically.** AI coding tools are trained overwhelmingly
on generic Tailwind, so they'll readily suggest raw utility classes (`bg-blue-500`,
a hex literal) instead of this project's semantic tokens (`bg-accent`). CI's
`no-hardcoded-colors` oxlint rule and `check-css-tokens.mjs` catch this, but it's
worth knowing upfront rather than discovering it as a wall of CI failures.

**Confirm originality.** By submitting a PR you're confirming the code — AI-assisted
or not — doesn't knowingly include copied third-party code under an incompatible
license. Same expectation as any other open-source contribution; AI tools don't
change it.

## Component Architecture Pattern (`@benchside/scaffold-react`)

Every component in `packages/react` follows this pattern, verified end-to-end by
`packages/react/src/__tests__/component-pattern.test.tsx`:

1. **Props interface** — typed, documented. Extend the underlying element's props
   (`ComponentPropsWithoutRef<"div">`, etc.) plus `VariantProps<typeof xVariants>` where
   the component has a `cva` config.
2. **Ark UI primitive as the headless base** for interactive components.
   Primitives with no interactive state build directly on the HTML element.
3. **Ref is a plain prop, not `forwardRef`.** This project targets React 19+, where
   function components receive `ref` as a normal prop — declare it explicitly in the
   props interface (`ref?: Ref<HTMLDivElement>`) instead of wrapping the component in
   `forwardRef`.
4. **No theme awareness.** Theming is a pure CSS concern (`[data-theme]` cascade,
   verified in `@benchside/scaffold-theme-default`). Components never read or hold
   theme state — they just reference semantic Tailwind classes and the cascade handles
   the rest, including runtime theme swaps.
5. **Variants via `cva`.** Any component with a variant/size/tone axis defines a `cva`
   config for it rather than hand-rolled conditionals, so every component in
   `packages/react/src/components/` shares one variant-authoring shape.
6. **Class composition via `cn()`** (`packages/react/src/lib/cn.ts`) — merges the `cva`
   output with a consumer-supplied `className` using `tailwind-merge`, so overrides win
   over defaults instead of both classes surviving in the DOM.
7. **Compound components use Ark UI's dot-notation convention** (`Card.Header`,
   `Card.Body`, `Card.Footer` via `Object.assign`), matching how Ark UI itself exposes
   `Checkbox.Root` / `Checkbox.Control` / etc.
8. **State is exposed via `data-*` attributes, not extra variant classes.** Ark UI
   already emits attributes like `data-state` / `data-disabled` on its primitives —
   reuse those names when a non-Ark component needs an equivalent state
   (e.g. `data-loading`, `data-invalid`) instead of inventing unrelated vocabulary.
9. **Visual regression lives in `apps/docs`, not here.** `apps/docs/visual/*.visual.test.ts`
   (Playwright) screenshots components through Storybook's iframe — Storybook is
   the one real render surface, so there's no separate component-mounting harness
   in this package. Run via `pnpm --filter docs test:browser`.

   **Adding a baseline for a new story:** Playwright suffixes screenshot filenames
   by OS (`*-darwin.png` locally on a Mac, `*-linux.png` in CI) — a baseline made
   directly on a Mac can never match CI's, so `.devcontainer/devcontainer.json`
   pins the exact same `mcr.microsoft.com/playwright` image/version CI's Chromium
   comes from. One-time setup: `npm i -g @devcontainers/cli`, then
   `devcontainer up --workspace-folder .`. After that, generating/refreshing
   baselines is one line, run whenever a story is added or changed:

   ```sh
   devcontainer exec --workspace-folder . pnpm snapshots:update
   ```

   This runs entirely inside the container against a container-only
   `node_modules` (see the mounts in `devcontainer.json`) — your Mac's own
   `node_modules` is never touched, no reinstall needed after. Commit whatever
   lands under `apps/docs/visual/*-snapshots/*-linux.png`.

   No CI access and no Docker either? Fall back to downloading the
   `playwright-visual-results` artifact from a failed CI run
   (`.github/workflows/ci.yml` uploads it on failure): check the `actual.png`
   inside looks right, rename it to the expected `*-linux.png` name, commit it.

10. **File layout**: one folder per component —
    `src/components/ComponentName/{ComponentName.tsx, ComponentName.test.tsx}`
    (no `.browser.test.ts` here — see item 9, that's `apps/docs`'s job).
11. **Inline `style` props are discouraged by convention, not lint-enforced.** The
    project's "no hardcoded values" rule (`scaffold/no-hardcoded-colors`) only scans
    class names, so it can't catch a raw value inside a `style={{...}}` object — this is
    a known, accepted gap. A genuine inline `style` should have a clear, unavoidable
    reason (e.g. a runtime-computed position from `floating-ui`), and is expected to be
    caught in code review rather than CI.

## Adding a Component

1. Create `packages/react/src/components/ComponentName/` with
   `ComponentName.tsx` and `ComponentName.test.tsx`, following the
   Component Architecture Pattern above.
2. Add a story under `apps/docs/stories/ComponentName.stories.tsx` —
   this is both the documented example (autodocs generates the props
   table from your component's TypeScript types and JSDoc, no MDX
   needed) and the visual regression render surface.
3. Generate a visual regression baseline for the new story (see item 9
   above for the devcontainer flow).
4. Run `pnpm --filter @benchside/scaffold-react test` and
   `pnpm --filter docs test:browser` before opening a PR.

## Adding a Token

1. Edit `packages/tokens/tokens.json` directly — DTCG format
   (`$value`/`$type`/`$description`). Every token needs a non-empty
   `$description`; the docs generator refuses to run otherwise.
2. `pnpm --filter @benchside/scaffold-tokens validate` checks the file
   against the DTCG JSON Schema.
3. `pnpm build` (or `pnpm --filter @benchside/scaffold-tokens build`)
   regenerates `dist/tokens.{css,js,d.ts}` from the edited source.
4. Adding a **semantic** token (not a primitive)? Wire it into
   `packages/theme-default/src/light.css` and `dark.css` too — primitives
   alone aren't referenced by components, only their semantic mapping is.
