import { useMemo, useRef, type ReactNode, type Ref, type RefObject } from "react";
import {
  Portal,
  Select as ArkSelect,
  createListCollection,
  type SelectValueChangeDetails,
} from "@ark-ui/react";
import { cva } from "class-variance-authority";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { floatingPositionerStyle, useFloatingPosition } from "../../lib/floating";
import {
  FieldFooter,
  FIELD_LABEL_TEXT_CLASSES,
  FIELD_SUB_TEXT_CLASSES,
  mergeRefs,
  useFieldIds,
  type FieldSize,
} from "../../lib/field";

const boxVariants = cva(
  // `has-focus-visible` (not Ark's own `data-focus`, which the state
  // machine sets on every focus regardless of input device) so a mouse
  // click into the field — including Ark's own focus-return to the
  // trigger after a click-to-select closes the popover — doesn't draw a
  // ring; only real keyboard-visible focus does. See the box's real focus
  // target, `Trigger`, not this wrapper: `:has()` reads the ring off that
  // descendant since the wrapper itself is never directly focused.
  "relative inline-flex items-center gap-inline-xs rounded-md border bg-bg-elevated has-focus-visible:outline-2 has-focus-visible:outline-border-focus has-focus-visible:outline-offset-2 data-disabled:cursor-not-allowed data-disabled:opacity-50",
  {
    variants: {
      size: {
        xs: "px-inset-sm py-inset-2xs text-caption font-caption tracking-caption",
        sm: "px-inset-sm py-inset-xs text-label font-label tracking-label",
        md: "px-inset-md py-inset-sm text-label font-label tracking-label",
        lg: "px-inset-md py-inset-md text-label-lg font-label-lg tracking-label-lg",
        xl: "px-inset-lg py-inset-lg text-label-lg font-label-lg tracking-label-lg",
      },
      error: {
        true: "border-status-error",
        false: "border-border",
      },
    },
    defaultVariants: { size: "md", error: false },
  },
);

const itemVariants = cva(
  "flex cursor-pointer items-center gap-inline-xs rounded-sm px-inset-sm py-inset-xs data-highlighted:bg-accent-subtle data-disabled:cursor-not-allowed data-disabled:opacity-50",
);

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface SelectProps {
  /** The options to render in the popover. */
  items: SelectOption[];
  /** Rendered via Ark's `Select.Label`, wired to the trigger through `aria-labelledby`. */
  label?: string;
  /** A longer explanatory line between the label and the trigger. */
  description?: string;
  /** Helper text below the trigger. Hidden automatically when `error` is set. */
  hint?: string;
  /** Error message below the trigger, replacing `hint`. Sets `aria-invalid` and the trigger's error border. */
  error?: string;
  size?: FieldSize;
  placeholder?: string;
  /**
   * Allows more than one item to be selected. Changes `value`/`defaultValue`/
   * `onValueChange` to arrays, disables closing the popover on select (so
   * multiple picks don't require reopening it each time), and swaps each
   * item's selected indicator for an always-visible checkbox instead of a
   * checkmark that only appears once selected.
   */
  multiple?: boolean;
  /** Shows an inline button to reset the selection once one is made. */
  clearable?: boolean;
  /** A single value in single-select mode, or an array of values when `multiple`. */
  value?: string | string[];
  defaultValue?: string | string[];
  /** Receives a `string` in single-select mode, or `string[]` when `multiple`. */
  onValueChange?: (value: string | string[]) => void;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  name?: string;
  id?: string;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}

function toArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

interface SelectPopoverProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  size: FieldSize;
  multiple: boolean;
  items: SelectOption[];
}

/**
 * Anchored to `Control` (the whole visible box), not `Trigger`, since
 * `Trigger` only covers the flex-1 region excluding the clear button and
 * chevron — anchoring to it would leave the popover narrower than the
 * field and misaligned with the icons. See `lib/floating.ts` for why
 * positioning is done manually instead of via Ark's built-in popper.
 */
function SelectPopover({ open, anchorRef, size, multiple, items }: SelectPopoverProps) {
  const { positionerRef, rect } = useFloatingPosition(open, anchorRef, { matchAnchorWidth: true });

  return (
    <Portal>
      <ArkSelect.Positioner
        ref={positionerRef}
        className="z-50"
        style={floatingPositionerStyle(rect)}
      >
        <ArkSelect.Content className="max-h-64 p-1 shadow-lg overflow-auto rounded-md border border-border bg-bg-elevated data-[state=closed]:animate-panel-out data-[state=open]:animate-panel-in">
          {items.length === 0 ? (
            <div
              className={cn(
                FIELD_SUB_TEXT_CLASSES[size],
                "px-inset-sm py-inset-sm text-text-secondary",
              )}
            >
              No options
            </div>
          ) : (
            items.map((item) => (
              <ArkSelect.Item key={item.value} item={item} className={itemVariants()}>
                <ArkSelect.ItemContext>
                  {(itemApi) =>
                    multiple ? (
                      <span
                        className={cn(
                          "size-4 flex shrink-0 items-center justify-center rounded-sm border text-text-inverse",
                          itemApi.selected ? "border-accent bg-accent" : "border-border",
                        )}
                      >
                        {itemApi.selected && <Check className="size-full" aria-hidden="true" />}
                      </span>
                    ) : (
                      <ArkSelect.ItemIndicator>
                        <Check className="size-4 text-accent-text" aria-hidden="true" />
                      </ArkSelect.ItemIndicator>
                    )
                  }
                </ArkSelect.ItemContext>
                <ArkSelect.ItemText className="flex-1 truncate">{item.label}</ArkSelect.ItemText>
              </ArkSelect.Item>
            ))
          )}
        </ArkSelect.Content>
      </ArkSelect.Positioner>
    </Portal>
  );
}

