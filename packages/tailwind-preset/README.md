# @benchside/scaffold-tailwind

Tailwind v4 preset for the Benchside Scaffold design system. Pure CSS —
one `@theme inline` block that republishes every semantic token from
`@benchside/scaffold-theme-default` (and the radius/font-family
primitives from `@benchside/scaffold-tokens`) as Tailwind utility
classes (`bg-accent`, `text-text-secondary`, `p-inset-md`,
`rounded-lg`, `text-heading-1`, ...). No JavaScript config — Tailwind
v4 presets are CSS partials, not JS objects.

## Install

```bash
npm install @benchside/scaffold-tokens \
            @benchside/scaffold-theme-default \
            @benchside/scaffold-tailwind \
            tailwindcss
```

## Usage

Import in this order in your app's Tailwind entry CSS — later imports
assume the custom properties from earlier ones are already in scope:

```css
@import "tailwindcss";
@import "@benchside/scaffold-tokens/css";
@import "@benchside/scaffold-theme-default";
@import "@benchside/scaffold-tailwind";
```

Set `<html data-theme="light">` / `data-theme="dark"` to force a theme,
or omit the attribute to follow `prefers-color-scheme`. Utility classes
never change across the swap — only the underlying `var()` chain
re-resolves.

## Tailwind CSS IntelliSense

The [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
VS Code extension (v0.10+) autodetects Tailwind v4's CSS-based config —
no `tailwind.config.js` needed. It looks for a CSS file containing
`@import "tailwindcss"` reachable from your workspace root.

**If autocomplete doesn't pick up `bg-accent`, `text-text-secondary`,
`p-inset-md`, etc. automatically**, point the extension at your app's
Tailwind entry file explicitly in `.vscode/settings.json`:

```json
{
  "tailwindCSS.experimental.configFile": "src/app.css"
}
```

(Replace `src/app.css` with the path to the file that has the four
`@import` lines above.)

**Manual verification checklist** (this is a manual check, not automated):

1. Open a `.tsx`/`.html` file in a project that imports this preset per
   the order above.
2. Type `class="` (or `className="`) and confirm the completion list
   includes `bg-accent`, `text-text-secondary`, `p-inset-md`,
   `rounded-lg`, and `text-heading-1`.
3. Hover a completed class (e.g. `bg-accent`) and confirm the tooltip
   shows the resolved `var(--color-accent-default)` chain, not a baked
   color.
