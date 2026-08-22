import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  Ref,
} from "react";
import { createPortal } from "react-dom";
import { useVirtualizer, type VirtualItem, type Virtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter, Search } from "lucide-react";
import { cn } from "../../lib/cn";
import { mergeRefs, type FieldSize } from "../../lib/field";
import { floatingPositionerStyle, useFloatingPosition } from "../../lib/floating";
import { Checkbox } from "../Checkbox/Checkbox";
import { Input } from "../Input/Input";
import {
  computeNextActiveCell,
  useDataTableKeyboardNav,
  type UseDataTableKeyboardNavResult,
} from "./useDataTableKeyboardNav";
import type {
  DataTableAlign,
  DataTableCell,
  DataTableHeaderCell,
  DataTablePinned,
  DataTableRow,
  DataTableSelectionState,
  UseDataTableResult,
} from "./types";

const ALIGN_CLASSES: Record<DataTableAlign, string> = {
  start: "text-start",
  center: "text-center",
  end: "text-end",
};

/**
 * Cell padding per density level — mirrors `Input`'s own `size` variant's
 * padding progression (one inset step narrower than the level's own name)
 * so a `density="md"` table reads at the same visual weight as a `size="md"`
 * form field. Deliberately doesn't touch `text-data`/`text-label` font
 * size: density controls row height via padding, not data legibility.
 */
const DENSITY_PADDING_CLASSES: Record<FieldSize, string> = {
  xs: "px-inset-sm py-inset-2xs",
  sm: "px-inset-sm py-inset-xs",
  md: "px-inset-md py-inset-sm",
  lg: "px-inset-md py-inset-md",
  xl: "px-inset-lg py-inset-lg",
};

/**
 * Default `estimateRowSize` per density — the real rendered row height
 * (padding + `text-data`'s line-height + the 1px border each row's cells
 * pick up from adjacent borders). Rows aren't dynamically remeasured (no
 * `measureElement` — single-line text only), so this value *is* each row's
 * actual height, not just a seed for later correction.
 */
const DENSITY_ROW_HEIGHT: Record<FieldSize, number> = {
  xs: 25,
  sm: 29,
  md: 37,
  lg: 45,
  xl: 53,
};

/**
 * `position: sticky` computed from `pinnedOffset` (already `column.getStart`/
 * `getAfter` from the adapter) — logical inset, not physical left/right, per
 * v9's start/end pinning model. `data-pinned` (below, on the element) carries
 * the static sticky/z-index/background classes; only the numeric offset
 * needs inline style.
 */
function pinnedInsetStyle(pinned: DataTablePinned, offset: number | undefined): CSSProperties {
  if (!pinned || offset === undefined) return {};
  return pinned === "start" ? { insetInlineStart: offset } : { insetInlineEnd: offset };
}

interface DataTableContextValue<TRow extends object> {
  table: UseDataTableResult<TRow>;
  nav: UseDataTableKeyboardNavResult;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  density: FieldSize;
  /**
   * The same memoized id arrays and O(1) id -> index maps `DataTableRoot`
   * builds for its own keyboard nav — shared via context so consumers
   * (`DataTableBody`, `DataTableCellEditor`) don't fall back to rebuilding
   * them, or scanning `table.rows`/`table.headerCells` with `.map()`/
   * `.findIndex()`, on every render/keypress.
   */
  rowIds: string[];
  columnIds: string[];
  rowIndexById: Map<string, number>;
  columnIndexById: Map<string, number>;
}

// Context is intentionally untyped-per-instance (`any`) — React context
// can't be generic. `useDataTableContext` re-asserts the caller's own
// `TRow` at the read site, same trade-off as any generic compound
// component built on plain context.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DataTableContext = createContext<DataTableContextValue<any> | null>(null);

function useDataTableContext<TRow extends object>(): DataTableContextValue<TRow> {
  const ctx = useContext(DataTableContext);
  if (!ctx) throw new Error("DataTable subcomponents must be rendered within DataTable.Root");
  return ctx as DataTableContextValue<TRow>;
}

