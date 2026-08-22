import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import {
  arrow as arrowMiddleware,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type Placement,
} from "@floating-ui/dom";

export interface FloatingRect {
  x: number;
  y: number;
  /** Set only when `matchAnchorWidth` is on — omitted lets content size itself. */
  width?: number;
  /** The placement actually used once `flip()` has resolved it — may differ from the requested `placement`. */
  placement: Placement;
}

/** A side of the floating content the arrow is attached to (the first segment of a resolved `Placement`, e.g. `"top"` for `"top-start"`). */
export type FloatingArrowSide = "top" | "right" | "bottom" | "left";

export interface FloatingArrow {
  /** Cross-axis offset (px) along the content's edge — `x` for a top/bottom side, `y` for a left/right side. The other axis is `undefined`. */
  x?: number;
  y?: number;
  side: FloatingArrowSide;
}

interface UseFloatingPositionOptions {
  placement?: Placement;
  /** Match the popover's width to the anchor's (Select's listbox). Off by default (Menu sizes to content). */
  matchAnchorWidth?: boolean;
  offset?: number;
  /** When provided, runs floating-ui's `arrow` middleware against this element and returns its position via the `arrow` return value. */
  arrowRef?: RefObject<HTMLElement | null>;
}

/**
 * Positions a portaled popover against an anchor using floating-ui
 * directly, bypassing Ark's built-in `@zag-js/popper` wiring: its placement
 * effect does not fire under this project's React 19 + Vite setup, leaving
 * `--x`/`--y` unset and the popover pinned at the viewport origin. Affects
 * both `@ark-ui/react/select` and `@ark-ui/react/menu`. `computePosition`
 * works correctly when called directly, so this recreates just enough of
 * the built-in behavior (default bottom-start, flip, viewport shift) by
 * hand.
 *
 * @param open - Whether the popover is open; positioning is only computed
 * while true, and clears when false.
 * @param anchorRef - Ref to the element the popover is positioned against.
 * @param options - See {@link UseFloatingPositionOptions}.
 * @returns `positionerRef` to attach to the popover element, plus the
 * computed `rect` and `arrow` position (both `null` until the first
 * measurement resolves).
 */
export function useFloatingPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  {
    placement = "bottom-start",
    matchAnchorWidth = false,
    offset: gap = 4,
    arrowRef,
  }: UseFloatingPositionOptions = {},
) {
  const positionerRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<FloatingRect | null>(null);
  const [arrow, setArrow] = useState<FloatingArrow | null>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    const positioner = positionerRef.current;
    if (!open || !anchor || !positioner) {
      setRect(null);
      setArrow(null);
      return;
    }

    function measure() {
      const arrowEl = arrowRef?.current;
      // `anchor`/`positioner` are non-null here — narrowed by the early
      // return above and stable for the life of this effect (both come
      // from refs captured before this closure runs).
      computePosition(anchor!, positioner!, {
        placement,
        middleware: [
          offset(gap),
          flip(),
          shift({ padding: 8 }),
          ...(arrowEl ? [arrowMiddleware({ element: arrowEl })] : []),
        ],
      }).then(({ x, y, placement: resolvedPlacement, middlewareData }) => {
        setRect(
          matchAnchorWidth
            ? { x, y, width: anchor!.offsetWidth, placement: resolvedPlacement }
            : { x, y, placement: resolvedPlacement },
        );
        const side = resolvedPlacement.split("-")[0] as FloatingArrowSide;
        setArrow(
          middlewareData.arrow
            ? { x: middlewareData.arrow.x, y: middlewareData.arrow.y, side }
            : null,
        );
      });
    }

    // Deferred by one `requestAnimationFrame`: measuring on the same tick
    // the positioner first mounts can catch the floating element mid-layout
    // (its wrapped text hasn't settled into its final box yet), so `flip()`
    // picks a side based on a not-yet-accurate size. `autoUpdate`'s own
    // ResizeObserver then notices the real size a moment later and
    // corrects, producing a one-frame visible jump. Waiting a frame first
    // lets the initial layout settle before `computePosition` ever runs, so
    // it gets the real size on its first try.
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      cleanup = autoUpdate(anchor, positioner, measure);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, [open, anchorRef, placement, matchAnchorWidth, gap, arrowRef]);

  return { positionerRef, rect, arrow };
}

/**
 * Absolute-position inline style for a `useFloatingPosition` rect — parked
 * off-screen (not `visibility: hidden`) until the first `computePosition`
 * resolves. Off-screen rather than hidden is deliberate: a real user never
 * sees it either way, but `visibility: hidden` also removes it (and its
 * contents) from the accessibility tree, which `@testing-library`'s
 * `getByRole`/`findByRole` respect — tests that open a popover and
 * immediately query its contents shouldn't have to know it briefly renders
 * off-screen for one frame first.
 *
 * `transform: "none"` is deliberate: Ark's factory components merge our
 * `style` prop with their own baseline style key-by-key rather than
 * replacing it, and that baseline includes
 * `transform: translate3d(var(--x), var(--y), 0)` from its own (bypassed,
 * but not fully inert) popper wiring. For Select those `--x`/`--y` custom
 * properties stay unset so the leftover transform is harmless, but Menu's
 * popper machinery does compute real values for them — which then silently
 * double-applies on top of our own `left`/`top`, offsetting the popover
 * well past its intended position. Explicitly overriding `transform`
 * neutralizes that regardless of whether a given component's own popper
 * happens to compute something or not.
 *
 * @param rect - The current rect from `useFloatingPosition`, or `null`
 * before the first measurement resolves.
 * @returns Inline style for the positioner element.
 */
export function floatingPositionerStyle(rect: FloatingRect | null): CSSProperties {
  if (!rect) return { position: "fixed", left: "-9999px", top: "-9999px", transform: "none" };
  return { position: "absolute", left: rect.x, top: rect.y, width: rect.width, transform: "none" };
}

const ARROW_STATIC_SIDE: Record<FloatingArrowSide, keyof CSSProperties> = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right",
};

/**
 * Inline style for an arrow element inside a `useFloatingPosition`
 * positioner — floating-ui's `arrow` middleware only computes the arrow's
 * offset along the content's edge, not the anchor sticking it to that edge
 * (the standard Radix/Floating-UI-docs recipe: a small square, same fill
 * as the content, rotated 45° and straddling the content's edge by half
 * its own size — offset by `-size / 2` on the *static* side, the one
 * opposite `side`).
 *
 * @param arrow - The current arrow data from `useFloatingPosition`, or
 * `null` to hide the arrow (e.g. before the first measurement resolves).
 * @param size - The arrow's rendered width/height in px. Must match
 * whatever size class the arrow element itself uses.
 * @returns Inline style for the arrow element.
 */
export function floatingArrowStyle(arrow: FloatingArrow | null, size = 8): CSSProperties {
  if (!arrow) return { visibility: "hidden" };
  const staticSide = ARROW_STATIC_SIDE[arrow.side];
  return {
    position: "absolute",
    left: arrow.x !== undefined ? `${arrow.x}px` : undefined,
    top: arrow.y !== undefined ? `${arrow.y}px` : undefined,
    [staticSide]: `${-size / 2}px`,
  };
}
