import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
  type RefObject,
} from "react";
import {
  DateInput as ArkDateInput,
  DatePicker as ArkDatePicker,
  Portal,
  type DateInputValueChangeDetails,
  type DatePickerDateRangePreset,
  type DatePickerValueChangeDetails,
} from "@ark-ui/react";
import { ZonedDateTime, toTimeZone, type DateValue } from "@internationalized/date";
import { cva } from "class-variance-authority";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";
import { floatingPositionerStyle, useFloatingPosition } from "../../lib/floating";
import {
  FieldFooter,
  FIELD_LABEL_TEXT_CLASSES,
  FIELD_SUB_TEXT_CLASSES,
  useFieldIds,
  type FieldSize,
} from "../../lib/field";

const boxVariants = cva(
  "relative inline-flex items-center gap-inline-xs rounded-md border bg-bg-elevated has-focus-visible:outline-2 has-focus-visible:outline-border-focus has-focus-visible:outline-offset-2 data-disabled:cursor-not-allowed data-disabled:opacity-50",
  {
    variants: {
      size: {
        xs: "px-inset-sm py-inset-2xs text-caption font-caption tracking-caption",
        sm: "px-inset-sm py-inset-xs text-label font-label tracking-label",
        md: "px-inset-md py-inset-sm text-label font-label tracking-label",
        lg: "px-inset-md py-inset-md text-label-lg font-label-lg tracking-label-lg",
        xl: "px-inset-lg py-inset-lg text-label-lg font-label-lg tracking-label-lg",
      },
      error: {
        true: "border-status-error",
        false: "border-border",
      },
    },
    defaultVariants: { size: "md", error: false },
  },
);

// Literal segments are the locale's own separators ("/", "-") — rendered
// `aria-hidden` by Zag (see `date-input.connect.js`'s `getSegmentProps`),
// so they need no interactive affordance, just spacing. Editable segments
// (year/month/day) are real `role="spinbutton"` elements — focus/hover
// feedback matters here the same way it does on `Slider`'s numeric input.
// `data-type` carries a string value (exact-match `data-[type=literal]`
// is correct), but `data-editable`/`data-placeholder-shown` are Zag
// booleans rendered via `dataAttr()` as `""` (present) or absent — never
// the literal string `"true"`, so `data-[editable=true]:` silently matches
// nothing; the bare presence form below is required.
const segmentVariants = cva(
  "rounded-sm tabular-nums outline-none data-[type=literal]:text-text-secondary data-editable:cursor-text data-editable:px-0.5 data-editable:focus:bg-accent-subtle data-editable:focus:text-accent-text data-placeholder-shown:text-text-secondary",
);

const triggerVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-sm text-text-secondary outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
);

const TRIGGER_ICON_SIZE_CLASSES = {
  xs: "size-3.5",
  sm: "size-3.5",
  md: "size-4",
  lg: "size-4",
  xl: "size-4.5",
} as const;

const NAV_BUTTON_SIZE_CLASSES = {
  xs: "size-3.5",
  sm: "size-3.5",
  md: "size-4",
  lg: "size-4",
  xl: "size-4.5",
} as const;

/**
 * Every value crosses this exact seam when moving between the public
 * `value`/`defaultValue`/`onValueChange` shape (a scalar in single mode, an
 * array in `range`/`multiple` mode — mirroring `Slider`'s `range` prop) and
 * the internal shared state and both Ark roots' own domain, which is always
 * a `DateValue[]` regardless of mode. In `range` mode the external array is
 * exposed exactly as Zag reports it — length 0 (nothing picked), 1 (only
 * the start date picked), or 2 (complete) — rather than forcing a rigid
 * tuple, since a consumer often needs to tell "start picked, still choosing
 * end" apart from "nothing picked yet" (e.g. to gate a search/filter
 * action). `multiple` mode is naturally variable-length the same way.
 */
