import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDataTable } from "./useDataTable";
import type { DataTableColumnDef } from "./types";

interface Sample {
  sampleId: string;
  name: string;
  concentration: number;
}

const data: Sample[] = [
  { sampleId: "S-001", name: "Alpha", concentration: 1.2 },
  { sampleId: "S-002", name: "Beta", concentration: 3.4 },
];

const getRowId = (row: Sample) => row.sampleId;

describe("useDataTable", () => {
  it("resolves values via accessorKey", () => {
    const columns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: "Name" },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    expect(result.current.rows[0]?.cells[0]?.value).toBe("Alpha");
    expect(result.current.rows[1]?.cells[0]?.value).toBe("Beta");
  });

  it("resolves values via accessorFn", () => {
    const columns: DataTableColumnDef<Sample>[] = [
      { id: "conc", accessorFn: (row) => row.concentration * 2, header: "2x Conc" },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    expect(result.current.rows[0]?.cells[0]?.value).toBe(2.4);
  });

  it("uses getRowId to identify rows", () => {
    const columns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: "Name" },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    expect(result.current.rows.map((row) => row.id)).toEqual(["S-001", "S-002"]);
  });

  it("preserves row index and the original row object", () => {
    const columns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: "Name" },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    expect(result.current.rows[1]?.index).toBe(1);
    expect(result.current.rows[1]?.original).toBe(data[1]);
  });

  it("row.index reflects current display order, not original data-array position, once sorted", () => {
    const sortableColumns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: "Name", sortable: true },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns: sortableColumns, getRowId }));
    // data is [Alpha, Beta]; sorting descending by name reorders to [Beta, Alpha].
    act(() => result.current.toggleSort("name"));
    act(() => result.current.toggleSort("name"));
    expect(result.current.sort).toEqual({ columnId: "name", direction: "desc" });
    expect(result.current.rows.map((r) => r.id)).toEqual(["S-002", "S-001"]);
    // Beta is now displayed first (index 0), even though it's data[1] originally.
    expect(result.current.rows[0]?.index).toBe(0);
    expect(result.current.rows[1]?.index).toBe(1);
  });

  it("builds a header cell from a static header value", () => {
    const columns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: "Name" },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    expect(result.current.headerCells[0]?.label).toBe("Name");
    expect(result.current.headerCells[0]?.columnId).toBe("name");
  });

  it("builds a header cell from a header function", () => {
    const columns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: (ctx) => `Col:${ctx.columnId}` },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    expect(result.current.headerCells[0]?.label).toBe("Col:name");
  });

  it("defaults a cell's render to the stringified value when no cell def is given", () => {
    const columns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: "Name" },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    expect(result.current.rows[0]?.cells[0]?.render()).toBe("Alpha");
  });

  it("calls a custom cell render function with row, value, and columnId", () => {
    const columns: DataTableColumnDef<Sample>[] = [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: (ctx) => `${ctx.columnId}=${ctx.value}(${ctx.row.id})`,
      },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    expect(result.current.rows[0]?.cells[0]?.render()).toBe("name=Alpha(S-001)");
  });

  it("supports a display column with neither accessorKey nor accessorFn", () => {
    const columns: DataTableColumnDef<Sample>[] = [
      { id: "actions", header: "Actions", cell: () => "edit" },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    expect(result.current.rows[0]?.cells[0]?.value).toBeUndefined();
    expect(result.current.rows[0]?.cells[0]?.render()).toBe("edit");
  });

  it("carries a column's align onto both the header cell and its row cells", () => {
    const columns: DataTableColumnDef<Sample>[] = [
      { id: "concentration", accessorKey: "concentration", header: "Conc.", align: "end" },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    expect(result.current.headerCells[0]?.align).toBe("end");
    expect(result.current.rows[0]?.cells[0]?.align).toBe("end");
  });

  it("defaults align to start when not specified", () => {
    const columns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: "Name" },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    expect(result.current.headerCells[0]?.align).toBe("start");
  });

  it("returns an empty rows array for empty data", () => {
    const columns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: "Name" },
    ];
    const { result } = renderHook(() => useDataTable({ data: [], columns, getRowId }));
    expect(result.current.rows).toEqual([]);
  });
});

