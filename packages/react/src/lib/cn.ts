import { cx } from "class-variance-authority";
import { extendTailwindMerge } from "tailwind-merge";

type ClassValue = Parameters<typeof cx>[number];

/**
 * tailwind-merge's default `text-*` handling only recognizes T-shirt sizes
 * (`sm`, `lg`, ...) as font-size; any other suffix — including this
 * preset's named typography roles (`text-body-sm`, `text-heading-1`, ...) —
 * falls back to its permissive text-color matcher and collides with real
 * color classes like `text-status-warning` (last one wins, silently
 * dropping the other). Registering these roles under the `text` theme
 * scale routes them to font-size correctly. List mirrors the composite
 * `--text-*` roles in `packages/tailwind-preset/src/index.css`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "heading-1",
        "heading-2",
        "heading-3",
        "heading-4",
        "body-lg",
        "body",
        "body-sm",
        "label",
        "label-lg",
        "caption",
        "data",
        "code",
        "code-lg",
      ],
      // Same problem as `text` above, for this preset's role-based spacing
      // scale (`p-inset-lg`, `gap-inline-sm`, `w-stack-md`, ...): tailwind-
      // merge's default spacing scale only recognizes numbers/fractions, so
      // e.g. `px-inset-lg py-inset-sm p-inset-lg` wouldn't collapse to just
      // the last one. A prefix check covers the whole role scale — inset/
      // stack/inline — without hardcoding every size step.
      spacing: [(value: string) => /^(inset|stack|inline)-/.test(value)],
    },
  },
});

/**
 * Merges `cva`/clsx-style class value inputs and resolves conflicting
 * Tailwind classes within the same utility group, with later classes
 * winning — e.g. a consumer-supplied `className` overriding a component's
 * default `bg-accent`.
 *
 * @param classes - Class values to merge, in precedence order (later wins).
 * @returns The merged, conflict-resolved class string.
 */
export function cn(...classes: ClassValue[]): string {
  return twMerge(cx(...classes));
}