function toInternalArray(value: DateValue | DateValue[] | undefined): DateValue[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function toExternalValue(
  values: DateValue[],
  isArrayValue: boolean,
): DateValue | DateValue[] | undefined {
  if (values.length === 0) return undefined;
  return isArrayValue ? values : values[0];
}

type DateGranularity = "day" | "hour" | "minute" | "second";
type DatePickerView = "day" | "month" | "year";

/**
 * Whether a segment has no meaningful value at the current `minView` — the
 * day in a month/year-only picker, or also the month in a year-only one.
 * Locked segments render as an inert "–" (see the segment-mapping loop in
 * the main component) rather than a real `DateInput.Segment`: keeping the
 * `Segment` but disabling it isn't an option (`readOnly`/`disabled` are
 * whole-field props on `DateInput.Root`, nothing per-segment in its public
 * API), and dropping it from the render entirely was tried and reverted —
 * Zag tracks segment focus/navigation purely by DOM position
 * (`dom.getSegmentEls` is a plain `querySelectorAll('[data-part=segment]')`
 * scoped to the control), so removing an element breaks every segment
 * after it. Rendering a plain, non-`Segment` element in its place keeps the
 * position/count Zag expects intact while making it genuinely inert —
 * no `tabIndex`, no `contentEditable`, so it cannot receive focus or a
 * keystroke at all, not just visually locked.
 */
function isSegmentLockedByMinView(segmentType: string, minView: DatePickerView): boolean {
  if (segmentType === "day") return minView !== "day";
  if (segmentType === "month") return minView === "year";
  return false;
}

/**
 * `displayTimeZone` converts a `ZonedDateTime` for display only — the
 * canonical value this component holds (and reports to `onValueChange`)
 * always keeps whatever time zone it already carries (e.g. the zone an
 * assay run was actually recorded in), per the gap-analysis decision that
 * a recorded timestamp's zone must never change silently. `toTimeZone`
 * (not `toZoned`) is the dedicated Zoned→Zoned conversion — it preserves
 * the absolute instant and only changes the displayed wall-clock/zone.
 * Values without a time zone (`CalendarDate`/`CalendarDateTime`) pass
 * through untouched, since there's nothing to convert.
 */
function toDisplay(value: DateValue, displayTimeZone: string | undefined): DateValue {
  if (!displayTimeZone || !(value instanceof ZonedDateTime)) return value;
  return toTimeZone(value, displayTimeZone);
}

/**
 * The reverse of `toDisplay`, run on whatever the two Ark roots report back
 * after an edit — converts back to `canonical`'s own zone (the value this
 * same array slot held *before* the edit), not a single fixed zone, so
 * range mode's two dates can carry different recorded zones. When there's
 * no prior canonical value at this slot (the very first date ever entered
 * under a `displayTimeZone`), there's nothing to restore — the zone it was
 * entered in becomes the canonical zone.
 */
function fromDisplay(displayValue: DateValue, canonical: DateValue | undefined): DateValue {
  if (!(displayValue instanceof ZonedDateTime) || !(canonical instanceof ZonedDateTime)) {
    return displayValue;
  }
  return toTimeZone(displayValue, canonical.timeZone);
}

interface DatePickerProps {
  /** Rendered via `DateInput.Label`, wired to the first segment's click-to-focus behavior. */
  label?: string;
  /** A longer explanatory line between the label and the control. */
  description?: string;
  /** Helper text below the control. Hidden automatically when `error` is set. */
  hint?: string;
  /** Error message below the control, replacing `hint`. Sets `invalid` and the field's error color. */
  error?: string;
  size?: FieldSize;
  /**
   * The BCP 47 locale used for segment ordering, separators, and calendar
   * labels. @default "en-US"
   */
  locale?: string;
  /**
   * The time zone used to resolve `today()`, and to format a `ZonedDateTime`
   * value's segments/calendar — which otherwise default to `"UTC"` rather
   * than the value's own zone (confirmed empirically; see `resolvedTimeZone`
   * in the component body). Left unset, a `ZonedDateTime` value formats in
   * its own zone by default instead. Has no effect on a plain `CalendarDate`
   * — that type carries no time zone by construction. Overridden by
   * `displayTimeZone` when both are set.
   */
  timeZone?: string;
  /** The minimum date that can be selected. */
  min?: DateValue;
  /** The maximum date that can be selected. */
  max?: DateValue;
  /** Returns `true` for a date that cannot be selected — e.g. a blackout day. */
  isDateUnavailable?: (date: DateValue, locale: string) => boolean;
  /**
   * Renders a second segment group and switches the calendar to range
   * selection: click a start day, then an end day (the popover stays open
   * between the two, and closes after per `closeOnSelect` — verified in
   * `date-picker.machine.mjs`: only the *second* click's transition is
   * guarded by `closeOnSelect`, the first never closes). A third click
   * after a complete range starts a new one rather than extending it.
   */
  range?: boolean;
  /** A single date normally, or `[start, end]` (possibly length 0/1 mid-selection) when `range`. */
  value?: DateValue | DateValue[];
  defaultValue?: DateValue | DateValue[];
  /** Receives a `DateValue` normally, or `DateValue[]` when `range` — `undefined` when nothing is selected. */
  onValueChange?: (value: DateValue | DateValue[] | undefined) => void;
  /** Per-group accessible name qualifiers in `range` mode, e.g. `["From", "To"]` — `["Start", "End"]` when unset. */
  rangeLabels?: string[];
  /**
   * The smallest unit shown as an editable segment. `"day"` renders only
   * year/month/day (the default); `"hour"`/`"minute"`/`"second"` add time
   * segments — and, when the value is a `ZonedDateTime`, an auto-added
   * `timeZoneName` segment (see `hideTimeZone`). Only affects the segmented
   * input — the calendar always operates on the date portion alone, and a
   * day clicked there preserves whatever time the value already carries
   * (Zag's own `preserveTime`, confirmed in `date-picker.machine.mjs`).
   * @default "day"
   */
  granularity?: DateGranularity;
  /** 12-hour or 24-hour time segments. @default locale-determined */
  hourCycle?: 12 | 24;
  /** Hides the auto-added `timeZoneName` segment for a `ZonedDateTime` value. @default false */
  hideTimeZone?: boolean;
  /**
   * Renders (and accepts edits in) this time zone instead of a
   * `ZonedDateTime` value's own recorded one — for display only. The
   * canonical value reported to `onValueChange` always keeps its original
   * zone; only what's shown in the segments/calendar is converted, and an
   * edit is converted back before being reported. Has no effect on
   * `CalendarDate`/`CalendarDateTime` values, which carry no zone to convert.
   */
  displayTimeZone?: string;
  /**
   * The finest calendar granularity selectable — `"month"` for a
   * reagent/lot expiry (no meaningful day), `"year"` for year-only. The
   * calendar starts at (and never drills past) this view — clicking a month
   * cell with `minView="month"` selects that whole month directly rather
   * than opening its days. Any day component the resulting value ends up
   * with defaults to `1` (Zag's own `setDateValue`).
   *
   * The segmented field locks any segment below this — day for `"month"`,
   * day and month for `"year"` — to an inert "–", rather than actually
   * removing it: Zag tracks segment focus/navigation purely by DOM position
   * (`dom.getSegmentEls` is a plain `querySelectorAll('[data-part=segment]')`
   * scoped to the control, no public way to tell it otherwise), so an
   * *absent* segment breaks every segment after it — filtering even one
   * segment out (including an invisible bidi-isolate literal Intl inserts
   * around `AM`/`PM`, easy to miss) silently breaks `ArrowUp`/`ArrowDown`
   * on every segment after it, with no thrown error to signal why. See
   * `isSegmentLockedByMinView`.
   * @default "day"
   */
  minView?: DatePickerView;
  /** The coarsest view reachable via the header's drill-up button. @default "year" */
  maxView?: DatePickerView;
  /**
   * Several individually toggled dates instead of one (or a range) — e.g.
   * marking which days of a provenance log to include in an export.
   * Mutually exclusive with `range`. `DateInput` has no multiple-selection
   * mode of its own (its `SelectionMode` is `"single" | "range"` only), so
   * this renders a read-only summary field instead of segments — the
   * calendar is the only way to select, and clicking a day toggles it
   * in/out of the set rather than committing and closing (Zag's own
   * `toggleSelectedDate`, confirmed in `date-picker.machine.mjs` — the
   * popover never auto-closes in this mode, matching that you're typically
   * picking more than one day per visit).
   */
  multiple?: boolean;
  /** Caps how many dates can be selected in `multiple` mode. */
  maxSelectedDates?: number;
  /**
   * Preset buttons shown above the calendar — only meaningful with `range`.
   * Each `value` is one of Zag's named presets (`"last7Days"`, `"thisMonth"`,
   * etc.) or an explicit `[start, end]`. Clicking one commits and closes the
   * popover immediately, regardless of the normal two-click range flow.
   */
  presets?: { label: string; value: DatePickerDateRangePreset | DateValue[] }[];
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  form?: string;
  id?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

interface DatePickerPopoverProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  size: FieldSize;
  presets?: { label: string; value: DatePickerDateRangePreset | DateValue[] }[];
}

const presetButtonVariants = cva(
  "cursor-pointer rounded-sm border border-border px-inset-sm py-inset-2xs outline-none hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2",
);

// Shared by day/month/year cell triggers — `disabled`/`selected`/`focus`/
// `in-range`/`in-hover-range`/`outside-range` are all common to
// `TableCellState` (confirmed identical across `getDayTableCellTriggerProps`/
// `getMonthTableCellTriggerProps`/`getYearTableCellTriggerProps` in
// `date-picker.connect.mjs`). `today`/`unavailable` are `DayTableCellState`-
// only extras — month/year cells have no such data-attrs to style.
const CALENDAR_CELL_SHARED_CLASSES =
  "flex cursor-pointer items-center justify-center rounded-sm outline-none data-disabled:cursor-not-allowed data-disabled:text-text-disabled data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-border-focus data-in-hover-range:not-data-selected:rounded-none data-in-hover-range:not-data-selected:bg-accent-subtle data-in-range:not-data-selected:rounded-none data-in-range:not-data-selected:bg-accent-subtle data-outside-range:text-text-disabled data-selected:bg-accent data-selected:text-accent-text hover:not-data-disabled:not-data-selected:bg-accent-subtle";

function dayCellClasses(size: FieldSize): string {
  return cn(
    FIELD_LABEL_TEXT_CLASSES[size],
    CALENDAR_CELL_SHARED_CLASSES,
    // `mx-auto` centers this fixed-size cell within its `TableCell` <td> —
    // now stretched wide by `table-layout: fixed` + `w-full` on `Table`
    // (added so the grid fills a popover a wide `presets` row has forced
    // open, instead of sitting narrow and left-aligned inside it).
    "size-8 mx-auto data-today:font-semibold data-unavailable:cursor-not-allowed data-unavailable:text-text-disabled data-unavailable:line-through hover:not-data-unavailable:not-data-selected:bg-accent-subtle",
  );
}

function gridCellClasses(size: FieldSize): string {
  return cn(
    FIELD_LABEL_TEXT_CLASSES[size],
    CALENDAR_CELL_SHARED_CLASSES,
    "h-9 min-w-14 px-inset-sm",
  );
}

interface CalendarNavProps {
  size: FieldSize;
}

/**
 * Prev/next + the clickable "August 2026"-style header that drills up to a
 * coarser view. `PrevTrigger`/`NextTrigger`/`ViewTrigger` all read their
 * target view from `DatePickerView`'s context (`useDatePickerViewPropsContext`,
 * default `{ view: "day" }` with no `View` ancestor) — confirmed in
 * `date-picker-view.js` — so this can't sit outside every `<View>` block as
 * one static instance (it would always navigate/label itself for day view:
 * wrong `aria-label`, wrong step size, once `minView`/`maxView` let the user
 * reach month/year view at all). It also can't be nested *inside* each of
 * the three grid `View` blocks either — `DatePickerView` only toggles a
 * `hidden` attribute rather than conditionally rendering (same file), so
 * that would mount three copies simultaneously, all reading the same live
 * `visibleRangeText` regardless of which one is actually hidden — three
 * identical "August 2026" nodes in the DOM at once. Instead this is
 * rendered once, wrapped in a `View` whose `view` prop is always the
 * *current* live view (`api.view`) rather than a fixed one — `hidden`
 * always evaluates to `false` for it by construction, so it's effectively
 * always-visible, single-instance, and correctly re-parented to whichever
 * view is actually active on every render. `getPrevTriggerProps`/
 * `getNextTriggerProps` already use `translations.prevTrigger(view)`/
 * `nextTrigger(view)` (`date-picker.connect.mjs`), which picks the right
 * wording per view on its own — no manual `aria-label` override needed.
 */
function CalendarNav({ size }: CalendarNavProps) {
  const navIconSize = NAV_BUTTON_SIZE_CLASSES[size];
  return (
    <ArkDatePicker.ViewControl className="flex items-center justify-between gap-inline-sm">
      <ArkDatePicker.PrevTrigger className={cn(triggerVariants(), "size-6")}>
        <ChevronLeft className={navIconSize} aria-hidden="true" />
      </ArkDatePicker.PrevTrigger>
      <ArkDatePicker.ViewTrigger
        className={cn(FIELD_LABEL_TEXT_CLASSES[size], "cursor-pointer text-center")}
      >
        <ArkDatePicker.RangeText />
      </ArkDatePicker.ViewTrigger>
      <ArkDatePicker.NextTrigger className={cn(triggerVariants(), "size-6")}>
        <ChevronRight className={navIconSize} aria-hidden="true" />
      </ArkDatePicker.NextTrigger>
    </ArkDatePicker.ViewControl>
  );
}

interface DatePickerFocusRegistrarProps {
  setFocusedValue: (value: DateValue) => void;
  targetRef: RefObject<((value: DateValue) => void) | null>;
}

/**
 * `ArkDatePicker.Context`'s render-prop hands us `api.setFocusedValue`
 * scoped to that closure, but `handleDateInputChange` (an event handler
 * outside it) needs to call it too — so it has to escape via a ref. Writing
 * to that ref directly in the render-prop body would mutate during render
 * (a Rules-of-React violation React Compiler flags); this tiny do-nothing
 * component exists solely to own the effect that assigns it instead.
 */
function DatePickerFocusRegistrar({ setFocusedValue, targetRef }: DatePickerFocusRegistrarProps) {
  useEffect(() => {
    targetRef.current = setFocusedValue;
  }, [setFocusedValue, targetRef]);
  return null;
}

/**
 * The calendar grid + month navigation, portaled and anchored to the field
 * (`Control` + `Trigger` box) the same way `Select`/`Combobox` anchor their
 * listbox — see `lib/floating.ts` for why positioning bypasses Ark's own
 * popper wiring. All three views (day/month/year) are always mounted —
 * `DatePickerView` just toggles a `hidden` attribute rather than
 * conditionally rendering (confirmed in `date-picker-view.js`) — so which
 * one is visible is entirely Zag's own `view`/`minView`/`maxView` state;
 * nothing here decides that. All subcomponents read `DatePicker`'s context
 * internally; nothing is prop-drilled in from outside except `open` (for
 * positioning) and `anchorRef`.
 */
function DatePickerPopover({ open, anchorRef, size, presets }: DatePickerPopoverProps) {
  const { positionerRef, rect } = useFloatingPosition(open, anchorRef);
  const presetRowRef = useRef<HTMLDivElement>(null);
  // The calendar grid (`table-layout: fixed`, cells sized by `size-8`/
  // `min-w-14`) is naturally narrower than a wide `presets` row, and — this
  // was tried, at length — a CSS-only stretch doesn't work here: neither
  // `width: 100%` on the table inside a `flex flex-col` parent (a genuine
  // circular dependency — the parent sizes to its widest child, the table
  // asks to be 100% of that — which resolved to ~1,000,000px in Chromium,
  // not a missing-class issue) nor the same inside `grid` (`<table>`'s own
  // auto-layout intrinsic sizing doesn't participate in `justify-items:
  // stretch` — every combination tested still left it at its own natural
  // width). Measuring the preset row's real width and applying it directly
  // sidesteps the whole class of CSS ambiguity.
  const [tableWidth, setTableWidth] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    if (!presets || presets.length === 0) {
      // A DOM measurement that can only be known post-layout, not derivable
      // during render — this is what useLayoutEffect exists for.
      // eslint-disable-next-line react/set-state-in-effect -- see comment above
      setTableWidth(undefined);
      return;
    }
    // Only measure once `rect` is set — before that, the positioner is
    // still parked off-screen at `left: -9999px` with no width constraint
    // of its own (see `floatingPositionerStyle`), where a `flex-wrap` row
    // lays out against an unconstrained/anonymous containing block and
    // measures far narrower (even 0) than it does once genuinely
    // positioned — confirmed empirically, not a hypothetical.
    if (!rect) return;
    setTableWidth(presetRowRef.current?.offsetWidth);
  }, [presets, rect]);

  return (
    <Portal>
      <ArkDatePicker.Positioner
        ref={positionerRef}
        className="z-50"
        style={floatingPositionerStyle(rect)}
      >
        <ArkDatePicker.Content className="shadow-lg grid gap-stack-sm rounded-md border border-border bg-bg-elevated p-inset-md data-[state=closed]:animate-panel-out data-[state=open]:animate-panel-in">
          {presets && presets.length > 0 && (
            <div
              ref={presetRowRef}
              className={cn(FIELD_SUB_TEXT_CLASSES[size], "flex flex-wrap gap-inline-xs")}
            >
              {presets.map((preset) => (
                <ArkDatePicker.PresetTrigger
                  key={preset.label}
                  value={preset.value}
                  className={presetButtonVariants()}
                >
                  {preset.label}
                </ArkDatePicker.PresetTrigger>
              ))}
            </div>
          )}
          <ArkDatePicker.Context>
            {(api) => (
              <ArkDatePicker.View view={api.view}>
                <CalendarNav size={size} />
              </ArkDatePicker.View>
            )}
          </ArkDatePicker.Context>
          <ArkDatePicker.View view="day">
            <ArkDatePicker.Context>
              {(api) => (
                <ArkDatePicker.Table
                  className="table-fixed border-collapse"
                  style={{ width: tableWidth }}
                >
                  <ArkDatePicker.TableHead>
                    <ArkDatePicker.TableRow>
                      {api.weekDays.map((weekDay, index) => (
                        <ArkDatePicker.TableHeader
                          key={index}
                          className={cn(
                            FIELD_SUB_TEXT_CLASSES[size],
                            "font-medium p-inset-2xs text-center text-text-secondary",
                          )}
                        >
                          {weekDay.narrow}
                        </ArkDatePicker.TableHeader>
                      ))}
                    </ArkDatePicker.TableRow>
                  </ArkDatePicker.TableHead>
                  <ArkDatePicker.TableBody>
                    {api.weeks.map((week, weekIndex) => (
                      <ArkDatePicker.TableRow key={weekIndex}>
                        {week.map((day, dayIndex) => (
                          <ArkDatePicker.TableCell key={dayIndex} value={day} className="p-0">
                            <ArkDatePicker.TableCellTrigger className={dayCellClasses(size)}>
                              {day.day}
                            </ArkDatePicker.TableCellTrigger>
                          </ArkDatePicker.TableCell>
                        ))}
                      </ArkDatePicker.TableRow>
                    ))}
                  </ArkDatePicker.TableBody>
                </ArkDatePicker.Table>
              )}
            </ArkDatePicker.Context>
          </ArkDatePicker.View>
          <ArkDatePicker.View view="month">
            <ArkDatePicker.Context>
              {(api) => (
                <ArkDatePicker.Table
                  className="table-fixed border-collapse"
                  style={{ width: tableWidth }}
                >
                  <ArkDatePicker.TableBody>
                    {api.getMonthsGrid({ columns: 4, format: "short" }).map((row, rowIndex) => (
                      <ArkDatePicker.TableRow key={rowIndex}>
                        {row.map((cell) => (
                          <ArkDatePicker.TableCell
                            key={cell.value}
                            value={cell.value}
                            className="p-0"
                          >
                            <ArkDatePicker.TableCellTrigger className={gridCellClasses(size)}>
                              {cell.label}
                            </ArkDatePicker.TableCellTrigger>
                          </ArkDatePicker.TableCell>
                        ))}
                      </ArkDatePicker.TableRow>
                    ))}
                  </ArkDatePicker.TableBody>
                </ArkDatePicker.Table>
              )}
            </ArkDatePicker.Context>
          </ArkDatePicker.View>
          <ArkDatePicker.View view="year">
            <ArkDatePicker.Context>
              {(api) => (
                <ArkDatePicker.Table
                  className="table-fixed border-collapse"
                  style={{ width: tableWidth }}
                >
                  <ArkDatePicker.TableBody>
                    {api.getYearsGrid({ columns: 4 }).map((row, rowIndex) => (
                      <ArkDatePicker.TableRow key={rowIndex}>
                        {row.map((cell) => (
                          <ArkDatePicker.TableCell
                            key={cell.value}
                            value={cell.value}
                            className="p-0"
                          >
                            <ArkDatePicker.TableCellTrigger className={gridCellClasses(size)}>
                              {cell.label}
                            </ArkDatePicker.TableCellTrigger>
                          </ArkDatePicker.TableCell>
                        ))}
                      </ArkDatePicker.TableRow>
                    ))}
                  </ArkDatePicker.TableBody>
                </ArkDatePicker.Table>
              )}
            </ArkDatePicker.Context>
          </ArkDatePicker.View>
        </ArkDatePicker.Content>
      </ArkDatePicker.Positioner>
    </Portal>
  );
}

