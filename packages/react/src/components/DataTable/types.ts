import type { ReactNode } from "react";

/**
 * Public column-def and row/cell shapes for DataTable. Deliberately mirrors
 * none of `@tanstack/react-table`'s types — `useDataTable` is the only file
 * that imports from tanstack, so the engine can be swapped later without
 * touching consumers or the view layer.
 */

export type DataTableAlign = "start" | "center" | "end";

export interface DataTableHeaderContext {
  columnId: string;
}

export interface DataTableCellContext<TRow extends object, TValue = unknown> {
  row: DataTableRow<TRow>;
  value: TValue;
  columnId: string;
}

export type DataTableNumberRange = "low" | "high" | "in-range";

export interface DataTableNumberFormat {
  precision?: number;
  /** `"decimals"` (default) rounds to a fixed number of decimal places; `"significantFigures"` rounds to that many significant digits. */
  precisionMode?: "decimals" | "significantFigures";
  unit?: string;
  rangeCheck?: (value: number) => DataTableNumberRange;
}

export interface DataTableFormattedNumber {
  text: string;
  unit?: string;
  range: DataTableNumberRange;
}

export interface DataTableCellState {
  outOfRange: boolean;
  flagged: boolean;
  readonly: boolean;
  error: boolean;
  loading: boolean;
  /** Has a local edit not yet reflected in `data` — set from the adapter's own edit-tracking, not a `cellState` callback. */
  edited: boolean;
}

export type DataTableCellEditor = "text" | "number";

export type DataTablePinned = "start" | "end" | false;

export interface DataTableColumnDef<TRow extends object, TValue = unknown> {
  id: string;
  /** Top-level key on `TRow`. Use `accessorFn` for computed or nested values. */
  accessorKey?: keyof TRow & string;
  accessorFn?: (row: TRow) => TValue;
  header: ReactNode | ((ctx: DataTableHeaderContext) => ReactNode);
  /** Defaults to rendering the resolved value as text when omitted. */
  cell?: ReactNode | ((ctx: DataTableCellContext<TRow, TValue>) => ReactNode);
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: DataTableAlign;
  sortable?: boolean;
  filterable?: boolean;
  /** Value-level comparator: receives the column's already-resolved cell value, not a raw row. Defaults to a case-insensitive substring match. */
  filterFn?: (value: TValue, filterValue: unknown, row: TRow) => boolean;
  /** Seeds initial pin state — pinning itself lives in adapter state (`columnPinning`), since it's runtime-mutable. */
  pinned?: DataTablePinned;
  /** Numeric formatting — pairs with `numericCell(format)` from `format.tsx` as the column's `cell`; also drives `outOfRange` via `rangeCheck` regardless of which `cell` renderer is used. */
  format?: DataTableNumberFormat;
  /** Per-cell flags beyond `outOfRange` (which `format.rangeCheck` already derives) and `edited` (which the adapter's own edit-tracking derives). Merged into `DataTableCell.state`. */
  cellState?: (
    ctx: DataTableCellContext<TRow, TValue>,
  ) => Partial<Omit<DataTableCellState, "outOfRange" | "edited">>;
  /** Opts the column into `DataTable.Cell`'s inline editor on Enter. */
  editable?: boolean;
  /** Which editor `DataTable.Cell` renders when editing. Default `"text"`. */
  editor?: DataTableCellEditor;
  meta?: Record<string, unknown>;
}

/** Single-column for v1 — no confirmed multi-sort requirement. Upgrading to an array later is an adapter-only change. */
export type DataTableSortState = { columnId: string; direction: "asc" | "desc" } | null;

export interface DataTableCell {
  id: string;
  rowId: string;
  columnId: string;
  value: unknown;
  align: DataTableAlign;
  render: () => ReactNode;
  state: DataTableCellState;
  /** Matches the column's `DataTableHeaderCell.width` — cells need their own width to stay aligned with the header, since flex children don't inherit a sibling's size. */
  width: number;
  pinned: DataTablePinned;
  /** px inset from the pinned side (`insetInlineStart`/`insetInlineEnd`), `undefined` when not pinned. */
  pinnedOffset: number | undefined;
  editable: boolean;
  /** Which editor to render when editing — meaningful only when `editable` is true. */
  editor: DataTableCellEditor;
}

/** Passed to `onCellEdit` when a cell's inline edit commits. */
export interface DataTableCellEdit<TRow extends object> {
  rowId: string;
  columnId: string;
  value: unknown;
  row: TRow;
}

export interface DataTableRow<TRow extends object> {
  id: string;
  original: TRow;
  index: number;
  cells: DataTableCell[];
}

export interface DataTableHeaderCellResize {
  /** Bind to both `onMouseDown` and `onTouchStart` — tanstack's handler internally distinguishes the two. */
  onPointerDown: (event: unknown) => void;
  isResizing: boolean;
}