describe("useDataTable sorting", () => {
  const sortableColumns: DataTableColumnDef<Sample>[] = [
    { id: "sampleId", accessorKey: "sampleId", header: "ID", sortable: true },
    { id: "name", accessorKey: "name", header: "Name" },
  ];

  it("marks header cells sortable/not-sortable per the column def", () => {
    const { result } = renderHook(() => useDataTable({ data, columns: sortableColumns, getRowId }));
    expect(result.current.headerCells[0]?.sortable).toBe(true);
    expect(result.current.headerCells[1]?.sortable).toBe(false);
  });

  it("reports sortDirection false for every header cell when unsorted", () => {
    const { result } = renderHook(() => useDataTable({ data, columns: sortableColumns, getRowId }));
    expect(result.current.headerCells[0]?.sortDirection).toBe(false);
    expect(result.current.sort).toBeNull();
  });

  it("onSortClick toggles the column through none -> asc -> desc -> none, reordering rows", () => {
    const { result } = renderHook(() => useDataTable({ data, columns: sortableColumns, getRowId }));

    act(() => result.current.headerCells[0]!.onSortClick?.());
    expect(result.current.sort).toEqual({ columnId: "sampleId", direction: "asc" });
    expect(result.current.rows.map((r) => r.id)).toEqual(["S-001", "S-002"]);

    act(() => result.current.headerCells[0]!.onSortClick?.());
    expect(result.current.sort).toEqual({ columnId: "sampleId", direction: "desc" });
    expect(result.current.rows.map((r) => r.id)).toEqual(["S-002", "S-001"]);

    act(() => result.current.headerCells[0]!.onSortClick?.());
    expect(result.current.sort).toBeNull();
  });

  it("toggleSort is a no-op for a column with sortable: false (undefined)", () => {
    const { result } = renderHook(() => useDataTable({ data, columns: sortableColumns, getRowId }));
    expect(result.current.headerCells[1]?.onSortClick).toBeUndefined();
  });

  it("sorting a new column replaces the previous single-column sort", () => {
    const columns: DataTableColumnDef<Sample>[] = [
      { id: "sampleId", accessorKey: "sampleId", header: "ID", sortable: true },
      { id: "concentration", accessorKey: "concentration", header: "Conc.", sortable: true },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    act(() => result.current.headerCells[0]!.onSortClick?.());
    expect(result.current.sort?.columnId).toBe("sampleId");
    act(() => result.current.headerCells[1]!.onSortClick?.());
    // sampleId's sort is replaced entirely, not appended to; "concentration"
    // is numeric, so its own first click is desc-first (tanstack's default
    // auto-sort-direction heuristic: strings start asc, other types start desc).
    expect(result.current.sort).toEqual({ columnId: "concentration", direction: "desc" });
  });

  it("respects defaultSort for uncontrolled initial sort state", () => {
    const { result } = renderHook(() =>
      useDataTable({
        data,
        columns: sortableColumns,
        getRowId,
        defaultSort: { columnId: "sampleId", direction: "desc" },
      }),
    );
    expect(result.current.sort).toEqual({ columnId: "sampleId", direction: "desc" });
    expect(result.current.rows.map((r) => r.id)).toEqual(["S-002", "S-001"]);
  });

  it("supports controlled sort via the sort prop plus onSortChange", () => {
    const onSortChange = vi.fn();
    const { result, rerender } = renderHook(
      (props: { sort: import("./types").DataTableSortState }) =>
        useDataTable({ data, columns: sortableColumns, getRowId, sort: props.sort, onSortChange }),
      { initialProps: { sort: null as import("./types").DataTableSortState } },
    );

    act(() => result.current.headerCells[0]!.onSortClick?.());
    expect(onSortChange).toHaveBeenCalledWith({ columnId: "sampleId", direction: "asc" });
    // controlled: internal sort state does not change until the prop does
    expect(result.current.sort).toBeNull();

    rerender({ sort: { columnId: "sampleId", direction: "asc" } });
    expect(result.current.sort).toEqual({ columnId: "sampleId", direction: "asc" });
  });

  it("toggleSort(columnId) toggles the same way as onSortClick", () => {
    const { result } = renderHook(() => useDataTable({ data, columns: sortableColumns, getRowId }));
    act(() => result.current.toggleSort("sampleId"));
    expect(result.current.sort).toEqual({ columnId: "sampleId", direction: "asc" });
  });
});

describe("useDataTable cell state", () => {
  it("defaults every cell state flag to false with no format/cellState configured", () => {
    const columns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: "Name" },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    expect(result.current.rows[0]?.cells[0]?.state).toEqual({
      outOfRange: false,
      flagged: false,
      readonly: false,
      error: false,
      loading: false,
      edited: false,
    });
  });

  it("derives outOfRange from the column's format.rangeCheck", () => {
    const columns: DataTableColumnDef<Sample>[] = [
      {
        id: "concentration",
        accessorKey: "concentration",
        header: "Conc.",
        format: { rangeCheck: (v) => (v > 2 ? "high" : "in-range") },
      },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    // data[0].concentration = 1.2 (in-range), data[1].concentration = 3.4 (high)
    expect(result.current.rows[0]?.cells[0]?.state.outOfRange).toBe(false);
    expect(result.current.rows[1]?.cells[0]?.state.outOfRange).toBe(true);
  });

  it("merges cellState's returned flags into the cell's state", () => {
    const columns: DataTableColumnDef<Sample>[] = [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        cellState: (ctx) => (ctx.value === "Beta" ? { flagged: true, readonly: true } : {}),
      },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    expect(result.current.rows[0]?.cells[0]?.state).toMatchObject({
      flagged: false,
      readonly: false,
    });
    expect(result.current.rows[1]?.cells[0]?.state).toMatchObject({
      flagged: true,
      readonly: true,
    });
  });

  it("cellState receives row, value, and columnId", () => {
    const cellState = vi.fn().mockReturnValue({});
    const columns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: "Name", cellState },
    ];
    renderHook(() => useDataTable({ data, columns, getRowId }));
    expect(cellState).toHaveBeenCalledWith(
      expect.objectContaining({ value: "Alpha", columnId: "name" }),
    );
  });
});

