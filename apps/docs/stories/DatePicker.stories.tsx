import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarDate, getLocalTimeZone, parseZonedDateTime, today } from "@internationalized/date";
import { DatePicker } from "@benchside/scaffold-react";

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

const meta: Meta<typeof DatePicker> = {
  title: "Components/DatePicker",
  component: DatePicker,
  argTypes: {
    size: { control: "select", options: SIZES },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    label: { control: "text" },
    hint: { control: "text" },
    error: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof DatePicker>;

/** Drag the Controls panel to try every prop live. */
export const Default: Story = {
  args: {
    label: "Collection date",
    defaultValue: new CalendarDate(2026, 8, 18),
    size: "md",
  },
};

/** Documentation/visual-regression reference — the full size scale. */
export const Sizes: Story = {
  render: () => (
    <div className="w-80 flex flex-col gap-stack-lg">
      {SIZES.map((size) => (
        <DatePicker
          key={size}
          label={`Size ${size}`}
          size={size}
          defaultValue={new CalendarDate(2026, 8, 18)}
        />
      ))}
    </div>
  ),
};

/** Documentation/visual-regression reference — every state at once. */
export const States: Story = {
  render: () => (
    <div className="w-80 flex flex-col gap-stack-lg">
      <DatePicker label="Default" />
      <DatePicker label="Broken" error="Collection date is required" />
      <DatePicker label="Disabled" disabled defaultValue={new CalendarDate(2026, 8, 18)} />
      <DatePicker label="Read-only" readOnly defaultValue={new CalendarDate(2026, 8, 18)} />
    </div>
  ),
};

/**
 * `max` set to today disallows a future collection date; `min` set to a
 * protocol's start date disallows anything earlier than the protocol
 * existed. Both dates outside the range are focusable in the grid (arrow
 * keys still land on them) but not selectable.
 */
export const MinMax: Story = {
  args: {
    label: "Collection date",
    description: "Must fall within the current protocol",
    min: new CalendarDate(2026, 7, 1),
    max: today(getLocalTimeZone()),
    defaultValue: new CalendarDate(2026, 7, 15),
  },
};

/**
 * `isDateUnavailable` blocks arbitrary dates independent of `min`/`max` —
 * e.g. lab closure days a collection can't be scheduled on.
 */
export const BlackoutDates: Story = {
  args: {
    label: "Sample collection date",
    hint: "Weekends are unavailable (lab closure)",
    defaultValue: new CalendarDate(2026, 8, 18),
    isDateUnavailable: (date) => {
      const dayOfWeek = new Date(date.year, date.month - 1, date.day).getDay();
      return dayOfWeek === 0 || dayOfWeek === 6;
    },
  },
};

/**
 * `range` renders two segment groups ("Start"/"End" by default, overridable
 * via `rangeLabels`) and switches the calendar to two-click range selection.
 */
export const Range: Story = {
  args: {
    label: "Collection window",
    range: true,
    defaultValue: [new CalendarDate(2026, 8, 10), new CalendarDate(2026, 8, 20)],
  },
};

/** A range still mid-selection — only the start date has been picked. */
export const RangePartial: Story = {
  args: {
    label: "Collection window",
    range: true,
    defaultValue: [new CalendarDate(2026, 8, 10)],
  },
};

/**
 * `granularity="minute"` adds hour/minute/AM-PM segments; a `ZonedDateTime`
 * value additionally renders a time-zone segment and formats in its own
 * recorded zone by default (not the `"UTC"` both Ark roots default to).
 */
export const DateTime: Story = {
  args: {
    label: "Run started at",
    granularity: "minute",
    defaultValue: parseZonedDateTime("2026-08-18T14:30:00[America/New_York]"),
  },
};

/**
 * `displayTimeZone` renders (and accepts edits in) a different zone than
 * the value's own — here a value recorded in `America/New_York` displayed
 * in `Asia/Seoul`. The value reported to `onValueChange` always keeps its
 * original recorded zone; only the display converts.
 */
export const DateTimeDisplayTimeZone: Story = {
  args: {
    label: "Run started at (local time)",
    description: "Recorded in America/New_York, shown in Asia/Seoul",
    granularity: "minute",
    displayTimeZone: "Asia/Seoul",
    defaultValue: parseZonedDateTime("2026-08-18T14:30:00[America/New_York]"),
  },
};

/**
 * `minView="month"` for a reagent/lot expiry — the calendar opens straight
 * into the month grid and a click commits that whole month (day defaults to
 * `1`). Note: the segmented field still shows a day segment regardless (see
 * `minView`'s doc comment for why hiding it isn't safe) — the calendar is
 * the primary month/year-only entry path.
 */
export const ExpiryMonthOnly: Story = {
  args: {
    label: "Lot expiry",
    minView: "month",
    defaultValue: new CalendarDate(2027, 3, 1),
  },
};

/** `minView="year"` — a click in the year grid commits month=1/day=1. */
export const ExpiryYearOnly: Story = {
  args: {
    label: "Lot expiry",
    minView: "year",
    defaultValue: new CalendarDate(2027, 1, 1),
  },
};

/**
 * `multiple` renders a read-only summary instead of segments — click days
 * in the calendar to toggle them in/out. The popover never auto-closes, so
 * several dates can be picked in one visit.
 */
export const MultipleDates: Story = {
  args: {
    label: "Included dates",
    multiple: true,
    defaultValue: [new CalendarDate(2026, 8, 10), new CalendarDate(2026, 8, 15)],
  },
};

/**
 * `presets` — only meaningful with `range` — commit and close immediately,
 * bypassing the normal two-click flow. Named presets come from Zag
 * (`"last7Days"`, `"thisMonth"`, ...); a custom `[start, end]` array works too.
 */
export const RangeWithPresets: Story = {
  args: {
    label: "Provenance window",
    range: true,
    presets: [
      { label: "Last 7 days", value: "last7Days" },
      { label: "Last 30 days", value: "last30Days" },
      { label: "This month", value: "thisMonth" },
      { label: "This quarter", value: "thisQuarter" },
    ],
  },
};
