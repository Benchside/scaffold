import type { ComponentPropsWithoutRef, ElementType, MouseEvent, Ref } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";
import { Spinner } from "../Spinner/Spinner";

const SIZE_CLASSES = {
  xs: "px-inset-sm py-inset-2xs text-caption font-caption tracking-caption",
  sm: "px-inset-md py-inset-xs text-label font-label tracking-label",
  md: "px-inset-lg py-inset-sm text-label font-label tracking-label",
  lg: "px-inset-xl py-inset-md text-label-lg font-label-lg tracking-label-lg",
  xl: "px-inset-2xl py-inset-lg text-label-lg font-label-lg tracking-label-lg",
} as const;

const ICON_ONLY_PADDING = {
  xs: "p-inset-sm",
  sm: "p-inset-md",
  md: "p-inset-lg",
  lg: "p-inset-xl",
  xl: "p-inset-2xl",
} as const;

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-inline-xs rounded-md focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2",
  {
    variants: {
      intent: { primary: "", secondary: "", destructive: "" },
      emphasis: { solid: "", outline: "border", ghost: "" },
      size: {
        xs: SIZE_CLASSES.xs,
        sm: SIZE_CLASSES.sm,
        md: SIZE_CLASSES.md,
        lg: SIZE_CLASSES.lg,
        xl: SIZE_CLASSES.xl,
      },
      iconOnly: { true: "", false: "" },
      disabled: { true: "cursor-not-allowed opacity-50", false: "" },
      loading: { true: "cursor-wait", false: "" },
    },
    compoundVariants: [
      {
        intent: "primary",
        emphasis: "solid",
        class: "bg-accent text-text-on-solid hover:bg-accent-hover active:bg-accent-active",
      },
      {
        intent: "primary",
        emphasis: "outline",
        class: "border-accent text-accent-text hover:bg-accent-subtle",
      },
      { intent: "primary", emphasis: "ghost", class: "text-accent-text hover:bg-accent-subtle" },
      { intent: "secondary", emphasis: "solid", class: "bg-bg-subtle text-text hover:bg-bg-hover" },
      {
        intent: "secondary",
        emphasis: "outline",
        class: "border-border text-text hover:bg-bg-hover",
      },
      { intent: "secondary", emphasis: "ghost", class: "text-text-secondary hover:bg-bg-hover" },
      {
        intent: "destructive",
        emphasis: "solid",
        class:
          "bg-status-error text-text-on-solid hover:bg-status-error-hover active:bg-status-error-active",
      },
      {
        intent: "destructive",
        emphasis: "outline",
        class: "border-status-error text-status-error hover:bg-status-error-bg",
      },
      {
        intent: "destructive",
        emphasis: "ghost",
        class: "text-status-error hover:bg-status-error-bg",
      },
      { iconOnly: true, size: "xs", class: ICON_ONLY_PADDING.xs },
      { iconOnly: true, size: "sm", class: ICON_ONLY_PADDING.sm },
      { iconOnly: true, size: "md", class: ICON_ONLY_PADDING.md },
      { iconOnly: true, size: "lg", class: ICON_ONLY_PADDING.lg },
      { iconOnly: true, size: "xl", class: ICON_ONLY_PADDING.xl },
    ],
    defaultVariants: {
      intent: "primary",
      emphasis: "solid",
      size: "md",
      iconOnly: false,
      disabled: false,
      loading: false,
    },
  },
);

type ButtonRef = HTMLButtonElement | HTMLAnchorElement;

interface ButtonProps
  extends
    ComponentPropsWithoutRef<"button">,
    Omit<VariantProps<typeof buttonVariants>, "disabled" | "loading"> {
  /** Element to render as. `"a"` gets real native link behavior — pass `href`. */
  as?: "button" | "a";
  /**
   * Square padding for an icon-with-no-label button. Always pair with
   * `aria-label` — there's no visible text for assistive tech otherwise.
   */
  iconOnly?: boolean;
  /**
   * Functionally disabled (blocks clicks, sets `aria-busy`/`aria-disabled`)
   * but keeps the button's normal `intent` color — signals "in progress",
   * not "unavailable". The label stays in the DOM (just visually hidden)
   * so the button's width doesn't change when the spinner appears.
   */
  loading?: boolean;
  ref?: Ref<ButtonRef>;
  href?: string;
}

/**
 * An actionable control. Renders as a native `<button>` (default
 * `type="button"`, not `"submit"` — opt in explicitly) or `<a>` via `as="a"`.
 *
 * @param intent - Semantic meaning: `primary` (default), `secondary`, or `destructive`.
 * @param emphasis - Visual weight, crossed with `intent`: `solid` (default), `outline`,
 * or `ghost`. `primary`+`ghost` covers what other systems call "tertiary".
 * @param size - `xs` through `xl` (default `md`).
 * @param disabled - Blocks interaction and mutes the color (`aria-disabled`, not native
 * `disabled`, so the button stays focusable). A `type="submit"` button that's disabled
 * can still be reached by the browser's implicit form submission on Enter elsewhere in
 * the form — guard the submit handler itself too, don't rely on this alone.
 * @param loading - Blocks interaction like `disabled` but keeps the normal color.
 *
 * @example
 * <Button intent="destructive" emphasis="outline" loading={isDeleting} onClick={onDelete}>
 *   Delete
 * </Button>
 */
function Button({
  as = "button",
  intent,
  emphasis,
  size,
  iconOnly,
  disabled = false,
  loading = false,
  type,
  className,
  onClick,
  children,
  ref,
  ...props
}: ButtonProps) {
  const Element: ElementType = as;
  const isBlocked = disabled || loading;

  function handleClick(event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) {
    if (isBlocked) {
      event.preventDefault();
      return;
    }
    onClick?.(event as MouseEvent<HTMLButtonElement>);
  }

  return (
    <Element
      ref={ref}
      // `as` is a fixed union (button/a), not full polymorphism — assert.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...({
        type: as === "button" ? (type ?? "button") : undefined,
        "aria-disabled": isBlocked ? "true" : undefined,
        "aria-busy": loading ? "true" : undefined,
        onClick: handleClick,
        ...props,
      } as any)}
      className={cn(
        buttonVariants({ intent, emphasis, size, iconOnly, disabled, loading }),
        className,
      )}
    >
      <span className={loading ? "invisible" : undefined}>{children}</span>
      {loading && (
        <span className="inset-0 absolute flex items-center justify-center">
          <Spinner size={size ?? "md"} decorative />
        </span>
      )}
    </Element>
  );
}

export { Button };