export interface DataTableHeaderCell {
  id: string;
  columnId: string;
  label: ReactNode;
  align: DataTableAlign;
  width: number | undefined;
  sortable: boolean;
  sortDirection: "asc" | "desc" | false;
  onSortClick?: () => void;
  pinned: DataTablePinned;
  /** px inset from the pinned side (`insetInlineStart`/`insetInlineEnd`), `undefined` when not pinned. */
  pinnedOffset: number | undefined;
  onPin: (pinned: DataTablePinned) => void;
  /** `undefined` when the column can't be resized. */
  resize?: DataTableHeaderCellResize;
  filterable: boolean;
  filterValue: unknown;
  onFilterChange?: (value: unknown) => void;
}

export interface DataTableColumnFilter {
  columnId: string;
  value: unknown;
}

export interface UseDataTableOptions<TRow extends object> {
  data: TRow[];
  columns: DataTableColumnDef<TRow>[];
  /**
   * Required, not optional with an index fallback — future selection and
   * edited-cell tracking key off this id, and a fallback to array index
   * would silently break identity across sort/filter once those land.
   */
  getRowId: (row: TRow, index: number) => string;

  sort?: DataTableSortState;
  defaultSort?: DataTableSortState;
  onSortChange?: (sort: DataTableSortState) => void;

  columnVisibility?: Record<string, boolean>;
  defaultColumnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;

  /** Unused by any v1 UI — exists so a future drag-reorder feature only needs to add a UI layer on top of this existing state. */
  columnOrder?: string[];
  defaultColumnOrder?: string[];
  onColumnOrderChange?: (order: string[]) => void;

  columnSizing?: Record<string, number>;
  defaultColumnSizing?: Record<string, number>;
  onColumnSizingChange?: (sizing: Record<string, number>) => void;

  columnPinning?: DataTableColumnPinningState;
  defaultColumnPinning?: DataTableColumnPinningState;
  onColumnPinningChange?: (pinning: DataTableColumnPinningState) => void;

  globalFilter?: string;
  defaultGlobalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;

  columnFilters?: DataTableColumnFilter[];
  defaultColumnFilters?: DataTableColumnFilter[];
  onColumnFiltersChange?: (filters: DataTableColumnFilter[]) => void;

  selectedRowIds?: Set<string>;
  defaultSelectedRowIds?: Set<string>;
  onSelectedRowIdsChange?: (ids: Set<string>) => void;

  /** Fired when an inline edit commits (Enter/Tab/blur, not Escape). Edited values live in the adapter's own state — this is for the consumer to persist the change into their real data source. */
  onCellEdit?: (edit: DataTableCellEdit<TRow>) => void;
}

export interface DataTableColumnPinningState {
  start: string[];
  end: string[];
}

export interface DataTableSelectionState {
  selectedIds: Set<string>;
  isAllSelected: boolean;
  /** Indeterminate — some but not all currently-visible rows are selected. */
  isSomeSelected: boolean;
  isRowSelected: (rowId: string) => boolean;
  toggleRow: (rowId: string) => void;
  /**
   * Extends the selection from the last toggled row through `rowId`
   * (inclusive), walking the table's current sorted/filtered row order —
   * mirrors native shift+click range-select. Falls back to a plain
   * `toggleRow` when there's no prior anchor.
   */
  toggleRange: (rowId: string) => void;
  /** Selects every currently visible row, or clears the selection if all are already selected. */
  toggleAll: () => void;
  clear: () => void;
}

export interface UseDataTableResult<TRow extends object> {
  headerCells: DataTableHeaderCell[];
  rows: DataTableRow<TRow>[];
  sort: DataTableSortState;
  toggleSort: (columnId: string) => void;
  columnVisibility: Record<string, boolean>;
  toggleColumnVisibility: (columnId: string) => void;
  columnOrder: string[];
  setColumnOrder: (order: string[]) => void;
  columnPinning: DataTableColumnPinningState;
  setColumnPinning: (columnId: string, pinned: DataTablePinned) => void;
  resizeColumn: (columnId: string, width: number) => void;
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
  columnFilters: DataTableColumnFilter[];
  setColumnFilter: (columnId: string, value: unknown) => void;
  clearColumnFilter: (columnId: string) => void;
  selection: DataTableSelectionState;
  /** Commits a value into a cell's local edit state and fires `onCellEdit`. */
  editCell: (rowId: string, columnId: string, value: unknown) => void;
  /** Composite `${rowId}:${columnId}` keys for cells with a local edit — for an aggregate "N unsaved edits" indicator, not per-cell styling (use `cell.state.edited` for that). */
  editedCellIds: Set<string>;
}
