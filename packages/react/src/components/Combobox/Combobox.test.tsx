import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Combobox, type ComboboxOption } from "./Combobox";

const OPTIONS: ComboboxOption[] = [
  { label: "BRCA1", value: "brca1" },
  { label: "BRCA2", value: "brca2" },
  { label: "TP53", value: "tp53", disabled: true },
];

/**
 * jsdom lays nothing out, so `offsetWidth`/`offsetHeight` are always 0 —
 * TanStack Virtual reads exactly those (not `getBoundingClientRect()`) once,
 * synchronously, on mount to pick its initial visible range, and a
 * zero-height viewport makes that range empty, so no rows (and no
 * `role="option"` elements) ever render. Stubbing just the listbox's offset
 * size (not every element's) gives it a real viewport to compute a range
 * against, matching how every other component's tests don't need to know
 * virtualization exists.
 */
function isComboboxListbox(this: HTMLElement) {
  return (
    this.getAttribute("data-scope") === "combobox" && this.getAttribute("data-part") === "content"
  );
}

let originalOffsetHeight: PropertyDescriptor | undefined;
let originalOffsetWidth: PropertyDescriptor | undefined;

beforeEach(() => {
  originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
  originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get(this: HTMLElement) {
      return isComboboxListbox.call(this) ? 300 : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return isComboboxListbox.call(this) ? 288 : 0;
    },
  });
});

afterEach(() => {
  if (originalOffsetHeight)
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", originalOffsetHeight);
  if (originalOffsetWidth)
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalOffsetWidth);
});

function BasicCombobox(props: Partial<React.ComponentProps<typeof Combobox>> = {}) {
  return <Combobox label="Gene symbol" items={OPTIONS} placeholder="Search genes" {...props} />;
}

/**
 * `userEvent.type()` dispatches keystrokes fast enough to outrun Ark's
 * `queueMicrotask`-scheduled imperative sync of the (uncontrolled) input's
 * DOM value, intermittently dropping or scrambling characters. Typing one
 * character per `userEvent.keyboard()` call — each fully awaited — gives
 * that microtask time to flush between keystrokes, matching how a real user
 * types. Select has no equivalent because its trigger is a button, not a
 * text input Ark syncs this way.
 */
async function typeSlowly(text: string) {
  for (const char of text) {
    await userEvent.keyboard(char);
  }
}

// A stub "fuzzy" filter that matches anything containing all letters of the
// query in order, regardless of contiguity — the default prefix/substring
// filter would not match "b1" against "BRCA1".
function fuzzyFilter(itemText: string, filterText: string) {
  const haystack = itemText.toLowerCase();
  let i = 0;
  for (const ch of filterText.toLowerCase()) {
    i = haystack.indexOf(ch, i);
    if (i === -1) return false;
    i += 1;
  }
  return true;
}

function groupByLetter(item: ComboboxOption) {
  return item.label[0]!;
}

