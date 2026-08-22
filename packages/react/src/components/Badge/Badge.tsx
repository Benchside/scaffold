import type { ComponentPropsWithoutRef, Ref } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const badgeVariants = cva("inline-flex items-center gap-inline-xs", {
  variants: {
    variant: {
      default: "text-status-neutral",
      success: "text-status-success",
      warning: "text-status-warning",
      error: "text-status-error",
      info: "text-status-info",
    },
    appearance: {
      solid: "",
      outline: "border bg-transparent",
    },
    shape: {
      pill: "rounded-full",
      rounded: "rounded-md",
    },
    size: {
      sm: "px-inset-xs py-inset-2xs text-caption font-caption tracking-caption",
      md: "px-inset-sm py-inset-2xs text-label font-label tracking-label",
      lg: "px-inset-md py-inset-xs text-label-lg font-label-lg tracking-label-lg",
    },
  },
  compoundVariants: [
    { variant: "default", appearance: "solid", class: "bg-status-neutral-bg" },
    { variant: "success", appearance: "solid", class: "bg-status-success-bg" },
    { variant: "warning", appearance: "solid", class: "bg-status-warning-bg" },
    { variant: "error", appearance: "solid", class: "bg-status-error-bg" },
    { variant: "info", appearance: "solid", class: "bg-status-info-bg" },
    { variant: "default", appearance: "outline", class: "border-status-neutral" },
    { variant: "success", appearance: "outline", class: "border-status-success" },
    { variant: "warning", appearance: "outline", class: "border-status-warning" },
    { variant: "error", appearance: "outline", class: "border-status-error" },
    { variant: "info", appearance: "outline", class: "border-status-info" },
  ],
  defaultVariants: { variant: "default", appearance: "solid", shape: "pill", size: "md" },
});

interface BadgeProps extends ComponentPropsWithoutRef<"span">, VariantProps<typeof badgeVariants> {
  ref?: Ref<HTMLSpanElement>;
}

/**
 * A compact status/label pill. Renders as a `<span>`, so it composes freely
 * inside text, table cells, and headings — there's no dedicated icon prop;
 * pass an icon element as a child alongside the label instead.
 *
 * @param variant - Semantic status color. `default` is neutral gray, not a status color.
 * @param appearance - `solid` (default) fills the background; `outline` uses a colored
 * border on a transparent background instead.
 * @param shape - `pill` (default) is fully rounded; `rounded` uses a smaller corner radius.
 * @param size - Controls padding and typography scale: `sm` (caption), `md` (default,
 * label), or `lg` (label-lg).
 *
 * @example
 * <Badge variant="success" appearance="outline">Passed</Badge>
 */
function Badge({ variant, appearance, shape, size, className, ref, ...props }: BadgeProps) {
  return (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, appearance, shape, size }), className)}
      {...props}
    />
  );
}

export { Badge };
