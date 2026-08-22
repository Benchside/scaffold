import type { ReactNode } from "react";
import type {
  DataTableCellContext,
  DataTableColumnDef,
  DataTableFormattedNumber,
  DataTableNumberFormat,
} from "./types";

/**
 * Formats a numeric value for display, keeping the unit and range
 * classification separate from the text so a consumer (or a future
 * export/copy-paste feature) can still read the raw value via
 * `getCellValue` without re-parsing a unit back out of a string.
 */
export function formatDataTableNumber(
  value: number,
  format: DataTableNumberFormat,
): DataTableFormattedNumber {
  const { precision, precisionMode = "decimals", unit, rangeCheck } = format;

  const options: Intl.NumberFormatOptions =
    precision === undefined
      ? {}
      : precisionMode === "significantFigures"
        ? { minimumSignificantDigits: 1, maximumSignificantDigits: precision }
        : { minimumFractionDigits: precision, maximumFractionDigits: precision };

  return {
    text: new Intl.NumberFormat(undefined, options).format(value),
    unit,
    range: rangeCheck ? rangeCheck(value) : "in-range",
  };
}

/**
 * A ready-made `DataTableColumnDef.cell` for numeric columns: renders the
 * formatted value with the unit as a separate muted `<span>`. Assign it to
 * a column's `cell` explicitly (`cell: numericCell(format)`), and pass the
 * same `format` as the column's `format` so `useDataTable` can also derive
 * `data-out-of-range` from `rangeCheck` — see `useDataTable.ts`.
 *
 * Takes `TValue = unknown` (not `number`) so it type-checks as an entry in
 * an ordinary `DataTableColumnDef<TRow>[]` array, where TypeScript can't
 * otherwise let a `TValue = number`-specific `cell` satisfy a structurally
 * `unknown`-typed slot (function parameters are contravariant). The value
 * is expected to already be numeric — accessorKey/accessorFn on a numeric
 * field, same as any other column.
 */
export function numericCell<TRow extends object>(
  format: DataTableNumberFormat,
): NonNullable<DataTableColumnDef<TRow>["cell"]> {
  return (ctx: DataTableCellContext<TRow>): ReactNode => {
    const { text, unit } = formatDataTableNumber(Number(ctx.value), format);
    if (!unit) return text;
    return (
      <>
        {text} <span className="text-text-secondary">{unit}</span>
      </>
    );
  };
}