/**
 * A calendar date field: a segmented, keyboard-editable input (year/month/
 * day, ordered and separated per `locale`) paired with a calendar popover —
 * built on two independent Ark UI state machines (`DateInput` for the
 * segments, `DatePicker` for the popover) kept in sync through this
 * component's own `value` state, since Ark doesn't wire the two machines
 * together itself.
 *
 * `value`/`defaultValue`/`onValueChange` use `@internationalized/date`'s
 * `DateValue` (`CalendarDate` in v1), never a native `Date` — a native
 * `Date` has no way to represent "just a calendar day" independent of a
 * time zone, which is exactly the ambiguity a protocol/expiry/batch date
 * must not have.
 *
 * @param size - `xs` through `xl` (default `md`) — matches `Input`'s scale.
 * @param error - Replaces `hint`, sets `invalid`, and colors the field/cells.
 * @param isDateUnavailable - Blackout predicate; distinct from `min`/`max`.
 *
 * @example
 * <DatePicker label="Collection date" max={today(getLocalTimeZone())} value={date} onValueChange={setDate} />
 */
function DatePicker({
  label,
  description,
  hint,
  error,
  size = "md",
  locale,
  timeZone,
  min,
  max,
  isDateUnavailable,
  range = false,
  value,
  defaultValue,
  onValueChange,
  rangeLabels,
  granularity,
  hourCycle,
  hideTimeZone,
  displayTimeZone,
  minView = "day",
  maxView = "year",
  multiple = false,
  maxSelectedDates,
  presets,
  disabled = false,
  readOnly,
  required,
  name,
  form,
  id,
  className,
  ref,
}: DatePickerProps) {
  const { descriptionId, hintId, errorId, describedBy } = useFieldIds({
    hasDescription: Boolean(description),
    hasError: Boolean(error),
    hasHint: Boolean(hint),
  });
  const controlRef = useRef<HTMLDivElement>(null);
  const datePickerSetFocusedValueRef = useRef<((value: DateValue) => void) | null>(null);
  const selectionMode = range ? "range" : multiple ? "multiple" : "single";
  const isArrayValue = range || multiple;

  // Always controlled from this component's own state (whether or not the
  // consumer controls `value`) — see the file-level doc comment for why:
  // `DateInput.Root` and `DatePicker.Root` are two independent machines
  // that both need the same current value, and only one bindable prop pair
  // can carry the consumer's `defaultValue`.
  const [uncontrolledValues, setUncontrolledValues] = useState(() => toInternalArray(defaultValue));
  const currentValues = value !== undefined ? toInternalArray(value) : uncontrolledValues;
  // What's actually fed to both Ark roots — converted to `displayTimeZone`
  // when set, so segments/calendar render (and accept edits) in that zone
  // while the canonical `currentValues` this component reports keeps each
  // value's own recorded zone. See `toDisplay`'s doc comment.
  const displayValues = displayTimeZone
    ? currentValues.map((v) => toDisplay(v, displayTimeZone))
    : currentValues;
  /**
   * Both Ark roots' own `timeZone` prop defaults to `"UTC"` and — for a
   * `ZonedDateTime` value — actively *reformats* the displayed wall-clock
   * into that zone, not just a label (confirmed empirically: a value at
   * 14:30 `America/New_York` rendered as 18:30 with no `timeZone` prop
   * set, its own zone silently discarded for display purposes). Left
   * unset, every `ZonedDateTime` would render converted to UTC by
   * default — exactly the silent-zone-swap this component's whole
   * `displayTimeZone` design exists to prevent. Defaulting the resolved
   * `timeZone` to the value's own zone (when the consumer set neither an
   * explicit `timeZone` nor `displayTimeZone`) keeps the *display*
   * consistent with `displayValues`, which is already in that same zone
   * either way (its own recorded zone, or `displayTimeZone` after
   * `toDisplay`'s conversion) — so this never fights the manual
   * conversion above with a second, independent one.
   */
  const canonicalZonedTimeZone = currentValues.find(
    (v): v is ZonedDateTime => v instanceof ZonedDateTime,
  )?.timeZone;
  const resolvedTimeZone = displayTimeZone ?? timeZone ?? canonicalZonedTimeZone;

  function commitValues(next: DateValue[]) {
    setUncontrolledValues(next);
    onValueChange?.(toExternalValue(next, isArrayValue));
  }

  /** Converts a change reported by either Ark root — in `displayTimeZone`
   *  domain, matching what they were fed — back to each slot's own
   *  canonical zone before this component commits it. */
  function toCanonical(values: DateValue[]): DateValue[] {
    if (!displayTimeZone) return values;
    return values.map((v, i) => fromDisplay(v, currentValues[i]));
  }

  function handleDateInputChange(details: DateInputValueChangeDetails) {
    commitValues(toCanonical(details.value));
    // `DatePicker`'s `value`-change watcher only re-syncs its own (unused)
    // free-text `Input`, never `focusedValue`/the visible month (confirmed
    // by reading `date-picker.machine.mjs`'s `watch()`) — so without this,
    // finishing a segment edit wouldn't move the calendar to that month,
    // and opening it right after would show whatever month it last
    // displayed instead. The last entry — the end date once `range` mode
    // has one, otherwise the only date — is the one most likely relevant
    // to what the user just finished typing. Uses the *display*-domain
    // value straight from `details`, matching what `DatePicker.Root` was
    // itself fed (`displayValues`, not the canonical `currentValues`).
    const focusTarget = details.value.at(-1);
    if (focusTarget) datePickerSetFocusedValueRef.current?.(focusTarget);
  }

  function handleDatePickerChange(details: DatePickerValueChangeDetails) {
    commitValues(toCanonical(details.value));
  }

  function resolveRangeQualifier(index: number): string {
    return rangeLabels?.[index] ?? (index === 0 ? "Start" : "End");
  }

  /**
   * A single shared `DateInput.Label` can't distinguish which of the two
   * segment groups is focused, so in `range` mode each group gets its own
   * composed `aria-label` instead — same neutralize-then-override trick
   * `Slider` uses for its range thumbs: passing `aria-labelledby=""` (a
   * real, non-`undefined` value) overrides the group's auto-generated
   * `aria-labelledby`, which otherwise wins over `aria-label` in accname
   * resolution.
   */
  function resolveSegmentGroupAriaProps(index: number): {
    "aria-label"?: string;
    "aria-labelledby"?: string;
  } {
    if (!range) return {};
    const qualifier = resolveRangeQualifier(index);
    return {
      "aria-label": label ? `${label} ${qualifier}` : qualifier,
      "aria-labelledby": "",
    };
  }

  // `DateInput` has no `multiple` selection mode of its own (its own
  // `SelectionMode` is `"single" | "range"`), so this mode skips it
  // entirely — no dual-machine sync problem to solve here, unlike
  // single/range — and uses `DatePicker.Root` directly as the outer
  // wrapper instead, with a read-only summary in place of segments.
  if (multiple) {
    return (
      <ArkDatePicker.Root
        ref={ref}
        id={id}
        value={displayValues}
        onValueChange={(details) => commitValues(toCanonical(details.value))}
        locale={locale}
        timeZone={resolvedTimeZone}
        min={min}
        max={max}
        isDateUnavailable={isDateUnavailable}
        selectionMode={selectionMode}
        maxSelectedDates={maxSelectedDates}
        minView={minView}
        maxView={maxView}
        disabled={disabled}
        readOnly={readOnly}
        invalid={Boolean(error)}
        name={name}
        className="flex flex-col gap-stack-xs"
      >
        {label && (
          <ArkDatePicker.Label className={FIELD_LABEL_TEXT_CLASSES[size]}>
            {label}
            {required && (
              <span aria-hidden="true" className="text-status-error">
                *
              </span>
            )}
          </ArkDatePicker.Label>
        )}
        {description && (
          <p id={descriptionId} className={cn(FIELD_SUB_TEXT_CLASSES[size], "text-text-secondary")}>
            {description}
          </p>
        )}
        <ArkDatePicker.Context>
          {(api) => (
            <>
              <DatePickerFocusRegistrar
                setFocusedValue={api.setFocusedValue}
                targetRef={datePickerSetFocusedValueRef}
              />
              <div
                ref={controlRef}
                className={cn(boxVariants({ size, error: Boolean(error) }), className)}
              >
                <span className="flex-1 truncate text-text-secondary">
                  {api.valueAsString.length > 0
                    ? api.valueAsString.join(", ")
                    : "No dates selected"}
                </span>
                <ArkDatePicker.Trigger
                  aria-describedby={describedBy}
                  className={cn(triggerVariants(), TRIGGER_ICON_SIZE_CLASSES[size])}
                >
                  <CalendarIcon className="size-full" aria-hidden="true" />
                </ArkDatePicker.Trigger>
                <DatePickerPopover open={api.open} anchorRef={controlRef} size={size} />
              </div>
            </>
          )}
        </ArkDatePicker.Context>
        <FieldFooter size={size} error={error} errorId={errorId} hint={hint} hintId={hintId} />
      </ArkDatePicker.Root>
    );
  }

  // Narrower than the shared `selectionMode` (which also admits
  // `"multiple"`, handled entirely by the early return above) — both Ark
  // roots reached below only ever see `"single" | "range"`.
  const singleOrRangeSelectionMode = range ? "range" : "single";
  const groupIndexes = range ? [0, 1] : [0];

  return (
    <ArkDateInput.Root
      ref={ref}
      id={id}
      value={displayValues}
      onValueChange={handleDateInputChange}
      locale={locale}
      timeZone={resolvedTimeZone}
      min={min}
      max={max}
      isDateUnavailable={isDateUnavailable}
      selectionMode={singleOrRangeSelectionMode}
      granularity={granularity}
      hourCycle={hourCycle}
      hideTimeZone={hideTimeZone}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      invalid={Boolean(error)}
      name={name}
      form={form}
      className="flex flex-col gap-stack-xs"
    >
      {label && (
        <ArkDateInput.Label className={FIELD_LABEL_TEXT_CLASSES[size]}>
          {label}
          {required && (
            <span aria-hidden="true" className="text-status-error">
              *
            </span>
          )}
        </ArkDateInput.Label>
      )}
      {description && (
        <p id={descriptionId} className={cn(FIELD_SUB_TEXT_CLASSES[size], "text-text-secondary")}>
          {description}
        </p>
      )}
      <ArkDateInput.Context>
        {(dateInputApi) => (
          <div
            ref={controlRef}
            className={cn(boxVariants({ size, error: Boolean(error) }), className)}
          >
            <ArkDateInput.Control className="flex flex-1 items-center gap-inline-xs">
              {groupIndexes.map((groupIndex) => (
                <Fragment key={groupIndex}>
                  {groupIndex > 0 && (
                    <span aria-hidden="true" className="text-text-secondary">
                      –
                    </span>
                  )}
                  <ArkDateInput.SegmentGroup
                    index={groupIndex}
                    aria-describedby={range ? undefined : describedBy}
                    {...resolveSegmentGroupAriaProps(groupIndex)}
                    className="flex items-center"
                  >
                    {dateInputApi.getSegments({ index: groupIndex }).map((segment, index) =>
                      isSegmentLockedByMinView(segment.type, minView) ? (
                        <span
                          key={index}
                          data-part="segment"
                          aria-hidden="true"
                          className={cn(
                            segmentVariants(),
                            "cursor-default text-text-disabled select-none",
                          )}
                        >
                          –
                        </span>
                      ) : (
                        <ArkDateInput.Segment
                          key={index}
                          segment={segment}
                          className={segmentVariants()}
                        />
                      ),
                    )}
                  </ArkDateInput.SegmentGroup>
                </Fragment>
              ))}
            </ArkDateInput.Control>
            <ArkDatePicker.Root
              value={displayValues}
              onValueChange={handleDatePickerChange}
              locale={locale}
              timeZone={resolvedTimeZone}
              min={min}
              max={max}
              isDateUnavailable={isDateUnavailable}
              selectionMode={singleOrRangeSelectionMode}
              minView={minView}
              maxView={maxView}
              disabled={disabled}
              readOnly={readOnly}
              invalid={Boolean(error)}
            >
              <ArkDatePicker.Context>
                {(datePickerApi) => {
                  return (
                    <>
                      <DatePickerFocusRegistrar
                        setFocusedValue={datePickerApi.setFocusedValue}
                        targetRef={datePickerSetFocusedValueRef}
                      />
                      <ArkDatePicker.Trigger
                        className={cn(triggerVariants(), TRIGGER_ICON_SIZE_CLASSES[size])}
                      >
                        <CalendarIcon className="size-full" aria-hidden="true" />
                      </ArkDatePicker.Trigger>
                      <DatePickerPopover
                        open={datePickerApi.open}
                        anchorRef={controlRef}
                        size={size}
                        presets={range ? presets : undefined}
                      />
                    </>
                  );
                }}
              </ArkDatePicker.Context>
            </ArkDatePicker.Root>
          </div>
        )}
      </ArkDateInput.Context>
      <ArkDateInput.HiddenInput />
      <FieldFooter size={size} error={error} errorId={errorId} hint={hint} hintId={hintId} />
    </ArkDateInput.Root>
  );
}

export { DatePicker };
export type { DatePickerProps };
