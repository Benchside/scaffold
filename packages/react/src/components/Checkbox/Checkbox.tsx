import { useLayoutEffect, useRef, type MouseEventHandler, type Ref } from "react";
import { Checkbox as ArkCheckbox, type CheckboxCheckedChangeDetails } from "@ark-ui/react";
import { cva } from "class-variance-authority";
import { Check, Minus } from "lucide-react";
import { cn } from "../../lib/cn";
import {
  FieldFooter,
  FIELD_LABEL_TEXT_CLASSES,
  mergeRefs,
  useFieldIds,
  type FieldSize,
} from "../../lib/field";

/**
 * Steps through the primitive `--font-size-*` scale directly rather than
 * reusing `FIELD_LABEL_TEXT_CLASSES`: that scale collapses xs/sm and md/lg
 * into shared text sizes for label typography, which would render the box
 * identically at two adjacent sizes. `Input` avoids the same collapse via
 * its padding scale; the box has no padding to fall back on, so it uses all
 * five primitive sizes directly.
 */
const BOX_SIZE_CLASSES = {
  xs: "size-(--font-size-xs)",
  sm: "size-(--font-size-sm)",
  md: "size-(--font-size-base)",
  lg: "size-(--font-size-lg)",
  xl: "size-(--font-size-xl)",
} as const;

const controlVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-sm border text-text-inverse transition-colors duration-100 data-disabled:opacity-50 data-focus-visible:outline-2 data-focus-visible:outline-border-focus data-focus-visible:outline-offset-2",
  {
    variants: { size: BOX_SIZE_CLASSES },
    defaultVariants: { size: "md" },
  },
);

interface CheckboxProps {
  /** Associated via native label-wraps-input — no separate htmlFor/id needed. */
  label: string;
  /** Keeps `label` for assistive tech but visually hides it — a checkbox in a grid cell or toolbar whose meaning is already conveyed by its position (e.g. a row-selection column). */
  hideLabel?: boolean;
  /** Helper text below the row. Hidden automatically when `error` is set. */
  hint?: string;
  /** Error message below the row, replacing `hint`. Sets `aria-invalid` and the box's error border. */
  error?: string;
  size?: FieldSize;
  /**
   * Forces the indeterminate visual (dash icon, native `indeterminate` DOM
   * property) regardless of `checked`/`defaultChecked` — for "select all"
   * rows where indeterminacy is derived from a separate selection count
   * rather than being a checked value in its own right.
   */
  indeterminate?: boolean;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (details: CheckboxCheckedChangeDetails) => void;
  /**
   * Forwarded straight to the native input, ahead of Ark's own handling —
   * for callers that need the raw click event itself (e.g. reading
   * `event.shiftKey` for a range-select gesture), which `onCheckedChange`'s
   * `{ checked }` detail doesn't carry.
   */
  onClick?: MouseEventHandler<HTMLInputElement>;
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
 * A complete checkbox field: the control, its inline label, and optional
 * hint or error text below — built on Ark UI's checkbox state machine for
 * keyboard toggling, focus management, and ARIA.
 *
 * @param size - `xs` through `xl` (default `md`) — matches `Input`'s scale.
 * @param indeterminate - Forces the dash/mixed visual independent of `checked`.
 * @param error - Replaces `hint` and sets `aria-invalid` when present.
 *
 * @example
 * <Checkbox label="Select all" checked={allSelected} indeterminate={someSelected} onCheckedChange={...} />
 */
function Checkbox({
  label,
  hideLabel = false,
  hint,
  error,
  size = "md",
  indeterminate = false,
  checked,
  defaultChecked,
  onCheckedChange,
  onClick,
  disabled = false,
  required = false,
  readOnly,
  name,
  value,
  id,
  className,
  ref,
}: CheckboxProps) {
  const { hintId, errorId, describedBy } = useFieldIds({
    hasDescription: false,
    hasError: Boolean(error),
    hasHint: Boolean(hint),
  });

  // Ark only syncs the native `indeterminate` DOM property (there's no HTML
  // attribute for it) via an effect on *updates*, not on initial mount — a
  // checkbox that mounts already indeterminate (e.g. "select all" with a
  // partial selection already present) would render as plain unchecked to
  // assistive tech until some other state change. Set it ourselves.
  const indeterminateInputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (indeterminateInputRef.current) {
      indeterminateInputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <div className="flex flex-col gap-stack-xs">
      <ArkCheckbox.Root
        checked={checked !== undefined ? (indeterminate ? "indeterminate" : checked) : undefined}
        defaultChecked={
          checked === undefined ? (indeterminate ? "indeterminate" : defaultChecked) : undefined
        }
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        required={required}
        readOnly={readOnly}
        invalid={Boolean(error)}
        name={name}
        value={value}
        className="inline-flex cursor-pointer items-center gap-inline-xs data-disabled:cursor-not-allowed"
      >
        <ArkCheckbox.Context>
          {(api) => (
            <ArkCheckbox.Control
              className={cn(
                controlVariants({ size }),
                api.checkedState !== false
                  ? "border-accent bg-accent"
                  : "border-border bg-bg-elevated",
                error && "border-status-error",
                className,
              )}
            >
              <ArkCheckbox.Indicator>
                <Check className="size-full" aria-hidden="true" />
              </ArkCheckbox.Indicator>
              <ArkCheckbox.Indicator indeterminate>
                <Minus className="size-full" aria-hidden="true" />
              </ArkCheckbox.Indicator>
            </ArkCheckbox.Control>
          )}
        </ArkCheckbox.Context>
        <ArkCheckbox.HiddenInput
          ref={mergeRefs(ref, indeterminateInputRef)}
          id={id}
          aria-describedby={describedBy}
          onClick={onClick}
        />
        <ArkCheckbox.Label className={cn(FIELD_LABEL_TEXT_CLASSES[size], hideLabel && "sr-only")}>
          {label}
          {required && (
            <span aria-hidden="true" className="text-status-error">
              *
            </span>
          )}
        </ArkCheckbox.Label>
      </ArkCheckbox.Root>
      <FieldFooter size={size} error={error} errorId={errorId} hint={hint} hintId={hintId} />
    </div>
  );
}

export { Checkbox };
