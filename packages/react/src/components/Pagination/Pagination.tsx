import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import {
  Pagination as ArkPagination,
  type PaginationPageChangeDetails,
  type PaginationPageSizeChangeDetails,
} from "@ark-ui/react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "../../lib/cn";

const RANGE_FORMATTER = new Intl.NumberFormat("en-US");

interface PaginationProps extends Omit<ComponentPropsWithoutRef<"nav">, "defaultValue"> {
  /** Total number of items being paginated (not the page count — derived from `count`/`pageSize`). */
  count?: number;
  page?: number;
  /** @default 1 */
  defaultPage?: number;
  pageSize?: number;
  /** @default 10 */
  defaultPageSize?: number;
  /** Pages shown beside the active page. @default 1 */
  siblingCount?: number;
  /** Pages shown at the very start/end. @default 1 */
  boundaryCount?: number;
  onPageChange?: (details: PaginationPageChangeDetails) => void;
  /**
   * Called when `Pagination.Context`'s `setPageSize` is used — this
   * component ships no page-size picker itself (compose one with `Select`
   * at the call site, reading/writing through `Pagination.Context`), but
   * the prop is wired through now so that composition needs no API change
   * later.
   */
  onPageSizeChange?: (details: PaginationPageSizeChangeDetails) => void;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

/**
 * A page-number strip with previous/next/first/last navigation — built on
 * Ark UI's pagination state machine for boundary/sibling-count truncation,
 * disabled-state handling at the ends, and ARIA. Fully composable: render
 * only the triggers you want as direct children, and use
 * `Pagination.Context` to map the (already-truncated) `pages` array into
 * `Pagination.Item`/`Pagination.Ellipsis`. `Pagination.Context` also
 * exposes `setPage`/`setPageSize`/`totalPages`/`pageSize` directly, so a
 * page-size `<Select>` or a jump-to-page input can be composed later
 * without any change to this component's API.
 *
 * @param count - Total item count (not page count).
 * @param siblingCount - Pages shown beside the active page (default `1`).
 * @param boundaryCount - Pages shown at the very start/end (default `1`).
 *
 * @example
 * <Pagination count={total} defaultPageSize={20}>
 *   <Pagination.PrevTrigger />
 *   <Pagination.Context>
 *     {(api) => api.pages.map((page, i) =>
 *       page.type === "page" ? (
 *         <Pagination.Item key={i} value={page.value}>{page.value}</Pagination.Item>
 *       ) : (
 *         <Pagination.Ellipsis key={i} index={i} />
 *       )
 *     )}
 *   </Pagination.Context>
 *   <Pagination.NextTrigger />
 *   <Pagination.RangeText />
 * </Pagination>
 */
function Pagination({
  count,
  page,
  defaultPage,
  pageSize,
  defaultPageSize,
  siblingCount,
  boundaryCount,
  onPageChange,
  onPageSizeChange,
  className,
  children,
  ref,
  ...props
}: PaginationProps) {
  return (
    <ArkPagination.Root
      count={count}
      page={page}
      defaultPage={defaultPage}
      pageSize={pageSize}
      defaultPageSize={defaultPageSize}
      siblingCount={siblingCount}
      boundaryCount={boundaryCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      ref={ref}
      className={cn("flex items-center gap-inline-xs", className)}
      {...props}
    >
      {children}
    </ArkPagination.Root>
  );
}

const NAV_BUTTON_CLASSES =
  "inline-flex size-(--font-size-xl) items-center justify-center rounded-md text-text-secondary transition-colors duration-100 hover:bg-bg-hover hover:text-text focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50";

interface PaginationTriggerProps extends ComponentPropsWithoutRef<"button"> {
  ref?: Ref<HTMLButtonElement>;
}

/** Jumps to the first page. Icon-only by default (already accessibly labeled via Ark's translations) — pass children to override. */
function PaginationFirstTrigger({ className, children, ref, ...props }: PaginationTriggerProps) {
  return (
    <ArkPagination.FirstTrigger ref={ref} className={cn(NAV_BUTTON_CLASSES, className)} {...props}>
      {children ?? <ChevronsLeft className="size-4" aria-hidden="true" />}
    </ArkPagination.FirstTrigger>
  );
}

/** Moves to the previous page. Icon-only by default — pass children to override. */
function PaginationPrevTrigger({ className, children, ref, ...props }: PaginationTriggerProps) {
  return (
    <ArkPagination.PrevTrigger ref={ref} className={cn(NAV_BUTTON_CLASSES, className)} {...props}>
      {children ?? <ChevronLeft className="size-4" aria-hidden="true" />}
    </ArkPagination.PrevTrigger>
  );
}

/** Moves to the next page. Icon-only by default — pass children to override. */
function PaginationNextTrigger({ className, children, ref, ...props }: PaginationTriggerProps) {
  return (
    <ArkPagination.NextTrigger ref={ref} className={cn(NAV_BUTTON_CLASSES, className)} {...props}>
      {children ?? <ChevronRight className="size-4" aria-hidden="true" />}
    </ArkPagination.NextTrigger>
  );
}

/** Jumps to the last page. Icon-only by default — pass children to override. */
function PaginationLastTrigger({ className, children, ref, ...props }: PaginationTriggerProps) {
  return (
    <ArkPagination.LastTrigger ref={ref} className={cn(NAV_BUTTON_CLASSES, className)} {...props}>
      {children ?? <ChevronsRight className="size-4" aria-hidden="true" />}
    </ArkPagination.LastTrigger>
  );
}

interface PaginationItemProps extends Omit<ComponentPropsWithoutRef<"button">, "value" | "type"> {
  value: number;
  ref?: Ref<HTMLButtonElement>;
}

/** A single page-number button, from `Pagination.Context`'s `pages` array. */
function PaginationItem({ value, className, children, ref, ...props }: PaginationItemProps) {
  return (
    <ArkPagination.Item
      type="page"
      value={value}
      ref={ref}
      className={cn(
        "inline-flex h-(--font-size-xl) min-w-(--font-size-xl) items-center justify-center rounded-md px-inset-2xs text-data text-text transition-colors duration-100 hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus data-selected:bg-accent data-selected:text-text-on-solid",
        className,
      )}
      {...props}
    >
      {children}
    </ArkPagination.Item>
  );
}

interface PaginationEllipsisProps extends ComponentPropsWithoutRef<"div"> {
  index: number;
  ref?: Ref<HTMLDivElement>;
}

/** A truncation marker (`…`) between non-adjacent pages, from `Pagination.Context`'s `pages` array. */
function PaginationEllipsis({
  index,
  className,
  children,
  ref,
  ...props
}: PaginationEllipsisProps) {
  return (
    <ArkPagination.Ellipsis
      index={index}
      ref={ref}
      className={cn(
        "inline-flex size-(--font-size-xl) items-center justify-center text-text-secondary",
        className,
      )}
      {...props}
    >
      {children ?? "…"}
    </ArkPagination.Ellipsis>
  );
}

interface PaginationRangeTextFormatDetails {
  start: number;
  end: number;
  count: number;
}

interface PaginationRangeTextProps extends ComponentPropsWithoutRef<"span"> {
  /** Overrides the default "{start}–{end} of {count}" format. */
  format?: (details: PaginationRangeTextFormatDetails) => string;
  ref?: Ref<HTMLSpanElement>;
}

/**
 * A "1–20 of 1,234,567" summary of the current page's slice — not an Ark
 * part (Ark exposes `pageRange`/`count` on `Context` but no ready-made
 * summary text), added here since scientific datasets routinely run into
 * the millions of records and an unformatted count reads poorly at that
 * scale, the same reasoning `DataTable`'s `formatDataTableNumber` and
 * `Progress`'s `Intl.NumberFormat`-based formatting already follow in this
 * repo.
 */
function PaginationRangeText({ format, className, ref, ...props }: PaginationRangeTextProps) {
  return (
    <ArkPagination.Context>
      {(api) => {
        const start = api.count === 0 ? 0 : api.pageRange.start + 1;
        const end = api.pageRange.end;
        const text = format
          ? format({ start, end, count: api.count })
          : `${RANGE_FORMATTER.format(start)}–${RANGE_FORMATTER.format(end)} of ${RANGE_FORMATTER.format(api.count)}`;
        return (
          <span ref={ref} className={cn("text-data text-text-secondary", className)} {...props}>
            {text}
          </span>
        );
      }}
    </ArkPagination.Context>
  );
}

const PaginationWithParts = Object.assign(Pagination, {
  Context: ArkPagination.Context,
  FirstTrigger: PaginationFirstTrigger,
  PrevTrigger: PaginationPrevTrigger,
  NextTrigger: PaginationNextTrigger,
  LastTrigger: PaginationLastTrigger,
  Item: PaginationItem,
  Ellipsis: PaginationEllipsis,
  RangeText: PaginationRangeText,
});

export { PaginationWithParts as Pagination };
