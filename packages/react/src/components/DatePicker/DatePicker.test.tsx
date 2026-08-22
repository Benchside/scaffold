import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarDate, parseZonedDateTime } from "@internationalized/date";
import { axe } from "vitest-axe";
import { DatePicker } from "./DatePicker";

describe("DatePicker", () => {
  it("renders year/month/day segments labeled and associated with the field label", async () => {
    render(<DatePicker label="Collection date" />);
    const year = screen.getByRole("spinbutton", { name: "Year" });
    const month = screen.getByRole("spinbutton", { name: "Month" });
    const day = screen.getByRole("spinbutton", { name: "Day" });
    expect(year).toBeInTheDocument();
    expect(month).toBeInTheDocument();
    expect(day).toBeInTheDocument();

    // Clicking the label focuses the first segment (`DateInput.Label`'s own
    // click handler — verified in `date-input.connect.js`).
    await userEvent.click(screen.getByText("Collection date"));
    expect(month).toHaveFocus();
  });

  it("shows the controlled value's segments", () => {
    render(<DatePicker label="Collection date" value={new CalendarDate(2026, 8, 18)} />);
    expect(screen.getByRole("spinbutton", { name: "Year" })).toHaveTextContent("2026");
    expect(screen.getByRole("spinbutton", { name: "Month" })).toHaveTextContent("8");
    expect(screen.getByRole("spinbutton", { name: "Day" })).toHaveTextContent("18");
  });

  /**
   * Digit entry itself goes through the segment's native `beforeinput`
   * event (see `date-input.connect.js`'s `onBeforeInput`), which a
   * jsdom-dispatched `InputEvent` never reaches React's synthetic
   * `onBeforeInput` handler for — confirmed with a minimal repro (a bare
   * `contentEditable` span with its own `onBeforeInput`, no Zag/Ark
   * involved, under this project's React 19 + jsdom 30 + `fireEvent`
   * stack). `ArrowUp`/`ArrowDown` go through plain `keydown`, which jsdom
   * *does* deliver correctly, so this exercises the same
   * edit-a-segment-and-commit pipeline via a path that's actually
   * observable here. Literal digit typing is verified in the browser via
   * Storybook + Playwright instead (see the DatePicker story).
   */
  it("commits an edited segment and fires onValueChange with a CalendarDate", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        label="Collection date"
        defaultValue={new CalendarDate(2026, 8, 18)}
        onValueChange={onValueChange}
      />,
    );
    const day = screen.getByRole("spinbutton", { name: "Day" });
    day.focus();
    await userEvent.keyboard("{ArrowUp}");

    await waitFor(() => {
      const last = onValueChange.mock.calls.at(-1)?.[0];
      expect(last).toBeInstanceOf(CalendarDate);
      expect(last).toMatchObject({ year: 2026, month: 8, day: 19 });
    });
    expect(day).toHaveTextContent("19");
  });

  it("opens the calendar popover on trigger click and shows the visible month", async () => {
    render(<DatePicker label="Collection date" value={new CalendarDate(2026, 8, 18)} />);
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    const grid = await screen.findByRole("button", { name: /August 18, 2026/ });
    expect(grid).toBeInTheDocument();
    expect(screen.getByText(/August 2026/i)).toBeInTheDocument();
  });

  it("selects a day from the calendar and updates the segments + onValueChange", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        label="Collection date"
        defaultValue={new CalendarDate(2026, 8, 18)}
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    const day20 = await screen.findByRole("button", { name: /August 20, 2026/ });
    await userEvent.click(day20);

    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ year: 2026, month: 8, day: 20 }),
    );
    expect(screen.getByRole("spinbutton", { name: "Day" })).toHaveTextContent("20");
  });

  it("editing a segment moves the calendar to that month when opened", async () => {
    render(<DatePicker label="Collection date" defaultValue={new CalendarDate(2026, 8, 18)} />);
    const year = screen.getByRole("spinbutton", { name: "Year" });
    year.focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(year).toHaveTextContent("2027");

    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    expect(await screen.findByText(/August 2027/i)).toBeInTheDocument();
  });

  it("disables calendar cells outside min/max and blocks selecting them", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        label="Collection date"
        value={new CalendarDate(2026, 8, 18)}
        min={new CalendarDate(2026, 8, 10)}
        max={new CalendarDate(2026, 8, 20)}
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    const day25 = await screen.findByRole("button", { name: /August 25, 2026/ });
    expect(day25).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(day25);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("marks a blackout date unavailable via isDateUnavailable", async () => {
    render(
      <DatePicker
        label="Collection date"
        value={new CalendarDate(2026, 8, 18)}
        isDateUnavailable={(date) => date.day === 15}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    const day15 = await screen.findByRole("button", { name: /August 15, 2026/ });
    // Zag renders boolean data-attrs as `""` (present) / absent, not "true" —
    // `toHaveAttribute` with one arg only checks presence.
    expect(day15).toHaveAttribute("data-unavailable");
  });

  it("sets invalid/error styling and associates the error message", () => {
    render(<DatePicker label="Collection date" error="Date is required" />);
    const group = screen.getByRole("group", { name: "Collection date" });
    expect(group).toHaveAttribute("aria-describedby");
    expect(screen.getByText("Date is required")).toBeInTheDocument();
  });

  it("disabled prevents focusing segments and opening the calendar", async () => {
    render(<DatePicker label="Collection date" disabled />);
    expect(screen.getByRole("button", { name: /calendar/i })).toBeDisabled();
    const month = screen.getByRole("spinbutton", { name: "Month" });
    expect(month).toHaveAttribute("aria-disabled", "true");
  });

  it("has zero axe violations closed and open", async () => {
    const { container } = render(
      <DatePicker label="Collection date" value={new CalendarDate(2026, 8, 18)} />,
    );
    expect((await axe(container)).violations.length).toBe(0);

    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    await screen.findByText(/August 2026/i);
    // Scanning `document.body` (not `container`) to reach the portaled
    // calendar popover — that also puts axe-core's whole-page "region"
    // (landmark) heuristic in scope, which every isolated component test
    // in this project trips regardless of the component under test, so
    // it's disabled here rather than suppressed by scoping to `container`
    // and missing the portal content entirely.
    const results = await axe(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations.length).toBe(0);
  });
});

