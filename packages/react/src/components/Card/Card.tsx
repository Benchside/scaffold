import { createContext, useContext } from "react";
import type { ComponentPropsWithoutRef, ElementType, Ref } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const cardVariants = cva(
  "flex flex-col overflow-hidden rounded-lg border data-selected:border-accent data-selected:bg-accent-subtle",
  {
    variants: {
      variant: {
        outline: "bg-bg-elevated border-border",
        filled: "bg-bg-subtle border-transparent",
      },
      interactive: {
        // Reset the browser's default centered button text and shrink-to-fit
        // width — `<a>` doesn't need this, but it's harmless there too.
        // `outline-2` alone already sets outline-style, no separate `outline`.
        true: "cursor-pointer text-left w-full hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2",
        false: "",
      },
    },
    defaultVariants: { variant: "outline", interactive: false },
  },
);

type CardDensity = "default" | "compact";

const CardDensityContext = createContext<CardDensity>("default");

const sectionPaddingVariants = cva("", {
  variants: {
    density: {
      default: "px-inset-lg py-inset-lg",
      compact: "px-inset-md py-inset-md",
    },
  },
  defaultVariants: { density: "default" },
});

type CardRef = HTMLDivElement | HTMLButtonElement | HTMLAnchorElement;

interface CardProps extends ComponentPropsWithoutRef<"div">, VariantProps<typeof cardVariants> {
  /**
   * Element to render as. `"button"`/`"a"` get real native focus, hover, and
   * keyboard (Enter/Space) affordance for free — there's no separate
   * `interactive`/`onClick`-on-`div` mode, so a clickable card should always
   * use one of these instead. Fixed union, not full polymorphism: `href`
   * and event handler types below are not narrowed per tag.
   */
  as?: "div" | "button" | "a";
  /**
   * Padding scale for Header/Body/Footer, propagated via context so each
   * section doesn't need its own density prop. `"default"` (16px) for
   * standalone/detail cards, `"compact"` (12px) for dense dashboard grids.
   */
  density?: CardDensity;
  /**
   * Visual "chosen from a list" state (accent border + tinted background),
   * exposed as a `data-selected` attribute rather than a class — this is a
   * styling hook only. Pair it with real `aria-pressed`/`aria-selected`
   * semantics at the call site if the card is part of an actual selection
   * widget.
   */
  selected?: boolean;
  ref?: Ref<CardRef>;
  /** Only meaningful when `as="a"`. */
  href?: string;
}

/**
 * A bordered/filled content boundary with optional `Card.Header`,
 * `Card.Body`, and `Card.Footer` sections (stacked top to bottom). Card only
 * owns the outer boundary and section padding — layout of whatever you put
 * inside a section (flex/grid, gaps, alignment) is entirely up to the
 * consumer.
 *
 * @param variant - `outline` (default) is bordered with an elevated
 * background; `filled` uses a subtle background with no visible border.
 * No shadow-based "elevated" variant — this system communicates hierarchy
 * with border/background only, never box-shadow.
 *
 * @example
 * <Card as="button" onClick={...} selected={isActive}>
 *   <Card.Header>Experiment Run #42</Card.Header>
 *   <Card.Body>Sample throughput, latency, and error-rate summary.</Card.Body>
 * </Card>
 */
function Card({ as, variant, density = "default", selected, className, ref, ...props }: CardProps) {
  const Element: ElementType = as ?? "div";
  const interactive = as === "button" || as === "a";
  return (
    <CardDensityContext.Provider value={density}>
      <Element
        // `as` is a fixed union (div/button/a), not full polymorphism, so
        // JSX can't narrow which intrinsic tag's props/ref apply — assert.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...({ ref, "data-selected": selected ? "" : undefined, ...props } as any)}
        className={cn(cardVariants({ variant, interactive }), className)}
      />
    </CardDensityContext.Provider>
  );
}

interface CardSectionProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement>;
}

/** Top section of a `Card`. Padding only — no typography or layout opinion. */
function CardHeader({ className, ref, ...props }: CardSectionProps) {
  const density = useContext(CardDensityContext);
  return (
    <div ref={ref} className={cn(sectionPaddingVariants({ density }), className)} {...props} />
  );
}

/** Middle section of a `Card`. Padding only — no typography or layout opinion. */
function CardBody({ className, ref, ...props }: CardSectionProps) {
  const density = useContext(CardDensityContext);
  return (
    <div ref={ref} className={cn(sectionPaddingVariants({ density }), className)} {...props} />
  );
}

/** Bottom section of a `Card`. Padding only — no typography or layout opinion. */
function CardFooter({ className, ref, ...props }: CardSectionProps) {
  const density = useContext(CardDensityContext);
  return (
    <div ref={ref} className={cn(sectionPaddingVariants({ density }), className)} {...props} />
  );
}

const CardWithSections = Object.assign(Card, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});

export { CardWithSections as Card };
