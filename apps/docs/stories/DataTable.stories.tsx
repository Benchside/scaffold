import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  DataTable,
  useDataTable,
  numericCell,
  type DataTableColumnDef,
} from "@benchside/scaffold-react";

interface Sample {
  sampleId: string;
  name: string;
  concentration: number;
}

const SAMPLES: Sample[] = [
  { sampleId: "S-001", name: "Plasma A1", concentration: 12.4 },
  { sampleId: "S-002", name: "Plasma A2", concentration: 8.9 },
  { sampleId: "S-003", name: "Plasma A3", concentration: 15.2 },
  { sampleId: "S-004", name: "Serum B1", concentration: 3.1 },
  { sampleId: "S-005", name: "Serum B2", concentration: 22.7 },
];

const concentrationFormat = {
  precision: 1,
  unit: "ng/mL",
  rangeCheck: (v: number) =>
    v < 5 ? ("low" as const) : v > 20 ? ("high" as const) : ("in-range" as const),
};

const columns: DataTableColumnDef<Sample>[] = [
  { id: "sampleId", accessorKey: "sampleId", header: "Sample ID", sortable: true },
  {
    id: "name",
    accessorKey: "name",
    header: "Name",
    cellState: (ctx) => (ctx.value === "Plasma A3" ? { flagged: true } : {}),
  },
  {
    id: "concentration",
    accessorKey: "concentration",
    header: "Concentration",
    align: "end",
    sortable: true,
    format: concentrationFormat,
    cell: numericCell(concentrationFormat),
  },
];

function HeaderRow({ table }: { table: ReturnType<typeof useDataTable<Sample>> }) {
  return (
    <DataTable.Header>
      <DataTable.HeaderRow>
        {table.headerCells.map((header) => (
          <DataTable.HeaderCell key={header.id} header={header} className="flex-1">
            {header.sortable ? <DataTable.SortButton header={header} /> : header.label}
          </DataTable.HeaderCell>
        ))}
      </DataTable.HeaderRow>
    </DataTable.Header>
  );
}

function SampleGrid() {
  const table = useDataTable({ data: SAMPLES, columns, getRowId: (row) => row.sampleId });
  return (
    <DataTable.Root table={table} aria-label="Samples" className="max-w-xl w-full">
      <HeaderRow table={table} />
      <DataTable.Body table={table} emptyState="No samples found.">
        {(row) => (
          <DataTable.Row key={row.id} row={row}>
            {row.cells.map((cell) => (
              <DataTable.Cell key={cell.id} cell={cell} className="flex-1" />
            ))}
          </DataTable.Row>
        )}
      </DataTable.Body>
    </DataTable.Root>
  );
}

const meta: Meta<typeof DataTable.Root> = {
  title: "Components/DataTable",
  component: DataTable.Root,
};

export default meta;

type Story = StoryObj<typeof DataTable.Root>;

/**
 * Static, non-virtualized grid — column model, ARIA grid roles, sorting,
 * numeric formatting with units, and cell state (out-of-range concentration
 * values, a flagged sample name).
 */
export const Default: Story = {
  render: () => <SampleGrid />,
};

/** Empty state, driven purely by `data: []` — `Body`'s `emptyState` prop covers it automatically. */
export const Empty: Story = {
  render: () => {
    const table = useDataTable({ data: [], columns, getRowId: (row) => row.sampleId });
    return (
      <DataTable.Root table={table} aria-label="Samples" className="max-w-xl w-full">
        <HeaderRow table={table} />
        <DataTable.Body table={table} emptyState="No samples found.">
          {(row) => <DataTable.Row key={row.id} row={row} />}
        </DataTable.Body>
      </DataTable.Root>
    );
  },
};