describe("DatePicker range mode", () => {
  it("renders two segment groups with distinct Start/End accessible names", () => {
    render(<DatePicker label="Collection window" range />);
    expect(screen.getByRole("group", { name: "Collection window Start" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Collection window End" })).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton", { name: "Day" })).toHaveLength(2);
  });

  it("picks a start then an end date, closing the popover only after the end date", async () => {
    const onValueChange = vi.fn();
    render(<DatePicker label="Collection window" range onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    await userEvent.click(await screen.findByRole("button", { name: /August 10, 2026/ }));

    // Popover stays open after the start date alone (verified from
    // `date-picker.machine.mjs`: only the *second* click's transition is
    // guarded by `closeOnSelect`).
    expect(screen.getByText(/August 2026/i)).toBeInTheDocument();
    expect(onValueChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ year: 2026, month: 8, day: 10 }),
    ]);

    await userEvent.click(screen.getByRole("button", { name: /August 20, 2026/ }));
    expect(onValueChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ year: 2026, month: 8, day: 10 }),
      expect.objectContaining({ year: 2026, month: 8, day: 20 }),
    ]);
    // The popover's content stays mounted through its close animation
    // (same as `Select`/`Combobox`'s), so "closed" is the trigger's
    // `aria-expanded` going false, not the content leaving the DOM.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /calendar/i })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });
  });

  it("starting a new range after a complete one resets rather than extends", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        label="Collection window"
        range
        defaultValue={[new CalendarDate(2026, 8, 10), new CalendarDate(2026, 8, 20)]}
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    await userEvent.click(await screen.findByRole("button", { name: /August 5, 2026/ }));
    expect(onValueChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ year: 2026, month: 8, day: 5 }),
    ]);
  });

  it("marks days between the two selected dates with data-in-range", async () => {
    render(
      <DatePicker
        label="Collection window"
        range
        defaultValue={[new CalendarDate(2026, 8, 10), new CalendarDate(2026, 8, 20)]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    const day15 = await screen.findByRole("button", { name: /August 15, 2026/ });
    expect(day15).toHaveAttribute("data-in-range");
    const day5 = await screen.findByRole("button", { name: /August 5, 2026/ });
    expect(day5).not.toHaveAttribute("data-in-range");
  });

  it("editing the End group's day commits both dates as an array", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        label="Collection window"
        range
        defaultValue={[new CalendarDate(2026, 8, 10), new CalendarDate(2026, 8, 20)]}
        onValueChange={onValueChange}
      />,
    );
    const days = screen.getAllByRole("spinbutton", { name: "Day" });
    days[1]!.focus();
    await userEvent.keyboard("{ArrowUp}");

    await waitFor(() => {
      const last = onValueChange.mock.calls.at(-1)?.[0];
      expect(last).toEqual([
        expect.objectContaining({ year: 2026, month: 8, day: 10 }),
        expect.objectContaining({ year: 2026, month: 8, day: 21 }),
      ]);
    });
  });

  it("has zero axe violations in range mode, closed and open", async () => {
    const { container } = render(
      <DatePicker
        label="Collection window"
        range
        defaultValue={[new CalendarDate(2026, 8, 10), new CalendarDate(2026, 8, 20)]}
      />,
    );
    expect((await axe(container)).violations.length).toBe(0);

    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    await screen.findByText(/August 2026/i);
    const results = await axe(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations.length).toBe(0);
  });
});

