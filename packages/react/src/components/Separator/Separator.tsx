import type { ComponentPropsWithoutRef, Ref } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const separatorVariants = cva("shrink-0", {
  variants: {
    orientation: {
      horizontal: "w-full border-t",
      // `self-stretch` fills the cross axis of a flex/grid parent (the
      // common case — a toolbar, a Card.Header/Body split). In a plain
      // block parent there's no cross axis to stretch into, so give the
      // separator an explicit height via `className` in that case.
      vertical: "self-stretch border-l",
    },
    emphasis: {
      default: "border-border",
      strong: "border-border-strong",
    },
  },
  defaultVariants: { orientation: "horizontal", emphasis: "default" },
});

interface SeparatorProps
  extends ComponentPropsWithoutRef<"div">, VariantProps<typeof separatorVariants> {
  /**
   * Marks the separator as purely visual spacing rather than a real content
   * boundary — drops `role="separator"`/`aria-orientation` so screen readers
   * don't announce it. Use for dense layouts with many non-semantic dividers
   * (e.g. between toolbar icons); leave `false` for separators that actually
   * divide sections of content.
   */
  decorative?: boolean;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A thin dividing line, horizontal or vertical. Renders as a `<div>` (not
 * `<hr>`, so the same element works for both orientations).
 *
 * @param orientation - `horizontal` (default) or `vertical`. Thickness is
 * always 1px — not a configurable size, to keep it a structural line rather
 * than a decorative element.
 * @param emphasis - `default` uses the standard border color; `strong` uses
 * a higher-contrast border for a more prominent section break.
 */
function Separator({
  orientation = "horizontal",
  emphasis,
  decorative,
  className,
  ref,
  ...props
}: SeparatorProps) {
  const a11yProps = decorative
    ? {}
    : { role: "separator" as const, "aria-orientation": orientation ?? "horizontal" };
  return (
    <div
      ref={ref}
      className={cn(separatorVariants({ orientation, emphasis }), className)}
      {...a11yProps}
      {...props}
    />
  );
}

export { Separator };
