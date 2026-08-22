import { useMemo, useRef, useState } from "react";
import {
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnFiltersState,
  type Row,
  type SortingState,
} from "@tanstack/react-table";
import { formatDataTableNumber } from "./format";
import type {
  DataTableCell,
  DataTableCellState,
  DataTableColumnDef,
  DataTableColumnFilter,
  DataTableColumnPinningState,
  DataTableHeaderCell,
  DataTablePinned,
  DataTableRow,
  DataTableSelectionState,
  DataTableSortState,
  UseDataTableOptions,
  UseDataTableResult,
} from "./types";

/** Composite key into the adapter's public `editedCellIds`. */
function editValueKey(rowId: string, columnId: string): string {
  return `${rowId}:${columnId}`;
}

/**
 * Rebuilds a single already-built cell with an edited value overriding
 * `cell.getValue()` — used to patch just the rows an edit actually
 * touches (see `patchRowForEdits`), instead of the full `rows` builder
 * recomputing every cell of every row on each edit commit.
 */
function patchCellForEdit<TRow extends object>(
  cell: DataTableCell,
  row: DataTableRow<TRow>,
  def: DataTableColumnDef<TRow> | undefined,
  value: unknown,
): DataTableCell {
  const ctx = { row, value, columnId: cell.columnId };
  const outOfRange =
    def?.format?.rangeCheck !== undefined && typeof value === "number"
      ? formatDataTableNumber(value, def.format).range !== "in-range"
      : false;
  const customState = def?.cellState?.(ctx) ?? {};
  return {
    ...cell,
    value,
    state: {
      outOfRange,
      flagged: customState.flagged ?? false,
      readonly: customState.readonly ?? false,
      error: customState.error ?? false,
      loading: customState.loading ?? false,
      edited: true,
    },
    render: () => {
      if (typeof def?.cell === "function") return def.cell(ctx);
      if (def?.cell !== undefined) return def.cell;
      return value == null ? "" : String(value);
    },
  };
}

/**
 * Patches only the cells `edits` (this row's slice of `editedValuesByRow`)
 * actually covers, reusing every other cell's exact object reference.
 */
function patchRowForEdits<TRow extends object>(
  row: DataTableRow<TRow>,
  edits: Record<string, unknown>,
  columnDefsById: Map<string, DataTableColumnDef<TRow>>,
): DataTableRow<TRow> {
  // Mirrors the base builder below: a cell's own `ctx.row` sees `cells:
  // []`, since it's constructed there before `row.cells` is populated —
  // cellState/cell callbacks get the same shape regardless of which path
  // built the cell.
  const ctxRow: DataTableRow<TRow> = { ...row, cells: [] };
  return {
    ...row,
    cells: row.cells.map((cell) =>
      Object.hasOwn(edits, cell.columnId)
        ? patchCellForEdit(cell, ctxRow, columnDefsById.get(cell.columnId), edits[cell.columnId])
        : cell,
    ),
  };
}

/**
 * Feature registration is additive — each addition is real tree-shaking,
 * not just unused API surface. Row selection deliberately has no slot
 * here — unlike sorting/filtering, it doesn't change which rows the row
 * model computes,
 * it's independent presentational state layered on top of the already-
 * resolved `rows` array, so it's simpler and just as correct to hand-roll
 * (a plain `Set<string>` of selected ids, walked against the adapter's own
 * `rows`) than to route it through tanstack's row-selection feature — whose
 * built-in shift-range handling (`row.getToggleSelectedHandler()`) needs the
 * raw browser click event forwarded through, which doesn't fit behind our
 * own `Checkbox` component's `onCheckedChange({ checked })` API anyway.
 */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  columnVisibilityFeature,
  columnOrderingFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnPinningFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
});

/** Default column/global filter: case-insensitive substring match. */
function defaultFilter(value: unknown, filterValue: unknown): boolean {
  if (filterValue == null || filterValue === "") return true;
  return String(value ?? "")
    .toLowerCase()
    .includes(String(filterValue).toLowerCase());
}

function toColumnFiltersState(filters: DataTableColumnFilter[]): ColumnFiltersState {
  return filters.map((f) => ({ id: f.columnId, value: f.value }));
}

function fromColumnFiltersState(state: ColumnFiltersState): DataTableColumnFilter[] {
  return state.map((f) => ({ columnId: f.id, value: f.value }));
}

function toSortingState(sort: DataTableSortState): SortingState {
  return sort ? [{ id: sort.columnId, desc: sort.direction === "desc" }] : [];
}

