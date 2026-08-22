import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { DataTable } from "./DataTable";
import { useDataTable } from "./useDataTable";
import type { DataTableColumnDef, DataTableRow } from "./types";

/**
 * jsdom lays nothing out, so `offsetWidth`/`offsetHeight` are always 0 —
 * TanStack Virtual reads exactly those (not `getBoundingClientRect()`) once,
 * synchronously, on mount to pick its initial visible range, and a
 * zero-height grid makes that range empty, so no rows ever render. Stubbing
 * just the grid's own offset size (not every element's) gives it a real
 * viewport to compute a range against — same technique `Combobox`'s test
 * suite already uses for its virtualized listbox.
 */
function isDataTableGrid(this: HTMLElement) {
  return this.getAttribute("role") === "grid";
}

let originalOffsetHeight: PropertyDescriptor | undefined;
let originalOffsetWidth: PropertyDescriptor | undefined;

beforeEach(() => {
  originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
  originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get(this: HTMLElement) {
      return isDataTableGrid.call(this) ? 300 : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return isDataTableGrid.call(this) ? 600 : 0;
    },
  });
});

afterEach(() => {
  if (originalOffsetHeight)
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", originalOffsetHeight);
  if (originalOffsetWidth)
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalOffsetWidth);
});

interface Sample {
  sampleId: string;
  name: string;
  concentration: number;
}

const data: Sample[] = [
  { sampleId: "S-001", name: "Alpha", concentration: 1.2 },
  { sampleId: "S-002", name: "Beta", concentration: 3.4 },
];

const columns: DataTableColumnDef<Sample>[] = [
  { id: "name", accessorKey: "name", header: "Name" },
  { id: "concentration", accessorKey: "concentration", header: "Concentration", align: "end" },
];

function Grid() {
  const table = useDataTable({ data, columns, getRowId: (row) => row.sampleId });
  return (
    <DataTable.Root table={table} aria-label="Samples">
      <DataTable.Header>
        <DataTable.HeaderRow>
          {table.headerCells.map((header) => (
            <DataTable.HeaderCell key={header.id} header={header} />
          ))}
        </DataTable.HeaderRow>
      </DataTable.Header>
      <DataTable.Body table={table}>
        {(row) => (
          <DataTable.Row key={row.id} row={row}>
            {row.cells.map((cell) => (
              <DataTable.Cell key={cell.id} cell={cell} />
            ))}
          </DataTable.Row>
        )}
      </DataTable.Body>
    </DataTable.Root>
  );
}

/** Opens the Name column's filter popover and waits for its async floating-ui position to settle, so the effect's later state update doesn't leak past the test. */
async function openNameFilter(
  user: ReturnType<typeof userEvent.setup>,
  getByRole: (role: string, options?: { name: string }) => HTMLElement,
) {
  await user.click(getByRole("button", { name: "Filter Name" }));
  const dialog = getByRole("dialog", { name: "Filter Name" });
  await waitFor(() => expect(dialog).not.toHaveStyle({ left: "-9999px" }));
  return dialog;
}