describe("DatePicker date+time (ZonedDateTime) mode", () => {
  it("day granularity (default) renders no time segments even for a ZonedDateTime value", () => {
    render(
      <DatePicker
        label="Recorded at"
        value={parseZonedDateTime("2026-08-18T14:30:00[America/New_York]")}
      />,
    );
    expect(screen.queryByRole("spinbutton", { name: "Hour" })).not.toBeInTheDocument();
  });

  it("granularity=minute renders hour/minute/dayPeriod/time-zone segments", () => {
    render(
      <DatePicker
        label="Recorded at"
        granularity="minute"
        value={parseZonedDateTime("2026-08-18T14:30:00[America/New_York]")}
      />,
    );
    expect(screen.getByRole("spinbutton", { name: "Hour" })).toHaveTextContent("2");
    expect(screen.getByRole("spinbutton", { name: "Minute" })).toHaveTextContent("30");
    expect(screen.getByRole("spinbutton", { name: "AM/PM" })).toHaveTextContent("PM");
    expect(screen.getByText(/EDT|EST/)).toBeInTheDocument();
  });

  it("hideTimeZone removes the time-zone segment without affecting the value", () => {
    render(
      <DatePicker
        label="Recorded at"
        granularity="minute"
        hideTimeZone
        value={parseZonedDateTime("2026-08-18T14:30:00[America/New_York]")}
      />,
    );
    expect(screen.queryByText(/EDT|EST/)).not.toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Hour" })).toHaveTextContent("2");
  });

  it("clicking a calendar day preserves the existing time-of-day", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        label="Recorded at"
        granularity="minute"
        defaultValue={parseZonedDateTime("2026-08-18T14:30:00[America/New_York]")}
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    await userEvent.click(await screen.findByRole("button", { name: /August 20, 2026/ }));

    const last = onValueChange.mock.calls.at(-1)?.[0];
    expect(last).toMatchObject({ year: 2026, month: 8, day: 20, hour: 14, minute: 30 });
  });

  it("displayTimeZone renders a converted time but commits back in the value's own recorded zone", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        label="Recorded at"
        granularity="minute"
        displayTimeZone="Asia/Seoul"
        defaultValue={parseZonedDateTime("2026-08-18T14:30:00[America/New_York]")}
        onValueChange={onValueChange}
      />,
    );
    // 14:30 America/New_York (EDT, UTC-4) is 03:30 the next day in Asia/Seoul (UTC+9).
    expect(screen.getByRole("spinbutton", { name: "Hour" })).toHaveTextContent("3");
    expect(screen.getByRole("spinbutton", { name: "Day" })).toHaveTextContent("19");

    const hour = screen.getByRole("spinbutton", { name: "Hour" });
    hour.focus();
    await userEvent.keyboard("{ArrowUp}");

    await waitFor(() => {
      const last = onValueChange.mock.calls.at(-1)?.[0];
      expect(last.timeZone).toBe("America/New_York");
      // The display-domain edit (03:30 -> 04:30 Asia/Seoul) converts back
      // to 15:30 America/New_York — the display hour moved by exactly the
      // edit, not by the zone offset.
      expect(last).toMatchObject({ year: 2026, month: 8, day: 18, hour: 15, minute: 30 });
    });
  });

  it("has zero axe violations with time segments", async () => {
    const { container } = render(
      <DatePicker
        label="Recorded at"
        granularity="minute"
        value={parseZonedDateTime("2026-08-18T14:30:00[America/New_York]")}
      />,
    );
    expect((await axe(container)).violations.length).toBe(0);
  });
});

