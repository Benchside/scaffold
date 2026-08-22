import type { Ref } from "react";
import { Switch as ArkSwitch, type SwitchCheckedChangeDetails } from "@ark-ui/react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/cn";
import {
  FieldFooter,
  FIELD_LABEL_TEXT_CLASSES,
  useFieldIds,
  type FieldSize,
} from "../../lib/field";

/**
 * Track height reads the same primitive `--font-size-*` step as
 * `Checkbox`'s box and `RadioGroup`'s control, for one consistent scale
 * across every Ark-based selection control. Width follows from a fixed
 * aspect ratio (a pill shape's own geometry, not a token) rather than a
 * second hardcoded size step.
 */
const TRACK_SIZE_CLASSES = {
  xs: "h-(--font-size-xs)",
  sm: "h-(--font-size-sm)",
  md: "h-(--font-size-base)",
  lg: "h-(--font-size-lg)",
  xl: "h-(--font-size-xl)",
} as const;

/**
 * Distance the thumb slides so it ends up flush against the track's far
 * edge, matching its unchecked-side gap exactly. `translate-x-full` (100%
 * of the thumb's own width) only matches this distance at one specific
 * track height, since the thumb is square (sized to the track's
 * content-box height) while the actual travel is `trackWidth - trackHeight`
 * (border-box, so padding cancels out of both terms). At this track's fixed
 * 7/4 aspect ratio, `trackWidth - trackHeight` reduces to `trackHeight *
 * 0.75` — hence the `* 0.75` scale on each size's height token below.
 */
const THUMB_TRANSLATE_CLASSES = {
  xs: "translate-x-[calc(var(--font-size-xs)*0.75)]",
  sm: "translate-x-[calc(var(--font-size-sm)*0.75)]",
  md: "translate-x-[calc(var(--font-size-base)*0.75)]",
  lg: "translate-x-[calc(var(--font-size-lg)*0.75)]",
  xl: "translate-x-[calc(var(--font-size-xl)*0.75)]",
} as const;

const trackVariants = cva(
  "inline-flex aspect-7/4 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-100 data-disabled:opacity-50 data-focus-visible:outline-2 data-focus-visible:outline-border-focus data-focus-visible:outline-offset-2",
  {
    variants: { size: TRACK_SIZE_CLASSES },
    defaultVariants: { size: "md" },
  },
);

interface SwitchProps {
  /** Associated via native label-wraps-input — no separate htmlFor/id needed. */
  label: string;
  /** Helper text below the row. Hidden automatically when `error` is set. */
  hint?: string;
  /** Error message below the row, replacing `hint`. Sets `aria-invalid` and the track's error border. */
  error?: string;
  size?: FieldSize;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (details: SwitchCheckedChangeDetails) => void;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  name?: string;
  value?: string;
  id?: string;
  className?: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * An on/off toggle: track, sliding thumb, inline label, and optional hint or
 * error text below — built on Ark UI's switch state machine for keyboard
 * toggling, focus management, and ARIA. Track/thumb color and thumb
 * position are computed from `Switch.Context`'s `checked` value in JS
 * rather than a `data-[state=checked]:` CSS selector, matching `Checkbox`
 * and `RadioGroup` — this avoids Tailwind cascade-layer ordering deciding
 * the wrong winner when `checked` and `error` styling could otherwise
 * compete for the same class group.
 *
 * @param size - `xs` through `xl` (default `md`) — matches `Checkbox`'s scale.
 * @param error - Replaces `hint` and sets `aria-invalid` when present.
 *
 * @example
 * <Switch label="Enable notifications" checked={enabled} onCheckedChange={...} />
 */
function Switch({
  label,
  hint,
  error,
  size = "md",
  checked,
  defaultChecked,
  onCheckedChange,
  disabled = false,
  required = false,
  readOnly,
  name,
  value,
  id,
  className,
  ref,
}: SwitchProps) {
  const { hintId, errorId, describedBy } = useFieldIds({
    hasDescription: false,
    hasError: Boolean(error),
    hasHint: Boolean(hint),
  });

  return (
    <div className="flex flex-col gap-stack-xs">
      <ArkSwitch.Root
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        required={required}
        readOnly={readOnly}
        invalid={Boolean(error)}
        name={name}
        value={value}
        className="inline-flex cursor-pointer items-center gap-inline-xs data-disabled:cursor-not-allowed"
      >
        <ArkSwitch.Context>
          {(api) => (
            <ArkSwitch.Control
              className={cn(
                trackVariants({ size }),
                api.checked ? "border-accent bg-accent" : "border-border bg-bg-subtle",
                error && "border-status-error",
                className,
              )}
            >
              <ArkSwitch.Thumb
                className={cn(
                  "aspect-square h-full rounded-full bg-bg-elevated transition-transform duration-150",
                  api.checked ? THUMB_TRANSLATE_CLASSES[size] : "translate-x-0",
                )}
              />
            </ArkSwitch.Control>
          )}
        </ArkSwitch.Context>
        <ArkSwitch.HiddenInput ref={ref} id={id} aria-describedby={describedBy} />
        <ArkSwitch.Label className={FIELD_LABEL_TEXT_CLASSES[size]}>
          {label}
          {required && (
            <span aria-hidden="true" className="text-status-error">
              *
            </span>
          )}
        </ArkSwitch.Label>
      </ArkSwitch.Root>
      <FieldFooter size={size} error={error} errorId={errorId} hint={hint} hintId={hintId} />
    </div>
  );
}

export { Switch };