interface DataTableRootProps<TRow extends object> extends ComponentPropsWithoutRef<"div"> {
  table: UseDataTableResult<TRow>;
  /** Row/cell padding scale, `"xs"`–`"xl"` (default `"sm"`) — matches `Input`'s own `size` scale, so a table reads at the same visual weight as same-sized form fields around it. */
  density?: FieldSize;
  /** Estimated row height in px, seeding the virtualizer before any row is measured. Defaults to the real measured height for `density`. */
  estimateRowSize?: number;
  /** Rows rendered outside the visible window on each side. Default 8, matching `Combobox`. */
  overscan?: number;
  /** The virtualizer's current visible index range — for a consumer to fetch more data as it approaches the end. DataTable has no pagination UI; this is the primitive for infinite-scroll-style loading instead. */
  onRangeChange?: (range: { startIndex: number; endIndex: number }) => void;
  ref?: Ref<HTMLDivElement>;
}

/**
 * The scroll container and ARIA grid root. A div-based ARIA grid, not a
 * native `<table>` — a sticky header and absolutely-positioned virtualized
 * rows live inside this same scroll container, which a native `<table>`'s
 * layout model can't support while keeping column alignment. Owns the
 * `@tanstack/react-virtual` instance (needs this element as its scroll
 * container) and bridges it to keyboard nav: moving the active cell
 * off-screen scrolls it into view, the same `scrollToIndexFn` concept
 * `Combobox` already uses for its own virtualized listbox.
 */