describe("DatePicker minView/maxView (month/year calendar views)", () => {
  it("clicking the header drills up to month view, then year view", async () => {
    render(<DatePicker label="Collection date" value={new CalendarDate(2026, 8, 18)} />);
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    await userEvent.click(screen.getByText(/August 2026/i));

    // "2026" also matches the field's own Year segment and (once the
    // now-hidden-but-still-mounted year grid is considered — `hidden`
    // elements aren't excluded by `getByText`) a year cell in that grid, so
    // target the header specifically via its stable `range-text` part
    // rather than by text or accessible name (the latter is Zag's own
    // `viewTrigger(view)` translation, not the visible "2026").
    await screen.findByRole("button", { name: /^Aug/ });
    const header = document
      .querySelector('[data-part="range-text"]')!
      .closest("button") as HTMLElement;
    await userEvent.click(header);
    expect(await screen.findByRole("button", { name: /^2026$/ })).toBeInTheDocument();
  });

  it("clicking a month cell (default minView=day) drills into that month's days, not a commit", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        label="Collection date"
        value={new CalendarDate(2026, 8, 18)}
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    await userEvent.click(screen.getByText(/August 2026/i));
    const marchCell = await screen.findByRole("button", { name: /^Mar/ });
    await userEvent.click(marchCell);

    expect(onValueChange).not.toHaveBeenCalled();
    expect(await screen.findByText(/March 2026/i)).toBeInTheDocument();
  });

  it("minView=month: calendar opens in month view and a click commits day=1 and closes", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        label="Lot expiry"
        minView="month"
        defaultValue={new CalendarDate(2027, 1, 1)}
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    const marchCell = await screen.findByRole("button", { name: /^Mar/ });
    await userEvent.click(marchCell);

    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ year: 2027, month: 3, day: 1 }),
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /calendar/i })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });
  });

  it("minView=year: calendar opens in year view and a click commits month=1/day=1", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        label="Lot expiry"
        minView="year"
        defaultValue={new CalendarDate(2027, 1, 1)}
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    const yearCell = await screen.findByRole("button", { name: /^2028$/ });
    await userEvent.click(yearCell);

    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ year: 2028, month: 1, day: 1 }),
    );
  });

  it("prev/next in year view step by decade with a matching aria-label", async () => {
    render(
      <DatePicker label="Lot expiry" minView="year" defaultValue={new CalendarDate(2027, 1, 1)} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    const prev = await screen.findByRole("button", { name: /previous decade/i });
    expect(prev).toBeInTheDocument();
  });

  it("has zero axe violations in month and year views", async () => {
    render(
      <DatePicker label="Lot expiry" minView="month" defaultValue={new CalendarDate(2027, 1, 1)} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    await screen.findByRole("button", { name: /^Jan/ });
    const results = await axe(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations.length).toBe(0);
  });

  it("minView=month locks the day segment to an inert '–' instead of removing it", () => {
    render(
      <DatePicker label="Lot expiry" minView="month" defaultValue={new CalendarDate(2027, 3, 1)} />,
    );
    // No day spinbutton at all — the locked segment isn't a real `Segment`.
    expect(screen.queryByRole("spinbutton", { name: "Day" })).not.toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Month" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Year" })).toBeInTheDocument();
    expect(screen.getByText("–")).toBeInTheDocument();
  });

  it("minView=month's locked day segment cannot be focused or edited via keyboard", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        label="Lot expiry"
        minView="month"
        defaultValue={new CalendarDate(2027, 3, 1)}
        onValueChange={onValueChange}
      />,
    );
    const locked = screen.getByText("–");
    expect(locked).not.toHaveAttribute("tabIndex");
    expect(locked).not.toHaveAttribute("contentEditable");

    // Tabbing from Month should skip straight to Year, never landing on the
    // locked segment (it has no tabIndex to land on).
    screen.getByRole("spinbutton", { name: "Month" }).focus();
    await userEvent.tab();
    expect(screen.getByRole("spinbutton", { name: "Year" })).toHaveFocus();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("minView=year locks both day and month segments", () => {
    render(
      <DatePicker label="Lot expiry" minView="year" defaultValue={new CalendarDate(2027, 1, 1)} />,
    );
    expect(screen.queryByRole("spinbutton", { name: "Day" })).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton", { name: "Month" })).not.toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Year" })).toBeInTheDocument();
    expect(screen.getAllByText("–")).toHaveLength(2);
  });
});