describe("DataTable", () => {
  it("renders Root with role=grid", () => {
    const { getByRole } = render(<Grid />);
    expect(getByRole("grid", { name: "Samples" })).toBeInTheDocument();
  });

  it("renders Header/Body as rowgroups and rows/cells with correct ARIA roles", () => {
    const { getByRole, getAllByRole } = render(<Grid />);
    const grid = getByRole("grid");
    expect(grid.querySelectorAll('[role="rowgroup"]')).toHaveLength(2);
    expect(getAllByRole("columnheader")).toHaveLength(2);
    expect(getAllByRole("row")).toHaveLength(3); // 1 header row + 2 body rows
    expect(getAllByRole("gridcell")).toHaveLength(4);
  });

  it("renders header labels in column order", () => {
    const { getAllByRole } = render(<Grid />);
    const headers = getAllByRole("columnheader").map((el) => el.textContent);
    expect(headers).toEqual(["Name", "Concentration"]);
  });

  it("renders resolved cell values for every row", () => {
    const { getAllByRole } = render(<Grid />);
    const cells = getAllByRole("gridcell").map((el) => el.textContent);
    expect(cells).toEqual(["Alpha", "1.2", "Beta", "3.4"]);
  });

  it("applies text-end alignment to a header cell whose column def sets align: end", () => {
    const { getAllByRole } = render(<Grid />);
    const headers = getAllByRole("columnheader");
    expect(headers[1]).toHaveClass("text-end");
  });

  it("applies text-end alignment to that column's body cells too", () => {
    const { getAllByRole } = render(<Grid />);
    const cells = getAllByRole("gridcell");
    expect(cells[1]).toHaveClass("text-end");
    expect(cells[3]).toHaveClass("text-end");
  });

  it("accepts ref as a plain prop on Root", () => {
    let node: HTMLDivElement | null = null;
    function WithRef() {
      const table = useDataTable({ data, columns, getRowId: (row) => row.sampleId });
      return (
        <DataTable.Root
          table={table}
          aria-label="Samples"
          ref={(el) => {
            node = el;
          }}
        />
      );
    }
    render(<WithRef />);
    expect(node).toBeInstanceOf(HTMLDivElement);
  });

  it("lets a consumer className override Root's default classes via tailwind-merge", () => {
    function Custom() {
      const table = useDataTable({ data, columns, getRowId: (row) => row.sampleId });
      return <DataTable.Root table={table} aria-label="Samples" className="bg-bg-subtle" />;
    }
    const { getByRole } = render(<Custom />);
    expect(getByRole("grid")).toHaveClass("bg-bg-subtle");
  });

  it("renders an empty grid (no rows) without error when data is empty", () => {
    function Empty() {
      const table = useDataTable({ data: [], columns, getRowId: (row) => row.sampleId });
      return (
        <DataTable.Root table={table} aria-label="Samples">
          <DataTable.Header>
            <DataTable.HeaderRow>
              {table.headerCells.map((header) => (
                <DataTable.HeaderCell key={header.id} header={header} />
              ))}
            </DataTable.HeaderRow>
          </DataTable.Header>
          <DataTable.Body table={table}>
            {(row) => <DataTable.Row key={row.id} row={row} />}
          </DataTable.Body>
        </DataTable.Root>
      );
    }
    const { getAllByRole, queryAllByRole } = render(<Empty />);
    expect(getAllByRole("columnheader")).toHaveLength(2);
    expect(queryAllByRole("row")).toHaveLength(1); // header row only
  });

  it("throws a clear error when a subcomponent renders outside DataTable.Root", () => {
    const { result } = renderHook(() =>
      useDataTable({ data, columns, getRowId: (row) => row.sampleId }),
    );
    expect(() =>
      render(<DataTable.Body table={result.current}>{() => null}</DataTable.Body>),
    ).toThrow(/DataTable\.Root/);
  });

  it("passes an axe scan", async () => {
    const { container } = render(<Grid />);
    expect((await axe(container)).violations.length).toBe(0);
  });

  it("infers DataTable.Body's row parameter as DataTableRow<TRow>, not DataTableRow<object>", () => {
    // Type-only regression test: `Check` is never rendered, but `tsc` still
    // checks its body. `DataTable.Body`'s only other TRow-bearing prop is
    // `children`'s own parameter — a position TS can't infer a generic
    // *from* — so without the explicit `table` prop below, `row` silently
    // widens to `DataTableRow<object>` and every field on it reads as if
    // unknown, with no type error anywhere to catch it.
    function Check() {
      const table = useDataTable({ data, columns, getRowId: (row) => row.sampleId });
      return (
        <DataTable.Root table={table} aria-label="Samples">
          <DataTable.Body table={table}>
            {(row) => {
              expectTypeOf(row).toEqualTypeOf<DataTableRow<Sample>>();
              return null;
            }}
          </DataTable.Body>
        </DataTable.Root>
      );
    }
    expect(Check).toBeInstanceOf(Function);
  });

  describe("keyboard grid navigation", () => {
    it("gives only the first body cell a tabIndex of 0 on initial render", () => {
      const { getAllByRole } = render(<Grid />);
      const cells = getAllByRole("gridcell");
      expect(cells[0]).toHaveAttribute("tabindex", "0");
      for (const cell of cells.slice(1)) expect(cell).toHaveAttribute("tabindex", "-1");
    });

    it("moves the active tabIndex to a cell when it receives focus directly", () => {
      const { getAllByRole } = render(<Grid />);
      const cells = getAllByRole("gridcell");
      act(() => cells[3]!.focus());
      expect(cells[3]).toHaveAttribute("tabindex", "0");
      expect(cells[0]).toHaveAttribute("tabindex", "-1");
    });

    it("marks the active cell with data-active on a real mouse click, not just keyboard nav", async () => {
      // The active-cell ring is driven by `data-active` (set from
      // `nav.isActive`), not `:focus-visible` — the browser suppresses
      // `:focus-visible` on pointer-initiated focus, which would silently
      // leave a clicked cell with no visible "you are here" indicator even
      // though it's the roving-tabindex active cell. `userEvent.click`
      // (a real pointer interaction, unlike `.focus()`) is what exercises
      // that path.
      const user = userEvent.setup();
      const { getAllByRole } = render(<Grid />);
      const cells = getAllByRole("gridcell");
      expect(cells[0]).toHaveAttribute("data-active", ""); // default active cell
      await user.click(cells[3]!);
      expect(cells[3]).toHaveAttribute("data-active", "");
      expect(cells[0]).not.toHaveAttribute("data-active");
    });

    it("ArrowDown moves focus and the active tabIndex to the cell below", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<Grid />);
      const cells = getAllByRole("gridcell");
      act(() => cells[0]!.focus());
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(cells[2]); // row 2, same column (2 columns per row)
      expect(cells[2]).toHaveAttribute("tabindex", "0");
      expect(cells[0]).toHaveAttribute("tabindex", "-1");
    });

    it("ArrowDown clamps at the last row", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<Grid />);
      const cells = getAllByRole("gridcell");
      act(() => cells[2]!.focus());
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(cells[2]);
    });

    it("ArrowRight/ArrowLeft move focus across columns in the same row", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<Grid />);
      const cells = getAllByRole("gridcell");
      act(() => cells[0]!.focus());
      await user.keyboard("{ArrowRight}");
      expect(document.activeElement).toBe(cells[1]);
      await user.keyboard("{ArrowLeft}");
      expect(document.activeElement).toBe(cells[0]);
    });

    it("Home/End move focus to the first/last column in the current row", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<Grid />);
      const cells = getAllByRole("gridcell");
      act(() => cells[2]!.focus());
      await user.keyboard("{End}");
      expect(document.activeElement).toBe(cells[3]);
      await user.keyboard("{Home}");
      expect(document.activeElement).toBe(cells[2]);
    });

    it("Ctrl+Home/Ctrl+End move focus to the first/last cell of the grid", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<Grid />);
      const cells = getAllByRole("gridcell");
      act(() => cells[1]!.focus());
      await user.keyboard("{Control>}{End}{/Control}");
      expect(document.activeElement).toBe(cells[3]);
      await user.keyboard("{Control>}{Home}{/Control}");
      expect(document.activeElement).toBe(cells[0]);
    });

    it("PageDown/PageUp move focus by a page of rows, clamped at the grid edges", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<Grid />);
      const cells = getAllByRole("gridcell");
      act(() => cells[0]!.focus());
      await user.keyboard("{PageDown}");
      expect(document.activeElement).toBe(cells[2]); // clamps to the only other row
      await user.keyboard("{PageUp}");
      expect(document.activeElement).toBe(cells[0]);
    });
  });

  describe("sorting", () => {
    const sortableColumns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: "Name", sortable: true },
      { id: "concentration", accessorKey: "concentration", header: "Concentration", align: "end" },
    ];

    function SortableGrid() {
      const table = useDataTable({
        data,
        columns: sortableColumns,
        getRowId: (row) => row.sampleId,
      });
      return (
        <DataTable.Root table={table} aria-label="Samples">
          <DataTable.Header>
            <DataTable.HeaderRow>
              {table.headerCells.map((header) => (
                <DataTable.HeaderCell key={header.id} header={header}>
                  {header.sortable ? <DataTable.SortButton header={header} /> : header.label}
                </DataTable.HeaderCell>
              ))}
            </DataTable.HeaderRow>
          </DataTable.Header>
          <DataTable.Body table={table}>
            {(row) => (
              <DataTable.Row key={row.id} row={row}>
                {row.cells.map((cell) => (
                  <DataTable.Cell key={cell.id} cell={cell} />
                ))}
              </DataTable.Row>
            )}
          </DataTable.Body>
        </DataTable.Root>
      );
    }

    it("sets aria-sort=none on a sortable column's header before it's sorted", () => {
      const { getAllByRole } = render(<SortableGrid />);
      expect(getAllByRole("columnheader")[0]).toHaveAttribute("aria-sort", "none");
    });

    it("does not set aria-sort on a non-sortable column's header", () => {
      const { getAllByRole } = render(<SortableGrid />);
      expect(getAllByRole("columnheader")[1]).not.toHaveAttribute("aria-sort");
    });

    it("clicking the sort button sorts the rows and updates aria-sort", async () => {
      const user = userEvent.setup();
      const { getAllByRole, getByRole } = render(<SortableGrid />);
      await user.click(getByRole("button", { name: "Name" }));
      expect(getAllByRole("columnheader")[0]).toHaveAttribute("aria-sort", "ascending");
      const nameCells = getAllByRole("gridcell").filter((_, i) => i % 2 === 0);
      expect(nameCells.map((c) => c.textContent)).toEqual(["Alpha", "Beta"]);
    });

    it("activating the sort button via keyboard (Enter) sorts the rows", async () => {
      const user = userEvent.setup();
      const { getByRole } = render(<SortableGrid />);
      const button = getByRole("button", { name: "Name" });
      button.focus();
      await user.keyboard("{Enter}");
      expect(getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "ascending");
    });

    it("clicking the sort button again cycles asc -> desc -> none", async () => {
      const user = userEvent.setup();
      const { getByRole } = render(<SortableGrid />);
      const button = getByRole("button", { name: "Name" });
      await user.click(button);
      expect(getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "ascending");
      await user.click(button);
      expect(getByRole("columnheader", { name: "Name" })).toHaveAttribute(
        "aria-sort",
        "descending",
      );
      await user.click(button);
      expect(getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "none");
    });

    it("passes an axe scan with a sortable column", async () => {
      const { container } = render(<SortableGrid />);
      expect((await axe(container)).violations.length).toBe(0);
    });
  });

  describe("cell state", () => {
    const flaggedColumns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: "Name" },
      {
        id: "concentration",
        accessorKey: "concentration",
        header: "Concentration",
        format: { rangeCheck: (v) => (v > 2 ? "high" : "in-range") },
        cellState: (ctx) => (ctx.row.original.name === "Beta" ? { flagged: true } : {}),
      },
    ];

    function FlaggedGrid() {
      const table = useDataTable({
        data,
        columns: flaggedColumns,
        getRowId: (row) => row.sampleId,
      });
      return (
        <DataTable.Root table={table} aria-label="Samples">
          <DataTable.Header>
            <DataTable.HeaderRow>
              {table.headerCells.map((header) => (
                <DataTable.HeaderCell key={header.id} header={header} />
              ))}
            </DataTable.HeaderRow>
          </DataTable.Header>
          <DataTable.Body table={table}>
            {(row) => (
              <DataTable.Row key={row.id} row={row}>
                {row.cells.map((cell) => (
                  <DataTable.Cell key={cell.id} cell={cell} />
                ))}
              </DataTable.Row>
            )}
          </DataTable.Body>
        </DataTable.Root>
      );
    }

    it("sets data-out-of-range on a cell whose format.rangeCheck flags it", () => {
      const { getAllByRole } = render(<FlaggedGrid />);
      const cells = getAllByRole("gridcell");
      // row 0: Alpha/1.2 (in-range), row 1: Beta/3.4 (high)
      expect(cells[1]).not.toHaveAttribute("data-out-of-range");
      expect(cells[3]).toHaveAttribute("data-out-of-range", "");
    });

    it("sets data-flagged from a column's cellState callback", () => {
      const { getAllByRole } = render(<FlaggedGrid />);
      const cells = getAllByRole("gridcell");
      expect(cells[1]).not.toHaveAttribute("data-flagged");
      expect(cells[3]).toHaveAttribute("data-flagged", "");
    });

    it("does not set data-out-of-range or data-flagged on unaffected cells", () => {
      const { getAllByRole } = render(<FlaggedGrid />);
      const cells = getAllByRole("gridcell");
      for (const cell of [cells[0], cells[2]]) {
        expect(cell).not.toHaveAttribute("data-out-of-range");
        expect(cell).not.toHaveAttribute("data-flagged");
      }
    });
  });

  describe("Body state (loading/empty/error)", () => {
    function StatefulGrid({ state }: { state?: "idle" | "loading" | "empty" | "error" }) {
      const table = useDataTable({ data, columns, getRowId: (row) => row.sampleId });
      return (
        <DataTable.Root table={table} aria-label="Samples">
          <DataTable.Header>
            <DataTable.HeaderRow>
              {table.headerCells.map((header) => (
                <DataTable.HeaderCell key={header.id} header={header} />
              ))}
            </DataTable.HeaderRow>
          </DataTable.Header>
          <DataTable.Body
            table={table}
            state={state}
            loadingState="Loading samples…"
            emptyState="No samples found."
            errorState="Failed to load samples."
          >
            {(row) => (
              <DataTable.Row key={row.id} row={row}>
                {row.cells.map((cell) => (
                  <DataTable.Cell key={cell.id} cell={cell} />
                ))}
              </DataTable.Row>
            )}
          </DataTable.Body>
        </DataTable.Root>
      );
    }

    it("renders rows normally in the idle (default) state", () => {
      const { getAllByRole } = render(<StatefulGrid />);
      expect(getAllByRole("row")).toHaveLength(3); // header + 2 data rows
    });

    it("renders loadingState inside a status live region instead of rows", () => {
      const { getByRole, queryAllByRole } = render(<StatefulGrid state="loading" />);
      expect(getByRole("status")).toHaveTextContent("Loading samples…");
      expect(queryAllByRole("row")).toHaveLength(2); // header row + one message row
    });

    it("renders errorState inside an alert live region instead of rows", () => {
      const { getByRole } = render(<StatefulGrid state="error" />);
      expect(getByRole("alert")).toHaveTextContent("Failed to load samples.");
    });

    it("renders emptyState when explicitly state=empty", () => {
      const { getByRole } = render(<StatefulGrid state="empty" />);
      expect(getByRole("gridcell")).toHaveTextContent("No samples found.");
    });

    it("auto-shows emptyState when idle and there are no rows", () => {
      function EmptyByData() {
        const table = useDataTable({ data: [], columns, getRowId: (row) => row.sampleId });
        return (
          <DataTable.Root table={table} aria-label="Samples">
            <DataTable.Header>
              <DataTable.HeaderRow>
                {table.headerCells.map((header) => (
                  <DataTable.HeaderCell key={header.id} header={header} />
                ))}
              </DataTable.HeaderRow>
            </DataTable.Header>
            <DataTable.Body table={table} emptyState="No samples found.">
              {(row) => <DataTable.Row key={row.id} row={row} />}
            </DataTable.Body>
          </DataTable.Root>
        );
      }
      const { getByRole } = render(<EmptyByData />);
      expect(getByRole("gridcell")).toHaveTextContent("No samples found.");
    });

    it("stays silently empty when idle, no rows, and no emptyState given", () => {
      function EmptyNoMessage() {
        const table = useDataTable({ data: [], columns, getRowId: (row) => row.sampleId });
        return (
          <DataTable.Root table={table} aria-label="Samples">
            <DataTable.Body table={table}>
              {(row) => <DataTable.Row key={row.id} row={row} />}
            </DataTable.Body>
          </DataTable.Root>
        );
      }
      const { queryAllByRole } = render(<EmptyNoMessage />);
      expect(queryAllByRole("row")).toHaveLength(0);
    });

    it("passes an axe scan for loading/empty/error states", async () => {
      for (const state of ["loading", "empty", "error"] as const) {
        const { container, unmount } = render(<StatefulGrid state={state} />);
        expect((await axe(container)).violations.length).toBe(0);
        unmount();
      }
    });
  });

  describe("column visibility", () => {
    function VisibilityGrid() {
      const table = useDataTable({ data, columns, getRowId: (row) => row.sampleId });
      return (
        <div>
          <button type="button" onClick={() => table.toggleColumnVisibility("concentration")}>
            Toggle concentration
          </button>
          <DataTable.Root table={table} aria-label="Samples">
            <DataTable.Header>
              <DataTable.HeaderRow>
                {table.headerCells.map((header) => (
                  <DataTable.HeaderCell key={header.id} header={header} />
                ))}
              </DataTable.HeaderRow>
            </DataTable.Header>
            <DataTable.Body table={table}>
              {(row) => (
                <DataTable.Row key={row.id} row={row}>
                  {row.cells.map((cell) => (
                    <DataTable.Cell key={cell.id} cell={cell} />
                  ))}
                </DataTable.Row>
              )}
            </DataTable.Body>
          </DataTable.Root>
        </div>
      );
    }

    it("hides a column's header and cells when toggled off", async () => {
      const user = userEvent.setup();
      const { getAllByRole, getByRole } = render(<VisibilityGrid />);
      expect(getAllByRole("columnheader")).toHaveLength(2);
      await user.click(getByRole("button", { name: "Toggle concentration" }));
      expect(getAllByRole("columnheader")).toHaveLength(1);
      expect(getAllByRole("gridcell")).toHaveLength(2); // just Name, for 2 rows
    });

    it("restores a hidden column when toggled back on", async () => {
      const user = userEvent.setup();
      const { getAllByRole, getByRole } = render(<VisibilityGrid />);
      const button = getByRole("button", { name: "Toggle concentration" });
      await user.click(button);
      await user.click(button);
      expect(getAllByRole("columnheader")).toHaveLength(2);
    });
  });

  describe("column pinning (sticky)", () => {
    function PinnedGrid() {
      const pinnedColumns: DataTableColumnDef<Sample>[] = [
        { id: "name", accessorKey: "name", header: "Name", pinned: "start" },
        { id: "concentration", accessorKey: "concentration", header: "Concentration" },
      ];
      const table = useDataTable({ data, columns: pinnedColumns, getRowId: (row) => row.sampleId });
      return (
        <DataTable.Root table={table} aria-label="Samples">
          <DataTable.Header>
            <DataTable.HeaderRow>
              {table.headerCells.map((header) => (
                <DataTable.HeaderCell key={header.id} header={header} />
              ))}
            </DataTable.HeaderRow>
          </DataTable.Header>
          <DataTable.Body table={table}>
            {(row) => (
              <DataTable.Row key={row.id} row={row}>
                {row.cells.map((cell) => (
                  <DataTable.Cell key={cell.id} cell={cell} />
                ))}
              </DataTable.Row>
            )}
          </DataTable.Body>
        </DataTable.Root>
      );
    }

    it("marks a pinned header cell with data-pinned and a sticky inset style", () => {
      const { getAllByRole } = render(<PinnedGrid />);
      const header = getAllByRole("columnheader")[0]!;
      expect(header).toHaveAttribute("data-pinned", "start");
      expect(header).toHaveClass("data-pinned:sticky");
      expect(header.style.insetInlineStart).toBe("0px");
    });

    it("does not mark an unpinned header cell", () => {
      const { getAllByRole } = render(<PinnedGrid />);
      expect(getAllByRole("columnheader")[1]).not.toHaveAttribute("data-pinned");
    });

    it("marks pinned body cells the same way as their header", () => {
      const { getAllByRole } = render(<PinnedGrid />);
      const cells = getAllByRole("gridcell");
      expect(cells[0]).toHaveAttribute("data-pinned", "start");
      expect(cells[1]).not.toHaveAttribute("data-pinned");
    });
  });

  describe("column resizing", () => {
    const resizableColumns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: "Name", width: 120, minWidth: 60, maxWidth: 300 },
      { id: "concentration", accessorKey: "concentration", header: "Concentration" },
    ];

    function ResizableGrid() {
      const table = useDataTable({
        data,
        columns: resizableColumns,
        getRowId: (row) => row.sampleId,
      });
      return (
        <DataTable.Root table={table} aria-label="Samples">
          <DataTable.Header>
            <DataTable.HeaderRow>
              {table.headerCells.map((header) => (
                <DataTable.HeaderCell key={header.id} header={header}>
                  {header.label}
                  <DataTable.ResizeHandle header={header} />
                </DataTable.HeaderCell>
              ))}
            </DataTable.HeaderRow>
          </DataTable.Header>
          <DataTable.Body table={table}>
            {(row) => (
              <DataTable.Row key={row.id} row={row}>
                {row.cells.map((cell) => (
                  <DataTable.Cell key={cell.id} cell={cell} />
                ))}
              </DataTable.Row>
            )}
          </DataTable.Body>
        </DataTable.Root>
      );
    }

    it("renders a resize handle as a keyboard-focusable separator for a resizable column", () => {
      const { getAllByRole } = render(<ResizableGrid />);
      const handles = getAllByRole("separator");
      expect(handles).toHaveLength(2); // both columns are resizable by default
      expect(handles[0]).toHaveAttribute("aria-orientation", "vertical");
      expect(handles[0]).toHaveAttribute("aria-valuenow", "120");
    });

    it("ArrowRight/ArrowLeft on the handle resizes the column, clamped to min/max", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<ResizableGrid />);
      const handle = getAllByRole("separator")[0]!;
      handle.focus();
      await user.keyboard("{ArrowRight}");
      expect(handle).toHaveAttribute("aria-valuenow", "130");
      await user.keyboard(
        "{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}",
      );
      expect(handle).toHaveAttribute("aria-valuenow", "60"); // clamped to minWidth
    });

    it("header width reflects the column's def width before any resize", () => {
      const { getAllByRole } = render(<ResizableGrid />);
      const headers = getAllByRole("columnheader");
      expect(headers[0]).toHaveStyle({ width: "120px" });
    });

    it("body cells carry the same width as their column's header, so columns stay aligned", () => {
      const { getAllByRole } = render(<ResizableGrid />);
      const headerWidth = getAllByRole("columnheader")[0]!.style.width;
      const cells = getAllByRole("gridcell");
      expect(cells[0]).toHaveStyle({ width: headerWidth }); // row 0, column 0
      expect(cells[2]).toHaveStyle({ width: headerWidth }); // row 1, column 0
    });

    it("resizing a column updates both the header and its body cells' width together", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<ResizableGrid />);
      const handle = getAllByRole("separator")[0]!;
      handle.focus();
      await user.keyboard("{ArrowRight}");
      const headerWidth = getAllByRole("columnheader")[0]!.style.width;
      expect(headerWidth).toBe("130px");
      expect(getAllByRole("gridcell")[0]).toHaveStyle({ width: "130px" });
    });
  });

  describe("filtering", () => {
    const filterableColumns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: "Name", filterable: true },
      { id: "concentration", accessorKey: "concentration", header: "Concentration", align: "end" },
    ];

    function FilterableGrid() {
      const table = useDataTable({
        data,
        columns: filterableColumns,
        getRowId: (row) => row.sampleId,
      });
      return (
        <div>
          <DataTable.SearchInput table={table} />
          <DataTable.Root table={table} aria-label="Samples">
            <DataTable.Header>
              <DataTable.HeaderRow>
                {table.headerCells.map((header) => (
                  <DataTable.HeaderCell key={header.id} header={header}>
                    {header.label}
                    {header.filterable && <DataTable.FilterButton header={header} />}
                  </DataTable.HeaderCell>
                ))}
              </DataTable.HeaderRow>
            </DataTable.Header>
            <DataTable.Body table={table}>
              {(row) => (
                <DataTable.Row key={row.id} row={row}>
                  {row.cells.map((cell) => (
                    <DataTable.Cell key={cell.id} cell={cell} />
                  ))}
                </DataTable.Row>
              )}
            </DataTable.Body>
          </DataTable.Root>
        </div>
      );
    }

    it("SearchInput narrows rows by global filter as the user types", async () => {
      const user = userEvent.setup();
      const { getAllByRole, getByRole } = render(<FilterableGrid />);
      await user.type(getByRole("searchbox", { name: "Search" }), "Alpha");
      const nameCells = getAllByRole("gridcell").filter((_, i) => i % 2 === 0);
      expect(nameCells.map((c) => c.textContent)).toEqual(["Alpha"]);
    });

    it("does not render a FilterButton for a non-filterable column", () => {
      const { getAllByRole, queryAllByRole } = render(<FilterableGrid />);
      expect(getAllByRole("columnheader")).toHaveLength(2);
      expect(queryAllByRole("button", { name: /^Filter/ })).toHaveLength(1);
    });

    it("opens the filter popover on click and shows an input bound to the column filter", async () => {
      const user = userEvent.setup();
      const { getByRole } = render(<FilterableGrid />);
      const trigger = getByRole("button", { name: "Filter Name" });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      await openNameFilter(user, getByRole);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    it("typing in the column filter popover narrows rows to matching values", async () => {
      const user = userEvent.setup();
      const { getByRole, getAllByRole } = render(<FilterableGrid />);
      await openNameFilter(user, getByRole);
      await user.type(getByRole("textbox", { name: "Filter Name" }), "Beta");
      const nameCells = getAllByRole("gridcell").filter((_, i) => i % 2 === 0);
      expect(nameCells.map((c) => c.textContent)).toEqual(["Beta"]);
    });

    it("closes the filter popover on Escape without clearing the filter", async () => {
      const user = userEvent.setup();
      const { getByRole, queryByRole, getAllByRole } = render(<FilterableGrid />);
      await openNameFilter(user, getByRole);
      await user.type(getByRole("textbox", { name: "Filter Name" }), "Beta");
      await user.keyboard("{Escape}");
      expect(queryByRole("dialog")).not.toBeInTheDocument();
      const nameCells = getAllByRole("gridcell").filter((_, i) => i % 2 === 0);
      expect(nameCells.map((c) => c.textContent)).toEqual(["Beta"]);
    });

    it("closes the filter popover when clicking outside it", async () => {
      const user = userEvent.setup();
      const { getByRole, queryByRole } = render(<FilterableGrid />);
      await openNameFilter(user, getByRole);
      await user.click(document.body);
      expect(queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("passes an axe scan with the search input and an open filter popover", async () => {
      const user = userEvent.setup();
      const { container, getByRole } = render(<FilterableGrid />);
      await openNameFilter(user, getByRole);
      expect((await axe(container)).violations.length).toBe(0);
    });
  });

  describe("row selection", () => {
    const selectionData: Sample[] = [
      { sampleId: "S-001", name: "Alpha", concentration: 1.2 },
      { sampleId: "S-002", name: "Beta", concentration: 3.4 },
      { sampleId: "S-003", name: "Gamma", concentration: 9.9 },
    ];

    function SelectableGrid() {
      const table = useDataTable({
        data: selectionData,
        columns,
        getRowId: (row) => row.sampleId,
      });
      return (
        <DataTable.Root table={table} aria-label="Samples">
          <DataTable.Header>
            <DataTable.HeaderRow>
              <DataTable.SelectionHeaderCell selection={table.selection} />
              {table.headerCells.map((header) => (
                <DataTable.HeaderCell key={header.id} header={header} />
              ))}
            </DataTable.HeaderRow>
          </DataTable.Header>
          <DataTable.Body table={table}>
            {(row) => (
              <DataTable.Row key={row.id} row={row}>
                <DataTable.SelectionCell row={row} selection={table.selection} />
                {row.cells.map((cell) => (
                  <DataTable.Cell key={cell.id} cell={cell} />
                ))}
              </DataTable.Row>
            )}
          </DataTable.Body>
        </DataTable.Root>
      );
    }

    it("renders a select-all checkbox in the header and one per row", () => {
      const { getAllByRole } = render(<SelectableGrid />);
      expect(getAllByRole("checkbox", { name: "Select all rows" })).toHaveLength(1);
      expect(getAllByRole("checkbox", { name: "Select row" })).toHaveLength(3);
    });

    it("clicking a row's checkbox selects it and sets aria-selected/data-selected on the row", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<SelectableGrid />);
      const checkboxes = getAllByRole("checkbox", { name: "Select row" });
      await user.click(checkboxes[0]!);
      expect(checkboxes[0]).toBeChecked();
      const rows = getAllByRole("row");
      expect(rows[1]).toHaveAttribute("aria-selected", "true"); // rows[0] is the header row
      expect(rows[1]).toHaveAttribute("data-selected", "");
      expect(rows[2]).not.toHaveAttribute("aria-selected");
    });

    it("clicking a selected row's checkbox again deselects it", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<SelectableGrid />);
      const checkbox = getAllByRole("checkbox", { name: "Select row" })[0]!;
      await user.click(checkbox);
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
      expect(getAllByRole("row")[1]).not.toHaveAttribute("aria-selected");
    });

    it("shift+clicking a second row selects the inclusive range between them", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<SelectableGrid />);
      const checkboxes = getAllByRole("checkbox", { name: "Select row" });
      await user.click(checkboxes[0]!);
      await user.keyboard("{Shift>}");
      await user.click(checkboxes[2]!);
      await user.keyboard("{/Shift}");
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).toBeChecked();
      expect(checkboxes[2]).toBeChecked();
    });

    it("the select-all checkbox selects every row, then clears on a second click", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<SelectableGrid />);
      const selectAll = getAllByRole("checkbox", { name: "Select all rows" })[0]!;
      await user.click(selectAll);
      for (const checkbox of getAllByRole("checkbox", { name: "Select row" })) {
        expect(checkbox).toBeChecked();
      }
      await user.click(selectAll);
      for (const checkbox of getAllByRole("checkbox", { name: "Select row" })) {
        expect(checkbox).not.toBeChecked();
      }
    });

    it("the select-all checkbox is indeterminate when only some rows are selected", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<SelectableGrid />);
      await user.click(getAllByRole("checkbox", { name: "Select row" })[0]!);
      const selectAll = getAllByRole("checkbox", {
        name: "Select all rows",
      })[0]! as HTMLInputElement;
      expect(selectAll.indeterminate).toBe(true);
      expect(selectAll).not.toBeChecked();
    });

    it("passes an axe scan with selection controls and a partial selection", async () => {
      const user = userEvent.setup();
      const { container, getAllByRole } = render(<SelectableGrid />);
      await user.click(getAllByRole("checkbox", { name: "Select row" })[0]!);
      expect((await axe(container)).violations.length).toBe(0);
    });
  });

  describe("virtualization", () => {
    const MANY_ROWS: Sample[] = Array.from({ length: 500 }, (_, i) => ({
      sampleId: `S-${String(i).padStart(3, "0")}`,
      name: `Sample ${i}`,
      concentration: i / 10,
    }));

    function VirtualizedGrid({
      onRangeChange,
    }: {
      onRangeChange?: (range: { startIndex: number; endIndex: number }) => void;
    }) {
      const table = useDataTable({
        data: MANY_ROWS,
        columns,
        getRowId: (row) => row.sampleId,
      });
      return (
        <DataTable.Root table={table} aria-label="Samples" onRangeChange={onRangeChange}>
          <DataTable.Header>
            <DataTable.HeaderRow>
              {table.headerCells.map((header) => (
                <DataTable.HeaderCell key={header.id} header={header} />
              ))}
            </DataTable.HeaderRow>
          </DataTable.Header>
          <DataTable.Body table={table}>
            {(row) => (
              <DataTable.Row key={row.id} row={row}>
                {row.cells.map((cell) => (
                  <DataTable.Cell key={cell.id} cell={cell} />
                ))}
              </DataTable.Row>
            )}
          </DataTable.Body>
        </DataTable.Root>
      );
    }

    function VirtualizedSelectableGrid() {
      const table = useDataTable({
        data: MANY_ROWS,
        columns,
        getRowId: (row) => row.sampleId,
      });
      return (
        <DataTable.Root table={table} aria-label="Samples">
          <DataTable.Header>
            <DataTable.HeaderRow>
              <DataTable.SelectionHeaderCell selection={table.selection} />
              {table.headerCells.map((header) => (
                <DataTable.HeaderCell key={header.id} header={header} />
              ))}
            </DataTable.HeaderRow>
          </DataTable.Header>
          <DataTable.Body table={table}>
            {(row) => (
              <DataTable.Row key={row.id} row={row}>
                <DataTable.SelectionCell row={row} selection={table.selection} />
                {row.cells.map((cell) => (
                  <DataTable.Cell key={cell.id} cell={cell} />
                ))}
              </DataTable.Row>
            )}
          </DataTable.Body>
        </DataTable.Root>
      );
    }

    it("only mounts a window of rows, not all 500", () => {
      const { getAllByRole } = render(<VirtualizedGrid />);
      const rendered = getAllByRole("row").length - 1; // minus the header row
      expect(rendered).toBeGreaterThan(0);
      expect(rendered).toBeLessThan(MANY_ROWS.length);
    });

    it("sizes the scrollable area to the full row count via the sizing wrapper's height", () => {
      const { getByRole } = render(<VirtualizedGrid />);
      const rowgroups = getByRole("grid").querySelectorAll('[role="rowgroup"]');
      const bodyRowgroup = rowgroups[1]!;
      const sizer = bodyRowgroup.firstElementChild as HTMLElement;
      // 500 rows * the "sm"-density default (29px) estimate, before any real measurement.
      expect(sizer.style.height).toBe("14500px");
    });

    it("Ctrl+End reaches and focuses the last row even though it isn't mounted at first", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<VirtualizedGrid />);
      const firstCell = getAllByRole("gridcell")[0]!;
      act(() => firstCell.focus());
      await user.keyboard("{Control>}{End}{/Control}");
      expect(document.activeElement).not.toBe(firstCell);
      expect(document.activeElement).toHaveAttribute("role", "gridcell");
      // Ctrl+End moves to the last row's last column (concentration), per
      // the WAI-ARIA grid pattern's "last cell in the grid" — check the
      // whole row rendered, not just the focused (concentration) cell.
      expect(document.activeElement?.closest('[role="row"]')?.textContent).toContain("Sample 499");
    });

    it("reports the visible range via onRangeChange", () => {
      const ranges: Array<{ startIndex: number; endIndex: number }> = [];
      render(<VirtualizedGrid onRangeChange={(range) => ranges.push(range)} />);
      expect(ranges.length).toBeGreaterThan(0);
      const last = ranges.at(-1)!;
      expect(last.startIndex).toBe(0);
      expect(last.endIndex).toBeGreaterThan(0);
      expect(last.endIndex).toBeLessThan(MANY_ROWS.length);
    });

    it("shift+click ranges correctly across a span that wasn't mounted between the two clicks", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<VirtualizedSelectableGrid />);
      const firstCheckbox = getAllByRole("checkbox", { name: "Select row" })[0]!;
      await user.click(firstCheckbox);
      // Jump keyboard focus to the far end (rows in between never mount),
      // then shift+click the far row's checkbox against the row-0 anchor.
      // `SelectionCell` renders its own `role="gridcell"` too, but (unlike
      // `DataTable.Cell`) isn't part of the roving-tabindex nav model, so it
      // carries no `tabindex` — pick a cell that does.
      const firstCell = getAllByRole("gridcell").find((el) => el.hasAttribute("tabindex"))!;
      act(() => firstCell.focus());
      await user.keyboard("{Control>}{End}{/Control}");
      const farCheckbox = getAllByRole("checkbox", { name: "Select row" }).at(-1)!;
      await user.keyboard("{Shift>}");
      await user.click(farCheckbox);
      await user.keyboard("{/Shift}");
      // The full 500-row range is selected — selection.toggleRange walks
      // the adapter's complete row list, independent of which rows happen
      // to be mounted at click time.
      expect(firstCheckbox).toBeChecked();
      expect(farCheckbox).toBeChecked();
    });

    it("passes an axe scan with a large virtualized dataset", async () => {
      const { container } = render(<VirtualizedGrid />);
      expect((await axe(container)).violations.length).toBe(0);
    });

    it("an edit survives the row scrolling out of the virtual window and back", async () => {
      const editableManyColumns: DataTableColumnDef<Sample>[] = [
        { id: "name", accessorKey: "name", header: "Name", editable: true },
        { id: "concentration", accessorKey: "concentration", header: "Concentration" },
      ];
      function VirtualizedEditableGrid() {
        const table = useDataTable({
          data: MANY_ROWS,
          columns: editableManyColumns,
          getRowId: (row) => row.sampleId,
        });
        return (
          <DataTable.Root table={table} aria-label="Samples">
            <DataTable.Header>
              <DataTable.HeaderRow>
                {table.headerCells.map((header) => (
                  <DataTable.HeaderCell key={header.id} header={header} />
                ))}
              </DataTable.HeaderRow>
            </DataTable.Header>
            <DataTable.Body table={table}>
              {(row) => (
                <DataTable.Row key={row.id} row={row}>
                  {row.cells.map((cell) => (
                    <DataTable.Cell key={cell.id} cell={cell} />
                  ))}
                </DataTable.Row>
              )}
            </DataTable.Body>
          </DataTable.Root>
        );
      }
      const user = userEvent.setup();
      const { getByRole, getAllByRole } = render(<VirtualizedEditableGrid />);
      const cells = getAllByRole("gridcell");
      act(() => cells[0]!.focus()); // row 0, Name — "Sample 0"
      await user.keyboard("{Enter}");
      await user.clear(getAllByRole("textbox")[0]!);
      await user.type(getAllByRole("textbox")[0]!, "Renamed");
      await user.keyboard("{Enter}");
      expect(getAllByRole("gridcell")[0]).toHaveTextContent("Renamed");

      const grid = getByRole("grid");
      // Scroll deep enough that row 0 leaves the mounted window, then scroll
      // back — this asserts the value lives in adapter state, not the DOM.
      act(() => {
        grid.scrollTop = 50000;
        grid.dispatchEvent(new Event("scroll"));
      });
      expect(getAllByRole("gridcell").some((el) => el.textContent === "Renamed")).toBe(false);
      act(() => {
        grid.scrollTop = 0;
        grid.dispatchEvent(new Event("scroll"));
      });
      expect(getAllByRole("gridcell")[0]).toHaveTextContent("Renamed");
      expect(getAllByRole("gridcell")[0]).toHaveAttribute("data-edited", "");
    });
  });

  describe("density", () => {
    function DensityGrid({ density }: { density?: "xs" | "sm" | "md" | "lg" | "xl" }) {
      const table = useDataTable({ data, columns, getRowId: (row) => row.sampleId });
      return (
        <DataTable.Root table={table} aria-label="Samples" density={density}>
          <DataTable.Header>
            <DataTable.HeaderRow>
              {table.headerCells.map((header) => (
                <DataTable.HeaderCell key={header.id} header={header} />
              ))}
            </DataTable.HeaderRow>
          </DataTable.Header>
          <DataTable.Body table={table}>
            {(row) => (
              <DataTable.Row key={row.id} row={row}>
                {row.cells.map((cell) => (
                  <DataTable.Cell key={cell.id} cell={cell} />
                ))}
              </DataTable.Row>
            )}
          </DataTable.Body>
        </DataTable.Root>
      );
    }

    it("defaults to sm padding on both header and body cells", () => {
      const { getAllByRole } = render(<DensityGrid />);
      expect(getAllByRole("columnheader")[0]).toHaveClass("py-inset-xs");
      expect(getAllByRole("gridcell")[0]).toHaveClass("py-inset-xs");
    });

    it("applies a different density's padding classes to header and body cells alike", () => {
      const { getAllByRole } = render(<DensityGrid density="lg" />);
      expect(getAllByRole("columnheader")[0]).toHaveClass("py-inset-md");
      expect(getAllByRole("gridcell")[0]).toHaveClass("py-inset-md");
    });

    it("does not change cell text size across densities (only spacing)", () => {
      const { getAllByRole: getXs } = render(<DensityGrid density="xs" />);
      const { getAllByRole: getXl } = render(<DensityGrid density="xl" />);
      expect(getXs("gridcell")[0]).toHaveClass("text-data");
      expect(getXl("gridcell")[0]).toHaveClass("text-data");
    });

    it("seeds the virtualizer's row height from density when estimateRowSize isn't set", () => {
      function BigDensityGrid() {
        const bigData: Sample[] = Array.from({ length: 200 }, (_, i) => ({
          sampleId: `S-${i}`,
          name: `Sample ${i}`,
          concentration: i,
        }));
        const bigTable = useDataTable({ data: bigData, columns, getRowId: (row) => row.sampleId });
        return (
          <DataTable.Root table={bigTable} aria-label="Samples" density="xl">
            <DataTable.Header>
              <DataTable.HeaderRow>
                {bigTable.headerCells.map((header) => (
                  <DataTable.HeaderCell key={header.id} header={header} />
                ))}
              </DataTable.HeaderRow>
            </DataTable.Header>
            <DataTable.Body table={bigTable}>
              {(row) => (
                <DataTable.Row key={row.id} row={row}>
                  {row.cells.map((cell) => (
                    <DataTable.Cell key={cell.id} cell={cell} />
                  ))}
                </DataTable.Row>
              )}
            </DataTable.Body>
          </DataTable.Root>
        );
      }
      const { getByRole } = render(<BigDensityGrid />);
      const rowgroups = getByRole("grid").querySelectorAll('[role="rowgroup"]');
      const sizer = rowgroups[1]!.firstElementChild as HTMLElement;
      // 200 rows * the "xl"-density default (53px) estimate.
      expect(sizer.style.height).toBe("10600px");
    });

    it("an explicit estimateRowSize overrides the density default", () => {
      function OverriddenGrid() {
        const table = useDataTable({ data, columns, getRowId: (row) => row.sampleId });
        return (
          <DataTable.Root table={table} aria-label="Samples" density="xl" estimateRowSize={100}>
            <DataTable.Header>
              <DataTable.HeaderRow>
                {table.headerCells.map((header) => (
                  <DataTable.HeaderCell key={header.id} header={header} />
                ))}
              </DataTable.HeaderRow>
            </DataTable.Header>
            <DataTable.Body table={table}>
              {(row) => (
                <DataTable.Row key={row.id} row={row}>
                  {row.cells.map((cell) => (
                    <DataTable.Cell key={cell.id} cell={cell} />
                  ))}
                </DataTable.Row>
              )}
            </DataTable.Body>
          </DataTable.Root>
        );
      }
      const { getByRole } = render(<OverriddenGrid />);
      const rowgroups = getByRole("grid").querySelectorAll('[role="rowgroup"]');
      const sizer = rowgroups[1]!.firstElementChild as HTMLElement;
      expect(sizer.style.height).toBe("200px"); // 2 rows * 100px
    });

    it("passes an axe scan at every density", async () => {
      for (const density of ["xs", "sm", "md", "lg", "xl"] as const) {
        const { container, unmount } = render(<DensityGrid density={density} />);
        expect((await axe(container)).violations.length).toBe(0);
        unmount();
      }
    });
  });

  describe("inline cell editing", () => {
    const editableColumns: DataTableColumnDef<Sample>[] = [
      { id: "name", accessorKey: "name", header: "Name", editable: true },
      {
        id: "concentration",
        accessorKey: "concentration",
        header: "Concentration",
        align: "end",
        editable: true,
        editor: "number",
      },
    ];

    function EditableGrid({ onCellEdit }: { onCellEdit?: (edit: unknown) => void } = {}) {
      const table = useDataTable({
        data,
        columns: editableColumns,
        getRowId: (row) => row.sampleId,
        onCellEdit,
      });
      return (
        <DataTable.Root table={table} aria-label="Samples">
          <DataTable.Header>
            <DataTable.HeaderRow>
              {table.headerCells.map((header) => (
                <DataTable.HeaderCell key={header.id} header={header} />
              ))}
            </DataTable.HeaderRow>
          </DataTable.Header>
          <DataTable.Body table={table}>
            {(row) => (
              <DataTable.Row key={row.id} row={row}>
                {row.cells.map((cell) => (
                  <DataTable.Cell key={cell.id} cell={cell} />
                ))}
              </DataTable.Row>
            )}
          </DataTable.Body>
        </DataTable.Root>
      );
    }

    it("Enter on a focused editable cell opens a real, focused input with the current value", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<EditableGrid />);
      const cells = getAllByRole("gridcell");
      act(() => cells[0]!.focus());
      await user.keyboard("{Enter}");
      const input = getAllByRole("textbox")[0]!;
      expect(document.activeElement).toBe(input);
      expect(input).toHaveValue("Alpha");
    });

    it("does nothing on Enter for a cell whose column isn't editable", async () => {
      const user = userEvent.setup();
      const { getAllByRole, queryAllByRole } = render(<Grid />); // Grid's columns aren't editable
      const cells = getAllByRole("gridcell");
      act(() => cells[0]!.focus());
      await user.keyboard("{Enter}");
      expect(queryAllByRole("textbox")).toHaveLength(0);
      expect(document.activeElement).toBe(cells[0]);
    });

    it("double-clicking an editable cell opens a real, focused input with the current value", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<EditableGrid />);
      const cells = getAllByRole("gridcell");
      await user.dblClick(cells[0]!);
      const input = getAllByRole("textbox")[0]!;
      expect(document.activeElement).toBe(input);
      expect(input).toHaveValue("Alpha");
    });

    it("double-clicking activates and edits a cell that wasn't already the active cell", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<EditableGrid />);
      const cells = getAllByRole("gridcell");
      // cells[0] is active by default (the grid's initial active cell) — this
      // double-clicks a different cell to prove activateAndEdit doesn't
      // depend on that cell already being active going in.
      await user.dblClick(cells[2]!);
      const input = getAllByRole("textbox")[0]!;
      expect(document.activeElement).toBe(input);
      expect(input).toHaveValue("Beta");
    });

    it("does nothing on double-click for a cell whose column isn't editable", async () => {
      const user = userEvent.setup();
      const { getAllByRole, queryAllByRole } = render(<Grid />); // Grid's columns aren't editable
      const cells = getAllByRole("gridcell");
      await user.dblClick(cells[0]!);
      expect(queryAllByRole("textbox")).toHaveLength(0);
    });

    it("typing and pressing Enter commits the value and moves the active cell down one row", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<EditableGrid />);
      const cells = getAllByRole("gridcell");
      act(() => cells[0]!.focus());
      await user.keyboard("{Enter}");
      await user.clear(getAllByRole("textbox")[0]!);
      await user.type(getAllByRole("textbox")[0]!, "Zeta");
      await user.keyboard("{Enter}");
      expect(getAllByRole("gridcell")[0]).toHaveTextContent("Zeta");
      expect(getAllByRole("gridcell")[0]).toHaveAttribute("data-edited", "");
      // row 1, same column (2 columns per row) is now the active/focused cell.
      expect(document.activeElement).toBe(getAllByRole("gridcell")[2]);
      expect(document.activeElement).toHaveAttribute("tabindex", "0");
    });

    it("Tab commits and moves the active cell right one column", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<EditableGrid />);
      const cells = getAllByRole("gridcell");
      act(() => cells[0]!.focus());
      await user.keyboard("{Enter}");
      await user.keyboard("{Tab}");
      expect(getAllByRole("gridcell")[0]).toHaveTextContent("Alpha"); // unchanged
      expect(document.activeElement).toBe(getAllByRole("gridcell")[1]);
    });

    it("Escape reverts without committing and returns focus to the cell", async () => {
      const user = userEvent.setup();
      const { getAllByRole, queryAllByRole } = render(<EditableGrid />);
      const cells = getAllByRole("gridcell");
      act(() => cells[0]!.focus());
      await user.keyboard("{Enter}");
      await user.clear(getAllByRole("textbox")[0]!);
      await user.type(getAllByRole("textbox")[0]!, "Zeta");
      await user.keyboard("{Escape}");
      expect(queryAllByRole("textbox")).toHaveLength(0);
      expect(getAllByRole("gridcell")[0]).toHaveTextContent("Alpha");
      expect(getAllByRole("gridcell")[0]).not.toHaveAttribute("data-edited");
      expect(document.activeElement).toBe(getAllByRole("gridcell")[0]);
    });

    it("blurring the input (clicking elsewhere) commits the typed value", async () => {
      const user = userEvent.setup();
      const { getAllByRole } = render(<EditableGrid />);
      const cells = getAllByRole("gridcell");
      act(() => cells[0]!.focus());
      await user.keyboard("{Enter}");
      await user.clear(getAllByRole("textbox")[0]!);
      await user.type(getAllByRole("textbox")[0]!, "Zeta");
      await user.click(getAllByRole("gridcell")[2]!); // click a different cell
      expect(getAllByRole("gridcell")[0]).toHaveTextContent("Zeta");
      expect(getAllByRole("gridcell")[0]).toHaveAttribute("data-edited", "");
    });

    it("commits a number-editor cell's value as a number, not a string", async () => {
      const user = userEvent.setup();
      const onCellEdit = vi.fn();
      const { getAllByRole } = render(<EditableGrid onCellEdit={onCellEdit} />);
      const cells = getAllByRole("gridcell");
      act(() => cells[1]!.focus()); // Concentration column, row 0
      await user.keyboard("{Enter}");
      await user.clear(getAllByRole("spinbutton")[0]!);
      await user.type(getAllByRole("spinbutton")[0]!, "9.9");
      await user.keyboard("{Enter}");
      expect(onCellEdit).toHaveBeenCalledWith({
        rowId: "S-001",
        columnId: "concentration",
        value: 9.9,
        row: data[0],
      });
    });

    it("passes an axe scan while a cell is being edited", async () => {
      const user = userEvent.setup();
      const { container, getAllByRole } = render(<EditableGrid />);
      act(() => getAllByRole("gridcell")[0]!.focus());
      await user.keyboard("{Enter}");
      expect((await axe(container)).violations.length).toBe(0);
    });
  });
});
