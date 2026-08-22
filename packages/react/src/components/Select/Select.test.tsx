import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Select, type SelectOption } from "./Select";

const OPTIONS: SelectOption[] = [
  { label: "Red", value: "red" },
  { label: "Green", value: "green" },
  { label: "Blue", value: "blue", disabled: true },
];

function BasicSelect(props: Partial<React.ComponentProps<typeof Select>> = {}) {
  return <Select label="Color" items={OPTIONS} placeholder="Choose a color" {...props} />;
}

describe("Select", () => {
  it("renders a combobox trigger showing the placeholder when nothing is selected", () => {
    render(<BasicSelect />);
    const trigger = screen.getByRole("combobox", { name: "Color" });
    expect(trigger).toHaveTextContent("Choose a color");
  });

  it("opens the listbox with every item when the trigger is clicked", async () => {
    render(<BasicSelect />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("selects an item on click, closing the popover and reflecting its label in the trigger", async () => {
    render(<BasicSelect />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "Red" }));
    expect(screen.getByRole("combobox")).toHaveTextContent("Red");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });

  it("calls onValueChange with the selected value string in single-select mode", async () => {
    const onValueChange = vi.fn();
    render(<BasicSelect onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "Green" }));
    expect(onValueChange).toHaveBeenCalledWith("green");
  });

  it("supports a controlled value: onValueChange fires, and a rerender with the new value is reflected", async () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<BasicSelect value="red" onValueChange={onValueChange} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Red");
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "Green" }));
    expect(onValueChange).toHaveBeenCalledWith("green");
    expect(screen.getByRole("combobox")).toHaveTextContent("Red");
    rerender(<BasicSelect value="green" onValueChange={onValueChange} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Green");
  });

  it("does not select a disabled item and leaves onValueChange uncalled", async () => {
    const onValueChange = vi.fn();
    render(<BasicSelect onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("combobox"));
    const blueOption = screen.getByRole("option", { name: "Blue" });
    expect(blueOption).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(blueOption);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  describe("multiple mode", () => {
    it("keeps the popover open after selecting, and calls onValueChange with an array", async () => {
      const onValueChange = vi.fn();
      render(<BasicSelect multiple onValueChange={onValueChange} />);
      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.click(screen.getByRole("option", { name: "Red" }));
      expect(onValueChange).toHaveBeenCalledWith(["red"]);
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("shows the item count once more than one item is selected", async () => {
      render(<BasicSelect multiple />);
      await userEvent.click(screen.getByRole("combobox"));
      await userEvent.click(screen.getByRole("option", { name: "Red" }));
      expect(screen.getByRole("combobox")).toHaveTextContent("Red");
      await userEvent.click(screen.getByRole("option", { name: "Green" }));
      expect(screen.getByRole("combobox")).toHaveTextContent("2 selected");
    });

    it("toggles an item off when it is clicked again", async () => {
      render(<BasicSelect multiple />);
      await userEvent.click(screen.getByRole("combobox"));
      const redOption = screen.getByRole("option", { name: "Red" });
      await userEvent.click(redOption);
      expect(redOption).toHaveAttribute("aria-selected", "true");
      await userEvent.click(redOption);
      expect(redOption).toHaveAttribute("aria-selected", "false");
    });
  });

  it("shows a clear button once a value is selected when clearable is set, and clicking it resets the trigger", async () => {
    render(<BasicSelect clearable defaultValue="red" />);
    const clearButton = screen.getByRole("button", { name: /clear/i });
    expect(screen.getByRole("combobox")).toHaveTextContent("Red");
    await userEvent.click(clearButton);
    expect(screen.getByRole("combobox")).toHaveTextContent("Choose a color");
  });

  it("shows a 'No options' placeholder when items is empty", async () => {
    render(<BasicSelect items={[]} />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getByText("No options")).toBeInTheDocument();
  });

  it.each([
    ["xs", "text-caption"],
    ["md", "text-label"],
    ["xl", "text-label-lg"],
  ] as const)("applies the %s trigger size class", (size, sizeClass) => {
    render(<BasicSelect size={size} />);
    expect(screen.getByRole("combobox").parentElement).toHaveClass(sizeClass);
  });

  it("shows hint text and links it into aria-describedby when there is no error", () => {
    render(<BasicSelect hint="Used to tag your samples" />);
    const trigger = screen.getByRole("combobox");
    const hint = screen.getByText("Used to tag your samples");
    expect(trigger.getAttribute("aria-describedby")).toContain(hint.id);
  });

  it("shows the error instead of the hint, and sets aria-invalid", () => {
    render(<BasicSelect hint="Used to tag your samples" error="Pick a color" />);
    expect(screen.queryByText("Used to tag your samples")).toBeNull();
    const errorEl = screen.getByText("Pick a color");
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger.getAttribute("aria-describedby")).toContain(errorEl.id);
  });

  it("disables the trigger and blocks opening", async () => {
    render(<BasicSelect disabled />);
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeDisabled();
    await userEvent.click(trigger);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("lets a consumer className override the default trigger border via tailwind-merge", () => {
    render(<BasicSelect className="border-status-error" />);
    const control = screen.getByRole("combobox").parentElement;
    expect(control).toHaveClass("border-status-error");
    expect(control).not.toHaveClass("border-border");
  });

  it("accepts ref as a plain prop pointing at the trigger button", () => {
    let node: HTMLButtonElement | null = null;
    render(
      <BasicSelect
        ref={(el) => {
          node = el;
        }}
      />,
    );
    expect(node).toBeInstanceOf(HTMLButtonElement);
    expect(node).toBe(screen.getByRole("combobox"));
  });

  it("passes an axe scan across sizes and states", async () => {
    const { container } = render(
      <div>
        <BasicSelect />
        <BasicSelect required />
        <BasicSelect error="Pick a color" />
        <BasicSelect disabled />
        <BasicSelect multiple clearable defaultValue={["red", "green"]} />
        <BasicSelect size="xs" />
        <BasicSelect size="xl" />
      </div>,
    );
    expect((await axe(container)).violations.length).toBe(0);
  });
});
