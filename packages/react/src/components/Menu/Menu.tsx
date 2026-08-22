import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import {
  Menu as ArkMenu,
  Portal,
  type MenuOpenChangeDetails,
  type MenuSelectionDetails,
} from "@ark-ui/react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/cn";
import { floatingPositionerStyle, useFloatingPosition } from "../../lib/floating";
import { mergeRefs } from "../../lib/field";

const triggerVariants = cva(
  "inline-flex cursor-pointer items-center gap-inline-xs rounded-md border border-border bg-bg-elevated px-inset-sm py-inset-xs text-label data-disabled:cursor-not-allowed data-disabled:opacity-50 data-focus-visible:outline-2 data-focus-visible:outline-border-focus data-focus-visible:outline-offset-2",
);

const itemVariants = cva(
  "flex cursor-pointer items-center gap-inline-xs rounded-sm px-inset-sm py-inset-xs data-highlighted:bg-accent-subtle data-disabled:cursor-not-allowed data-disabled:opacity-50",
  {
    variants: {
      destructive: {
        true: "text-status-error data-highlighted:bg-status-error-bg",
        false: "",
      },
    },
    defaultVariants: { destructive: false },
  },
);

/**
 * Shared by `Trigger`/`ContextTrigger` (which write it) and `Content`
 * (which reads it) so the popover can anchor to whichever one last opened
 * the menu — a button element, or a zero-size virtual element at the
 * right-click point.
 */
const MenuAnchorContext = createContext<RefObject<HTMLElement | null> | null>(null);

interface MenuProps {
  children?: ReactNode;
  /** Controls open state externally; omit to let the menu manage its own state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Fires with the selected item's `value` when an item is chosen. */
  onSelect?: (value: string) => void;
  /** Whether to close the menu when an item is selected. @default true */
  closeOnSelect?: boolean;
  "aria-label"?: string;
}

/**
 * An action list opened from a trigger button or a right-click, built on
 * Ark UI's menu state machine for arrow-key navigation, type-ahead, focus
 * management, and ARIA.
 *
 * @example
 * <Menu onSelect={(value) => runAction(value)}>
 *   <Menu.Trigger>Actions</Menu.Trigger>
 *   <Menu.Content>
 *     <Menu.Item value="rename" shortcut="⌘R">Rename</Menu.Item>
 *     <Menu.Separator />
 *     <Menu.Item value="delete" destructive>Delete</Menu.Item>
 *   </Menu.Content>
 * </Menu>
 */
function Menu({
  children,
  open,
  defaultOpen,
  onOpenChange,
  onSelect,
  closeOnSelect,
  "aria-label": ariaLabel,
}: MenuProps) {
  const anchorRef = useRef<HTMLElement | null>(null);
  const restoreFocusFrameRef = useRef<number | undefined>(undefined);
  // Marks a close caused by selecting an item, so the focus-restore
  // workaround below only runs for that case and not for Escape/outside
  // dismissal (which Ark already restores focus for correctly).
  const closedBySelectRef = useRef(false);

  useEffect(() => {
    return () => cancelAnimationFrame(restoreFocusFrameRef.current ?? -1);
  }, []);

  function handleOpenChange(details: MenuOpenChangeDetails) {
    onOpenChange?.(details.open);
    if (details.open || !closedBySelectRef.current) return;
    closedBySelectRef.current = false;
    // Ark restores focus to the trigger on Escape/outside-dismiss, but not
    // when the menu closes via item selection — focus is left stranded on
    // the now-hidden content element. Poll across a few animation frames,
    // since the number of ticks the close needs to settle isn't fixed.
    cancelAnimationFrame(restoreFocusFrameRef.current ?? -1);
    let attemptsLeft = 5;
    const attempt = () => {
      const anchor = anchorRef.current;
      const canFocus = typeof anchor?.focus === "function" && document.body.contains(anchor);
      if (canFocus && document.activeElement !== anchor) anchor.focus();
      attemptsLeft -= 1;
      if (attemptsLeft > 0) restoreFocusFrameRef.current = requestAnimationFrame(attempt);
    };
    restoreFocusFrameRef.current = requestAnimationFrame(attempt);
  }

  function handleSelect(details: MenuSelectionDetails) {
    closedBySelectRef.current = true;
    onSelect?.(details.value);
  }

  return (
    <ArkMenu.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={handleOpenChange}
      onSelect={handleSelect}
      closeOnSelect={closeOnSelect}
      aria-label={ariaLabel}
    >
      <MenuAnchorContext.Provider value={anchorRef}>{children}</MenuAnchorContext.Provider>
    </ArkMenu.Root>
  );
}

