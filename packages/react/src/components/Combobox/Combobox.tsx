import {
  cloneElement,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import {
  Combobox as ArkCombobox,
  Portal,
  useListCollection,
  type ComboboxInputValueChangeDetails,
  type ComboboxValueChangeDetails,
  type UseComboboxContext,
} from "@ark-ui/react";
import { useVirtualizer, type VirtualItem, type Virtualizer } from "@tanstack/react-virtual";
import { cva } from "class-variance-authority";
import { ChevronDown, X } from "lucide-react";
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
import { Tooltip } from "../Tooltip/Tooltip";

const boxVariants = cva(
  // `has-focus-visible` (not Ark's own `data-focus`, which the state
  // machine sets on every focus regardless of input device) so a mouse
  // click into the field — including Ark's own focus-return to the input
  // after a click-to-select closes the popover — doesn't draw a ring;
  // only real keyboard-visible focus does. See the box's real focus
  // target, `Input`, not this wrapper: `:has()` reads the ring off that
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

const pillVariants = cva(
  "inline-flex items-center gap-inline-2xs rounded-sm bg-bg-hover px-inset-xs py-inset-2xs",
  {
    variants: {
      size: {
        xs: "text-caption font-caption tracking-caption",
        sm: "text-caption font-caption tracking-caption",
        md: "text-label font-label tracking-label",
        lg: "text-label-lg font-label-lg tracking-label-lg",
        xl: "text-label-lg font-label-lg tracking-label-lg",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface ComboboxOption {
  label: string;
  value: string;
  disabled?: boolean;
  /** Shown in a tooltip on hover/focus when `disabled` is true. */
  disabledReason?: string;
}

interface ComboboxProps {
  /** The full option list. In v1 this is always the complete set — filtering happens client-side via `filter`. */
  items: ComboboxOption[];
  /** Rendered via Ark's `Combobox.Label`, wired to the input through native `for`/`id` (see the `ids` note below). */
  label?: string;
  /** A longer explanatory line between the label and the input. */
  description?: string;
  /** Helper text below the input. Hidden automatically when `error` is set. */
  hint?: string;
  /** Error message below the input, replacing `hint`. Sets `aria-invalid` and the box's error border. */
  error?: string;
  size?: FieldSize;
  placeholder?: string;
  /** Shows an inline button to reset the selection and input text once a value is chosen. */
  clearable?: boolean;
  /**
   * Allows more than one item to be selected, shown as removable pills in
   * the control above the input rather than as trigger text (Ark's own
   * guidance for `multiple`: input text is cleared after each pick — see
   * `selectionBehavior` — since the pills, not the input, now represent the
   * selection). Changes `value`/`defaultValue`/`onValueChange` to arrays and
   * keeps the popover open after a pick so multiple selections don't
   * require reopening it each time.
   */
  multiple?: boolean;
  /** A single value in single-select mode, or an array of values when `multiple`. */
  value?: string | string[];
  defaultValue?: string | string[];
  /** Receives a `string` in single-select mode, or `string[]` when `multiple`. */
  onValueChange?: (value: string | string[]) => void;
  inputValue?: string;
  defaultInputValue?: string;
  onInputValueChange?: (inputValue: string) => void;
  /**
   * Match predicate run against every item's `label` as the user types.
   * Defaults to prefix-then-substring matching — deliberately not fuzzy:
   * scientific nomenclature (gene symbols, compound names) is collision-prone,
   * so a "helpfully" fuzzy default risks silently offering the wrong entity.
   * Pass a custom predicate to opt into fuzzy or alias-aware matching for a
   * specific field, or `null` to disable client-side filtering entirely
   * (e.g. when `items` is already a server-filtered result page).
   */
  filter?: ((itemText: string, filterText: string, item: ComboboxOption) => boolean) | null;
  /**
   * Wraps the matched substring of each item's label in `<mark>`. Defaults
   * to `true`, and is automatically suppressed when a custom `filter` is
   * supplied (a fuzzy/alias match's "why it matched" isn't representable as
   * one substring index — a wrong highlight would be worse than none).
   */
  highlightMatch?: boolean;
  /**
   * Groups options under a header labeled with this function's return
   * value. Options are re-sorted so items sharing a group are contiguous,
   * ordered by each group's first appearance in `items` — not
   * alphabetically — so callers control group order by controlling `items`'
   * order.
   */
  groupBy?: (item: ComboboxOption) => string;
  /**
   * Row height in px used as the virtualizer's size estimate before an
   * item is actually measured. Only affects initial scrollbar/positioning
   * accuracy — real row heights (e.g. from a future multi-line item
   * template) are measured and used once rendered.
   */
  estimatedItemHeight?: number;
  /**
   * Shows `loadingText` in place of the option list — for a consumer
   * fetching `items` from an external source (e.g. a gene/compound
   * database) in response to `onInputValueChange`. Pass `filter={null}`
   * alongside this for server-filtered results; `items` is then rendered
   * as-is rather than re-filtered client-side.
   */
  loading?: boolean;
  /** @default "Loading…" */
  loadingText?: ReactNode;
  /** Shown when `items` is empty and `loading` is not set. @default "No results" */
  emptyText?: ReactNode;
  /**
   * Called with the range of rendered row indexes whenever the visible
   * window changes — e.g. from scrolling or arrow-key navigation. Indexes
   * count group header rows when `groupBy` is set, so they won't line up
   * 1:1 with positions in `items`. Reserved for a future consumer to
   * prefetch the next page of `items` as the window nears the end of
   * what's currently loaded; Combobox itself does no prefetching.
   */
  onRangeChange?: (range: { startIndex: number; endIndex: number }) => void;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  name?: string;
  id?: string;
  className?: string;
  ref?: Ref<HTMLInputElement>;
}

function toArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

/**
 * Reorders `items` so every item sharing a group sits contiguously,
 * preserving each group's within-group order and ordering groups by their
 * first appearance in `items`. Required before handing items to
 * `useListCollection`: `buildRows` below walks `collection.items` in its
 * existing order to decide where header rows go, and `scrollToIndexFn`
 * relies on that same order matching `collection.indexOf()` — grouping
 * without first sorting would scatter a group's items across multiple
 * same-named header blocks instead of one.
 */
function sortItemsByGroup(
  items: ComboboxOption[],
  groupBy: (item: ComboboxOption) => string,
): ComboboxOption[] {
  const groups = new Map<string, ComboboxOption[]>();
  for (const item of items) {
    const group = groupBy(item);
    const bucket = groups.get(group);
    if (bucket) bucket.push(item);
    else groups.set(group, [item]);
  }
  return Array.from(groups.values()).flat();
}

type ComboboxRow = { type: "header"; key: string } | { type: "item"; item: ComboboxOption };

/**
 * Flattens `items` (already group-sorted, if `groupBy` is set) into the
 * virtualizer's row list — one row per item, plus one header row inserted
 * wherever the group changes — and the index map `scrollToIndexFn` needs to
 * translate Ark's item-only index into a row index (see its call site).
 */
function buildRows(
  items: ComboboxOption[],
  groupBy?: (item: ComboboxOption) => string,
): { rows: ComboboxRow[]; itemIndexToRowIndex: number[] } {
  if (!groupBy) {
    return {
      rows: items.map((item): ComboboxRow => ({ type: "item", item })),
      itemIndexToRowIndex: items.map((_, i) => i),
    };
  }
  const rows: ComboboxRow[] = [];
  const itemIndexToRowIndex: number[] = [];
  let lastGroup: string | undefined;
  items.forEach((item, itemIndex) => {
    const group = groupBy(item);
    if (group !== lastGroup) {
      rows.push({ type: "header", key: group });
      lastGroup = group;
    }
    itemIndexToRowIndex[itemIndex] = rows.length;
    rows.push({ type: "item", item });
  });
  return { rows, itemIndexToRowIndex };
}

function defaultComboboxFilter(itemText: string, filterText: string): boolean {
  const haystack = itemText.toLowerCase();
  const needle = filterText.toLowerCase();
  return haystack.startsWith(needle) || haystack.includes(needle);
}

interface HighlightedTextProps {
  text: string;
  query: string;
}

/** Wraps the first match of `query` inside `text` in `<mark>`. Case-insensitive, matches on a plain substring index — not meaningful for fuzzy matches, see `highlightMatch` above. */
function HighlightedText({ text, query }: HighlightedTextProps) {
  if (!query) return <>{text}</>;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-accent-subtle text-inherit">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}

interface ComboboxPopoverProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  size: FieldSize;
  api: UseComboboxContext<ComboboxOption>;
  rows: ComboboxRow[];
  inputValue: string;
  highlightMatch: boolean;
  highlightedRowIndex: number;
  listRef: RefObject<HTMLDivElement | null>;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  loading: boolean;
  loadingText: ReactNode;
  emptyText: ReactNode;
  onRangeChange?: (range: { startIndex: number; endIndex: number }) => void;
}

/**
 * The rows TanStack Virtual would render on its own (the current visible
 * range plus overscan) don't necessarily include the keyboard-highlighted
 * item — Ark sets `aria-activedescendant` on the input to that item's id
 * unconditionally, regardless of whether it's currently mounted. Without
 * this, scrolling the highlight out of view makes `aria-activedescendant`
 * point at a DOM node that doesn't exist, and screen readers announce no
 * current option. Unioning in one extra row for it (positioned from the
 * virtualizer's own measurement cache, so it lands in the right place even
 * off-screen) keeps that reference always resolvable.
 */
function withHighlightedRow(
  virtualItems: VirtualItem[],
  virtualizer: Virtualizer<HTMLDivElement, Element>,
  highlightedIndex: number,
): VirtualItem[] {
  if (highlightedIndex < 0 || virtualItems.some((row) => row.index === highlightedIndex)) {
    return virtualItems;
  }
  const measured = virtualizer.measurementsCache[highlightedIndex];
  if (!measured) return virtualItems;
  return [...virtualItems, measured].sort((a, b) => a.index - b.index);
}

/**
 * Anchored to `Control` (the whole visible box), not `Input`, for the same
 * reason `Select`'s popover anchors to `Control` rather than `Trigger` — see
 * `lib/floating.ts` for why positioning is done manually instead of via
 * Ark's built-in popper.
 */
function ComboboxPopover({
  open,
  anchorRef,
  size,
  api,
  rows,
  inputValue,
  highlightMatch,
  highlightedRowIndex,
  listRef,
  virtualizer,
  loading,
  loadingText,
  emptyText,
  onRangeChange,
}: ComboboxPopoverProps) {
  // Reads `.getVirtualItems()`/`.range` off the virtualizer instance passed
  // down from `Combobox` — same staleness risk as `Combobox` itself, opted
  // out at the function level rather than excluding the whole file.
  "use no memo";
  const { positionerRef, rect } = useFloatingPosition(open, anchorRef, { matchAnchorWidth: true });
  const virtualRows = withHighlightedRow(
    virtualizer.getVirtualItems(),
    virtualizer,
    highlightedRowIndex,
  );
  // `virtualizer.range` is a plain object read off the instance, not a
  // stable reference, so the effect depends on its bounds directly.
  const rangeStart = virtualizer.range?.startIndex;
  const rangeEnd = virtualizer.range?.endIndex;
  useEffect(() => {
    if (rangeStart !== undefined && rangeEnd !== undefined) {
      onRangeChange?.({ startIndex: rangeStart, endIndex: rangeEnd });
    }
  }, [rangeStart, rangeEnd, onRangeChange]);

  return (
    <Portal>
      <ArkCombobox.Positioner
        ref={positionerRef}
        className="z-50"
        style={floatingPositionerStyle(rect)}
      >
        <ArkCombobox.Content
          ref={listRef}
          className="max-h-64 p-1 shadow-lg overflow-auto rounded-md border border-border bg-bg-elevated data-[state=closed]:animate-panel-out data-[state=open]:animate-panel-in"
        >
          {loading ? (
            <div
              role="status"
              className={cn(
                FIELD_SUB_TEXT_CLASSES[size],
                "px-inset-sm py-inset-sm text-text-secondary",
              )}
            >
              {loadingText}
            </div>
          ) : (
            // Ark's Empty renders null once the collection is non-empty, so
            // it's safe to always render alongside the item list below.
            <ArkCombobox.Empty
              className={cn(
                FIELD_SUB_TEXT_CLASSES[size],
                "px-inset-sm py-inset-sm text-text-secondary",
              )}
            >
              {emptyText}
            </ArkCombobox.Empty>
          )}
          {!loading && rows.length > 0 && (
            <div style={{ position: "relative", height: virtualizer.getTotalSize() }}>
              {virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) return null;
                const rowStyle: CSSProperties = {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                };
                if (row.type === "header") {
                  return (
                    <div
                      key={`group:${row.key}`}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      style={rowStyle}
                      {...api.getItemGroupProps({ id: row.key })}
                      className="px-inset-sm pt-inset-sm pb-inset-2xs text-caption font-caption tracking-caption text-text-secondary"
                    >
                      <span {...api.getItemGroupLabelProps({ htmlFor: row.key })}>{row.key}</span>
                    </div>
                  );
                }
                const item = row.item;
                const itemNode = (
                  <ArkCombobox.Item
                    key={item.value}
                    item={item}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    className={itemVariants()}
                    style={rowStyle}
                  >
                    <ArkCombobox.ItemText className="flex-1 truncate">
                      {highlightMatch ? (
                        <HighlightedText text={item.label} query={inputValue} />
                      ) : (
                        item.label
                      )}
                    </ArkCombobox.ItemText>
                  </ArkCombobox.Item>
                );
                if (!item.disabled || !item.disabledReason) return itemNode;
                // A visually-hidden, always-mounted description rather than
                // pointing `aria-describedby` at `Tooltip.Content`: Ark's
                // tooltip content unmounts entirely (not just visually
                // hides) while closed, so a listbox option — which never
                // receives real DOM focus, only the virtual focus of
                // `aria-activedescendant` — would have no way to expose the
                // reason to a keyboard/AT user who never triggers a hover.
                // This keeps that description reachable regardless of
                // input method; the Tooltip is purely the sighted/mouse
                // affordance on top.
                const reasonId = `${api.getItemProps({ item }).id}-reason`;
                return (
                  <Tooltip key={item.value}>
                    <Tooltip.Trigger asChild>
                      {cloneElement(itemNode, { "aria-describedby": reasonId })}
                    </Tooltip.Trigger>
                    <Tooltip.Content>{item.disabledReason}</Tooltip.Content>
                    <span id={reasonId} className="sr-only">
                      {item.disabledReason}
                    </span>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </ArkCombobox.Content>
      </ArkCombobox.Positioner>
    </Portal>
  );
}

/**
 * A filterable text input backed by a listbox of matching options: label,
 * input (with optional clear button), a portaled listbox, and hint or error
 * text below — built on Ark UI's combobox state machine for keyboard
 * navigation, type-ahead filtering, focus management, and ARIA.
 *
 * @param items - `{ label, value, disabled?, disabledReason?, }[]` — the full
 * option list for client-side filtering, or the current result page when
 * `filter` is `null` (server-filtered mode).
 * @param size - `xs` through `xl` (default `md`) — matches `Input`'s scale.
 * @param filter - Custom match predicate; defaults to prefix+substring. See
 * the prop's own doc for why fuzzy isn't the default.
 * @param multiple - See the prop doc above for what this changes.
 * @param groupBy - Groups options under a header; see the prop's own doc
 * for how group order is decided.
 * @param loading - Shows `loadingText` instead of the option list, for a
 * consumer fetching `items` asynchronously. See the prop's own doc.
 * @param error - Replaces `hint` and sets `aria-invalid` when present.
 *
 * @example
 * <Combobox
 *   label="Gene symbol"
 *   items={[{ label: "BRCA1", value: "brca1" }, { label: "BRCA2", value: "brca2" }]}
 *   value={gene}
 *   onValueChange={setGene}
 * />
 */
function Combobox({
  items,
  label,
  description,
  hint,
  error,
  size = "md",
  placeholder,
  clearable = false,
  multiple = false,
  value,
  defaultValue,
  onValueChange,
  inputValue,
  defaultInputValue,
  onInputValueChange,
  filter = defaultComboboxFilter,
  highlightMatch = true,
  loading = false,
  loadingText = "Loading…",
  emptyText = "No results",
  onRangeChange,
  groupBy,
  estimatedItemHeight = 40,
  disabled = false,
  required = false,
  readOnly,
  name,
  id,
  className,
  ref,
}: ComboboxProps) {
  // Creates and reads methods off a `@tanstack/react-virtual` instance
  // (`.scrollToIndex`), a persistent class whose reference the compiler
  // can't prove stable — opt this component out rather than the whole file.
  "use no memo";
  const sortedItems = useMemo(
    () => (groupBy ? sortItemsByGroup(items, groupBy) : items),
    [items, groupBy],
  );
  const {
    collection,
    filter: applyFilter,
    set: setCollectionItems,
  } = useListCollection<ComboboxOption>({
    initialItems: sortedItems,
    filter: filter ?? undefined,
    itemToValue: (item) => item.value,
    itemToString: (item) => item.label,
    isItemDisabled: (item) => Boolean(item.disabled),
  });
  // `initialItems` above only seeds the collection on mount — `items`
  // changing afterward (a consumer fetching a new page of results in
  // response to `onInputValueChange`, the async/server-filtered mode) has
  // to be pushed in explicitly, or the collection would keep showing
  // whatever `items` looked like when this component first mounted.
  useEffect(() => {
    setCollectionItems(sortedItems);
  }, [sortedItems, setCollectionItems]);
  // `collection.items` stays group-sorted after filtering: `useListCollection`
  // filters by removing non-matches, not by re-sorting the remainder.
  const { rows, itemIndexToRowIndex } = useMemo(
    () => buildRows(collection.items, groupBy),
    [collection.items, groupBy],
  );
  const { fieldId, descriptionId, hintId, errorId, describedBy } = useFieldIds({
    id,
    hasDescription: Boolean(description),
    hasError: Boolean(error),
    hasHint: Boolean(hint),
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Lives here rather than inside `ComboboxPopover` because `scrollToIndexFn`
  // below — the keyboard-highlight-to-scroll bridge — has to sit on `Root`,
  // and needs this same instance to call `scrollToIndex` on.
  // @tanstack/react-virtual returns a persistent class instance; its methods
  // are stable across renders even though the compiler can't statically
  // prove that, so it just skips auto-memoizing this hook (no correctness
  // impact).
  // eslint-disable-next-line react/incompatible-library -- see comment above
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => listRef.current,
    estimateSize: (index) => (rows[index]?.type === "header" ? 28 : estimatedItemHeight),
    getItemKey: (index) => {
      const row = rows[index];
      return row?.type === "header" ? `group:${row.key}` : (row?.item.value ?? index);
    },
    overscan: 8,
  });
  const rootValue = useMemo(() => toArray(value), [value]);
  const rootDefaultValue = useMemo(() => toArray(defaultValue), [defaultValue]);

  function handleValueChange(details: ComboboxValueChangeDetails<ComboboxOption>) {
    onValueChange?.(multiple ? details.value : (details.value[0] ?? ""));
  }

  function handleInputValueChange(details: ComboboxInputValueChangeDetails) {
    applyFilter(details.inputValue);
    onInputValueChange?.(details.inputValue);
  }

  return (
    <ArkCombobox.Root
      collection={collection}
      value={rootValue}
      defaultValue={rootDefaultValue}
      onValueChange={handleValueChange}
      inputValue={inputValue}
      defaultInputValue={defaultInputValue}
      onInputValueChange={handleInputValueChange}
      // The keyboard-highlight-to-scroll bridge: Ark calls this on every
      // highlight change (arrow keys, initial highlight, programmatic) with
      // the highlighted item's position in `collection.items` — the
      // item-only index space, which no longer matches the virtualizer's
      // row index once `groupBy` inserts header rows between items, hence
      // the translation through `itemIndexToRowIndex`.
      scrollToIndexFn={({ index, immediate }) =>
        virtualizer.scrollToIndex(itemIndexToRowIndex[index] ?? index, {
          align: "auto",
          behavior: immediate ? "auto" : "smooth",
        })
      }
      openOnClick
      multiple={multiple}
      closeOnSelect={!multiple}
      disabled={disabled}
      required={required}
      readOnly={readOnly}
      invalid={Boolean(error)}
      name={name}
      // Pins the input's *internal* id to `fieldId` instead of letting
      // Ark generate its own and then overriding the rendered `id` prop
      // on `Input` directly: Zag's own DOM lookups (`dom.getInputEl`,
      // used to imperatively sync the input's value on clear/select —
      // see `syncInputValue` in the compiled machine) resolve elements by
      // this internal id. Overriding just the rendered `id` attribute
      // left those lookups resolving to nothing, so the clear button
      // could reset `value` (a React-visible state) while the real
      // `<input>` DOM node silently kept its stale text — a case where
      // "just override the prop" doesn't work because the id is also an
      // internal wiring key, not only a DOM attribute. Doing it this way
      // also gives `Label`'s own `htmlFor` (unmodified below) a matching
      // target for free — Combobox's `Input`, unlike Select's `Trigger`,
      // has no `aria-labelledby` fallback and depends entirely on that
      // native association for its accessible name.
      ids={{ input: fieldId }}
      className="flex flex-col gap-stack-xs"
    >
      {label && (
        <ArkCombobox.Label className={FIELD_LABEL_TEXT_CLASSES[size]}>
          {label}
          {required && (
            <span aria-hidden="true" className="text-status-error">
              *
            </span>
          )}
        </ArkCombobox.Label>
      )}
      {description && (
        <p id={descriptionId} className={cn(FIELD_SUB_TEXT_CLASSES[size], "text-text-secondary")}>
          {description}
        </p>
      )}
      <ArkCombobox.Context<ComboboxOption>>
        {(api): ReactNode => (
          <>
            <ArkCombobox.Control
              ref={controlRef}
              className={cn(
                boxVariants({ size, error: Boolean(error) }),
                multiple && "flex-wrap",
                className,
              )}
            >
              {multiple && api.selectedItems.length > 0 && (
                <div className="flex flex-wrap gap-inline-2xs">
                  {api.selectedItems.map((item) => (
                    <span key={item.value} className={pillVariants({ size })}>
                      {item.label}
                      <button
                        type="button"
                        aria-label={`Remove ${item.label}`}
                        onClick={() => api.clearValue(item.value)}
                        className="cursor-pointer text-text-secondary hover:text-text"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <ArkCombobox.Input
                ref={mergeRefs(ref, inputRef)}
                placeholder={placeholder}
                aria-describedby={describedBy}
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-placeholder data-disabled:cursor-not-allowed"
              />
              {clearable && (multiple ? api.hasSelectedItems : Boolean(api.inputValue)) && (
                <ArkCombobox.ClearTrigger
                  aria-label="Clear selection"
                  className="shrink-0 cursor-pointer text-text-secondary hover:text-text"
                >
                  <X className="size-4" aria-hidden="true" />
                </ArkCombobox.ClearTrigger>
              )}
              <ArkCombobox.Trigger
                aria-label="Toggle options"
                className="shrink-0 cursor-pointer text-text-secondary hover:text-text"
              >
                <ChevronDown
                  className="size-4 transition-transform duration-100 data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
              </ArkCombobox.Trigger>
            </ArkCombobox.Control>
            <ComboboxPopover
              open={api.open}
              anchorRef={controlRef}
              size={size}
              api={api}
              rows={rows}
              inputValue={api.inputValue}
              highlightMatch={highlightMatch && filter === defaultComboboxFilter}
              highlightedRowIndex={
                api.highlightedValue
                  ? (itemIndexToRowIndex[
                      collection.items.findIndex((item) => item.value === api.highlightedValue)
                    ] ?? -1)
                  : -1
              }
              listRef={listRef}
              virtualizer={virtualizer}
              loading={loading}
              loadingText={loadingText}
              emptyText={emptyText}
              onRangeChange={onRangeChange}
            />
          </>
        )}
      </ArkCombobox.Context>
      <FieldFooter size={size} error={error} errorId={errorId} hint={hint} hintId={hintId} />
    </ArkCombobox.Root>
  );
}

export { Combobox };