describe("useDataTable column visibility", () => {
  const twoColumns: DataTableColumnDef<Sample>[] = [
    { id: "sampleId", accessorKey: "sampleId", header: "ID" },
    { id: "name", accessorKey: "name", header: "Name" },
  ];

  it("shows all columns by default", () => {
    const { result } = renderHook(() => useDataTable({ data, columns: twoColumns, getRowId }));
    expect(result.current.headerCells.map((h) => h.columnId)).toEqual(["sampleId", "name"]);
    expect(result.current.rows[0]?.cells.map((c) => c.columnId)).toEqual(["sampleId", "name"]);
  });

  it("toggleColumnVisibility hides a column from headerCells and every row's cells", () => {
    const { result } = renderHook(() => useDataTable({ data, columns: twoColumns, getRowId }));
    act(() => result.current.toggleColumnVisibility("name"));
    expect(result.current.headerCells.map((h) => h.columnId)).toEqual(["sampleId"]);
    for (const row of result.current.rows) {
      expect(row.cells.map((c) => c.columnId)).toEqual(["sampleId"]);
    }
  });

  it("toggling a hidden column visible again restores it", () => {
    const { result } = renderHook(() => useDataTable({ data, columns: twoColumns, getRowId }));
    act(() => result.current.toggleColumnVisibility("name"));
    act(() => result.current.toggleColumnVisibility("name"));
    expect(result.current.headerCells.map((h) => h.columnId)).toEqual(["sampleId", "name"]);
  });

  it("respects defaultColumnVisibility for uncontrolled initial state", () => {
    const { result } = renderHook(() =>
      useDataTable({
        data,
        columns: twoColumns,
        getRowId,
        defaultColumnVisibility: { name: false },
      }),
    );
    expect(result.current.headerCells.map((h) => h.columnId)).toEqual(["sampleId"]);
  });
});

