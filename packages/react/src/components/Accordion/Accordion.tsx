import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import {
  Accordion as ArkAccordion,
  type AccordionFocusChangeDetails,
  type AccordionValueChangeDetails,
} from "@ark-ui/react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

interface AccordionProps extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "dir"> {
  /** Allow more than one item expanded at once. @default false */
  multiple?: boolean;
  /** Allow the currently-open item (in single-expand mode) to be closed again. @default false */
  collapsible?: boolean;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (details: AccordionValueChangeDetails) => void;
  onFocusChange?: (details: AccordionFocusChangeDetails) => void;
  /** Arrow-key axis and layout direction. @default "vertical" */
  orientation?: "horizontal" | "vertical";
  /** Disables every item. Use `Accordion.Item`'s own `disabled` for a single item. */
  disabled?: boolean;
  /** Skip mounting an item's content until it's first expanded. */
  lazyMount?: boolean;
  /** Unmount an item's content when it's no longer expanded. */
  unmountOnExit?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A vertically (or horizontally) stacked set of expandable/collapsible
 * items — built on Ark UI's accordion state machine for arrow-key
 * navigation, focus management, and ARIA.
 *
 * @param multiple - Allow more than one item open at once (default `false`,
 * single-expand).
 * @param collapsible - In single-expand mode, allow closing the currently
 * open item back to nothing open (default `false`, matching Ark).
 * @param orientation - `"vertical"` (default) or `"horizontal"` — also sets
 * the arrow-key axis, not just layout.
 * @param lazyMount - Skip mounting an item's content until it's first expanded.
 * @param unmountOnExit - Unmount an item's content once it's no longer expanded.
 *
 * @example
 * <Accordion defaultValue={["general"]}>
 *   <Accordion.Item value="general">
 *     <Accordion.ItemTrigger>General</Accordion.ItemTrigger>
 *     <Accordion.ItemContent>Settings...</Accordion.ItemContent>
 *   </Accordion.Item>
 * </Accordion>
 */
function Accordion({
  multiple = false,
  collapsible = false,
  value,
  defaultValue,
  onValueChange,
  onFocusChange,
  orientation = "vertical",
  disabled = false,
  lazyMount,
  unmountOnExit,
  className,
  children,
  ref,
  ...props
}: AccordionProps) {
  return (
    <ArkAccordion.Root
      multiple={multiple}
      collapsible={collapsible}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      onFocusChange={onFocusChange}
      orientation={orientation}
      disabled={disabled}
      lazyMount={lazyMount}
      unmountOnExit={unmountOnExit}
      ref={ref}
      className={cn("flex flex-col gap-stack-2xs", className)}
      {...props}
    >
      {children}
    </ArkAccordion.Root>
  );
}

interface AccordionItemProps extends Omit<ComponentPropsWithoutRef<"div">, "value"> {
  value: string;
  disabled?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/** A single expandable item within an `Accordion`. */
function AccordionItem({
  value,
  disabled,
  className,
  children,
  ref,
  ...props
}: AccordionItemProps) {
  return (
    <ArkAccordion.Item
      value={value}
      disabled={disabled}
      ref={ref}
      className={cn("border-b border-border last:border-b-0", className)}
      {...props}
    >
      {children}
    </ArkAccordion.Item>
  );
}

interface AccordionItemTriggerProps extends ComponentPropsWithoutRef<"button"> {
  ref?: Ref<HTMLButtonElement>;
}

/** The clickable header of an `Accordion.Item` — toggles its content open/closed. */
function AccordionItemTrigger({ className, children, ref, ...props }: AccordionItemTriggerProps) {
  return (
    <ArkAccordion.ItemTrigger
      ref={ref}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-inline-sm py-inset-sm text-left text-label text-text transition-colors duration-100 hover:text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:text-text",
        className,
      )}
      {...props}
    >
      {children}
      <ArkAccordion.ItemIndicator className="shrink-0 text-text-secondary transition-transform duration-150 data-[state=open]:rotate-180">
        <ChevronDown className="size-4" aria-hidden="true" />
      </ArkAccordion.ItemIndicator>
    </ArkAccordion.ItemTrigger>
  );
}

interface AccordionItemContentProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement>;
}

/** The panel shown when its `Accordion.Item` is expanded. */
function AccordionItemContent({ className, children, ref, ...props }: AccordionItemContentProps) {
  return (
    <ArkAccordion.ItemContent
      ref={ref}
      className={cn("pb-inset-sm text-body-sm text-text-secondary", className)}
      {...props}
    >
      {children}
    </ArkAccordion.ItemContent>
  );
}

const AccordionWithParts = Object.assign(Accordion, {
  Item: AccordionItem,
  ItemTrigger: AccordionItemTrigger,
  ItemContent: AccordionItemContent,
});

export { AccordionWithParts as Accordion };
