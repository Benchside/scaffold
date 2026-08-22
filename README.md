# @benchside/scaffold

> In biology, structure determines function. Scaffold is the structural
> matrix every Benchside tool folds around — so the tools can spend their
> effort on the science, not on rebuilding the same button twenty times.

**Benchside Scaffold** is the shared design, interaction, and
data-presentation system for the Benchside ecosystem — the color system,
typography, spacing, accessible components, and large-dataset primitives
that every Benchside tool builds on, so a researcher moving between tools
feels the same precision and trust throughout. It's Benchside-first and
open by default: any developer building scientific or data-dense software
can use it too.

## Ecosystem role

Scaffold isn't a product end users open directly — it's the foundation
Benchside products are built and experienced through:

```
Benchside Scaffold
        │
        ├── Benchside Calc       (molarity, dilution, MW calculations)
        ├── Benchside Construct  (molecular cloning workbench)
        ├── biolookup            (unified biological database search)
        ├── LabGraph              (research artifact provenance)
        └── ...and future tools, each with its own accent color
                on the same shared foundation
```

## Packages

| Package                                                       | Purpose                                                                                                                                                    |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@benchside/scaffold-tokens`](packages/tokens)               | Primitive design tokens (color, spacing, radius, typography) — DTCG `tokens.json`, built to CSS Custom Properties, a typed JS object, and TypeScript types |
| [`@benchside/scaffold-theme-default`](packages/theme-default) | Semantic token layer — maps primitives to purpose (`bg-base`, `text-primary`, `accent-default`, ...) for light and dark mode                               |
| [`@benchside/scaffold-tailwind`](packages/tailwind-preset)    | Tailwind CSS v4 preset — exposes every semantic token as a Tailwind utility class via `@theme inline`                                                      |
| [`@benchside/scaffold-react`](packages/react)                 | 23 production React components — built on Ark UI where real interaction complexity warrants it, native HTML where it doesn't                               |
| [`@benchside/scaffold-solid`](packages/solid)                 | Solid component package (in progress)                                                                                                                      |
| [`@benchside/scaffold-vue`](packages/vue)                     | Vue component package (in progress)                                                                                                                        |

## Install

Start here no matter what — this works whether or not your app uses
Tailwind:

```bash
npm install @benchside/scaffold-react react react-dom
```

```css
/* your app's global CSS — one import, that's it */
@import "@benchside/scaffold-react/style.css";
```

`style.css` is self-contained: it already bundles the resolved
token/theme values and every utility class the component set uses, so
there's no Tailwind config or build step needed on your side. Dark mode
follows `data-theme="dark"` on `<html>` (or `prefers-color-scheme` if
you omit it) automatically. **If you don't use Tailwind in your own app,
you're done.**

### Already using Tailwind, or want Scaffold's tokens in your own markup?

The install above works unchanged either way — `style.css` is
already-compiled CSS, not something your own Tailwind build reprocesses,
so there's no conflict. Add this only if you also want the semantic
vocabulary (`bg-accent`, `p-inset-md`, ...) available in markup **you**
write, not just inside Scaffold's components:

```bash
npm install @benchside/scaffold-tailwind
```

```css
@import "tailwindcss";
@import "@benchside/scaffold-tailwind/css";
@source "./src"; /* your own source — standard Tailwind config, not Scaffold-specific */
```

Skip this entirely if you're only using Scaffold's components as-is.

Only need the token system, no components? Install just the foundation:

```bash
npm install @benchside/scaffold-tokens @benchside/scaffold-theme-default
```

See each package's own README for full usage details. For a guided
walkthrough (Getting Started, Theming, component gallery), run Storybook
locally:

```bash
pnpm install
pnpm --filter docs storybook
```

## Theming

Set `data-theme="light"` / `data-theme="dark"` on `<html>` to force a
theme, or omit it to follow `prefers-color-scheme`. A per-tool theme only
ever needs to override four accent variables — everything downstream
(hover/active states, focus rings, links) follows automatically:

```css
[data-theme="benchside-calc"] {
  --color-accent-default: var(--color-teal-500);
  --color-accent-hover: var(--color-teal-600);
  --color-accent-active: var(--color-teal-700);
  --color-accent-subtle: var(--color-teal-50);
}
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the monorepo layout, commit
conventions, and how to add a component or token.

## License

MIT — see [LICENSE](LICENSE). The "Benchside" name and logo are not
covered by this license. Self-hosted fonts
(`@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`) are
distributed under the [SIL Open Font License 1.1](https://openfontlicense.org/).

---

_The scaffold provides the structure; the tools provide the science._