function DataTableRoot<TRow extends object>({
  table,
  density = "sm",
  estimateRowSize = DENSITY_ROW_HEIGHT[density],
  overscan = 8,
  onRangeChange,
  className,
  children,
  ref,
  ...props
}: DataTableRootProps<TRow>) {
  // Creates and reads methods off a `@tanstack/react-virtual` instance
  // (`.scrollToIndex`, `.range`), a persistent class whose reference the
  // compiler can't prove stable — opt this component out rather than the
  // whole file, so sibling components below still get compiled.
  "use no memo";
  const rootRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- table identity changes whenever rows/headerCells do
  const rowIds = useMemo(() => table.rows.map((row) => row.id), [table.rows]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- table identity changes whenever rows/headerCells do
  const columnIds = useMemo(
    () => table.headerCells.map((header) => header.columnId),
    [table.headerCells],
  );
  // O(1) lookups for keyboard nav and the scroll-to-active-cell effect
  // below, instead of scanning `rowIds`/`columnIds` on every keypress —
  // rebuilt only when the ids themselves change, same as `rowIds` above.
  const rowIndexById = useMemo(() => {
    const map = new Map<string, number>();
    rowIds.forEach((id, index) => map.set(id, index));
    return map;
  }, [rowIds]);
  const columnIndexById = useMemo(() => {
    const map = new Map<string, number>();
    columnIds.forEach((id, index) => map.set(id, index));
    return map;
  }, [columnIds]);
  const nav = useDataTableKeyboardNav({ rowIds, columnIds, rowIndexById, columnIndexById });

  // @tanstack/react-virtual returns a persistent class instance; its methods
  // are stable across renders even though the compiler can't statically
  // prove that, so it just skips auto-memoizing this component (no
  // correctness impact) — same reasoning as Combobox's own virtualizer.
  // eslint-disable-next-line react/incompatible-library -- see comment above
  const virtualizer = useVirtualizer<HTMLDivElement, Element>({
    count: table.rows.length,
    getScrollElement: () => rootRef.current,
    estimateSize: () => estimateRowSize,
    getItemKey: (index) => rowIds[index] ?? index,
    overscan,
  });

  // `rowIndexById` is read via a ref, not listed as a dependency, so the
  // scroll-to-active-cell effect below only fires on a real `activeCell`
  // change — not on every sort/filter/edit, which would otherwise re-scroll
  // the viewport even while the user has deliberately scrolled elsewhere.
  // Kept current via its own effect, declared before the scroll effect (so
  // it always runs first, same render) — writing to `.current` directly in
  // the render body would mutate during render, which React doesn't
  // guarantee survives an interrupted/discarded render.
  const rowIndexByIdRef = useRef(rowIndexById);
  useEffect(() => {
    rowIndexByIdRef.current = rowIndexById;
  }, [rowIndexById]);

  // `align: "auto"` is a no-op once the target is already fully visible, so
  // this is safe to run on every `activeCell` change (including a click
  // that already lands in view), not just keyboard moves that leave it.
  useEffect(() => {
    if (!nav.activeCell) return;
    const index = rowIndexByIdRef.current.get(nav.activeCell.rowId);
    if (index !== undefined) virtualizer.scrollToIndex(index, { align: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- virtualizer is a stable instance across renders; rowIndexById is read via ref, deliberately not a dependency (see comment above)
  }, [nav.activeCell]);

  // `virtualizer.range` is a plain object read off the instance, not a
  // stable reference — same pattern as `Combobox`'s own range passthrough.
  const rangeStart = virtualizer.range?.startIndex;
  const rangeEnd = virtualizer.range?.endIndex;
  useEffect(() => {
    if (rangeStart !== undefined && rangeEnd !== undefined) {
      onRangeChange?.({ startIndex: rangeStart, endIndex: rangeEnd });
    }
  }, [rangeStart, rangeEnd, onRangeChange]);

  return (
    <DataTableContext.Provider
      value={{ table, nav, virtualizer, density, rowIds, columnIds, rowIndexById, columnIndexById }}
    >
      <div
        ref={mergeRefs(ref, rootRef)}
        role="grid"
        className={cn("overflow-auto rounded-lg border border-border bg-bg-elevated", className)}
        {...props}
      >
        {children}
      </div>
    </DataTableContext.Provider>
  );
}

interface DataTableHeaderProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement>;
}

function DataTableHeader({ className, ref, ...props }: DataTableHeaderProps) {
  return (
    <div
      ref={ref}
      role="rowgroup"
      className={cn("top-0 sticky z-20 bg-bg-elevated", className)}
      {...props}
    />
  );
}

interface DataTableHeaderRowProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement>;
}

function DataTableHeaderRow({ className, ref, ...props }: DataTableHeaderRowProps) {
  return <div ref={ref} role="row" className={cn("flex", className)} {...props} />;
}

interface DataTableHeaderCellProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  header: DataTableHeaderCell;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

const ARIA_SORT_MAP = { asc: "ascending", desc: "descending", false: "none" } as const;

function DataTableHeaderCellComponent({
  header,
  className,
  children,
  style,
  ref,
  ...props
}: DataTableHeaderCellProps) {
  const { density } = useDataTableContext<object>();
  return (
    <div
      ref={ref}
      role="columnheader"
      aria-sort={header.sortable ? ARIA_SORT_MAP[`${header.sortDirection}`] : undefined}
      data-pinned={header.pinned || undefined}
      className={cn(
        "relative shrink-0 bg-bg-elevated text-label font-label text-text-secondary",
        DENSITY_PADDING_CLASSES[density],
        "data-pinned:sticky data-pinned:z-10",
        ALIGN_CLASSES[header.align],
        className,
      )}
      style={{
        width: header.width,
        ...pinnedInsetStyle(header.pinned, header.pinnedOffset),
        ...style,
      }}
      {...props}
    >
      {children ?? header.label}
    </div>
  );
}

interface DataTableSortButtonProps extends Omit<ComponentPropsWithoutRef<"button">, "children"> {
  header: DataTableHeaderCell;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Optional opt-in piece, not baked into `HeaderCell` — a non-sortable column
 * just renders `header.label` directly. A real `<button>` gets Enter/Space
 * activation and focus for free, matching the native-HTML-primitive
 * reasoning `Button`/`Input` already follow.
 */
function DataTableSortButton({
  header,
  className,
  children,
  ref,
  ...props
}: DataTableSortButtonProps) {
  const Icon =
    header.sortDirection === "asc"
      ? ArrowUp
      : header.sortDirection === "desc"
        ? ArrowDown
        : ArrowUpDown;
  return (
    <button
      type="button"
      ref={ref}
      onClick={header.onSortClick}
      className={cn(
        "inline-flex items-center gap-inline-2xs text-inherit hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus",
        className,
      )}
      {...props}
    >
      {children ?? header.label}
      <Icon
        className={cn(
          "size-3.5 shrink-0",
          header.sortDirection === false && "text-text-secondary/60",
        )}
        aria-hidden="true"
      />
    </button>
  );
}

interface DataTableResizeHandleProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  header: DataTableHeaderCell;
  /** px per ArrowLeft/ArrowRight press. Default 10. */
  step?: number;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Optional opt-in piece — renders nothing for a column with no `header.resize`
 * (not resizable). Pointer drag binds tanstack's own resize handler directly
 * to both `onMouseDown` and `onTouchStart` (its handler distinguishes the
 * two internally). Arrow keys give the same resize a keyboard path, since a
 * pointer-only drag handle otherwise has none.
 */
function DataTableResizeHandle({
  header,
  step = 10,
  className,
  ref,
  ...props
}: DataTableResizeHandleProps) {
  const { table } = useDataTableContext<object>();
  if (!header.resize) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      table.resizeColumn(header.columnId, (header.width ?? 0) - step);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      table.resizeColumn(header.columnId, (header.width ?? 0) + step);
    }
  }

  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      aria-valuenow={header.width}
      tabIndex={0}
      data-resizing={header.resize.isResizing ? "" : undefined}
      onMouseDown={header.resize.onPointerDown}
      onTouchStart={header.resize.onPointerDown}
      onKeyDown={handleKeyDown}
      className={cn(
        "inset-y-0 end-0 w-1 absolute cursor-col-resize touch-none select-none hover:bg-border-strong focus-visible:bg-accent data-resizing:bg-accent",
        className,
      )}
      {...props}
    />
  );
}

interface DataTableSelectionHeaderCellProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> {
  selection: DataTableSelectionState;
  /** Visible label for the checkbox, kept for assistive tech but visually hidden. Default `"Select all rows"`. */
  label?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Optional opt-in piece — a `role="columnheader"` cell holding a select-all
 * checkbox, wired to `table.selection`. Not backed by a column def (there's
 * no data behind it), so it renders its own ARIA grid role directly rather
 * than wrapping `DataTable.HeaderCell`. Like `SelectionCell` below, it sits
 * outside the roving-tabindex arrow-key nav model — its checkbox is a real
 * native control, reachable by Tab like any other interactive element —
 * rather than extending that model to a non-data column.
 */
function DataTableSelectionHeaderCell({
  selection,
  label = "Select all rows",
  className,
  ref,
  ...props
}: DataTableSelectionHeaderCellProps) {
  const { density } = useDataTableContext<object>();
  return (
    <div
      ref={ref}
      role="columnheader"
      className={cn(
        "flex shrink-0 items-center justify-center select-none",
        DENSITY_PADDING_CLASSES[density],
        className,
      )}
      {...props}
    >
      <Checkbox
        label={label}
        hideLabel
        checked={selection.isAllSelected}
        indeterminate={selection.isSomeSelected}
        onCheckedChange={() => selection.toggleAll()}
      />
    </div>
  );
}

interface DataTableSelectionCellProps<TRow extends object> extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> {
  row: DataTableRow<TRow>;
  selection: DataTableSelectionState;
  /** Visible label for the checkbox, kept for assistive tech but visually hidden. Default `"Select row"`. */
  label?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Optional opt-in piece — a `role="gridcell"` holding a per-row selection
 * checkbox. Reads the raw click event directly (via `Checkbox`'s `onClick`,
 * not `onCheckedChange` — whose `{ checked }` detail doesn't carry modifier
 * keys) so shift+click can extend the selection through
 * `selection.toggleRange`; a plain click or keyboard toggle (native
 * checkboxes fire a `click` event for Space/Enter activation too) falls
 * through to `selection.toggleRow`. `select-none` is load-bearing here, not
 * cosmetic: without it, a browser treats shift+click on a second checkbox as
 * extending a text selection from the first click and never dispatches a
 * `click` event at all, silently swallowing the range gesture.
 */
function DataTableSelectionCell<TRow extends object>({
  row,
  selection,
  label = "Select row",
  className,
  ref,
  ...props
}: DataTableSelectionCellProps<TRow>) {
  const { density } = useDataTableContext<object>();
  return (
    <div
      ref={ref}
      role="gridcell"
      className={cn(
        "flex shrink-0 items-center justify-center select-none",
        DENSITY_PADDING_CLASSES[density],
        className,
      )}
      {...props}
    >
      <Checkbox
        label={label}
        hideLabel
        checked={selection.isRowSelected(row.id)}
        onClick={(event) => {
          if (event.shiftKey) selection.toggleRange(row.id);
          else selection.toggleRow(row.id);
        }}
      />
    </div>
  );
}

/**
 * Unions the keyboard-active row into the rendered virtual-item list even
 * before `DataTableRoot`'s scroll-to-index bridge finishes scrolling —
 * mirrors `Combobox`'s `withHighlightedRow`. Without this, moving the
 * active cell to an off-screen row (Ctrl+End on a large table) would need
 * two render passes: one to kick off the scroll, another (after the
 * virtualizer notices the new scroll position) to actually mount the
 * target row for `useDataTableKeyboardNav`'s own focus effect to find.
 */
function withActiveRow(
  virtualItems: VirtualItem[],
  virtualizer: Virtualizer<HTMLDivElement, Element>,
  activeIndex: number,
): VirtualItem[] {
  if (activeIndex < 0 || virtualItems.some((item) => item.index === activeIndex)) {
    return virtualItems;
  }
  const measured = virtualizer.measurementsCache[activeIndex];
  if (!measured) return virtualItems;
  return [...virtualItems, measured].sort((a, b) => a.index - b.index);
}

type DataTableBodyState = "idle" | "loading" | "empty" | "error";

interface DataTableBodyProps<TRow extends object> extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> {
  /**
   * The same `table` passed to `DataTable.Root`. `Root`'s `TRow` and
   * `Body`'s `TRow` are otherwise two independent generic instantiations —
   * React context can't carry a type parameter across them — so without
   * this, TypeScript has nothing to infer `TRow` from except `children`'s
   * own parameter type, a position it can never infer *from*, and silently
   * falls back to `object` (every field of `row` then reads as if it were
   * unknown, with no error). Passing `table` again here is the same
   * value, just also given to the type checker.
   */
  table: UseDataTableResult<TRow>;
  children: (row: DataTableRow<TRow>) => ReactNode;
  /** `"idle"` (default) renders rows normally. Omit and rely on `emptyState` for a data-driven empty grid — `"empty"`/`"loading"`/`"error"` are for states the row data can't express on its own. */
  state?: DataTableBodyState;
  loadingState?: ReactNode;
  emptyState?: ReactNode;
  errorState?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A single message row/cell (not arbitrary content dropped straight into
 * the rowgroup) keeps `role="rowgroup"` > `role="row"` > `role="gridcell"`
 * structurally valid while `state` is non-idle.
 */
function DataTableBodyMessageRow({
  children,
  liveRole,
}: {
  children: ReactNode;
  liveRole?: "status" | "alert";
}) {
  return (
    <div role="row">
      <div role="gridcell">{liveRole ? <div role={liveRole}>{children}</div> : children}</div>
    </div>
  );
}

function DataTableBody<TRow extends object>({
  table,
  children,
  className,
  state = "idle",
  loadingState,
  emptyState,
  errorState,
  ref,
  ...props
}: DataTableBodyProps<TRow>) {
  // Reads `.getVirtualItems()`/`.getTotalSize()` off the virtualizer
  // instance from context — same staleness risk as `DataTableRoot`, opted
  // out at the function level rather than excluding the whole file.
  "use no memo";
  // Only `nav`/`virtualizer` come from context here — neither is shaped by
  // `TRow`, so `<object>` is honest rather than asserting a type this call
  // has no way to back up (see the `table` prop's own doc comment above).
  const { nav, virtualizer, rowIndexById } = useDataTableContext<object>();
  const isEmpty = state === "idle" && table.rows.length === 0 && emptyState !== undefined;

  let content: ReactNode;
  if (state === "loading") {
    content = <DataTableBodyMessageRow liveRole="status">{loadingState}</DataTableBodyMessageRow>;
  } else if (state === "error") {
    content = <DataTableBodyMessageRow liveRole="alert">{errorState}</DataTableBodyMessageRow>;
  } else if (state === "empty" || isEmpty) {
    content = <DataTableBodyMessageRow>{emptyState}</DataTableBodyMessageRow>;
  } else {
    const activeRowIndex = nav.activeCell ? (rowIndexById.get(nav.activeCell.rowId) ?? -1) : -1;
    const virtualRows = withActiveRow(virtualizer.getVirtualItems(), virtualizer, activeRowIndex);
    content = (
      <div style={{ position: "relative", height: virtualizer.getTotalSize() }}>
        {virtualRows.map((virtualRow) => {
          const row = table.rows[virtualRow.index];
          return row ? children(row) : null;
        })}
      </div>
    );
  }

  return (
    <div ref={ref} role="rowgroup" className={cn(className)} {...props}>
      {content}
    </div>
  );
}

interface DataTableRowProps<TRow extends object> extends ComponentPropsWithoutRef<"div"> {
  row: DataTableRow<TRow>;
  ref?: Ref<HTMLDivElement>;
}

/**
 * `position: absolute` + `translateY` from the virtualizer's own
 * measurement cache — not `getVirtualItems()`, which only covers the
 * currently-visible window — so a row unioned in early by `withActiveRow`
 * (keyboard-active but not yet scrolled into view) still positions
 * correctly, same as `Combobox`'s off-screen highlighted item.
 */
function DataTableRowComponent<TRow extends object>({
  row,
  className,
  style,
  ref,
  ...props
}: DataTableRowProps<TRow>) {
  // Reads `.measurementsCache` off the virtualizer instance from context —
  // same staleness risk as `DataTableRoot`/`DataTableBody`.
  "use no memo";
  const { virtualizer, table } = useDataTableContext<TRow>();
  const selected = table.selection.isRowSelected(row.id);
  const measured = virtualizer.measurementsCache[row.index];
  const virtualStyle: CSSProperties = measured
    ? {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        transform: `translateY(${measured.start}px)`,
      }
    : {};
  return (
    <div
      ref={ref}
      role="row"
      aria-selected={selected ? "true" : undefined}
      data-selected={selected ? "" : undefined}
      className={cn("flex data-selected:bg-bg-subtle", className)}
      style={{ ...virtualStyle, ...style }}
      {...props}
    />
  );
}

interface DataTableCellProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  cell: DataTableCell;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

interface DataTableCellEditorProps {
  cell: DataTableCell;
  table: Pick<UseDataTableResult<object>, "editCell">;
  nav: UseDataTableKeyboardNavResult;
  rowIds: string[];
  columnIds: string[];
  rowIndexById: Map<string, number>;
  columnIndexById: Map<string, number>;
}

/**
 * Renders in place of `cell.render()` while `nav.isEditing` — a real,
 * focused `<input>` (not `aria-activedescendant`), matching this grid's
 * roving-tabindex keyboard model. Enter/Tab commit and move the active cell (reusing
 * `computeNextActiveCell`, the same pure function arrow-key nav uses, so
 * the destination clamps at the grid edge the same way); Escape reverts
 * without committing; blur commits, since only an explicit Escape counts
 * as "changed your mind" — clicking away is a completed edit, not a
 * discard, matching common spreadsheet UX.
 */
function DataTableCellEditor({
  cell,
  table,
  nav,
  rowIds,
  columnIds,
  rowIndexById,
  columnIndexById,
}: DataTableCellEditorProps) {
  const [value, setValue] = useState(() => (cell.value == null ? "" : String(cell.value)));
  // Escape both reverts (no commit) and moves focus off the input as a
  // side effect of `stopEditing` unmounting it — without this flag, that
  // focus-loss would also trigger `handleBlur`'s own commit, undoing the
  // revert.
  const justEscapedRef = useRef(false);

  function commit() {
    table.editCell(cell.rowId, cell.columnId, cell.editor === "number" ? Number(value) : value);
  }

  function moveActiveCell(key: "ArrowDown" | "ArrowRight" | "ArrowLeft") {
    const next = computeNextActiveCell(
      { rowIds, columnIds, rowIndexById, columnIndexById },
      { rowId: cell.rowId, columnId: cell.columnId },
      key,
      0,
    );
    if (next) nav.setActiveCell(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
      nav.stopEditing();
      moveActiveCell("ArrowDown");
    } else if (event.key === "Tab") {
      event.preventDefault();
      commit();
      nav.stopEditing();
      moveActiveCell(event.shiftKey ? "ArrowLeft" : "ArrowRight");
    } else if (event.key === "Escape") {
      event.preventDefault();
      justEscapedRef.current = true;
      nav.stopEditing();
    }
  }

  function handleBlur() {
    if (justEscapedRef.current) {
      justEscapedRef.current = false;
      return;
    }
    commit();
    nav.stopEditing();
  }

  return (
    <input
      autoFocus
      aria-label={`Edit ${cell.columnId}`}
      type={cell.editor === "number" ? "number" : "text"}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="w-full bg-transparent outline-none"
    />
  );
}

function DataTableCellComponent({
  cell,
  className,
  children,
  style,
  ref,
  onKeyDown,
  onFocus,
  onDoubleClick,
  ...props
}: DataTableCellProps) {
  const { table, nav, density, rowIds, columnIds, rowIndexById, columnIndexById } =
    useDataTableContext<object>();
  const active = nav.isActive(cell.rowId, cell.columnId);
  const editing = cell.editable && nav.isEditing(cell.rowId, cell.columnId);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (cell.editable && event.key === "Enter") {
      event.preventDefault();
      nav.startEditing();
      return;
    }
    nav.onCellKeyDown(event);
  }

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    onFocus?.(event);
    // React's synthetic focus bubbles from a descendant (the edit editor's
    // own input) — ignore that case, or entering edit mode would re-fire
    // this on the same cell and needlessly rebuild `activeCell`.
    if (event.target !== event.currentTarget) return;
    nav.setActiveCell({ rowId: cell.rowId, columnId: cell.columnId });
  }