describe("useDataTable column pinning", () => {
  const twoColumns: DataTableColumnDef<Sample>[] = [
    { id: "sampleId", accessorKey: "sampleId", header: "ID" },
    { id: "name", accessorKey: "name", header: "Name" },
  ];

  it("reports pinned: false and no offset for unpinned columns by default", () => {
    const { result } = renderHook(() => useDataTable({ data, columns: twoColumns, getRowId }));
    expect(result.current.headerCells[0]?.pinned).toBe(false);
    expect(result.current.headerCells[0]?.pinnedOffset).toBeUndefined();
  });

  it("seeds initial pinning from a column def's pinned field", () => {
    const columns: DataTableColumnDef<Sample>[] = [
      { id: "sampleId", accessorKey: "sampleId", header: "ID", pinned: "start" },
      { id: "name", accessorKey: "name", header: "Name" },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    expect(result.current.columnPinning).toEqual({ start: ["sampleId"], end: [] });
    expect(result.current.headerCells[0]?.pinned).toBe("start");
    expect(result.current.headerCells[0]?.pinnedOffset).toBe(0);
  });

  it("setColumnPinning pins a column at runtime and unpins with false", () => {
    const { result } = renderHook(() => useDataTable({ data, columns: twoColumns, getRowId }));
    act(() => result.current.setColumnPinning("sampleId", "start"));
    expect(result.current.headerCells[0]?.pinned).toBe("start");
    act(() => result.current.setColumnPinning("sampleId", false));
    expect(result.current.headerCells[0]?.pinned).toBe(false);
  });

  it("applies pinning to row cells too, keyed the same as headerCells", () => {
    const { result } = renderHook(() => useDataTable({ data, columns: twoColumns, getRowId }));
    act(() => result.current.setColumnPinning("sampleId", "start"));
    expect(result.current.rows[0]?.cells[0]?.pinned).toBe("start");
    expect(result.current.rows[0]?.cells[0]?.pinnedOffset).toBe(0);
  });
});

describe("useDataTable column resizing", () => {
  const columns: DataTableColumnDef<Sample>[] = [
    {
      id: "sampleId",
      accessorKey: "sampleId",
      header: "ID",
      width: 100,
      minWidth: 60,
      maxWidth: 200,
    },
  ];

  it("uses the column def's width as the initial header width", () => {
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    expect(result.current.headerCells[0]?.width).toBe(100);
  });

  it("resizeColumn updates the header width", () => {
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    act(() => result.current.resizeColumn("sampleId", 150));
    expect(result.current.headerCells[0]?.width).toBe(150);
  });

  it("resizeColumn clamps to the column's minWidth/maxWidth", () => {
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    act(() => result.current.resizeColumn("sampleId", 10));
    expect(result.current.headerCells[0]?.width).toBe(60);
    act(() => result.current.resizeColumn("sampleId", 999));
    expect(result.current.headerCells[0]?.width).toBe(200);
  });

  it("exposes a resize handle for a resizable column", () => {
    const { result } = renderHook(() => useDataTable({ data, columns, getRowId }));
    expect(result.current.headerCells[0]?.resize).toBeDefined();
    expect(result.current.headerCells[0]?.resize?.isResizing).toBe(false);
    expect(typeof result.current.headerCells[0]?.resize?.onPointerDown).toBe("function");
  });
});

describe("useDataTable filtering", () => {
  const filterData: Sample[] = [
    { sampleId: "S-001", name: "Alpha", concentration: 1.2 },
    { sampleId: "S-002", name: "Beta", concentration: 3.4 },
    { sampleId: "S-003", name: "Gamma", concentration: 9.9 },
  ];
  const filterColumns: DataTableColumnDef<Sample>[] = [
    { id: "sampleId", accessorKey: "sampleId", header: "ID" },
    { id: "name", accessorKey: "name", header: "Name", filterable: true },
  ];

  it("global filter narrows rows by default (case-insensitive substring) across eligible columns", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: filterData, columns: filterColumns, getRowId }),
    );
    act(() => result.current.setGlobalFilter("alph"));
    expect(result.current.rows.map((r) => r.id)).toEqual(["S-001"]);
  });

  it("global filter is case-insensitive", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: filterData, columns: filterColumns, getRowId }),
    );
    act(() => result.current.setGlobalFilter("BETA"));
    expect(result.current.rows.map((r) => r.id)).toEqual(["S-002"]);
  });

  it("clearing the global filter restores all rows", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: filterData, columns: filterColumns, getRowId }),
    );
    act(() => result.current.setGlobalFilter("alph"));
    act(() => result.current.setGlobalFilter(""));
    expect(result.current.rows).toHaveLength(3);
  });

  it("setColumnFilter narrows rows using only that column's value", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: filterData, columns: filterColumns, getRowId }),
    );
    act(() => result.current.setColumnFilter("name", "gam"));
    expect(result.current.rows.map((r) => r.id)).toEqual(["S-003"]);
  });

  it("marks headerCells filterable per the column def", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: filterData, columns: filterColumns, getRowId }),
    );
    expect(result.current.headerCells[0]?.filterable).toBe(false); // sampleId: no filterable flag
    expect(result.current.headerCells[1]?.filterable).toBe(true); // name: filterable
    expect(result.current.headerCells[0]?.onFilterChange).toBeUndefined();
    expect(typeof result.current.headerCells[1]?.onFilterChange).toBe("function");
  });

  it("headerCells[].onFilterChange updates filterValue and rows the same way as setColumnFilter", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: filterData, columns: filterColumns, getRowId }),
    );
    act(() => result.current.headerCells[1]!.onFilterChange?.("bet"));
    expect(result.current.headerCells[1]?.filterValue).toBe("bet");
    expect(result.current.rows.map((r) => r.id)).toEqual(["S-002"]);
  });

  it("clearColumnFilter restores rows filtered by that column", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: filterData, columns: filterColumns, getRowId }),
    );
    act(() => result.current.setColumnFilter("name", "gam"));
    act(() => result.current.clearColumnFilter("name"));
    expect(result.current.rows).toHaveLength(3);
  });

  it("column and global filters combine (both must match)", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: filterData, columns: filterColumns, getRowId }),
    );
    act(() => result.current.setColumnFilter("name", "a")); // Alpha, Gamma both contain "a"
    act(() => result.current.setGlobalFilter("S-003"));
    expect(result.current.rows.map((r) => r.id)).toEqual(["S-003"]);
  });

  it("a custom filterFn on a column overrides the default substring match", () => {
    const exactColumns: DataTableColumnDef<Sample>[] = [
      {
        id: "concentration",
        accessorKey: "concentration",
        header: "Conc.",
        filterable: true,
        filterFn: (value, filterValue) => value === filterValue,
      },
    ];
    const { result } = renderHook(() =>
      useDataTable({ data: filterData, columns: exactColumns, getRowId }),
    );
    act(() => result.current.setColumnFilter("concentration", 3.4));
    expect(result.current.rows.map((r) => r.id)).toEqual(["S-002"]);
  });

  it("respects defaultGlobalFilter and defaultColumnFilters for uncontrolled initial state", () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: filterData,
        columns: filterColumns,
        getRowId,
        defaultGlobalFilter: "S-00",
        defaultColumnFilters: [{ columnId: "name", value: "al" }],
      }),
    );
    expect(result.current.globalFilter).toBe("S-00");
    expect(result.current.columnFilters).toEqual([{ columnId: "name", value: "al" }]);
    // "al" (name filter) narrows to Alpha alone; "S-00" (global) matches every sampleId here
    expect(result.current.rows.map((r) => r.id)).toEqual(["S-001"]);
  });

  it("supports controlled columnFilters via the prop plus onColumnFiltersChange", () => {
    const onColumnFiltersChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        data: filterData,
        columns: filterColumns,
        getRowId,
        columnFilters: [{ columnId: "name", value: "gam" }],
        onColumnFiltersChange,
      }),
    );
    expect(result.current.rows.map((r) => r.id)).toEqual(["S-003"]);
    act(() => result.current.clearColumnFilter("name"));
    expect(onColumnFiltersChange).toHaveBeenCalledWith([]);
    // controlled: still filtered, since the prop value hasn't changed
    expect(result.current.rows.map((r) => r.id)).toEqual(["S-003"]);
  });
});

