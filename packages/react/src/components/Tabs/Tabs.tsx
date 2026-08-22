import { createContext, useContext } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { Tabs as ArkTabs, type TabsValueChangeDetails } from "@ark-ui/react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/cn";

type TabsVariant = "underline" | "segmented";
type TabsSize = "sm" | "md" | "lg";

const TABS_TRIGGER_SIZE_CLASSES = {
  sm: "px-inset-sm py-inset-2xs text-caption font-caption tracking-caption",
  md: "px-inset-md py-inset-xs text-label font-label tracking-label",
  lg: "px-inset-lg py-inset-sm text-label-lg font-label-lg tracking-label-lg",
} as const;

const listVariants = cva(
  "relative flex data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex-col",
  {
    variants: {
      variant: {
        underline:
          "border-b border-border data-[orientation=vertical]:border-b-0 data-[orientation=vertical]:border-r",
        // No track border: the accent-tinted indicator (below) carries the
        // contrast, so a border would just double up with it and throw off
        // the pill's corner radius nesting inside the track's.
        segmented: "gap-1 rounded-lg bg-bg-subtle p-1",
      },
    },
    defaultVariants: { variant: "underline" },
  },
);

const triggerVariants = cva(
  "relative z-10 inline-flex cursor-pointer items-center justify-center gap-inline-2xs whitespace-nowrap text-text-secondary transition-colors duration-100 hover:text-text data-selected:text-accent-text focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:text-text-secondary",
  {
    variants: {
      variant: {
        underline: "",
        segmented: "rounded-md",
      },
      size: TABS_TRIGGER_SIZE_CLASSES,
    },
    defaultVariants: { variant: "underline", size: "md" },
  },
);

const indicatorVariants = cva("", {
  variants: {
    variant: {
      underline:
        "rounded-full bg-accent data-[orientation=horizontal]:bottom-0 data-[orientation=horizontal]:h-0.5 data-[orientation=horizontal]:w-(--width) data-[orientation=vertical]:right-0 data-[orientation=vertical]:h-(--height) data-[orientation=vertical]:w-0.5",
      // `accent-subtle` (not `bg-elevated`) so the pill reads by hue, not
      // just lightness — in the dark theme, `bg-elevated` equals the
      // track's `bg-subtle` (see theme-default/dark.css), so a neutral fill
      // would be indistinguishable from the track. Radius is the track's
      // `rounded-lg` (8px) minus its `p-1` padding (4px), so the pill nests
      // exactly inside the track's corners.
      segmented:
        "rounded-md bg-accent-subtle data-[orientation=horizontal]:top-0 data-[orientation=horizontal]:h-full data-[orientation=horizontal]:w-(--width) data-[orientation=vertical]:left-0 data-[orientation=vertical]:h-(--height) data-[orientation=vertical]:w-full",
    },
  },
  defaultVariants: { variant: "underline" },
});

interface TabsVariantSizeContextValue {
  variant: TabsVariant;
  size: TabsSize;
}

const TabsVariantSizeContext = createContext<TabsVariantSizeContextValue>({
  variant: "underline",
  size: "md",
});

interface TabsProps extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "dir"> {
  /** Visual style. `underline` (default) suits content/page navigation; `segmented` suits a self-contained option group. */
  variant?: TabsVariant;
  size?: TabsSize;
  /** Arrow-key axis and layout direction. Defaults to `"horizontal"`. */
  orientation?: "horizontal" | "vertical";
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (details: TabsValueChangeDetails) => void;
  /** Skip mounting a panel's content until its tab is first selected. */
  lazyMount?: boolean;
  /** Unmount a panel's content when its tab is no longer selected. */
  unmountOnExit?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A set of panels shown one at a time, switched by a row (or column) of
 * triggers — built on Ark UI's tabs state machine for arrow-key navigation,
 * focus management, and ARIA. Uses Ark's default `automatic` activation
 * mode: arrow-key focus immediately activates the tab, matching the
 * near-universal convention (Radix, Chakra, native OS tab strips).
 *
 * @param variant - `underline` (default), a bottom-border strip for content
 * navigation, or `segmented`, a filled pill track for a self-contained
 * option group (Carbon's Tabs vs. Content Switcher distinction).
 * @param orientation - `"horizontal"` (default) or `"vertical"` — also sets
 * the arrow-key axis, not just layout.
 * @param lazyMount - Skip mounting a panel until its tab is first selected.
 * @param unmountOnExit - Unmount a panel once its tab is no longer selected.
 *
 * @example
 * <Tabs defaultValue="account">
 *   <Tabs.List>
 *     <Tabs.Trigger value="account">Account</Tabs.Trigger>
 *     <Tabs.Trigger value="password">Password</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Content value="account">Account settings</Tabs.Content>
 *   <Tabs.Content value="password">Password settings</Tabs.Content>
 * </Tabs>
 */
function Tabs({
  variant = "underline",
  size = "md",
  orientation = "horizontal",
  value,
  defaultValue,
  onValueChange,
  lazyMount,
  unmountOnExit,
  className,
  children,
  ref,
  ...props
}: TabsProps) {
  return (
    <ArkTabs.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      orientation={orientation}
      lazyMount={lazyMount}
      unmountOnExit={unmountOnExit}
      ref={ref}
      className={cn(
        "flex gap-stack-sm data-[orientation=horizontal]:flex-col data-[orientation=vertical]:flex-row",
        className,
      )}
      {...props}
    >
      <TabsVariantSizeContext.Provider value={{ variant, size }}>
        {children}
      </TabsVariantSizeContext.Provider>
    </ArkTabs.Root>
  );
}

interface TabsListProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement>;
}

/** The row (or column) of `Tabs.Trigger`s, with a shared sliding indicator behind the active one. */
function TabsList({ className, children, ref, ...props }: TabsListProps) {
  const { variant } = useContext(TabsVariantSizeContext);
  return (
    <ArkTabs.List ref={ref} className={cn(listVariants({ variant }), className)} {...props}>
      {children}
      <ArkTabs.Indicator className={indicatorVariants({ variant })} />
    </ArkTabs.List>
  );
}

interface TabsTriggerProps extends Omit<ComponentPropsWithoutRef<"button">, "value"> {
  value: string;
  disabled?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

/** A single tab within a `Tabs.List`. */
function TabsTrigger({ value, disabled, className, children, ref, ...props }: TabsTriggerProps) {
  const { variant, size } = useContext(TabsVariantSizeContext);
  return (
    <ArkTabs.Trigger
      value={value}
      disabled={disabled}
      ref={ref}
      className={cn(triggerVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </ArkTabs.Trigger>
  );
}

interface TabsContentProps extends Omit<ComponentPropsWithoutRef<"div">, "value"> {
  value: string;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/** The panel shown when its matching `Tabs.Trigger` is active. */
function TabsContent({ value, className, children, ref, ...props }: TabsContentProps) {
  return (
    <ArkTabs.Content value={value} ref={ref} className={cn("pt-stack-sm", className)} {...props}>
      {children}
    </ArkTabs.Content>
  );
}

const TabsWithParts = Object.assign(Tabs, {
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
});

export { TabsWithParts as Tabs };
