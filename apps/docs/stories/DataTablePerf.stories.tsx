import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  DataTable,
  useDataTable,
  numericCell,
  type DataTableColumnDef,
} from "@benchside/scaffold-react";

// Synthetic large datasets driving perf/datatable.perf.spec.ts. Not part
// of the documented component gallery (excluded from Storybook's sidebar
// via `tags: ["!dev"]` below) and not a visual-regression target — these
// stories exist purely as a stable render surface for perf measurement.

interface PerfRow {
  id: string;
  sampleId: string;
  name: string;
  concentration: number;
}

function generateRows(count: number): PerfRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    sampleId: `S-${String(i).padStart(6, "0")}`,
    name: `Sample ${i}`,
    concentration: (i % 37) + i / 1000,
  }));
}

const concentrationFormat = {
  precision: 1,
  unit: "ng/mL",
  rangeCheck: (v: number) =>
    v < 5 ? ("low" as const) : v > 20 ? ("high" as const) : ("in-range" as const),
};

const perfColumns: DataTableColumnDef<PerfRow>[] = [
  { id: "sampleId", accessorKey: "sampleId", header: "Sample ID", sortable: true },
  { id: "name", accessorKey: "name", header: "Name", editable: true },
  {
    id: "concentration",
    accessorKey: "concentration",
    header: "Concentration",
    align: "end",
    sortable: true,
    editable: true,
    editor: "number",
    format: concentrationFormat,
    cell: numericCell(concentrationFormat),
  },
];

const meta: Meta = {
  title: "Perf/DataTable",
  tags: ["!dev"],
};
export default meta;
type Story = StoryObj;

function PerfTable({ rowCount }: { rowCount: number }) {
  // Memoized on rowCount alone, not regenerated every render — the whole
  // point is measuring what DataTable does with a *stable* dataset across
  // selection/edit/nav interactions, same as a real consumer's loaded data.
  const data = useMemo(() => generateRows(rowCount), [rowCount]);
  const table = useDataTable({
    data,
    columns: perfColumns,
    getRowId: (row) => row.id,
  });
  return (
    <div data-testid="perf-table-wrapper" data-row-count={rowCount}>
      <DataTable.Root table={table} aria-label={`${rowCount} rows`} className="h-[600px] w-[700px]">
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
    </div>
  );
}

// Explicit `name` on each — Storybook's export-name-to-display-name
// transform splits digits into their own words ("Perf1k" -> "Perf 1 K"),
// which the perf spec's story lookup would otherwise have to replicate.
export const Perf1k: Story = { name: "Perf1k", render: () => <PerfTable rowCount={1_000} /> };
export const Perf10k: Story = { name: "Perf10k", render: () => <PerfTable rowCount={10_000} /> };
export const Perf100k: Story = {
  name: "Perf100k",
  render: () => <PerfTable rowCount={100_000} />,
};
