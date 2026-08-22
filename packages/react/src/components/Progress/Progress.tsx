import { createContext, useContext } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { Progress as ArkProgress, type ProgressValueChangeDetails } from "@ark-ui/react";
import { cn } from "../../lib/cn";
import type { FieldSize } from "../../lib/field";

/**
 * Same primitive `--font-size-*` scale as `Checkbox`'s box and `Switch`'s
 * track, for one consistent size vocabulary across every sized control in
 * this repo.
 */
const TRACK_SIZE_CLASSES: Record<FieldSize, string> = {
  xs: "h-(--font-size-xs)",
  sm: "h-(--font-size-sm)",
  md: "h-(--font-size-base)",
  lg: "h-(--font-size-lg)",
  xl: "h-(--font-size-xl)",
};

/**
 * `--size`/`--thickness` custom properties, consumed by Ark's own circle
 * geometry math (radius/circumference/dash-offset — see
 * `@zag-js/progress`'s `getCircleProps`) rather than computed here.
 * `--size` is a `calc()` off the same `--font-size-*` step as the linear
 * track's height, scaled ×2.5 — the raw font-size values (12–20px) render
 * as barely-visible dots for a ring, since a circle needs real diameter to
 * read as a ring rather than a bar's diameter-independent thickness.
 * `--thickness` stays derived from `--size` (1/8th) rather than a second
 * hardcoded scale, matching how `Switch`'s thumb travel distance is a
 * `calc()` off its own size token instead of a parallel constant table.
 */
const CIRCLE_SIZE_CLASSES: Record<FieldSize, string> = {
  xs: "[--size:calc(var(--font-size-xs)*2.5)] [--thickness:calc(var(--size)/8)]",
  sm: "[--size:calc(var(--font-size-sm)*2.5)] [--thickness:calc(var(--size)/8)]",
  md: "[--size:calc(var(--font-size-base)*2.5)] [--thickness:calc(var(--size)/8)]",
  lg: "[--size:calc(var(--font-size-lg)*2.5)] [--thickness:calc(var(--size)/8)]",
  xl: "[--size:calc(var(--font-size-xl)*2.5)] [--thickness:calc(var(--size)/8)]",
};

const ProgressSizeContext = createContext<FieldSize>("md");

interface ProgressProps extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue"> {
  /** The controlled value. `null` means indeterminate. */
  value?: number | null;
  /** The initial value when uncontrolled. `null` means indeterminate. @default 50 */
  defaultValue?: number | null;
  /** @default 0 */
  min?: number;
  /** @default 100 */
  max?: number;
  /** Sizes `Progress.Track`'s height and `Progress.Circle`'s diameter. @default "md" */
  size?: FieldSize;
  onValueChange?: (details: ProgressValueChangeDetails) => void;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A linear or circular progress indicator — built on Ark UI's progress
 * state machine for value clamping, indeterminate detection, and
 * locale-aware percent formatting. Fully composable: render
 * `Progress.Track`/`Progress.Range` for a bar, `Progress.Circle`/
 * `Progress.CircleTrack`/`Progress.CircleRange` for a ring, or both under
 * the same value state.
 *
 * @param value - `null` renders the indeterminate state; omit both `value`
 * and `defaultValue` for Ark's own default (`50`).
 * @param size - `xs` through `xl` (default `md`) — matches `Checkbox`'s scale.
 *
 * @example
 * <Progress value={60}>
 *   <Progress.Label>Uploading</Progress.Label>
 *   <Progress.Track>
 *     <Progress.Range />
 *   </Progress.Track>
 *   <Progress.ValueText />
 * </Progress>
 */
function Progress({
  value,
  defaultValue,
  min,
  max,
  size = "md",
  onValueChange,
  className,
  children,
  ref,
  ...props
}: ProgressProps) {
  return (
    <ArkProgress.Root
      value={value}
      defaultValue={defaultValue}
      min={min}
      max={max}
      onValueChange={onValueChange}
      ref={ref}
      className={cn("flex flex-col gap-stack-2xs", className)}
      {...props}
    >
      <ProgressSizeContext.Provider value={size}>{children}</ProgressSizeContext.Provider>
    </ArkProgress.Root>
  );
}

