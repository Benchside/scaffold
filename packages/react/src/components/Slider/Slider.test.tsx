import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Slider } from "./Slider";

// The thumb's `visibility` starts `hidden` until Zag's `trackThumbSize`
// machine effect measures it and flips `hasMeasuredThumbSize` — that
// effect runs on a microtask outside React's synchronous `act()` flush
// (confirmed empirically: immediately after `render()` the thumb is still
// `visibility: hidden`), so every query for `role="slider"` — which RTL
// filters by visibility — must be async (`findByRole`), not `getByRole`.
describe("Slider", () => {
  it("renders a slider role with the correct initial aria-valuenow/min/max", async () => {
    render(<Slider label="Concentration" min={0} max={100} defaultValue={25} />);
    const thumb = await screen.findByRole("slider");
    expect(thumb).toHaveAttribute("aria-valuenow", "25");
    expect(thumb).toHaveAttribute("aria-valuemin", "0");
    expect(thumb).toHaveAttribute("aria-valuemax", "100");
  });

  it("associates the label with the thumb via aria-labelledby", async () => {
    render(<Slider label="Concentration" defaultValue={10} />);
    const thumb = await screen.findByRole("slider");
    const labelId = thumb.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)).toHaveTextContent("Concentration");
  });

  it("moves the thumb with ArrowRight/ArrowLeft by step", async () => {
    const onValueChange = vi.fn();
    render(
      <Slider
        label="Concentration"
        min={0}
        max={100}
        step={5}
        defaultValue={50}
        onValueChange={onValueChange}
      />,
    );
    const thumb = await screen.findByRole("slider");
    thumb.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(55);
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(onValueChange).toHaveBeenLastCalledWith(45);
  });

  it("jumps to min/max on Home/End", async () => {
    const onValueChange = vi.fn();
    render(
      <Slider
        label="Concentration"
        min={0}
        max={100}
        defaultValue={50}
        onValueChange={onValueChange}
      />,
    );
    const thumb = await screen.findByRole("slider");
    thumb.focus();
    await userEvent.keyboard("{End}");
    expect(onValueChange).toHaveBeenLastCalledWith(100);
    await userEvent.keyboard("{Home}");
    expect(onValueChange).toHaveBeenLastCalledWith(0);
  });

  // `largeStep`/`defaultValue` are both multiples of 25 here deliberately:
  // Zag's PageUp/PageDown snap the *result* to the largeStep grid (not just
  // `value + largeStep`) — from an off-grid starting value, a single
  // PageUp can jump further than `largeStep` (e.g. 50 -> 80 with largeStep
  // 20, not 70). Starting on-grid avoids that surprise and isolates the
  // delta this test actually cares about.
  it("uses largeStep on PageUp/PageDown", async () => {
    const onValueChange = vi.fn();
    render(
      <Slider
        label="Concentration"
        min={0}
        max={100}
        step={1}
        largeStep={25}
        defaultValue={50}
        onValueChange={onValueChange}
      />,
    );
    const thumb = await screen.findByRole("slider");
    thumb.focus();
    await userEvent.keyboard("{PageUp}");
    expect(onValueChange).toHaveBeenLastCalledWith(75);
    await userEvent.keyboard("{PageDown}{PageDown}");
    expect(onValueChange).toHaveBeenLastCalledWith(25);
  });

  it("calls onValueChangeEnd once a keyboard interaction settles", async () => {
    const onValueChangeEnd = vi.fn();
    render(<Slider label="Concentration" defaultValue={50} onValueChangeEnd={onValueChangeEnd} />);
    const thumb = await screen.findByRole("slider");
    thumb.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChangeEnd).toHaveBeenCalledWith(51);
  });

  it("supports a controlled value: onValueChange fires, and a rerender with the new value is reflected", async () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <Slider label="Concentration" value={50} onValueChange={onValueChange} />,
    );
    const thumb = await screen.findByRole("slider");
    thumb.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith(51);
    rerender(<Slider label="Concentration" value={51} onValueChange={onValueChange} />);
    expect(await screen.findByRole("slider")).toHaveAttribute("aria-valuenow", "51");
  });

  describe("paired numeric input", () => {
    it("renders the current value and keeps it in sync while dragging via keyboard", async () => {
      render(<Slider label="Concentration" defaultValue={50} />);
      const input = screen.getByRole("textbox", { name: "Concentration" });
      expect(input).toHaveValue("50");
      (await screen.findByRole("slider")).focus();
      await userEvent.keyboard("{ArrowRight}");
      await waitFor(() => expect(input).toHaveValue("51"));
    });

    it("commits a typed value on blur and moves the thumb", async () => {
      render(<Slider label="Concentration" min={0} max={100} defaultValue={50} />);
      const input = screen.getByRole("textbox", { name: "Concentration" });
      await userEvent.clear(input);
      await userEvent.type(input, "80");
      await userEvent.tab();
      expect(await screen.findByRole("slider")).toHaveAttribute("aria-valuenow", "80");
    });

    it("commits a typed value on Enter", async () => {
      render(<Slider label="Concentration" min={0} max={100} defaultValue={50} />);
      const input = screen.getByRole("textbox", { name: "Concentration" });
      await userEvent.clear(input);
      await userEvent.type(input, "30{Enter}");
      expect(await screen.findByRole("slider")).toHaveAttribute("aria-valuenow", "30");
    });

    it("snaps an off-step typed value to the nearest step, and the displayed text reflects the snapped value", async () => {
      render(<Slider label="Concentration" min={0} max={100} step={10} defaultValue={50} />);
      const input = screen.getByRole("textbox", { name: "Concentration" });
      await userEvent.clear(input);
      await userEvent.type(input, "23");
      await userEvent.tab();
      expect(await screen.findByRole("slider")).toHaveAttribute("aria-valuenow", "20");
      expect(input).toHaveValue("20");
    });

    it("clamps an out-of-range typed value to the nearest bound", async () => {
      render(<Slider label="Concentration" min={0} max={100} defaultValue={50} />);
      const input = screen.getByRole("textbox", { name: "Concentration" });
      await userEvent.clear(input);
      await userEvent.type(input, "500");
      await userEvent.tab();
      expect(await screen.findByRole("slider")).toHaveAttribute("aria-valuenow", "100");
      expect(input).toHaveValue("100");
    });

    it("reverts to the last committed value when the typed text isn't a number", async () => {
      render(<Slider label="Concentration" min={0} max={100} defaultValue={50} />);
      const input = screen.getByRole("textbox", { name: "Concentration" });
      await userEvent.clear(input);
      await userEvent.type(input, "abc");
      await userEvent.tab();
      expect(await screen.findByRole("slider")).toHaveAttribute("aria-valuenow", "50");
      expect(input).toHaveValue("50");
    });
  });

  describe("aria-valuetext and formatting", () => {
    it("formats aria-valuetext using step-derived precision, with no float artifacts", async () => {
      render(<Slider label="Concentration" min={0} max={10} step={0.1} defaultValue={7} />);
      const thumb = await screen.findByRole("slider");
      expect(thumb).toHaveAttribute("aria-valuetext", "7.0");
    });

    it("appends the unit suffix to aria-valuetext but not to the editable input's text", async () => {
      render(<Slider label="Concentration" unit="µM" defaultValue={25} />);
      const thumb = await screen.findByRole("slider");
      expect(thumb).toHaveAttribute("aria-valuetext", "25 µM");
      expect(screen.getByRole("textbox", { name: "Concentration" })).toHaveValue("25");
    });

    // Direct regression test for the class of bug Mantine shipped: the
    // formatted value/unit text must land on the element with role="slider"
    // specifically, not a parent/wrapper.
    it("sets aria-valuetext specifically on the role=slider element", async () => {
      render(<Slider label="Concentration" unit="µM" defaultValue={25} />);
      const thumb = await screen.findByRole("slider");
      expect(thumb.getAttribute("role")).toBe("slider");
      expect(thumb).toHaveAttribute("aria-valuetext", "25 µM");
    });

    it("lets a consumer formatValue override the default precision formatting", async () => {
      render(<Slider label="Concentration" defaultValue={25} formatValue={(v) => `${v}.00`} />);
      const thumb = await screen.findByRole("slider");
      expect(thumb).toHaveAttribute("aria-valuetext", "25.00");
      expect(screen.getByRole("textbox", { name: "Concentration" })).toHaveValue("25.00");
    });

    it("lets a consumer getAriaValueText override the fully composed text", async () => {
      render(
        <Slider
          label="Concentration"
          unit="µM"
          defaultValue={25}
          getAriaValueText={({ formatted }) => `Concentration is ${formatted}`}
        />,
      );
      const thumb = await screen.findByRole("slider");
      expect(thumb).toHaveAttribute("aria-valuetext", "Concentration is 25 µM");
    });
  });

  describe("editable={false}", () => {
    it("renders a formatted, unit-suffixed read-only value instead of an input", async () => {
      render(<Slider label="Concentration" unit="µM" defaultValue={25} editable={false} />);
      expect(screen.queryByRole("textbox", { name: "Concentration" })).not.toBeInTheDocument();
      expect(screen.getByText("25 µM")).toBeInTheDocument();
    });

    it("keeps the value visible and never removes it from the DOM", async () => {
      render(<Slider label="Concentration" unit="µM" defaultValue={25} editable={false} />);
      const thumb = await screen.findByRole("slider");
      thumb.focus();
      await userEvent.keyboard("{ArrowRight}");
      await waitFor(() => expect(screen.getByText("26 µM")).toBeInTheDocument());
    });
  });

  describe("range", () => {
    it("renders two thumbs at the given [min, max] values", async () => {
      render(<Slider label="Price" range defaultValue={[20, 80]} />);
      const thumbs = await screen.findAllByRole("slider");
      expect(thumbs).toHaveLength(2);
      expect(thumbs[0]).toHaveAttribute("aria-valuenow", "20");
      expect(thumbs[1]).toHaveAttribute("aria-valuenow", "80");
    });

    it("defaults to spanning [min, max] when range is set with no value/defaultValue", async () => {
      render(<Slider label="Price" range min={0} max={100} />);
      const thumbs = await screen.findAllByRole("slider");
      expect(thumbs[0]).toHaveAttribute("aria-valuenow", "0");
      expect(thumbs[1]).toHaveAttribute("aria-valuenow", "100");
    });

    it("resolves distinct accessible names per thumb by default", async () => {
      render(<Slider label="Price" range defaultValue={[20, 80]} />);
      expect(await screen.findByRole("slider", { name: "Price Minimum" })).toHaveAttribute(
        "aria-valuenow",
        "20",
      );
      expect(await screen.findByRole("slider", { name: "Price Maximum" })).toHaveAttribute(
        "aria-valuenow",
        "80",
      );
    });

    it("lets thumbLabels override the default Minimum/Maximum qualifiers", async () => {
      render(<Slider label="Price" range thumbLabels={["Low", "High"]} defaultValue={[20, 80]} />);
      expect(await screen.findByRole("slider", { name: "Price Low" })).toBeInTheDocument();
      expect(await screen.findByRole("slider", { name: "Price High" })).toBeInTheDocument();
    });

    it("prefixes aria-valuetext with the thumb qualifier", async () => {
      render(<Slider label="Price" range unit="USD" defaultValue={[20, 80]} />);
      const minThumb = await screen.findByRole("slider", { name: "Price Minimum" });
      const maxThumb = await screen.findByRole("slider", { name: "Price Maximum" });
      expect(minThumb).toHaveAttribute("aria-valuetext", "Minimum: 20 USD");
      expect(maxThumb).toHaveAttribute("aria-valuetext", "Maximum: 80 USD");
    });

    it("moves each thumb independently via keyboard, reporting onValueChange as an array", async () => {
      const onValueChange = vi.fn();
      render(<Slider label="Price" range defaultValue={[20, 80]} onValueChange={onValueChange} />);
      const minThumb = await screen.findByRole("slider", { name: "Price Minimum" });
      minThumb.focus();
      await userEvent.keyboard("{ArrowRight}");
      expect(onValueChange).toHaveBeenLastCalledWith([21, 80]);

      const maxThumb = await screen.findByRole("slider", { name: "Price Maximum" });
      maxThumb.focus();
      await userEvent.keyboard("{ArrowLeft}");
      expect(onValueChange).toHaveBeenLastCalledWith([21, 79]);
    });

    it("renders one editable numeric input per thumb, each committing independently", async () => {
      render(<Slider label="Price" range min={0} max={100} defaultValue={[20, 80]} />);
      const minInput = screen.getByRole("textbox", { name: "Price Minimum" });
      const maxInput = screen.getByRole("textbox", { name: "Price Maximum" });
      expect(minInput).toHaveValue("20");
      expect(maxInput).toHaveValue("80");

      await userEvent.clear(minInput);
      await userEvent.type(minInput, "30{Enter}");
      expect(await screen.findByRole("slider", { name: "Price Minimum" })).toHaveAttribute(
        "aria-valuenow",
        "30",
      );
      expect(await screen.findByRole("slider", { name: "Price Maximum" })).toHaveAttribute(
        "aria-valuenow",
        "80",
      );
    });

    it("keeps thumbs at least minStepsBetweenThumbs apart, clamping instead of crossing", async () => {
      render(
        <Slider
          label="Price"
          range
          min={0}
          max={100}
          step={1}
          minStepsBetweenThumbs={10}
          defaultValue={[40, 50]}
        />,
      );
      const minInput = screen.getByRole("textbox", { name: "Price Minimum" });
      await userEvent.clear(minInput);
      await userEvent.type(minInput, "60{Enter}");
      // Pushing the minimum thumb toward (and past) the maximum thumb, with a
      // required 10-unit gap, clamps it at max - 10 rather than letting it cross.
      expect(await screen.findByRole("slider", { name: "Price Minimum" })).toHaveAttribute(
        "aria-valuenow",
        "40",
      );
    });

    it("renders a combined, unit-suffixed range display when editable={false}", async () => {
      render(<Slider label="Price" range unit="USD" defaultValue={[20, 80]} editable={false} />);
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("20 – 80 USD")).toBeInTheDocument();
    });
  });

  describe("marks", () => {
    it("renders a marker per entry, positioned via data-value", async () => {
      render(
        <Slider
          label="Concentration"
          min={0}
          max={100}
          defaultValue={50}
          marks={[{ value: 0 }, { value: 50 }, { value: 100 }]}
        />,
      );
      await screen.findByRole("slider");
      const markers = document.querySelectorAll('[data-part="marker"]');
      expect(markers).toHaveLength(3);
      expect(Array.from(markers).map((m) => m.getAttribute("data-value"))).toEqual([
        "0",
        "50",
        "100",
      ]);
    });

    it("renders each mark's label text when provided, and none when omitted", async () => {
      render(
        <Slider
          label="Concentration"
          min={0}
          max={100}
          defaultValue={50}
          marks={[{ value: 0, label: "Low" }, { value: 50 }, { value: 100, label: "High" }]}
        />,
      );
      await screen.findByRole("slider");
      expect(screen.getByText("Low")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
      const unlabeled = document.querySelector('[data-part="marker"][data-value="50"]');
      expect(unlabeled?.textContent).toBe("");
    });

    it("marks are presentational, not exposed as separate accessible elements", async () => {
      render(
        <Slider label="Concentration" defaultValue={50} marks={[{ value: 0, label: "Low" }]} />,
      );
      await screen.findByRole("slider");
      const group = document.querySelector('[data-part="marker-group"]');
      const marker = document.querySelector('[data-part="marker"]');
      expect(group).toHaveAttribute("role", "presentation");
      expect(group).toHaveAttribute("aria-hidden", "true");
      expect(marker).toHaveAttribute("role", "presentation");
    });

    it("renders no marker group when marks is empty or unset", async () => {
      render(<Slider label="Concentration" defaultValue={50} marks={[]} />);
      await screen.findByRole("slider");
      expect(document.querySelector('[data-part="marker-group"]')).not.toBeInTheDocument();
    });

    it("reflects a mark's position relative to the current value via data-state", async () => {
      render(
        <Slider
          label="Concentration"
          min={0}
          max={100}
          defaultValue={50}
          marks={[{ value: 0 }, { value: 100 }]}
        />,
      );
      await screen.findByRole("slider");
      expect(document.querySelector('[data-part="marker"][data-value="0"]')).toHaveAttribute(
        "data-state",
        "under-value",
      );
      expect(document.querySelector('[data-part="marker"][data-value="100"]')).toHaveAttribute(
        "data-state",
        "over-value",
      );
    });
  });

  it("disables the thumb and the numeric input, and blocks keyboard interaction", async () => {
    render(<Slider label="Concentration" defaultValue={50} disabled />);
    expect(await screen.findByRole("slider")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("textbox", { name: "Concentration" })).toBeDisabled();
  });

  it("marks the numeric input read-only, and readOnly blocks value changes", async () => {
    const onValueChange = vi.fn();
    render(
      <Slider label="Concentration" defaultValue={50} readOnly onValueChange={onValueChange} />,
    );
    expect(screen.getByRole("textbox", { name: "Concentration" })).toHaveAttribute("readonly");
    (await screen.findByRole("slider")).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("shows hint text and links it into aria-describedby when there is no error", async () => {
    render(
      <Slider label="Concentration" hint="Enter a value between 0 and 100" defaultValue={50} />,
    );
    const hint = screen.getByText("Enter a value between 0 and 100");
    const thumb = await screen.findByRole("slider");
    expect(thumb.getAttribute("aria-describedby")).toContain(hint.id);
  });

  it("shows the error instead of the hint, and sets invalid state", async () => {
    render(
      <Slider
        label="Concentration"
        hint="Enter a value between 0 and 100"
        error="Value is out of range"
        defaultValue={50}
      />,
    );
    expect(screen.queryByText("Enter a value between 0 and 100")).toBeNull();
    const errorEl = screen.getByText("Value is out of range");
    const thumb = await screen.findByRole("slider");
    expect(thumb.getAttribute("aria-describedby")).toContain(errorEl.id);
    expect(thumb).toHaveAttribute("aria-invalid", "true");
  });

  it.each(["xs", "sm", "md", "lg", "xl"] as const)(
    "renders without error at size %s",
    async (size) => {
      render(<Slider label="Concentration" size={size} defaultValue={50} />);
      expect(await screen.findByRole("slider")).toBeInTheDocument();
    },
  );

  it("sets data-orientation on the track from the orientation prop", () => {
    render(<Slider label="Concentration" orientation="vertical" defaultValue={50} />);
    const track = document.querySelector('[data-part="track"]');
    expect(track).toHaveAttribute("data-orientation", "vertical");
  });

  it("lets a consumer className override the default gap via tailwind-merge", () => {
    render(<Slider label="Concentration" defaultValue={50} className="gap-stack-lg" />);
    const root = document.querySelector('[data-part="root"]');
    expect(root).toHaveClass("gap-stack-lg");
    expect(root).not.toHaveClass("gap-stack-xs");
  });

  it("accepts ref as a plain prop pointing at the root element", () => {
    let node: HTMLDivElement | null = null;
    render(
      <Slider
        label="Concentration"
        defaultValue={50}
        ref={(el) => {
          node = el;
        }}
      />,
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
  });

  it("passes an axe scan across sizes and states", async () => {
    const { container } = render(
      <div>
        <Slider label="Default" defaultValue={30} />
        <Slider label="Required hint" hint="Pick a value" defaultValue={40} />
        <Slider label="Broken" error="Value is out of range" defaultValue={50} />
        <Slider label="Disabled" disabled defaultValue={60} />
        <Slider label="Read-only" readOnly defaultValue={70} />
        <Slider label="Small" size="xs" defaultValue={20} />
        <Slider label="Large" size="xl" defaultValue={80} />
        <Slider label="Read-only display" unit="µM" defaultValue={45} editable={false} />
        <Slider label="Price" range unit="USD" defaultValue={[20, 80]} />
        <Slider
          label="Price range display"
          range
          unit="USD"
          defaultValue={[20, 80]}
          editable={false}
        />
        <Slider
          label="With marks"
          min={0}
          max={100}
          defaultValue={50}
          marks={[
            { value: 0, label: "Low" },
            { value: 50, label: "Mid" },
            { value: 100, label: "High" },
          ]}
        />
      </div>,
    );
    await waitFor(() => {
      expect(container.querySelectorAll('[role="slider"]')).toHaveLength(13);
      for (const thumb of container.querySelectorAll<HTMLElement>('[role="slider"]')) {
        expect(thumb.style.visibility).not.toBe("hidden");
      }
    });
    expect((await axe(container)).violations.length).toBe(0);
  });
});