/** Explicit loading state — `Body`'s `state="loading"` swaps in `loadingState` instead of rows. */
export const Loading: Story = {
  render: () => {
    const table = useDataTable({ data: SAMPLES, columns, getRowId: (row) => row.sampleId });
    return (
      <DataTable.Root table={table} aria-label="Samples" className="max-w-xl w-full">
        <HeaderRow table={table} />
        <DataTable.Body table={table} state="loading" loadingState="Loading samples…">
          {(row) => <DataTable.Row key={row.id} row={row} />}
        </DataTable.Body>
      </DataTable.Root>
    );
  },
};

/** Explicit error state — `Body`'s `state="error"` swaps in `errorState` instead of rows. */
export const ErrorState: Story = {
  render: () => {
    const table = useDataTable({ data: SAMPLES, columns, getRowId: (row) => row.sampleId });
    return (
      <DataTable.Root table={table} aria-label="Samples" className="max-w-xl w-full">
        <HeaderRow table={table} />
        <DataTable.Body table={table} state="error" errorState="Failed to load samples.">
          {(row) => <DataTable.Row key={row.id} row={row} />}
        </DataTable.Body>
      </DataTable.Root>
    );
  },
};

const filterableColumns: DataTableColumnDef<Sample>[] = [
  { id: "sampleId", accessorKey: "sampleId", header: "Sample ID", sortable: true },
  { id: "name", accessorKey: "name", header: "Name", filterable: true },
  {
    id: "concentration",
    accessorKey: "concentration",
    header: "Concentration",
    align: "end",
    sortable: true,
    format: concentrationFormat,
    cell: numericCell(concentrationFormat),
  },
];

/**
 * `SearchInput` (global, above the grid) and a per-column `FilterButton`
 * popover on Name — both narrow `table.rows` in place, no pagination.
 */
export const Filtering: Story = {
  render: () => {
    const table = useDataTable({
      data: SAMPLES,
      columns: filterableColumns,
      getRowId: (row) => row.sampleId,
    });
    return (
      <div className="max-w-xl flex w-full flex-col gap-inset-sm">
        <DataTable.SearchInput table={table} className="max-w-64" />
        <DataTable.Root table={table} aria-label="Samples">
          <DataTable.Header>
            <DataTable.HeaderRow>
              {table.headerCells.map((header) => (
                <DataTable.HeaderCell key={header.id} header={header} className="flex-1">
                  <span className="inline-flex items-center gap-inline-2xs">
                    {header.sortable ? <DataTable.SortButton header={header} /> : header.label}
                    {header.filterable && <DataTable.FilterButton header={header} />}
                  </span>
                </DataTable.HeaderCell>
              ))}
            </DataTable.HeaderRow>
          </DataTable.Header>
          <DataTable.Body table={table} emptyState="No samples match your filters.">
            {(row) => (
              <DataTable.Row key={row.id} row={row}>
                {row.cells.map((cell) => (
                  <DataTable.Cell key={cell.id} cell={cell} className="flex-1" />
                ))}
              </DataTable.Row>
            )}
          </DataTable.Body>
        </DataTable.Root>
      </div>
    );
  },
};

/**
 * A select-all header checkbox and a per-row checkbox column, both wired to
 * `table.selection`. Click a row's checkbox, then shift+click another to
 * select the range between them.
 */
export const RowSelection: Story = {
  render: () => {
    const table = useDataTable({ data: SAMPLES, columns, getRowId: (row) => row.sampleId });
    return (
      <DataTable.Root table={table} aria-label="Samples" className="max-w-xl w-full">
        <DataTable.Header>
          <DataTable.HeaderRow>
            <DataTable.SelectionHeaderCell selection={table.selection} />
            {table.headerCells.map((header) => (
              <DataTable.HeaderCell key={header.id} header={header} className="flex-1">
                {header.sortable ? <DataTable.SortButton header={header} /> : header.label}
              </DataTable.HeaderCell>
            ))}
          </DataTable.HeaderRow>
        </DataTable.Header>
        <DataTable.Body table={table} emptyState="No samples found.">
          {(row) => (
            <DataTable.Row key={row.id} row={row}>
              <DataTable.SelectionCell
                row={row}
                selection={table.selection}
                label={`Select ${row.original.name}`}
              />
              {row.cells.map((cell) => (
                <DataTable.Cell key={cell.id} cell={cell} className="flex-1" />
              ))}
            </DataTable.Row>
          )}
        </DataTable.Body>
      </DataTable.Root>
    );
  },
};