describe("useDataTable selection", () => {
  const selectionData: Sample[] = [
    { sampleId: "S-001", name: "Alpha", concentration: 1.2 },
    { sampleId: "S-002", name: "Beta", concentration: 3.4 },
    { sampleId: "S-003", name: "Gamma", concentration: 9.9 },
    { sampleId: "S-004", name: "Delta", concentration: 2.1 },
  ];
  const selectionColumns: DataTableColumnDef<Sample>[] = [
    { id: "name", accessorKey: "name", header: "Name" },
  ];

  it("starts with no rows selected", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: selectionData, columns: selectionColumns, getRowId }),
    );
    expect(result.current.selection.selectedIds.size).toBe(0);
    expect(result.current.selection.isAllSelected).toBe(false);
    expect(result.current.selection.isSomeSelected).toBe(false);
    expect(result.current.rows.every((r) => !result.current.selection.isRowSelected(r.id))).toBe(
      true,
    );
  });

  it("toggleRow selects and deselects a single row, reflected on selection.isRowSelected", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: selectionData, columns: selectionColumns, getRowId }),
    );
    act(() => result.current.selection.toggleRow("S-002"));
    expect(result.current.selection.selectedIds).toEqual(new Set(["S-002"]));
    expect(result.current.selection.isRowSelected("S-002")).toBe(true);
    act(() => result.current.selection.toggleRow("S-002"));
    expect(result.current.selection.selectedIds.size).toBe(0);
    expect(result.current.selection.isRowSelected("S-002")).toBe(false);
  });

  it("isRowSelected reports the same thing as selectedIds.has", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: selectionData, columns: selectionColumns, getRowId }),
    );
    act(() => result.current.selection.toggleRow("S-001"));
    expect(result.current.selection.isRowSelected("S-001")).toBe(true);
    expect(result.current.selection.isRowSelected("S-002")).toBe(false);
  });

  it("isSomeSelected (indeterminate) is true only when some but not all rows are selected", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: selectionData, columns: selectionColumns, getRowId }),
    );
    act(() => result.current.selection.toggleRow("S-001"));
    expect(result.current.selection.isSomeSelected).toBe(true);
    expect(result.current.selection.isAllSelected).toBe(false);
    act(() => result.current.selection.toggleAll());
    expect(result.current.selection.isAllSelected).toBe(true);
    expect(result.current.selection.isSomeSelected).toBe(false);
  });

  it("toggleAll selects every row, then clears when called again", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: selectionData, columns: selectionColumns, getRowId }),
    );
    act(() => result.current.selection.toggleAll());
    expect(result.current.selection.selectedIds).toEqual(
      new Set(["S-001", "S-002", "S-003", "S-004"]),
    );
    expect(result.current.selection.isAllSelected).toBe(true);
    act(() => result.current.selection.toggleAll());
    expect(result.current.selection.selectedIds.size).toBe(0);
  });

  it("toggleRange with no prior toggle falls back to selecting just that row", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: selectionData, columns: selectionColumns, getRowId }),
    );
    act(() => result.current.selection.toggleRange("S-003"));
    expect(result.current.selection.selectedIds).toEqual(new Set(["S-003"]));
  });

  it("toggleRange selects the inclusive range from the last toggled row forward", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: selectionData, columns: selectionColumns, getRowId }),
    );
    act(() => result.current.selection.toggleRow("S-001"));
    act(() => result.current.selection.toggleRange("S-003"));
    expect(result.current.selection.selectedIds).toEqual(new Set(["S-001", "S-002", "S-003"]));
  });

  it("toggleRange selects the inclusive range from the last toggled row backward", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: selectionData, columns: selectionColumns, getRowId }),
    );
    act(() => result.current.selection.toggleRow("S-004"));
    act(() => result.current.selection.toggleRange("S-002"));
    expect(result.current.selection.selectedIds).toEqual(new Set(["S-002", "S-003", "S-004"]));
  });

  it("toggleRange re-anchors on the target row, so a second range extends from there", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: selectionData, columns: selectionColumns, getRowId }),
    );
    act(() => result.current.selection.toggleRow("S-001"));
    act(() => result.current.selection.toggleRange("S-002"));
    act(() => result.current.selection.toggleRange("S-004"));
    expect(result.current.selection.selectedIds).toEqual(
      new Set(["S-001", "S-002", "S-003", "S-004"]),
    );
  });

  it("clear empties the selection", () => {
    const { result } = renderHook(() =>
      useDataTable({ data: selectionData, columns: selectionColumns, getRowId }),
    );
    act(() => result.current.selection.toggleAll());
    act(() => result.current.selection.clear());
    expect(result.current.selection.selectedIds.size).toBe(0);
  });

  it("selection survives a sort-order change (keyed by row id, not position)", () => {
    const sortableColumns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: "Name", sortable: true },
    ];
    const { result } = renderHook(() =>
      useDataTable({ data: selectionData, columns: sortableColumns, getRowId }),
    );
    act(() => result.current.selection.toggleRow("S-003")); // Gamma
    act(() => result.current.toggleSort("name")); // re-sorts rows by name
    expect(result.current.selection.selectedIds).toEqual(new Set(["S-003"]));
    expect(result.current.selection.isRowSelected("S-003")).toBe(true);
  });

  it("respects defaultSelectedRowIds for uncontrolled initial state", () => {
    const { result } = renderHook(() =>
      useDataTable({
        data: selectionData,
        columns: selectionColumns,
        getRowId,
        defaultSelectedRowIds: new Set(["S-002"]),
      }),
    );
    expect(result.current.selection.selectedIds).toEqual(new Set(["S-002"]));
  });

  it("supports controlled selectedRowIds via the prop plus onSelectedRowIdsChange", () => {
    const onSelectedRowIdsChange = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({
        data: selectionData,
        columns: selectionColumns,
        getRowId,
        selectedRowIds: new Set(["S-001"]),
        onSelectedRowIdsChange,
      }),
    );
    act(() => result.current.selection.toggleRow("S-002"));
    expect(onSelectedRowIdsChange).toHaveBeenCalledWith(new Set(["S-001", "S-002"]));
    // controlled: unchanged, since the prop value hasn't been updated by the consumer
    expect(result.current.selection.selectedIds).toEqual(new Set(["S-001"]));
  });
});