interface MenuTriggerProps extends Omit<ComponentPropsWithoutRef<"button">, "value"> {
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Opens the menu on click, positioned against this button.
 *
 * The anchor is set both on mount and on every click. Mount is required
 * because Zag's Enter/Space handling opens the menu directly without a
 * `click` event, which would leave an `onClick`-only anchor null; the
 * click handler re-syncs the anchor in case `ContextTrigger` set it to a
 * different target in between.
 */
function MenuTrigger({ children, className, onClick, ref, ...props }: MenuTriggerProps) {
  const anchorRef = useContext(MenuAnchorContext);
  return (
    <ArkMenu.Trigger
      ref={mergeRefs(ref, (el) => {
        if (anchorRef) anchorRef.current = el;
      })}
      onClick={(event) => {
        if (anchorRef) anchorRef.current = event.currentTarget;
        onClick?.(event);
      }}
      className={cn(triggerVariants(), className)}
      {...props}
    >
      {children}
    </ArkMenu.Trigger>
  );
}

interface MenuContextTriggerProps extends Omit<ComponentPropsWithoutRef<"button">, "value"> {
  /** Render as the child element instead of a `<button>` — for wrapping an arbitrary target (a table row, a card) in its context-menu area. */
  asChild?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/** Opens the menu on right-click, positioned at the pointer — for row/cell context menus in data tables. */
function MenuContextTrigger({
  children,
  className,
  onContextMenu,
  ref,
  ...props
}: MenuContextTriggerProps) {
  const anchorRef = useContext(MenuAnchorContext);
  return (
    <ArkMenu.ContextTrigger
      ref={ref}
      onContextMenu={(event) => {
        if (anchorRef) {
          const { clientX, clientY } = event;
          anchorRef.current = {
            getBoundingClientRect: () => new DOMRect(clientX, clientY, 0, 0),
          } as HTMLElement;
        }
        onContextMenu?.(event);
      }}
      className={className}
      {...props}
    >
      {children}
    </ArkMenu.ContextTrigger>
  );
}

interface MenuContentPopoverProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  className?: string;
  children?: ReactNode;
}

/** Positions the portaled popover against the shared anchor with floating-ui directly — see `lib/floating.ts` for why. */
function MenuContentPopover({ open, anchorRef, className, children }: MenuContentPopoverProps) {
  const { positionerRef, rect } = useFloatingPosition(open, anchorRef);
  return (
    <Portal>
      <ArkMenu.Positioner
        ref={positionerRef}
        className="z-50"
        style={floatingPositionerStyle(rect)}
      >
        <ArkMenu.Content
          className={cn(
            // `outline-none`: the ARIA menu pattern focuses the content
            // element (tabindex=0) on open, but keyboard nav is already
            // visible via each item's `data-highlighted` styling, so the
            // browser's default focus ring on the panel is redundant noise.
            "min-w-40 p-1 shadow-lg flex flex-col rounded-md border border-border bg-bg-elevated outline-none data-[state=closed]:animate-panel-out data-[state=open]:animate-panel-in",
            className,
          )}
        >
          {children}
        </ArkMenu.Content>
      </ArkMenu.Positioner>
    </Portal>
  );
}

interface MenuContentProps {
  className?: string;
  children?: ReactNode;
}

/** The portaled popover holding the menu's items, groups, and separators. */
function MenuContent({ className, children }: MenuContentProps) {
  const anchorRef = useContext(MenuAnchorContext);
  if (!anchorRef) throw new Error("Menu.Content must be rendered inside Menu");
  return (
    <ArkMenu.Context>
      {(api) => (
        <MenuContentPopover open={api.open} anchorRef={anchorRef} className={className}>
          {children}
        </MenuContentPopover>
      )}
    </ArkMenu.Context>
  );
}

interface MenuItemProps {
  value: string;
  disabled?: boolean;
  /** Renders left of the label; purely decorative (`aria-hidden`). */
  icon?: ReactNode;
  /** Right-aligned hint text (e.g. `"⌘R"`) — display only, doesn't wire the actual keybinding. */
  shortcut?: string;
  /** Marks a destructive action (e.g. delete) with the error tone. */
  destructive?: boolean;
  onSelect?: VoidFunction;
  className?: string;
  children?: ReactNode;
}

/** A single action within a `Menu.Content`. */
function MenuItem({
  value,
  disabled,
  icon,
  shortcut,
  destructive = false,
  onSelect,
  className,
  children,
}: MenuItemProps) {
  return (
    <ArkMenu.Item
      value={value}
      disabled={disabled}
      onSelect={onSelect}
      className={cn(itemVariants({ destructive }), className)}
    >
      {icon && (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      <ArkMenu.ItemText className="flex-1 truncate">{children}</ArkMenu.ItemText>
      {shortcut && (
        <span className="shrink-0 text-caption text-text-secondary" aria-hidden="true">
          {shortcut}
        </span>
      )}
    </ArkMenu.Item>
  );
}

interface MenuSeparatorProps {
  className?: string;
}

/** A visual divider between items or groups. */
function MenuSeparator({ className }: MenuSeparatorProps) {
  return <ArkMenu.Separator className={cn("my-1 border-border", className)} />;
}

interface MenuItemGroupProps {
  /** Rendered as the group's accessible label, wired via `aria-labelledby`. */
  label?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Groups related items under an optional label — for sectioning a longer
 * action list. `ItemGroup` generates its own id and hands it to
 * `ItemGroupLabel` via context, so no id wiring is needed here.
 */
function MenuItemGroup({ label, className, children }: MenuItemGroupProps) {
  return (
    <ArkMenu.ItemGroup className={cn("flex flex-col", className)}>
      {label && (
        <ArkMenu.ItemGroupLabel className="px-inset-sm py-inset-xs text-caption text-text-secondary">
          {label}
        </ArkMenu.ItemGroupLabel>
      )}
      {children}
    </ArkMenu.ItemGroup>
  );
}

const MenuWithParts = Object.assign(Menu, {
  Trigger: MenuTrigger,
  ContextTrigger: MenuContextTrigger,
  Content: MenuContent,
  Item: MenuItem,
  Separator: MenuSeparator,
  ItemGroup: MenuItemGroup,
});

export { MenuWithParts as Menu };