interface WideRow {
  id: string;
  sampleId: string;
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  c5: string;
  c6: string;
}

const WIDE_DATA: WideRow[] = Array.from({ length: 40 }, (_, i) => ({
  id: `row-${i}`,
  sampleId: `S-${String(i).padStart(3, "0")}`,
  c1: `Value ${i}-1`,
  c2: `Value ${i}-2`,
  c3: `Value ${i}-3`,
  c4: `Value ${i}-4`,
  c5: `Value ${i}-5`,
  c6: `Value ${i}-6`,
}));

const wideColumns: DataTableColumnDef<WideRow>[] = [
  {
    id: "sampleId",
    accessorKey: "sampleId",
    header: "Sample ID",
    pinned: "start",
    width: 100,
    minWidth: 80,
    maxWidth: 200,
  },
  { id: "c1", accessorKey: "c1", header: "Column 1", width: 150 },
  { id: "c2", accessorKey: "c2", header: "Column 2", width: 150 },
  { id: "c3", accessorKey: "c3", header: "Column 3", width: 150 },
  { id: "c4", accessorKey: "c4", header: "Column 4", width: 150 },
  { id: "c5", accessorKey: "c5", header: "Column 5", width: 150 },
  { id: "c6", accessorKey: "c6", header: "Column 6", width: 150 },
];

/**
 * Many rows (vertical scroll) and wide columns (horizontal scroll) with a
 * pinned Sample ID column and resize handles on every header — the sticky
 * header/pinned-column CSS is the highest-risk part of this checkpoint, so
 * this story exists specifically to scroll both axes against in a real
 * browser rather than trust the CSS on inspection alone.
 */