function fromSortingState(sorting: SortingState): DataTableSortState {
  const first = sorting[0];
  return first ? { columnId: first.id, direction: first.desc ? "desc" : "asc" } : null;
}

const EMPTY_PINNING: DataTableColumnPinningState = { start: [], end: [] };
const EMPTY_SELECTION: Set<string> = new Set();

function initialPinningFromDefs<TRow extends object>(
  defs: DataTableColumnDef<TRow>[],
): DataTableColumnPinningState {
  const start: string[] = [];
  const end: string[] = [];
  for (const def of defs) {
    if (def.pinned === "start") start.push(def.id);
    else if (def.pinned === "end") end.push(def.id);
  }
  return start.length || end.length ? { start, end } : EMPTY_PINNING;
}

/**
 * Value-or-updater state that's controlled when `controlled !== undefined`,
 * otherwise backed by internal state seeded from `defaultValue` — the same
 * shape `sort` above already uses, generalized so visibility/order/sizing/
 * pinning don't each hand-roll it.
 */
function useControllableState<T>(
  controlled: T | undefined,
  defaultValue: T,
  onChange: ((value: T) => void) | undefined,
): [T, (updater: T | ((old: T) => T)) => void] {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : uncontrolled;
  function set(updater: T | ((old: T) => T)) {
    const next = typeof updater === "function" ? (updater as (old: T) => T)(value) : updater;
    if (!isControlled) setUncontrolled(next);
    onChange?.(next);
  }
  return [value, set];
}

/**
 * Adapts `@tanstack/react-table` v9 into DataTable's own plain-object API.
 * This is the only file that imports from tanstack — nothing tanstack-typed
 * crosses out of it, so the engine is swappable later without touching the
 * view layer or consumers. Rendering is driven entirely by the caller's own
 * `DataTableColumnDef.header`/`cell`, not tanstack's columnDef/flexRender —
 * tanstack here is used purely for row processing and value resolution.
 */
