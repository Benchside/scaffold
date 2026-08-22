import { createContext, useContext, useRef } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref, RefObject } from "react";
import { Portal, Tooltip as ArkTooltip } from "@ark-ui/react";
import { cn } from "../../lib/cn";
import {
  floatingArrowStyle,
  floatingPositionerStyle,
  useFloatingPosition,
} from "../../lib/floating";

interface TooltipProps {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Delay before showing on hover, in ms. Not applied to focus, which opens immediately. @default 300 */
  openDelay?: number;
  /** Delay before hiding once the pointer leaves, in ms. @default 150 */
  closeDelay?: number;
  /**
   * Keeps the tooltip open while the pointer is over its own content, not
   * just the trigger — WCAG 1.4.13 (Content on Hover or Focus) requires
   * this for any tooltip whose content itself needs to be hoverable
   * (e.g. to select its text). Off by default: most tooltips are short
   * enough that hoverable content isn't needed.
   */
  interactive?: boolean;
  /** Prevents the tooltip from opening at all, regardless of hover or focus. */
  disabled?: boolean;
}

/**
 * Shared by `Trigger` (which writes it) and `Content` (which reads it) so
 * the popover can position itself against the trigger's DOM node.
 */
const TooltipAnchorContext = createContext<RefObject<HTMLElement | null> | null>(null);

/**
 * A short, non-interactive text hint shown on hover or focus — built on
 * Ark UI's tooltip state machine for delay timing, focus/blur/Escape
 * handling, and ARIA (`role="tooltip"`, `aria-describedby`). Positioned
 * with `lib/floating.ts` directly rather than Ark's built-in popper
 * wiring — see that file for why. `Content` always renders a pointer arrow
 * toward the trigger — there's no reason a given tooltip would want one
 * but not the other, so it isn't a separate opt-in part.
 *
 * @example
 * <Tooltip>
 *   <Tooltip.Trigger>
 *     <InfoIcon />
 *   </Tooltip.Trigger>
 *   <Tooltip.Content>Runs must be calibrated first.</Tooltip.Content>
 * </Tooltip>
 */
function Tooltip({
  children,
  open,
  defaultOpen,
  onOpenChange,
  openDelay = 300,
  closeDelay = 150,
  interactive = false,
  disabled = false,
}: TooltipProps) {
  const anchorRef = useRef<HTMLElement | null>(null);
  return (
    <ArkTooltip.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(details) => onOpenChange?.(details.open)}
      openDelay={openDelay}
      closeDelay={closeDelay}
      interactive={interactive}
      disabled={disabled}
    >
      <TooltipAnchorContext.Provider value={anchorRef}>{children}</TooltipAnchorContext.Provider>
    </ArkTooltip.Root>
  );
}

interface TooltipTriggerProps extends Omit<ComponentPropsWithoutRef<"button">, "value"> {
  /** Render as the child element instead of a `<button>` — for a tooltip on a control that already renders its own interactive element (e.g. a disabled `Button`). */
  asChild?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/** The element that shows the tooltip on hover or focus. */
function TooltipTrigger({ ref, ...props }: TooltipTriggerProps) {
  const anchorRef = useContext(TooltipAnchorContext);
  return (
    <ArkTooltip.Trigger
      ref={(el) => {
        if (anchorRef) anchorRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      {...props}
    />
  );
}

interface TooltipContentProps {
  className?: string;
  children?: ReactNode;
}

/** The portaled bubble holding the tooltip's text. */
function TooltipContent({ className, children }: TooltipContentProps) {
  const anchorRef = useContext(TooltipAnchorContext);
  if (!anchorRef) throw new Error("Tooltip.Content must be rendered inside Tooltip");
  return (
    <ArkTooltip.Context>
      {(api) => (
        <TooltipContentPopover open={api.open} anchorRef={anchorRef} className={className}>
          {children}
        </TooltipContentPopover>
      )}
    </ArkTooltip.Context>
  );
}

interface TooltipContentPopoverProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  className?: string;
  children?: ReactNode;
}

/** Positions the portaled bubble against the shared anchor with floating-ui directly — see `lib/floating.ts` for why. */
function TooltipContentPopover({
  open,
  anchorRef,
  className,
  children,
}: TooltipContentPopoverProps) {
  const arrowRef = useRef<HTMLDivElement>(null);
  const { positionerRef, rect, arrow } = useFloatingPosition(open, anchorRef, {
    placement: "top",
    arrowRef,
    // Wider than the library default so the arrow has room to sit visibly
    // between the trigger and the content box instead of overlapping either.
    offset: 8,
  });
  return (
    <Portal>
      <ArkTooltip.Positioner
        ref={positionerRef}
        className="z-50"
        style={floatingPositionerStyle(rect)}
      >
        <ArkTooltip.Content
          className={cn(
            "max-w-64 shadow-lg rounded-md bg-bg-inverse px-inset-sm py-inset-xs text-caption text-text-inverse",
            className,
          )}
        >
          {children}
          <div
            ref={arrowRef}
            style={floatingArrowStyle(arrow)}
            className="size-2 rotate-45 bg-bg-inverse"
          />
        </ArkTooltip.Content>
      </ArkTooltip.Positioner>
    </Portal>
  );
}

const TooltipWithParts = Object.assign(Tooltip, {
  Trigger: TooltipTrigger,
  Content: TooltipContent,
});

export { TooltipWithParts as Tooltip };