describe("useDataTable editing", () => {
  const editableColumns: DataTableColumnDef<Sample>[] = [
    { id: "name", accessorKey: "name", header: "Name", editable: true },
    { id: "concentration", accessorKey: "concentration", header: "Conc.", editor: "number" },
  ];

  it("marks cells editable/editor per the column def", () => {
    const { result } = renderHook(() => useDataTable({ data, columns: editableColumns, getRowId }));
    expect(result.current.rows[0]?.cells[0]?.editable).toBe(true);
    expect(result.current.rows[0]?.cells[0]?.editor).toBe("text");
    expect(result.current.rows[0]?.cells[1]?.editable).toBe(false);
    expect(result.current.rows[0]?.cells[1]?.editor).toBe("number");
  });

  it("defaults every cell's edited state to false with no edits made", () => {
    const { result } = renderHook(() => useDataTable({ data, columns: editableColumns, getRowId }));
    expect(result.current.rows[0]?.cells[0]?.state.edited).toBe(false);
    expect(result.current.editedCellIds.size).toBe(0);
  });

  it("editCell overrides the cell's value and marks it edited", () => {
    const { result } = renderHook(() => useDataTable({ data, columns: editableColumns, getRowId }));
    act(() => result.current.editCell("S-001", "name", "Zeta"));
    expect(result.current.rows[0]?.cells[0]?.value).toBe("Zeta");
    expect(result.current.rows[0]?.cells[0]?.state.edited).toBe(true);
    expect(result.current.editedCellIds).toEqual(new Set(["S-001:name"]));
  });

  it("editCell only affects the targeted cell, not the whole row or column", () => {
    const { result } = renderHook(() => useDataTable({ data, columns: editableColumns, getRowId }));
    act(() => result.current.editCell("S-001", "name", "Zeta"));
    expect(result.current.rows[0]?.cells[1]?.state.edited).toBe(false); // same row, other column
    expect(result.current.rows[1]?.cells[0]?.state.edited).toBe(false); // other row, same column
  });

  it("an edited value flows into a custom cell renderer and cellState, not just the raw value", () => {
    const flaggedColumns: DataTableColumnDef<Sample>[] = [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        editable: true,
        cell: (ctx) => `[${ctx.value}]`,
        cellState: (ctx) => (ctx.value === "Zeta" ? { flagged: true } : {}),
      },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns: flaggedColumns, getRowId }));
    act(() => result.current.editCell("S-001", "name", "Zeta"));
    expect(result.current.rows[0]?.cells[0]?.render()).toBe("[Zeta]");
    expect(result.current.rows[0]?.cells[0]?.state.flagged).toBe(true);
  });

  it("calls onCellEdit with the row id, column id, value, and original row", () => {
    const onCellEdit = vi.fn();
    const { result } = renderHook(() =>
      useDataTable({ data, columns: editableColumns, getRowId, onCellEdit }),
    );
    act(() => result.current.editCell("S-001", "name", "Zeta"));
    expect(onCellEdit).toHaveBeenCalledWith({
      rowId: "S-001",
      columnId: "name",
      value: "Zeta",
      row: data[0],
    });
  });

  it("editing survives a sort-order change (edited state lives on adapter state, not row position)", () => {
    const sortableColumns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: "Name", sortable: true, editable: true },
    ];
    const { result } = renderHook(() => useDataTable({ data, columns: sortableColumns, getRowId }));
    act(() => result.current.editCell("S-001", "name", "Zeta"));
    act(() => result.current.toggleSort("name"));
    act(() => result.current.toggleSort("name")); // -> desc: [Beta, Zeta]
    const editedRow = result.current.rows.find((r) => r.id === "S-001");
    expect(editedRow?.cells[0]?.value).toBe("Zeta");
    expect(editedRow?.cells[0]?.state.edited).toBe(true);
  });
});