interface ProgressLabelProps extends ComponentPropsWithoutRef<"span"> {
  ref?: Ref<HTMLSpanElement>;
}

/** The visible caption for a `Progress`. */
function ProgressLabel({ className, children, ref, ...props }: ProgressLabelProps) {
  return (
    <ArkProgress.Label ref={ref} className={cn("text-label text-text", className)} {...props}>
      {children}
    </ArkProgress.Label>
  );
}

interface ProgressTrackProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement>;
}

/** The linear bar's background track — wrap `Progress.Range` inside it. */
function ProgressTrack({ className, children, ref, ...props }: ProgressTrackProps) {
  const size = useContext(ProgressSizeContext);
  return (
    <ArkProgress.Track
      ref={ref}
      className={cn(
        "w-full overflow-hidden rounded-full bg-bg-subtle",
        TRACK_SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {children}
    </ArkProgress.Track>
  );
}

interface ProgressRangeProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement>;
}

/** The linear bar's filled portion — Ark sizes its width from the value. */
function ProgressRange({ className, ref, ...props }: ProgressRangeProps) {
  return (
    <ArkProgress.Range
      ref={ref}
      className={cn(
        "data-[state=indeterminate]:animate-pulse h-full rounded-full bg-accent transition-[width] duration-150 data-[state=indeterminate]:w-1/3",
        className,
      )}
      {...props}
    />
  );
}

interface ProgressValueTextProps extends ComponentPropsWithoutRef<"span"> {
  ref?: Ref<HTMLSpanElement>;
}

/**
 * The formatted value (default: locale percent) — announced politely on
 * change. Uses the `text-data` semantic token (tabular-nums, not a
 * monospace font swap) so digit width stays fixed as the value changes,
 * matching `DataTable`'s numeric cells — the established precedent for
 * numeric-readout typography in this repo.
 */
function ProgressValueText({ className, ref, ...props }: ProgressValueTextProps) {
  return (
    <ArkProgress.ValueText
      ref={ref}
      className={cn("text-data text-text-secondary", className)}
      {...props}
    />
  );
}

interface ProgressCircleProps extends ComponentPropsWithoutRef<"svg"> {
  ref?: Ref<SVGSVGElement>;
}

/** The circular ring's `<svg>` wrapper — wrap `Progress.CircleTrack`/`Progress.CircleRange` inside it. */
function ProgressCircle({ className, children, ref, ...props }: ProgressCircleProps) {
  const size = useContext(ProgressSizeContext);
  return (
    <ArkProgress.Circle ref={ref} className={cn(CIRCLE_SIZE_CLASSES[size], className)} {...props}>
      {children}
    </ArkProgress.Circle>
  );
}

interface ProgressCircleTrackProps extends ComponentPropsWithoutRef<"circle"> {
  ref?: Ref<SVGCircleElement>;
}

/** The circular ring's background track. */
function ProgressCircleTrack({ className, ref, ...props }: ProgressCircleTrackProps) {
  return (
    <ArkProgress.CircleTrack ref={ref} className={cn("stroke-bg-subtle", className)} {...props} />
  );
}

interface ProgressCircleRangeProps extends ComponentPropsWithoutRef<"circle"> {
  ref?: Ref<SVGCircleElement>;
}

/** The circular ring's filled arc — Ark computes its dash offset from the value. */
function ProgressCircleRange({ className, ref, ...props }: ProgressCircleRangeProps) {
  return (
    <ArkProgress.CircleRange
      ref={ref}
      className={cn(
        "data-[state=indeterminate]:animate-spin stroke-accent transition-[stroke-dashoffset] duration-150",
        className,
      )}
      {...props}
    />
  );
}

const ProgressWithParts = Object.assign(Progress, {
  Label: ProgressLabel,
  Track: ProgressTrack,
  Range: ProgressRange,
  ValueText: ProgressValueText,
  Circle: ProgressCircle,
  CircleTrack: ProgressCircleTrack,
  CircleRange: ProgressCircleRange,
});

export { ProgressWithParts as Progress };
