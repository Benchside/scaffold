import { createContext, useContext } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { RadioGroup as ArkRadioGroup, type RadioGroupValueChangeDetails } from "@ark-ui/react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/cn";
import {
  FieldFooter,
  FIELD_LABEL_TEXT_CLASSES,
  FIELD_SUB_TEXT_CLASSES,
  useFieldIds,
  type FieldSize,
} from "../../lib/field";

/**
 * Same primitive `--font-size-*` step scale as `Checkbox`'s box — kept
 * identical across the two Ark-based selection controls so they read as one
 * visual language, not two.
 */
const ITEM_SIZE_CLASSES = {
  xs: "size-(--font-size-xs)",
  sm: "size-(--font-size-sm)",
  md: "size-(--font-size-base)",
  lg: "size-(--font-size-lg)",
  xl: "size-(--font-size-xl)",
} as const;

const controlVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full border transition-colors duration-100 data-disabled:opacity-50 data-focus-visible:outline-2 data-focus-visible:outline-border-focus data-focus-visible:outline-offset-2",
  {
    variants: { size: ITEM_SIZE_CLASSES },
    defaultVariants: { size: "md" },
  },
);

const RadioGroupSizeContext = createContext<FieldSize>("md");

interface RadioGroupProps extends Omit<
  ComponentPropsWithoutRef<"fieldset">,
  "onChange" | "value" | "defaultValue"
> {
  /** Rendered as a native `<legend>` inside the group's `<fieldset>`. */
  label?: string;
  /** A longer explanatory line between the label and the options. */
  description?: string;
  /** Helper text below the options. Hidden automatically when `error` is set. */
  hint?: string;
  /** Error message below the options, replacing `hint`. Sets `aria-invalid` on the group and each item's error border. */
  error?: string;
  size?: FieldSize;
  /** Arrow-key direction and item layout. Defaults to `"vertical"`. */
  orientation?: "horizontal" | "vertical";
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (details: RadioGroupValueChangeDetails) => void;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  name?: string;
  children?: ReactNode;
  ref?: Ref<HTMLFieldSetElement>;
}

/**
 * A set of mutually-exclusive options, built on Ark UI's radio-group state
 * machine for arrow-key navigation and focus management. Renders as a real
 * `<fieldset>`/`<legend>` (not an ARIA-only `<div>`) — Ark's own `Root`/
 * `Label` default to `div`/`span`, so this uses their `asChild` escape
 * hatch to render the native elements instead while keeping Ark's wiring.
 * `<legend>`'s content model only allows phrasing content, so unlike
 * `Input`/`Checkbox` this doesn't reuse `FieldHeader` for the label —
 * `description` renders as a plain paragraph after the legend instead.
 *
 * @param size - `xs` through `xl` (default `md`) — matches `Checkbox`'s scale.
 * @param orientation - `"vertical"` (default) or `"horizontal"` — also sets
 * the arrow-key axis, not just layout.
 * @param error - Replaces `hint` and sets `aria-invalid` on the group.
 *
 * @example
 * <RadioGroup label="Plan" value={plan} onValueChange={({ value }) => setPlan(value)}>
 *   <RadioGroup.Item value="free">Free</RadioGroup.Item>
 *   <RadioGroup.Item value="pro">Pro</RadioGroup.Item>
 * </RadioGroup>
 */
function RadioGroup({
  label,
  description,
  hint,
  error,
  size = "md",
  orientation = "vertical",
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  required = false,
  readOnly,
  name,
  id,
  className,
  children,
  ref,
  ...props
}: RadioGroupProps) {
  const { fieldId, descriptionId, hintId, errorId, describedBy } = useFieldIds({
    id,
    hasDescription: Boolean(description),
    hasError: Boolean(error),
    hasHint: Boolean(hint),
  });

  return (
    <ArkRadioGroup.Root
      id={fieldId}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      required={required}
      readOnly={readOnly}
      invalid={Boolean(error)}
      orientation={orientation}
      name={name}
      asChild
    >
      <fieldset
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        className={cn("m-0 p-0 flex flex-col gap-stack-xs border-0", className)}
        {...props}
      >
        {label && (
          <ArkRadioGroup.Label asChild>
            <legend className={FIELD_LABEL_TEXT_CLASSES[size]}>
              {label}
              {required && (
                <span aria-hidden="true" className="text-status-error">
                  *
                </span>
              )}
            </legend>
          </ArkRadioGroup.Label>
        )}
        {description && (
          <p id={descriptionId} className={cn(FIELD_SUB_TEXT_CLASSES[size], "text-text-secondary")}>
            {description}
          </p>
        )}
        <RadioGroupSizeContext.Provider value={size}>
          <div
            className={cn(
              "flex gap-stack-xs",
              orientation === "horizontal" ? "flex-row gap-inline-md" : "flex-col",
            )}
          >
            {children}
          </div>
        </RadioGroupSizeContext.Provider>
        <FieldFooter size={size} error={error} errorId={errorId} hint={hint} hintId={hintId} />
      </fieldset>
    </ArkRadioGroup.Root>
  );
}

interface RadioGroupItemProps extends Omit<ComponentPropsWithoutRef<"label">, "value"> {
  value: string;
  disabled?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLLabelElement>;
}

/** A single mutually-exclusive option within a `RadioGroup`. */
function RadioGroupItem({
  value,
  disabled,
  className,
  children,
  ref,
  ...props
}: RadioGroupItemProps) {
  const size = useContext(RadioGroupSizeContext);
  return (
    <ArkRadioGroup.Item
      value={value}
      disabled={disabled}
      ref={ref}
      className={cn(
        "inline-flex cursor-pointer items-center gap-inline-xs data-disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    >
      <ArkRadioGroup.ItemContext>
        {(item) => (
          <>
            <ArkRadioGroup.ItemControl
              className={cn(
                controlVariants({ size }),
                item.checked ? "border-accent" : "border-border bg-bg-elevated",
                item.invalid && "border-status-error",
              )}
            >
              {item.checked && (
                <span className="size-1/2 rounded-full bg-accent" aria-hidden="true" />
              )}
            </ArkRadioGroup.ItemControl>
            <ArkRadioGroup.ItemHiddenInput />
            <ArkRadioGroup.ItemText className={FIELD_LABEL_TEXT_CLASSES[size]}>
              {children}
            </ArkRadioGroup.ItemText>
          </>
        )}
      </ArkRadioGroup.ItemContext>
    </ArkRadioGroup.Item>
  );
}

const RadioGroupWithItem = Object.assign(RadioGroup, { Item: RadioGroupItem });

export { RadioGroupWithItem as RadioGroup };
