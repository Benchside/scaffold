import { useEffect, useMemo, useRef, useState } from "react";

export interface DataTableGridShape {
  rowIds: string[];
  columnIds: string[];
  /**
   * Precomputed `id -> index` lookups, used in place of `rowIds.indexOf`/
   * `columnIds.indexOf` when present — turns every arrow-key press from an
   * O(n) scan into an O(1) lookup. Optional so `computeNextActiveCell`
   * stays a plain, easily-testable pure function against a bare `{
   * rowIds, columnIds }` shape; `useDataTableKeyboardNav` always supplies
   * them.
   */
  rowIndexById?: Map<string, number>;
  columnIndexById?: Map<string, number>;
}

export interface DataTableActiveCell {
  rowId: string;
  columnId: string;
}

export type DataTableNavKey =
  | "ArrowUp"
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight"
  | "Home"
  | "End"
  | "ctrl+Home"
  | "ctrl+End"
  | "PageUp"
  | "PageDown";

const NAV_KEY_MAP: Record<string, DataTableNavKey | undefined> = {
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
};

/**
 * Pure grid-navigation logic — no DOM, no React — so it's testable against a
 * synthetic `{ rowIds, columnIds }` shape without the adapter or a real
 * render. Left/Right and Up/Down clamp at the grid edge rather than wrapping
 * into the next/previous row, matching the WAI-ARIA grid pattern (and
 * spreadsheet convention) rather than a listbox's wrap-around nav.
 */
export function computeNextActiveCell(
  grid: DataTableGridShape,
  current: DataTableActiveCell | null,
  key: DataTableNavKey,
  pageSize: number,
): DataTableActiveCell | null {
  const { rowIds, columnIds, rowIndexById, columnIndexById } = grid;
  if (rowIds.length === 0 || columnIds.length === 0) return null;
  if (!current) return { rowId: rowIds[0]!, columnId: columnIds[0]! };

  const rowIndex = Math.max(rowIndexById?.get(current.rowId) ?? rowIds.indexOf(current.rowId), 0);
  const columnIndex = Math.max(
    columnIndexById?.get(current.columnId) ?? columnIds.indexOf(current.columnId),
    0,
  );
  const lastRow = rowIds.length - 1;
  const lastColumn = columnIds.length - 1;

  switch (key) {
    case "ArrowUp":
      return { rowId: rowIds[Math.max(rowIndex - 1, 0)]!, columnId: current.columnId };
    case "ArrowDown":
      return { rowId: rowIds[Math.min(rowIndex + 1, lastRow)]!, columnId: current.columnId };
    case "ArrowLeft":
      return { rowId: current.rowId, columnId: columnIds[Math.max(columnIndex - 1, 0)]! };
    case "ArrowRight":
      return { rowId: current.rowId, columnId: columnIds[Math.min(columnIndex + 1, lastColumn)]! };
    case "Home":
      return { rowId: current.rowId, columnId: columnIds[0]! };
    case "End":
      return { rowId: current.rowId, columnId: columnIds[lastColumn]! };
    case "ctrl+Home":
      return { rowId: rowIds[0]!, columnId: columnIds[0]! };
    case "ctrl+End":
      return { rowId: rowIds[lastRow]!, columnId: columnIds[lastColumn]! };
    case "PageUp":
      return { rowId: rowIds[Math.max(rowIndex - pageSize, 0)]!, columnId: current.columnId };
    case "PageDown":
      return { rowId: rowIds[Math.min(rowIndex + pageSize, lastRow)]!, columnId: current.columnId };
    default:
      return current;
  }
}

export interface UseDataTableKeyboardNavOptions extends DataTableGridShape {
  /** Rows to move for PageUp/PageDown. Default 10 — refined once virtualization exposes the real viewport row count. */
  pageSize?: number;
}

export interface UseDataTableKeyboardNavResult {
  activeCell: DataTableActiveCell | null;
  setActiveCell: (cell: DataTableActiveCell) => void;
  registerCell: (rowId: string, columnId: string, el: HTMLElement | null) => void;
  isActive: (rowId: string, columnId: string) => boolean;
  onCellKeyDown: (event: {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    preventDefault: () => void;
  }) => void;
  /** The cell currently in inline-edit mode, or `null` — always either `null` or equal to `activeCell`, never a different cell. */
  editingCell: DataTableActiveCell | null;
  isEditing: (rowId: string, columnId: string) => boolean;
  /** Enters edit mode on the current `activeCell`. A no-op with no active cell. */
  startEditing: () => void;
  /** Makes `cell` the active cell and enters edit mode on it in one step — for double-click, which may target a cell that isn't `activeCell` yet. */
  activateAndEdit: (cell: DataTableActiveCell) => void;
  stopEditing: () => void;
}

function cellKey(rowId: string, columnId: string): string {
  return `${rowId}:${columnId}`;
}