export function useDataTable<TRow extends object>(
  options: UseDataTableOptions<TRow>,
): UseDataTableResult<TRow> {
  const {
    data,
    columns: columnDefs,
    getRowId,
    sort,
    defaultSort,
    onSortChange,
    columnVisibility: controlledColumnVisibility,
    defaultColumnVisibility,
    onColumnVisibilityChange,
    columnOrder: controlledColumnOrder,
    defaultColumnOrder,
    onColumnOrderChange,
    columnSizing: controlledColumnSizing,
    defaultColumnSizing,
    onColumnSizingChange,
    columnPinning: controlledColumnPinning,
    defaultColumnPinning,
    onColumnPinningChange,
    globalFilter: controlledGlobalFilter,
    defaultGlobalFilter,
    onGlobalFilterChange,
    columnFilters: controlledColumnFilters,
    defaultColumnFilters,
    onColumnFiltersChange,
    selectedRowIds: controlledSelectedRowIds,
    defaultSelectedRowIds,
    onSelectedRowIdsChange,
    onCellEdit,
  } = options;

  const isSortControlled = sort !== undefined;
  const [uncontrolledSorting, setUncontrolledSorting] = useState<SortingState>(() =>
    toSortingState(defaultSort ?? null),
  );
  const sorting = isSortControlled ? toSortingState(sort) : uncontrolledSorting;

  function handleSortingChange(updater: SortingState | ((old: SortingState) => SortingState)) {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    if (!isSortControlled) setUncontrolledSorting(next);
    onSortChange?.(fromSortingState(next));
  }

  const [columnVisibility, setColumnVisibility] = useControllableState(
    controlledColumnVisibility,
    defaultColumnVisibility ?? {},
    onColumnVisibilityChange,
  );
  const [columnOrder, setColumnOrderState] = useControllableState(
    controlledColumnOrder,
    defaultColumnOrder ?? [],
    onColumnOrderChange,
  );
  const [columnSizing, setColumnSizing] = useControllableState(
    controlledColumnSizing,
    defaultColumnSizing ?? {},
    onColumnSizingChange,
  );
  const [columnPinning, setColumnPinningState] = useControllableState(
    controlledColumnPinning,
    defaultColumnPinning ?? initialPinningFromDefs(columnDefs),
    onColumnPinningChange,
  );
  const [globalFilter, setGlobalFilterState] = useControllableState(
    controlledGlobalFilter,
    defaultGlobalFilter ?? "",
    onGlobalFilterChange,
  );
  const [columnFiltersState, setColumnFiltersState] = useControllableState(
    controlledColumnFilters ? toColumnFiltersState(controlledColumnFilters) : undefined,
    toColumnFiltersState(defaultColumnFilters ?? []),
    (next) => onColumnFiltersChange?.(fromColumnFiltersState(next)),
  );
  const [selectedIds, setSelectedIds] = useControllableState(
    controlledSelectedRowIds,
    defaultSelectedRowIds ?? EMPTY_SELECTION,
    onSelectedRowIdsChange,
  );
  // The shift-range anchor — the last row toggled via `toggleRow` or landed
  // on via `toggleRange`. Not state: changing it should never itself cause
  // a re-render, only the selection it produces does.
  const rangeAnchorRef = useRef<string | null>(null);

  // Local edit state, uncontrolled (no options pair for it) — edits are
  // optimistic and live here until the consumer's own `data` catches up (or
  // doesn't); `onCellEdit` is the hand-off point for persisting them. Keyed
  // by row id first, not a flat `${rowId}:${columnId}` composite key — the
  // `rows` builder below needs to know *which rows* have any edit at all
  // without scanning every key, so an edit to one row can patch just that
  // row's cells instead of rebuilding the whole table.
  const [editedValuesByRow, setEditedValuesByRow] = useState<
    Record<string, Record<string, unknown>>
  >({});

  const helper = useMemo(() => createColumnHelper<typeof features, TRow>(), []);
  // Cast once: tanstack's `.accessor()` overloads resolve `TValue` from a
  // literal accessor key/function, which doesn't work through our own
  // generic `TRow` — safe because `def.accessorKey`/`accessorFn` are already
  // typed against `TRow` at our own public API boundary (types.ts).
  const accessorColumn = helper.accessor as (
    accessor: unknown,
    column: { id: string },
  ) => ReturnType<typeof helper.display>;

  const columnDefsById = useMemo(() => {
    const map = new Map<string, DataTableColumnDef<TRow>>();
    for (const def of columnDefs) map.set(def.id, def);
    return map;
  }, [columnDefs]);

  // Non-memoized: cheap closure, and useTable's own options object is
  // already rebuilt fresh every render anyway (see `columns` below, which
  // isn't referentially stable across `columnDefsById` changes either).
  function filterRowFn(
    row: Row<typeof features, TRow>,
    columnId: string,
    filterValue: unknown,
  ): boolean {
    const def = columnDefsById.get(columnId);
    const value = row.getValue(columnId);
    return def?.filterFn
      ? def.filterFn(value, filterValue, row.original)
      : defaultFilter(value, filterValue);
  }

  const columns = useMemo(
    () =>
      helper.columns(
        columnDefs.map((def) => {
          const columnOptions = {
            id: def.id,
            enableSorting: def.sortable === true,
            enableColumnFilter: def.filterable === true,
            filterFn: filterRowFn,
            size: def.width,
            minSize: def.minWidth,
            maxSize: def.maxWidth,
          };
          if (def.accessorFn) return accessorColumn(def.accessorFn, columnOptions);
          if (def.accessorKey) return accessorColumn(def.accessorKey, columnOptions);
          return helper.display(columnOptions);
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterRowFn closes over columnDefsById, already a dep
    [helper, columnDefs],
  );

  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row: TRow, index: number) => getRowId(row, index),
    globalFilterFn: filterRowFn,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnSizing,
      columnPinning,
      globalFilter,
      columnFilters: columnFiltersState,
    },
    onSortingChange: handleSortingChange,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrderState,
    onColumnSizingChange: setColumnSizing,
    onColumnPinningChange: setColumnPinningState,
    onGlobalFilterChange: setGlobalFilterState,
    onColumnFiltersChange: setColumnFiltersState,
    enableMultiSort: false,
    columnResizeMode: "onChange",
  });

  const headerCells: DataTableHeaderCell[] = useMemo(
    () =>
      (table.getHeaderGroups()[0]?.headers ?? []).map((header) => {
        const def = columnDefsById.get(header.column.id);
        const canSort = header.column.getCanSort();
        const pinned = header.column.getIsPinned();
        const canResize = header.column.getCanResize();
        return {
          id: header.id,
          columnId: header.column.id,
          label: header.isPlaceholder
            ? null
            : typeof def?.header === "function"
              ? def.header({ columnId: header.column.id })
              : (def?.header ?? null),
          align: def?.align ?? "start",
          width: header.column.getSize(),
          sortable: canSort,
          sortDirection: header.column.getIsSorted(),
          onSortClick: canSort ? () => header.column.toggleSorting() : undefined,
          pinned,
          pinnedOffset:
            pinned === "start"
              ? header.column.getStart("start")
              : pinned === "end"
                ? header.column.getAfter("end")
                : undefined,
          onPin: (next) => header.column.pin(next),
          resize: canResize
            ? {
                onPointerDown: header.getResizeHandler(),
                isResizing: header.column.getIsResizing(),
              }
            : undefined,
          filterable: header.column.getCanFilter(),
          filterValue: header.column.getFilterValue(),
          onFilterChange: header.column.getCanFilter()
            ? (value: unknown) => header.column.setFilterValue(value)
            : undefined,
        };
      }),
    // `table` intentionally omitted — see the same-shaped comment on
    // `baseRows` below. Headers don't depend on `data`/`globalFilter`
    // (which columns exist and how they're configured, not which rows
    // matched), but do depend on everything else that shapes a column.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above; table intentionally omitted
    [
      columns,
      sorting,
      columnVisibility,
      columnOrder,
      columnSizing,
      columnPinning,
      columnFiltersState,
      columnDefsById,
    ],
  );

  // Always built with unedited values (`cell.getValue()`, never
  // `editedValuesByRow`) — deliberately not a dependency, so this only
  // rebuilds on real data/sort/filter changes, never on an edit commit.
  // `rows` below patches edits in afterward, touching only the specific
  // rows an edit actually covers.
  const baseRows: DataTableRow<TRow>[] = useMemo(
    () =>
      table.getRowModel().rows.map((rawRow) => {
        const row: DataTableRow<TRow> = {
          id: rawRow.id,
          original: rawRow.original,
          // `rawRow.index` is tanstack's creation-time position in the
          // original data array (verified against its own `core` skill
          // docs) — wrong for a sorted/filtered view. `getDisplayIndex()` is
          // the row's position in the current sorted/filtered order, which
          // is what a consumer reading `row.index` off a rendered row would
          // actually expect, and what the view layer's virtualizer (a later
          // checkpoint) correlates against `table.rows`' own array position.
          index: rawRow.getDisplayIndex(),
          cells: [],
        };
        const cells: DataTableCell[] = rawRow.getVisibleCells().map((cell) => {
          const def = columnDefsById.get(cell.column.id);
          const value = cell.getValue();
          const ctx = { row, value, columnId: cell.column.id };
          const outOfRange =
            def?.format?.rangeCheck !== undefined && typeof value === "number"
              ? formatDataTableNumber(value, def.format).range !== "in-range"
              : false;
          const customState = def?.cellState?.(ctx) ?? {};
          const state: DataTableCellState = {
            outOfRange,
            flagged: customState.flagged ?? false,
            readonly: customState.readonly ?? false,
            error: customState.error ?? false,
            loading: customState.loading ?? false,
            edited: false,
          };
          const pinned = cell.column.getIsPinned();
          return {
            id: cell.id,
            rowId: row.id,
            columnId: cell.column.id,
            value,
            align: def?.align ?? "start",
            state,
            width: cell.column.getSize(),
            pinned,
            pinnedOffset:
              pinned === "start"
                ? cell.column.getStart("start")
                : pinned === "end"
                  ? cell.column.getAfter("end")
                  : undefined,
            editable: def?.editable === true,
            editor: def?.editor ?? "text",
            render: () => {
              if (typeof def?.cell === "function") return def.cell(ctx);
              if (def?.cell !== undefined) return def.cell;
              return value == null ? "" : String(value);
            },
          };
        });
        row.cells = cells;
        return row;
      }),
    // `table` is deliberately not a dependency, despite being read inside:
    // tanstack's own `useTable` returns a new wrapper object on *every*
    // render (its internal memo keys off the options object we pass,
    // which is itself rebuilt fresh every render) — depending on `table`
    // directly would defeat the point of this memo entirely, rebuilding
    // every row on every render regardless of whether anything relevant
    // changed. Depending on the actual inputs that affect the row model
    // instead — everything `table`'s options carry except `data`'s own
    // edits/selection, which live outside tanstack entirely — gets the
    // real thing: unchanged on an edit or selection commit, changed
    // exactly when sort/filter/visibility/data really do.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above; table intentionally omitted
    [
      data,
      columns,
      sorting,
      columnVisibility,
      columnOrder,
      columnSizing,
      columnPinning,
      globalFilter,
      columnFiltersState,
      columnDefsById,
    ],
  );

  const rows: DataTableRow<TRow>[] = useMemo(() => {
    const editedRowIds = Object.keys(editedValuesByRow);
    if (editedRowIds.length === 0) return baseRows;
    return baseRows.map((row) => {
      const edits = editedValuesByRow[row.id];
      return edits ? patchRowForEdits(row, edits, columnDefsById) : row;
    });
  }, [baseRows, editedValuesByRow, columnDefsById]);

  // Only rebuilds when `rows` itself does (data/sort/filter/edit changes),
  // not on selection changes — same identity-stability `rows` now has, so
  // range-select and edit lookups below are O(1) instead of scanning the
  // full array on every shift+click or edit commit.
  const rowIndexById = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row, index) => map.set(row.id, index));
    return map;
  }, [rows]);

  function toggleSort(columnId: string) {
    table.getColumn(columnId)?.toggleSorting();
  }

  function toggleColumnVisibility(columnId: string) {
    table.getColumn(columnId)?.toggleVisibility();
  }

  function setColumnOrder(order: string[]) {
    table.setColumnOrder(order);
  }

  function setColumnPinning(columnId: string, pinned: DataTablePinned) {
    table.getColumn(columnId)?.pin(pinned);
  }

  function resizeColumn(columnId: string, width: number) {
    const column = table.getColumn(columnId);
    if (!column) return;
    const minSize = column.columnDef.minSize ?? 20;
    const maxSize = column.columnDef.maxSize ?? Number.MAX_SAFE_INTEGER;
    const clamped = Math.min(Math.max(width, minSize), maxSize);
    setColumnSizing((old) => ({ ...old, [columnId]: clamped }));
  }

  function setColumnFilter(columnId: string, value: unknown) {
    table.getColumn(columnId)?.setFilterValue(value);
  }

  function clearColumnFilter(columnId: string) {
    table.getColumn(columnId)?.setFilterValue(undefined);
  }

  function isRowSelected(rowId: string) {
    return selectedIds.has(rowId);
  }

  function toggleRow(rowId: string) {
    rangeAnchorRef.current = rowId;
    setSelectedIds((old) => {
      const next = new Set(old);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }

  function toggleRange(rowId: string) {
    const anchorId = rangeAnchorRef.current;
    const anchorIndex = anchorId === null ? -1 : (rowIndexById.get(anchorId) ?? -1);
    rangeAnchorRef.current = rowId;
    if (anchorIndex === -1) {
      toggleRow(rowId);
      return;
    }
    const targetIndex = rowIndexById.get(rowId);
    if (targetIndex === undefined) return;
    const [start, end] =
      anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
    const rangeIds = rows.slice(start, end + 1).map((row) => row.id);
    setSelectedIds((old) => {
      const next = new Set(old);
      for (const id of rangeIds) next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
    setSelectedIds(allSelected ? new Set() : new Set(rows.map((row) => row.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const selectedVisibleCount = rows.reduce((n, row) => n + (selectedIds.has(row.id) ? 1 : 0), 0);
  const isAllSelected = rows.length > 0 && selectedVisibleCount === rows.length;
  const selection: DataTableSelectionState = {
    selectedIds,
    isAllSelected,
    isSomeSelected: selectedVisibleCount > 0 && !isAllSelected,
    isRowSelected,
    toggleRow,
    toggleRange,
    toggleAll,
    clear: clearSelection,
  };

  function editCell(rowId: string, columnId: string, value: unknown) {
    setEditedValuesByRow((old) => ({
      ...old,
      [rowId]: { ...old[rowId], [columnId]: value },
    }));
    const rowIndex = rowIndexById.get(rowId);
    const row = rowIndex === undefined ? undefined : rows[rowIndex];
    if (row) onCellEdit?.({ rowId, columnId, value, row: row.original });
  }

  const editedCellIds = useMemo(() => {
    const ids = new Set<string>();
    for (const rowId in editedValuesByRow) {
      for (const columnId in editedValuesByRow[rowId]) {
        ids.add(editValueKey(rowId, columnId));
      }
    }
    return ids;
  }, [editedValuesByRow]);

  return {
    headerCells,
    rows,
    sort: fromSortingState(sorting),
    toggleSort,
    columnVisibility,
    toggleColumnVisibility,
    columnOrder,
    setColumnOrder,
    columnPinning,
    setColumnPinning,
    resizeColumn,
    globalFilter,
    setGlobalFilter: setGlobalFilterState,
    columnFilters: fromColumnFiltersState(columnFiltersState),
    setColumnFilter,
    clearColumnFilter,
    selection,
    editCell,
    editedCellIds,
  };
}