describe("Combobox", () => {
  it("renders an input showing the placeholder when empty", () => {
    render(<BasicCombobox />);
    const input = screen.getByRole("combobox", { name: "Gene symbol" });
    expect(input).toHaveAttribute("placeholder", "Search genes");
    expect(input).toHaveValue("");
  });

  it("opens the listbox with every item when the input is clicked", async () => {
    render(<BasicCombobox />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("filters the option list as the user types using the default prefix/substring filter", async () => {
    render(<BasicCombobox />);
    const input = screen.getByRole("combobox");
    await userEvent.click(input);
    await typeSlowly("brca");
    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(2);
    });
    expect(screen.queryByRole("option", { name: "TP53" })).not.toBeInTheDocument();
  });

  it("matches a non-prefix substring too", async () => {
    render(<BasicCombobox />);
    const input = screen.getByRole("combobox");
    await userEvent.click(input);
    await typeSlowly("rca2");
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "BRCA2" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("option", { name: "BRCA1" })).not.toBeInTheDocument();
  });

  it("shows 'No results' once the filter matches nothing", async () => {
    render(<BasicCombobox />);
    const input = screen.getByRole("combobox");
    await userEvent.click(input);
    await typeSlowly("zzz");
    await waitFor(() => {
      expect(screen.getByText("No results")).toBeInTheDocument();
    });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("a custom filter prop overrides the default matching", async () => {
    render(<BasicCombobox filter={fuzzyFilter} />);
    const input = screen.getByRole("combobox");
    await userEvent.click(input);
    await typeSlowly("b1");
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "BRCA1" })).toBeInTheDocument();
    });
  });

  it("highlights the matched substring in each option's label by default", async () => {
    render(<BasicCombobox />);
    const input = screen.getByRole("combobox");
    await userEvent.click(input);
    await typeSlowly("brca1");
    await waitFor(() => {
      const option = screen.getByRole("option", { name: "BRCA1" });
      expect(within(option).getByText("BRCA1", { selector: "mark" })).toBeInTheDocument();
    });
  });

  it("suppresses match highlighting when a custom filter is supplied", async () => {
    render(<BasicCombobox filter={() => true} />);
    const input = screen.getByRole("combobox");
    await userEvent.click(input);
    await typeSlowly("brca1");
    await waitFor(() => {
      const option = screen.getByRole("option", { name: "BRCA1" });
      expect(within(option).queryByText("BRCA1", { selector: "mark" })).not.toBeInTheDocument();
    });
  });

  it("selects an item on click, closing the popover and reflecting its label in the input", async () => {
    render(<BasicCombobox />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "BRCA1" }));
    expect(screen.getByRole("combobox")).toHaveValue("BRCA1");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });

  it("calls onValueChange with the selected value string", async () => {
    const onValueChange = vi.fn();
    render(<BasicCombobox onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "BRCA2" }));
    expect(onValueChange).toHaveBeenCalledWith("brca2");
  });

  it("selects the highlighted item with Enter after arrow-key navigation", async () => {
    const onValueChange = vi.fn();
    render(<BasicCombobox onValueChange={onValueChange} />);
    const input = screen.getByRole("combobox");
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("brca2");
  });

  it("does not select a disabled item and leaves onValueChange uncalled", async () => {
    const onValueChange = vi.fn();
    render(<BasicCombobox onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    const disabledOption = screen.getByRole("option", { name: "TP53" });
    expect(disabledOption).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(disabledOption);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("shows a clear button once a value is present when clearable is set, and clicking it resets the input", async () => {
    render(<BasicCombobox clearable defaultValue="brca1" />);
    const clearButton = screen.getByRole("button", { name: /clear/i });
    expect(screen.getByRole("combobox")).toHaveValue("BRCA1");
    await userEvent.click(clearButton);
    // Ark syncs the input's DOM value imperatively via a `queueMicrotask`,
    // outside what `userEvent.click`'s own await tracks.
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue(""));
  });

  it.each([
    ["xs", "text-caption"],
    ["md", "text-label"],
    ["xl", "text-label-lg"],
  ] as const)("applies the %s size class", (size, sizeClass) => {
    render(<BasicCombobox size={size} />);
    expect(screen.getByRole("combobox").parentElement).toHaveClass(sizeClass);
  });

  it("shows hint text and links it into aria-describedby when there is no error", () => {
    render(<BasicCombobox hint="Matched against HGNC symbols" />);
    const input = screen.getByRole("combobox");
    const hint = screen.getByText("Matched against HGNC symbols");
    expect(input.getAttribute("aria-describedby")).toContain(hint.id);
  });

  it("shows the error instead of the hint, and sets aria-invalid", () => {
    render(<BasicCombobox hint="Matched against HGNC symbols" error="Pick a gene" />);
    expect(screen.queryByText("Matched against HGNC symbols")).toBeNull();
    const errorEl = screen.getByText("Pick a gene");
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(errorEl.id);
  });

  it("disables the input and blocks opening", async () => {
    render(<BasicCombobox disabled />);
    const input = screen.getByRole("combobox");
    expect(input).toBeDisabled();
    await userEvent.click(input);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("lets a consumer className override the default border via tailwind-merge", () => {
    render(<BasicCombobox className="border-status-error" />);
    const control = screen.getByRole("combobox").parentElement;
    expect(control).toHaveClass("border-status-error");
    expect(control).not.toHaveClass("border-border");
  });

  it("accepts ref as a plain prop pointing at the input", () => {
    let node: HTMLInputElement | null = null;
    render(
      <BasicCombobox
        ref={(el) => {
          node = el;
        }}
      />,
    );
    expect(node).toBeInstanceOf(HTMLInputElement);
    expect(node).toBe(screen.getByRole("combobox"));
  });

  it("sets aria-selected once the option is selected (Ark omits it entirely, rather than 'false', while unselected)", async () => {
    render(<BasicCombobox />);
    await userEvent.click(screen.getByRole("combobox"));
    const brca1 = screen.getByRole("option", { name: "BRCA1" });
    expect(brca1).not.toHaveAttribute("aria-selected");
    await userEvent.click(brca1);
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("option", { name: "BRCA1" })).toHaveAttribute("aria-selected", "true");
  });

  describe("multiple mode", () => {
    it("keeps the popover open after selecting, and calls onValueChange with an array", async () => {
      const onValueChange = vi.fn();
      render(<BasicCombobox multiple onValueChange={onValueChange} />);
      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.click(screen.getByRole("option", { name: "BRCA1" }));
      expect(onValueChange).toHaveBeenCalledWith(["brca1"]);
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("renders a removable pill per selected item, and clears the input text on each pick", async () => {
      render(<BasicCombobox multiple />);
      const input = screen.getByRole("combobox");
      await userEvent.click(input);
      await userEvent.click(screen.getByRole("option", { name: "BRCA1" }));
      await userEvent.click(screen.getByRole("option", { name: "BRCA2" }));
      // The listbox stays open after each pick (closeOnSelect is false for
      // multiple), so its options and the pills can both show the same
      // label at once — scope to the pill's own remove button instead of a
      // bare text match, which would be ambiguous between the two.
      expect(screen.getByRole("button", { name: "Remove BRCA1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remove BRCA2" })).toBeInTheDocument();
      await waitFor(() => expect(input).toHaveValue(""));
    });

    it("removes just that item when a pill's remove button is clicked", async () => {
      const onValueChange = vi.fn();
      render(
        <BasicCombobox multiple defaultValue={["brca1", "brca2"]} onValueChange={onValueChange} />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Remove BRCA1" }));
      expect(onValueChange).toHaveBeenCalledWith(["brca2"]);
      // Not `queryByText`: the listbox is always mounted (just visually
      // hidden while closed — see `ComboboxPopover`), so a bare text match
      // would also find BRCA1's still-present (hidden) listbox option.
      expect(screen.queryByRole("button", { name: "Remove BRCA1" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remove BRCA2" })).toBeInTheDocument();
    });

    it("toggles aria-selected per option, including deselect-by-reclick", async () => {
      render(<BasicCombobox multiple />);
      await userEvent.click(screen.getByRole("combobox"));
      const brca1 = screen.getByRole("option", { name: "BRCA1" });
      expect(brca1).not.toHaveAttribute("aria-selected");
      await userEvent.click(brca1);
      expect(brca1).toHaveAttribute("aria-selected", "true");
      await userEvent.click(brca1);
      expect(brca1).not.toHaveAttribute("aria-selected");
    });

    it("shows a clear-all button once items are selected, driven by hasSelectedItems rather than input text", async () => {
      render(<BasicCombobox multiple clearable defaultValue={["brca1", "brca2"]} />);
      const clearButton = screen.getByRole("button", { name: "Clear selection" });
      await userEvent.click(clearButton);
      await waitFor(() => {
        expect(screen.queryByRole("button", { name: "Remove BRCA1" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Remove BRCA2" })).not.toBeInTheDocument();
      });
    });
  });

  describe("grouping", () => {
    const GROUPED_OPTIONS: ComboboxOption[] = [
      { label: "BRCA1", value: "brca1" },
      { label: "TP53", value: "tp53" },
      { label: "BRCA2", value: "brca2" },
      { label: "EGFR", value: "egfr" },
    ];

    it("inserts a header row wherever the group changes, re-sorted so each group is contiguous", async () => {
      render(<Combobox label="Gene symbol" items={GROUPED_OPTIONS} groupBy={groupByLetter} />);
      await userEvent.click(screen.getByRole("combobox"));
      const groups = screen.getAllByRole("group");
      expect(groups.map((g) => g.textContent)).toEqual(["B", "T", "E"]);
      // BRCA1 and BRCA2 (both group "B") are re-sorted next to each other,
      // ahead of TP53, even though TP53 came second in the source order.
      const options = screen.getAllByRole("option").map((o) => o.textContent);
      expect(options).toEqual(["BRCA1", "BRCA2", "TP53", "EGFR"]);
    });

    it("header rows are not selectable options", async () => {
      render(<Combobox label="Gene symbol" items={GROUPED_OPTIONS} groupBy={groupByLetter} />);
      await userEvent.click(screen.getByRole("combobox"));
      const header = screen.getByRole("group", { name: "B" });
      expect(header).not.toHaveAttribute("role", "option");
    });

    it("keeps aria-activedescendant resolvable while arrowing past a group boundary", async () => {
      const manyGrouped: ComboboxOption[] = Array.from({ length: 60 }, (_, i) => ({
        label: `Gene ${String(i).padStart(3, "0")}`,
        value: `gene-${i}`,
      }));
      render(
        <Combobox
          label="Gene symbol"
          items={manyGrouped}
          groupBy={(item) => (Number(item.value.split("-")[1]) < 30 ? "First half" : "Second half")}
        />,
      );
      const input = screen.getByRole("combobox");
      await userEvent.click(input);
      for (let i = 0; i < 35; i++) {
        await userEvent.keyboard("{ArrowDown}");
        const activeDescendantId = input.getAttribute("aria-activedescendant");
        expect(activeDescendantId).toBeTruthy();
        expect(document.getElementById(activeDescendantId!)).toHaveAttribute("role", "option");
      }
    });
  });

  describe("disabled options with a reason", () => {
    const OPTIONS_WITH_REASON: ComboboxOption[] = [
      { label: "BRCA1", value: "brca1" },
      { label: "TP53", value: "tp53", disabled: true, disabledReason: "Requires calibration run" },
    ];

    it("exposes the reason via aria-describedby regardless of hover state", async () => {
      render(<Combobox label="Gene symbol" items={OPTIONS_WITH_REASON} />);
      await userEvent.click(screen.getByRole("combobox"));
      const option = screen.getByRole("option", { name: "TP53" });
      const describedById = option.getAttribute("aria-describedby");
      expect(describedById).toBeTruthy();
      expect(document.getElementById(describedById!)).toHaveTextContent("Requires calibration run");
    });

    it("shows the reason in a tooltip on hover", async () => {
      render(<Combobox label="Gene symbol" items={OPTIONS_WITH_REASON} />);
      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.hover(screen.getByRole("option", { name: "TP53" }));
      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toHaveTextContent("Requires calibration run");
      });
    });

    it("a disabled option without a reason has no tooltip machinery attached", async () => {
      render(
        <Combobox label="Gene symbol" items={[{ label: "TP53", value: "tp53", disabled: true }]} />,
      );
      await userEvent.click(screen.getByRole("combobox"));
      const option = screen.getByRole("option", { name: "TP53" });
      expect(option).not.toHaveAttribute("aria-describedby");
      expect(option).toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("virtualization", () => {
    const MANY_OPTIONS: ComboboxOption[] = Array.from({ length: 300 }, (_, i) => ({
      label: `Gene ${String(i).padStart(3, "0")}`,
      value: `gene-${i}`,
    }));

    it("only mounts a window of options, not all 300, once opened", async () => {
      render(<Combobox label="Gene symbol" items={MANY_OPTIONS} />);
      await userEvent.click(screen.getByRole("combobox"));
      const rendered = screen.getAllByRole("option").length;
      expect(rendered).toBeGreaterThan(0);
      expect(rendered).toBeLessThan(MANY_OPTIONS.length);
    });

    it("keeps aria-activedescendant resolvable to a real, mounted option while arrowing past the initial window", async () => {
      render(<Combobox label="Gene symbol" items={MANY_OPTIONS} />);
      const input = screen.getByRole("combobox");
      await userEvent.click(input);

      // Comfortably past whatever the initial ~300px/40px-per-row window
      // plus overscan would show without scrolling.
      for (let i = 0; i < 40; i++) {
        await userEvent.keyboard("{ArrowDown}");
        const activeDescendantId = input.getAttribute("aria-activedescendant");
        expect(activeDescendantId).toBeTruthy();
        const highlightedOption = document.getElementById(activeDescendantId!);
        expect(highlightedOption).not.toBeNull();
        expect(highlightedOption).toHaveAttribute("role", "option");
      }
    });

    it("selecting a far-scrolled item via Enter still resolves to the right value", async () => {
      const onValueChange = vi.fn();
      render(<Combobox label="Gene symbol" items={MANY_OPTIONS} onValueChange={onValueChange} />);
      const input = screen.getByRole("combobox");
      await userEvent.click(input);
      for (let i = 0; i < 40; i++) {
        await userEvent.keyboard("{ArrowDown}");
      }
      await userEvent.keyboard("{Enter}");
      // The first ArrowDown highlights index 0, so 40 presses lands on 39.
      expect(onValueChange).toHaveBeenCalledWith("gene-39");
    });
  });

  describe("async loading", () => {
    it("shows loadingText and suppresses the empty message while loading", async () => {
      render(<Combobox label="Gene symbol" items={[]} loading />);
      await userEvent.click(screen.getByRole("combobox"));
      expect(screen.getByRole("status")).toHaveTextContent("Loading…");
      expect(screen.queryByText("No results")).not.toBeInTheDocument();
    });

    it("supports custom loadingText", async () => {
      render(<Combobox label="Gene symbol" items={[]} loading loadingText="Searching genes…" />);
      await userEvent.click(screen.getByRole("combobox"));
      expect(screen.getByRole("status")).toHaveTextContent("Searching genes…");
    });

    it("shows the default empty message when items is empty and not loading", async () => {
      render(<Combobox label="Gene symbol" items={[]} />);
      await userEvent.click(screen.getByRole("combobox"));
      expect(screen.getByText("No results")).toBeInTheDocument();
    });

    it("supports custom emptyText", async () => {
      render(<Combobox label="Gene symbol" items={[]} emptyText="No genes match your search" />);
      await userEvent.click(screen.getByRole("combobox"));
      expect(screen.getByText("No genes match your search")).toBeInTheDocument();
    });

    it("picks up a new items page pushed in after mount (server-driven mode)", async () => {
      const { rerender } = render(
        <Combobox label="Gene symbol" items={[]} loading filter={null} />,
      );
      await userEvent.click(screen.getByRole("combobox"));
      expect(screen.getByRole("status")).toBeInTheDocument();
      rerender(
        <Combobox
          label="Gene symbol"
          items={[
            { label: "BRCA1", value: "brca1" },
            { label: "BRCA2", value: "brca2" },
          ]}
          filter={null}
        />,
      );
      await waitFor(() => {
        expect(screen.getAllByRole("option")).toHaveLength(2);
      });
    });

    it("with filter set to null, renders items as-is without client-side filtering", async () => {
      // A server-filtered page: only BRCA2 is "in" this page, but typing
      // "brca1" shouldn't hide it via client-side filtering — there's none.
      render(
        <Combobox label="Gene symbol" items={[{ label: "BRCA2", value: "brca2" }]} filter={null} />,
      );
      const input = screen.getByRole("combobox");
      await userEvent.click(input);
      await typeSlowly("brca1");
      expect(screen.getByRole("option", { name: "BRCA2" })).toBeInTheDocument();
    });

    it("calls onRangeChange with a sane, in-bounds row range once opened", async () => {
      const onRangeChange = vi.fn();
      const manyItems: ComboboxOption[] = Array.from({ length: 100 }, (_, i) => ({
        label: `Gene ${i}`,
        value: `gene-${i}`,
      }));
      render(<Combobox label="Gene symbol" items={manyItems} onRangeChange={onRangeChange} />);
      await userEvent.click(screen.getByRole("combobox"));
      await waitFor(() => {
        expect(onRangeChange).toHaveBeenCalled();
      });
      // jsdom doesn't lay anything out, so real item heights read as 0 as
      // they get measured — TanStack Virtual's estimated range keeps
      // widening across a few settling calls as a result, unlike in a real
      // browser (see the Storybook visual baselines). Every call's shape
      // should still be internally consistent regardless of that settling.
      for (const [range] of onRangeChange.mock.calls) {
        expect(range.startIndex).toBeGreaterThanOrEqual(0);
        expect(range.endIndex).toBeGreaterThanOrEqual(range.startIndex);
        expect(range.endIndex).toBeLessThan(manyItems.length);
      }
    });
  });

  it("passes an axe scan across sizes and states", async () => {
    const { container } = render(
      <div>
        <BasicCombobox />
        <BasicCombobox required />
        <BasicCombobox error="Pick a gene" />
        <BasicCombobox disabled />
        <BasicCombobox clearable defaultValue="brca1" />
        <BasicCombobox multiple clearable defaultValue={["brca1", "brca2"]} />
        <BasicCombobox
          items={[
            { label: "BRCA1", value: "brca1" },
            {
              label: "TP53",
              value: "tp53",
              disabled: true,
              disabledReason: "Requires calibration",
            },
          ]}
        />
        <BasicCombobox groupBy={groupByLetter} />
        <BasicCombobox items={[]} loading />
        <BasicCombobox items={[]} />
        <BasicCombobox size="xs" />
        <BasicCombobox size="xl" />
      </div>,
    );
    expect((await axe(container)).violations.length).toBe(0);
  });
});