export const PinnedAndSticky: Story = {
  render: () => {
    const table = useDataTable({
      data: WIDE_DATA,
      columns: wideColumns,
      getRowId: (row) => row.id,
    });
    return (
      <DataTable.Root table={table} aria-label="Wide dataset" className="h-64 w-[500px]">
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
  },
};

const MANY_WIDE_DATA: WideRow[] = Array.from({ length: 5000 }, (_, i) => ({
  id: `row-${i}`,
  sampleId: `S-${String(i).padStart(4, "0")}`,
  c1: `Value ${i}-1`,
  c2: `Value ${i}-2`,
  c3: `Value ${i}-3`,
  c4: `Value ${i}-4`,
  c5: `Value ${i}-5`,
  c6: `Value ${i}-6`,
}));

/**
 * 5,000 rows with the same pinned Sample ID column and resize handles as
 * `PinnedAndSticky` — that story alone (40 rows) doesn't exercise real
 * virtualization, since every row already fits within overscan. This one
 * does: only a small window of rows is ever mounted, so pinned-column
 * `position: sticky` nested inside each virtualized row's `position:
 * absolute; transform: translateY(...)` — the plan's highest-risk CSS
 * combination — has to keep working while scrolling, not just at rest.
 */
export const Virtualized5000Rows: Story = {
  render: () => {
    const table = useDataTable({
      data: MANY_WIDE_DATA,
      columns: wideColumns,
      getRowId: (row) => row.id,
    });
    return (
      <DataTable.Root table={table} aria-label="5000-row dataset" className="h-64 w-[500px]">
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
  },
};

const MANY_SAMPLES: Sample[] = Array.from({ length: 500 }, (_, i) => ({
  sampleId: `S-${String(i).padStart(3, "0")}`,
  name: `Sample ${i}`,
  concentration: i / 10,
}));

/**
 * Row selection combined with virtualization — checkboxes for rows outside
 * the current window mount on demand via `withActiveRow`'s cache-based
 * positioning, not real scroll, so shift+click ranging across a span that
 * was never actually scrolled through still has to resolve correctly.
 */
export const SelectionWithVirtualization: Story = {
  render: () => {
    const table = useDataTable({
      data: MANY_SAMPLES,
      columns,
      getRowId: (row) => row.sampleId,
    });
    return (
      <DataTable.Root table={table} aria-label="Samples" className="h-64 max-w-xl w-full">
        <DataTable.Header>
          <DataTable.HeaderRow>
            <DataTable.SelectionHeaderCell selection={table.selection} />
            {table.headerCells.map((header) => (
              <DataTable.HeaderCell key={header.id} header={header} className="flex-1">
                {header.label}
              </DataTable.HeaderCell>
            ))}
          </DataTable.HeaderRow>
        </DataTable.Header>
        <DataTable.Body table={table}>
          {(row) => (
            <DataTable.Row key={row.id} row={row}>
              <DataTable.SelectionCell
                row={row}
                selection={table.selection}
                label={`Select ${row.original.name}`}
              />
              {row.cells.map((cell) => (
                <DataTable.Cell key={cell.id} cell={cell} className="flex-1" />
              ))}
            </DataTable.Row>
          )}
        </DataTable.Body>
      </DataTable.Root>
    );
  },
};

const editableColumns: DataTableColumnDef<Sample>[] = [
  { id: "sampleId", accessorKey: "sampleId", header: "Sample ID" },
  { id: "name", accessorKey: "name", header: "Name", editable: true },
  {
    id: "concentration",
    accessorKey: "concentration",
    header: "Concentration",
    align: "end",
    editable: true,
    editor: "number",
    format: concentrationFormat,
    cell: numericCell(concentrationFormat),
  },
];

/**
 * Enter opens the inline editor on Name/Concentration; Enter commits and
 * moves down a row, Tab commits and moves right, Escape reverts, and
 * clicking away commits — matching spreadsheet convention.
 */
export const InlineEditing: Story = {
  render: () => {
    const table = useDataTable({
      data: SAMPLES,
      columns: editableColumns,
      getRowId: (row) => row.sampleId,
    });
    return (
      <DataTable.Root table={table} aria-label="Samples" className="max-w-xl w-full">
        <HeaderRow table={table} />
        <DataTable.Body table={table} emptyState="No samples found.">
          {(row) => (
            <DataTable.Row key={row.id} row={row}>
              {row.cells.map((cell) => (
                <DataTable.Cell key={cell.id} cell={cell} className="flex-1" />
              ))}
            </DataTable.Row>
          )}
        </DataTable.Body>
      </DataTable.Root>
    );
  },
};

type Density = "xs" | "sm" | "md" | "lg" | "xl";

// A component per grid, not `useDataTable()` inside `.map()` — hooks can't
// be called conditionally/in a loop, and five grids sharing one render
// function would call it exactly that way.
function DensityExample({ density }: { density: Density }) {
  const table = useDataTable({ data: SAMPLES, columns, getRowId: (row) => row.sampleId });
  return (
    <div className="flex flex-col gap-inset-2xs">
      <span className="text-caption font-caption text-text-secondary">
        density=&quot;{density}&quot;
      </span>
      <DataTable.Root
        table={table}
        aria-label={`Samples (${density})`}
        density={density}
        className="max-w-xl w-full"
      >
        <HeaderRow table={table} />
        <DataTable.Body table={table} emptyState="No samples found.">
          {(row) => (
            <DataTable.Row key={row.id} row={row}>
              {row.cells.map((cell) => (
                <DataTable.Cell key={cell.id} cell={cell} className="flex-1" />
              ))}
            </DataTable.Row>
          )}
        </DataTable.Body>
      </DataTable.Root>
    </div>
  );
}

/** All five density levels stacked for comparison — xs (most compact) through xl (most spacious). */
export const Density: Story = {
  render: () => (
    <div className="flex flex-col gap-inset-lg">
      {(["xs", "sm", "md", "lg", "xl"] as const).map((density) => (
        <DensityExample key={density} density={density} />
      ))}
    </div>
  ),
};
