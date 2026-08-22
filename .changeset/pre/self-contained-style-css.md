---
"@benchside/scaffold-react": minor
---

Add a self-contained `style.css` build, importable as `@benchside/scaffold-react/style.css`.

It bundles the resolved token/theme values and every utility class the component set uses, so rendering styled components no longer requires installing or configuring `@benchside/scaffold-tokens`, `@benchside/scaffold-theme-default`, or `@benchside/scaffold-tailwind` separately — one import is enough. Consumers who also want the same semantic token vocabulary (`bg-accent`, `p-inset-md`, ...) available in their own custom markup can still add `@benchside/scaffold-tailwind` to their own Tailwind build; this is unaffected and works alongside the new import.
