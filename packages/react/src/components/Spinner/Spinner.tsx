import type { ComponentPropsWithoutRef, Ref } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";
import type { FieldSize } from "../../lib/field";

/**
 * Same primitive `--font-size-*` scale as `Checkbox`'s box — both are
 * square icon-scale elements with no padding to fall back on.
 */
const SIZE_CLASSES: Record<FieldSize, string> = {
  xs: "size-(--font-size-xs)",
  sm: "size-(--font-size-sm)",
  md: "size-(--font-size-base)",
  lg: "size-(--font-size-lg)",
  xl: "size-(--font-size-xl)",
};

interface SpinnerProps extends ComponentPropsWithoutRef<"span"> {
  size?: FieldSize;
  /** Accessible label, announced via a visually-hidden status text. Ignored when `decorative` is set. @default "Loading" */
  label?: string;
  /**
   * Marks the spinner as purely decorative — skips `role="status"` and the
   * visually-hidden label entirely, matching `Separator`'s `decorative`
   * prop. Use this (not `aria-hidden`) when composing inside an
   * already-labeled busy container, e.g. `Button`'s own `aria-busy`:
   * `role="status"` carries an implicit live-region, and some browser/AT
   * combinations don't fully suppress a live region's announcements even
   * under an `aria-hidden` ancestor — verified against real Chromium
   * rendering, not assumed. Dropping the role entirely sidesteps that.
   */
  decorative?: boolean;
  ref?: Ref<HTMLSpanElement>;
}

/**
 * A rotating loading indicator — built directly on `lucide-react`'s
 * `Loader2` (the same icon `Button`'s own loading state uses), not Ark UI:
 * there's no interactive state or focus/keyboard model to manage, matching
 * `Badge`/`Separator`.
 *
 * @param size - `xs` through `xl` (default `md`) — matches `Checkbox`'s scale.
 * @param label - Visually-hidden accessible text (default `"Loading"`).
 * @param decorative - Drops `role="status"` and the label — for composing
 * inside an already-labeled busy container.
 *
 * @example
 * <Spinner label="Fetching results" />
 */
function Spinner({
  size = "md",
  label = "Loading",
  decorative = false,
  className,
  ref,
  ...props
}: SpinnerProps) {
  const a11yProps = decorative ? {} : { role: "status" as const };
  return (
    <span ref={ref} className="inline-flex" {...a11yProps} {...props}>
      <Loader2
        className={cn(
          SIZE_CLASSES[size],
          "animate-spin motion-reduce:animate-none motion-reduce:opacity-60",
          className,
        )}
        aria-hidden="true"
      />
      {!decorative && <span className="sr-only">{label}</span>}
    </span>
  );
}

export { Spinner };