/**
 * Roving-tabindex state and DOM focus management for DataTable's grid.
 * Deliberately independent of `useDataTable`/tanstack — the grid shape is
 * just row/column ids — so it stays testable in isolation (see
 * `computeNextActiveCell` above) and reusable once virtualization (a later
 * checkpoint) changes which cells are actually mounted.
 */
export function useDataTableKeyboardNav(
  options: UseDataTableKeyboardNavOptions,
): UseDataTableKeyboardNavResult {
  const { rowIds, columnIds, rowIndexById, columnIndexById, pageSize = 10 } = options;
  const grid = useMemo(
    () => ({ rowIds, columnIds, rowIndexById, columnIndexById }),
    [rowIds, columnIds, rowIndexById, columnIndexById],
  );

  const [activeCell, setActiveCellState] = useState<DataTableActiveCell | null>(() =>
    grid.rowIds.length > 0 && grid.columnIds.length > 0
      ? { rowId: grid.rowIds[0]!, columnId: grid.columnIds[0]! }
      : null,
  );

  const cellRefs = useRef(new Map<string, HTMLElement>());
  const [editingCell, setEditingCell] = useState<DataTableActiveCell | null>(null);

  const setActiveCell = (cell: DataTableActiveCell) => {
    // Bails out (via React's same-reference Object.is check) when the cell
    // hasn't actually changed, instead of always handing back a fresh
    // object. Without this, a redundant call — e.g. the focus effect below
    // re-focusing a cell that's already focused — still counts as a state
    // change, re-running that effect again, which (with more than one
    // DataTable mounted, each stealing focus back for its own active cell)
    // ping-pongs forever between them.
    setActiveCellState((current) =>
      current && current.rowId === cell.rowId && current.columnId === cell.columnId
        ? current
        : cell,
    );
    // Defensive, not the normal path — a cell's own edit-mode input commits
    // or reverts (and so calls `stopEditing`) on blur before focus ever
    // reaches a different cell. Guards `isEditing` against ever reporting
    // true for a cell that isn't also the active one.
    setEditingCell((current) =>
      current && (current.rowId !== cell.rowId || current.columnId !== cell.columnId)
        ? null
        : current,
    );
  };

  const isEditing = (rowId: string, columnId: string) =>
    editingCell !== null && editingCell.rowId === rowId && editingCell.columnId === columnId;

  const startEditing = () => {
    if (activeCell) setEditingCell(activeCell);
  };

  const activateAndEdit = (cell: DataTableActiveCell) => {
    // Double-click's target isn't necessarily `activeCell` yet — a click
    // and its own focus event happen first, but nothing guarantees that
    // update has landed by the time `dblclick` fires. Setting `editingCell`
    // straight to `cell`, rather than deferring to `startEditing`'s read of
    // `activeCell`, means this doesn't inherit that state's staleness.
    setActiveCell(cell);
    setEditingCell(cell);
  };

  const stopEditing = () => setEditingCell(null);

  const registerCell = (rowId: string, columnId: string, el: HTMLElement | null) => {
    const key = cellKey(rowId, columnId);
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  };

  const isActive = (rowId: string, columnId: string) =>
    activeCell !== null && activeCell.rowId === rowId && activeCell.columnId === columnId;

  useEffect(() => {
    if (!activeCell) return;
    // While the active cell is being edited, real DOM focus belongs on its
    // child editor input, not the cell's own div — refocusing the div here
    // would steal focus away from mid-edit typing.
    if (
      editingCell &&
      editingCell.rowId === activeCell.rowId &&
      editingCell.columnId === activeCell.columnId
    ) {
      return;
    }
    const el = cellRefs.current.get(cellKey(activeCell.rowId, activeCell.columnId));
    // Skip a redundant `.focus()` on an element that already has it — with
    // more than one DataTable mounted on a page, two grids' initial-mount
    // effects can otherwise re-trigger each other's `handleFocus` in a
    // reentrant loop (each call is synchronous, so React never gets a
    // chance to bail out via its own already-focused check first).
    if (el && document.activeElement !== el) el.focus();
  }, [activeCell, editingCell]);

  const onCellKeyDown: UseDataTableKeyboardNavResult["onCellKeyDown"] = (event) => {
    const mod = event.ctrlKey || event.metaKey;
    const key: DataTableNavKey | undefined =
      mod && event.key === "Home"
        ? "ctrl+Home"
        : mod && event.key === "End"
          ? "ctrl+End"
          : NAV_KEY_MAP[event.key];
    if (!key) return;
    event.preventDefault();
    const next = computeNextActiveCell(grid, activeCell, key, pageSize);
    if (next) setActiveCellState(next);
  };

  return {
    activeCell,
    setActiveCell,
    registerCell,
    isActive,
    onCellKeyDown,
    editingCell,
    isEditing,
    startEditing,
    activateAndEdit,
    stopEditing,
  };
}