/**
 * A single- or multi-select dropdown: label, trigger (with optional clear
 * button), a portaled listbox, and hint or error text below — built on Ark
 * UI's select state machine for keyboard navigation (type-ahead included),
 * focus management, and ARIA. A native `<select>` mirrors the value for
 * form submission via `Select.HiddenSelect`.
 *
 * @param items - `{ label, value, disabled? }[]` — the full option list;
 * there's no async/filtered loading in v1 (that's the v2 Combobox).
 * @param size - `xs` through `xl` (default `md`) — matches `Input`'s scale.
 * @param multiple - See the prop doc above for what this changes.
 * @param error - Replaces `hint` and sets `aria-invalid` when present.
 *
 * @example
 * <Select
 *   label="Assay type"
 *   items={[{ label: "qPCR", value: "qpcr" }, { label: "ELISA", value: "elisa" }]}
 *   value={assayType}
 *   onValueChange={(v) => setAssayType(v as string)}
 * />
 */
function Select({
  items,
  label,
  description,
  hint,
  error,
  size = "md",
  placeholder = "Select an option",
  multiple = false,
  clearable = false,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  required = false,
  readOnly,
  name,
  id,
  className,
  ref,
}: SelectProps) {
  const collection = useMemo(() => createListCollection<SelectOption>({ items }), [items]);
  const { fieldId, descriptionId, hintId, errorId, describedBy } = useFieldIds({
    id,
    hasDescription: Boolean(description),
    hasError: Boolean(error),
    hasHint: Boolean(hint),
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);

  function handleValueChange(details: SelectValueChangeDetails<SelectOption>) {
    onValueChange?.(multiple ? details.value : (details.value[0] ?? ""));
  }

  return (
    <ArkSelect.Root
      collection={collection}
      value={toArray(value)}
      defaultValue={toArray(defaultValue)}
      onValueChange={handleValueChange}
      multiple={multiple}
      closeOnSelect={!multiple}
      disabled={disabled}
      required={required}
      readOnly={readOnly}
      invalid={Boolean(error)}
      name={name}
      className="flex flex-col gap-stack-xs"
    >
      {label && (
        <ArkSelect.Label className={FIELD_LABEL_TEXT_CLASSES[size]}>
          {label}
          {required && (
            <span aria-hidden="true" className="text-status-error">
              *
            </span>
          )}
        </ArkSelect.Label>
      )}
      {description && (
        <p id={descriptionId} className={cn(FIELD_SUB_TEXT_CLASSES[size], "text-text-secondary")}>
          {description}
        </p>
      )}
      <ArkSelect.Context>
        {(api): ReactNode => (
          <>
            <ArkSelect.Control
              ref={controlRef}
              className={cn(boxVariants({ size, error: Boolean(error) }), className)}
            >
              <ArkSelect.Trigger
                ref={mergeRefs(ref, triggerRef)}
                id={fieldId}
                aria-describedby={describedBy}
                className="min-w-0 flex flex-1 cursor-pointer items-center bg-transparent text-left outline-none data-disabled:cursor-not-allowed"
              >
                <ArkSelect.ValueText placeholder={placeholder} className="block truncate">
                  {api.hasSelectedItems
                    ? api.selectedItems.length > 1
                      ? `${api.selectedItems.length} selected`
                      : api.valueAsString
                    : undefined}
                </ArkSelect.ValueText>
              </ArkSelect.Trigger>
              {clearable && (
                <ArkSelect.ClearTrigger
                  aria-label="Clear selection"
                  className="shrink-0 cursor-pointer text-text-secondary hover:text-text"
                >
                  <X className="size-4" aria-hidden="true" />
                </ArkSelect.ClearTrigger>
              )}
              <ArkSelect.Indicator className="pointer-events-none shrink-0">
                <ChevronDown
                  className="size-4 transition-transform duration-100 data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
              </ArkSelect.Indicator>
            </ArkSelect.Control>
            <SelectPopover
              open={api.open}
              anchorRef={controlRef}
              size={size}
              multiple={multiple}
              items={collection.items}
            />
          </>
        )}
      </ArkSelect.Context>
      <ArkSelect.HiddenSelect />
      <FieldFooter size={size} error={error} errorId={errorId} hint={hint} hintId={hintId} />
    </ArkSelect.Root>
  );
}

export { Select };