  function handleDoubleClick(event: MouseEvent<HTMLDivElement>) {
    onDoubleClick?.(event);
    if (event.defaultPrevented || !cell.editable) return;
    nav.activateAndEdit({ rowId: cell.rowId, columnId: cell.columnId });
  }

  const { state } = cell;

  return (
    <div
      ref={mergeRefs(ref, (el: HTMLDivElement | null) =>
        nav.registerCell(cell.rowId, cell.columnId, el),
      )}
      role="gridcell"
      tabIndex={active ? 0 : -1}
      aria-invalid={state.error ? "true" : undefined}
      data-active={active ? "" : undefined}
      data-out-of-range={state.outOfRange ? "" : undefined}
      data-flagged={state.flagged ? "" : undefined}
      data-readonly={state.readonly ? "" : undefined}
      data-error={state.error ? "" : undefined}
      data-loading={state.loading ? "" : undefined}
      data-edited={state.edited ? "" : undefined}
      data-pinned={cell.pinned || undefined}
      className={cn(
        // Driven by `data-active` (this cell's roving-tabindex state, from
        // `nav.isActive`), not `:focus-visible` — the browser's own
        // pointer-vs-keyboard heuristic hides `:focus-visible` on a mouse
        // click, but the active cell is a spreadsheet-style "you are here"
        // indicator the user needs regardless of how they got there, and it
        // has to survive edit mode too, where real DOM focus moves to the
        // child input and a plain `:focus-visible` on this div would drop.
        "shrink-0 text-data text-text data-active:outline-2 data-active:-outline-offset-2 data-active:outline-border-focus",
        DENSITY_PADDING_CLASSES[density],
        "data-edited:bg-accent-subtle data-error:bg-status-error-bg data-error:text-status-error data-flagged:bg-status-warning-bg data-loading:opacity-60 data-out-of-range:text-status-warning data-readonly:text-text-secondary",
        "data-pinned:sticky data-pinned:z-[1] data-pinned:bg-bg-elevated",
        ALIGN_CLASSES[cell.align],
        className,
      )}
      style={{ width: cell.width, ...pinnedInsetStyle(cell.pinned, cell.pinnedOffset), ...style }}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onDoubleClick={handleDoubleClick}
      {...props}
    >
      {editing ? (
        <DataTableCellEditor
          cell={cell}
          table={table}
          nav={nav}
          rowIds={rowIds}
          columnIds={columnIds}
          rowIndexById={rowIndexById}
          columnIndexById={columnIndexById}
        />
      ) : (
        (children ?? cell.render())
      )}
    </div>
  );
}

/** Only the slice `SearchInput` needs — avoids tying it to a `TRow` generic. */
interface DataTableSearchInputTable {
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
}

interface DataTableSearchInputProps extends Omit<
  ComponentPropsWithoutRef<typeof Input>,
  "value" | "defaultValue" | "onChange"
> {
  table: DataTableSearchInputTable;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Optional opt-in piece — a thin `Input` wrapper bound to `table.globalFilter`.
 * Takes `table` as an explicit prop rather than reading `DataTable.Root`'s
 * context: a search box is toolbar content, not a grid cell, so it's meant
 * to be rendered as a sibling of `Root` (e.g. above it), not nested inside
 * the `role="grid"` element where only rows/rowgroups belong per WAI-ARIA.
 */
function DataTableSearchInput({
  table,
  label = "Search",
  placeholder = "Search...",
  prefix,
  ref,
  ...props
}: DataTableSearchInputProps) {
  return (
    <Input
      ref={ref}
      type="search"
      label={label}
      placeholder={placeholder}
      value={table.globalFilter}
      onChange={(event) => table.setGlobalFilter(event.target.value)}
      prefix={prefix ?? <Search className="size-4 text-text-secondary" aria-hidden="true" />}
      {...props}
    />
  );
}

interface DataTableFilterButtonProps extends Omit<ComponentPropsWithoutRef<"button">, "children"> {
  header: DataTableHeaderCell;
  /** Placeholder for the popover's filter input. Default `"Filter"`. */
  placeholder?: string;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Optional opt-in piece — renders nothing for a column with `header.filterable`
 * false. A trigger button opening a small floating popover with a single text
 * input bound to `header.filterValue`. DataTable has no Ark UI primitive
 * underneath it (unlike Combobox/Select/Menu), so open state, outside-click
 * dismiss, and Escape-to-close are hand-rolled here rather than inherited —
 * only the positioning math is shared, via `useFloatingPosition`.
 */
function DataTableFilterButton({
  header,
  placeholder = "Filter",
  className,
  ref,
  ...props
}: DataTableFilterButtonProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const { positionerRef, rect } = useFloatingPosition(open, anchorRef, {
    placement: "bottom-start",
  });

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || positionerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, positionerRef]);

  if (!header.filterable) return null;

  const filterValue = typeof header.filterValue === "string" ? header.filterValue : "";
  const active = filterValue !== "";
  const label = typeof header.label === "string" ? header.label : header.columnId;

  return (
    <>
      <button
        type="button"
        ref={mergeRefs(ref, anchorRef)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Filter ${label}`}
        data-active={active ? "" : undefined}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "size-5 rounded inline-flex shrink-0 items-center justify-center text-text-secondary hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus data-active:text-accent",
          className,
        )}
        {...props}
      >
        <Filter className="size-3.5" aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={positionerRef}
            role="dialog"
            aria-label={`Filter ${label}`}
            style={floatingPositionerStyle(rect)}
            className="w-48 shadow-lg z-50 rounded-md border border-border bg-bg-elevated p-inset-sm"
          >
            <input
              autoFocus
              value={filterValue}
              placeholder={placeholder}
              aria-label={`Filter ${label}`}
              onChange={(event) => header.onFilterChange?.(event.target.value)}
              className="rounded w-full border border-border bg-transparent px-inset-sm py-inset-2xs text-label outline-none focus-visible:outline-2 focus-visible:outline-border-focus"
            />
          </div>,
          document.body,
        )}
    </>
  );
}

// A plain namespace object, not `Object.assign` onto a callable root: unlike
// `Card`/`Tabs`, DataTable has no bare `<DataTable>` usage — every render
// starts at `DataTable.Root`, mirroring Ark UI's own `Root`/`Trigger`/...
// compound naming (CONTRIBUTING.md's Component Architecture Pattern, point 7).
const DataTable = {
  Root: DataTableRoot,
  Header: DataTableHeader,
  HeaderRow: DataTableHeaderRow,
  HeaderCell: DataTableHeaderCellComponent,
  SortButton: DataTableSortButton,
  ResizeHandle: DataTableResizeHandle,
  SearchInput: DataTableSearchInput,
  FilterButton: DataTableFilterButton,
  SelectionHeaderCell: DataTableSelectionHeaderCell,
  SelectionCell: DataTableSelectionCell,
  Body: DataTableBody,
  Row: DataTableRowComponent,
  Cell: DataTableCellComponent,
};

export { DataTable };