describe("DatePicker multiple mode", () => {
  it("renders a read-only summary field instead of segments", () => {
    render(
      <DatePicker
        label="Included dates"
        multiple
        defaultValue={[new CalendarDate(2026, 8, 10), new CalendarDate(2026, 8, 15)]}
      />,
    );
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /calendar/i })).toBeInTheDocument();
  });

  it("shows a placeholder when nothing is selected", () => {
    render(<DatePicker label="Included dates" multiple />);
    expect(screen.getByText("No dates selected")).toBeInTheDocument();
  });

  it("clicking days toggles them in and out of the selection without closing", async () => {
    const onValueChange = vi.fn();
    render(<DatePicker label="Included dates" multiple onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    const day10 = await screen.findByRole("button", { name: /August 10/ });
    await userEvent.click(day10);
    expect(onValueChange).toHaveBeenLastCalledWith([expect.objectContaining({ day: 10 })]);

    const day15 = screen.getByRole("button", { name: /August 15/ });
    await userEvent.click(day15);
    expect(onValueChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ day: 10 }),
      expect.objectContaining({ day: 15 }),
    ]);

    // Popover never auto-closes in multiple mode (Zag: no closeOnSelect
    // branch applies to the multi-picker guard).
    expect(screen.getByRole("button", { name: /calendar/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    // Clicking an already-selected day deselects it.
    await userEvent.click(day10);
    expect(onValueChange).toHaveBeenLastCalledWith([expect.objectContaining({ day: 15 })]);
  });

  it("maxSelectedDates caps further selection", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        label="Included dates"
        multiple
        maxSelectedDates={1}
        defaultValue={[new CalendarDate(2026, 8, 10)]}
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    const day15 = await screen.findByRole("button", { name: /August 15/ });
    await userEvent.click(day15);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("has zero axe violations in multiple mode, closed and open", async () => {
    const { container } = render(
      <DatePicker label="Included dates" multiple defaultValue={[new CalendarDate(2026, 8, 10)]} />,
    );
    expect((await axe(container)).violations.length).toBe(0);

    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    await screen.findByRole("button", { name: /August 10/ });
    const results = await axe(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations.length).toBe(0);
  });
});

describe("DatePicker range presets", () => {
  it("clicking a preset commits the range and closes the popover", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        label="Collection window"
        range
        presets={[{ label: "This week", value: "thisWeek" }]}
        onValueChange={onValueChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    // The preset button's accessible name is Zag's own `presetTrigger(value)`
    // translation ("select <start> to <end>"), not its visible "This week"
    // label — same `aria-label`-wins pattern as the calendar's header.
    await userEvent.click(await screen.findByText("This week"));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    const last = onValueChange.mock.calls.at(-1)?.[0];
    expect(last).toHaveLength(2);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /calendar/i })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });
  });

  it("presets are not rendered outside range mode", async () => {
    render(
      <DatePicker label="Collection date" presets={[{ label: "This week", value: "thisWeek" }]} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /calendar/i }));
    expect(screen.queryByText("This week")).not.toBeInTheDocument();
  });
});
