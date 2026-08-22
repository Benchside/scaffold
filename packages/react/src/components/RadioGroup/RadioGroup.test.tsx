import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { RadioGroup } from "./RadioGroup";

function BasicGroup(props: Partial<React.ComponentProps<typeof RadioGroup>> = {}) {
  return (
    <RadioGroup label="Plan" {...props}>
      <RadioGroup.Item value="free">Free</RadioGroup.Item>
      <RadioGroup.Item value="pro">Pro</RadioGroup.Item>
      <RadioGroup.Item value="enterprise">Enterprise</RadioGroup.Item>
    </RadioGroup>
  );
}

describe("RadioGroup", () => {
  it("renders as a native fieldset with a legend, not just an ARIA-only div", () => {
    render(<BasicGroup />);
    const group = screen.getByRole("radiogroup");
    expect(group.tagName).toBe("FIELDSET");
    const legend = screen.getByText("Plan");
    expect(legend.tagName).toBe("LEGEND");
  });

  it("renders each item as a labeled radio input", () => {
    render(<BasicGroup />);
    expect(screen.getByLabelText("Free")).toHaveAttribute("type", "radio");
    expect(screen.getByLabelText("Pro")).toHaveAttribute("type", "radio");
    expect(screen.getByLabelText("Enterprise")).toHaveAttribute("type", "radio");
  });

  it("selects an item on click, and clicking another moves the selection (native mutual exclusivity)", async () => {
    render(<BasicGroup />);
    await userEvent.click(screen.getByLabelText("Free"));
    expect(screen.getByLabelText("Free")).toBeChecked();
    await userEvent.click(screen.getByLabelText("Pro"));
    expect(screen.getByLabelText("Pro")).toBeChecked();
    expect(screen.getByLabelText("Free")).not.toBeChecked();
  });

  it("navigates and selects with arrow keys", async () => {
    render(<BasicGroup />);
    await userEvent.tab();
    expect(screen.getByLabelText("Free")).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByLabelText("Pro")).toHaveFocus();
    expect(screen.getByLabelText("Pro")).toBeChecked();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByLabelText("Enterprise")).toHaveFocus();
    expect(screen.getByLabelText("Enterprise")).toBeChecked();
  });

  it("moves focus out of the group (not between items) on Tab", async () => {
    render(
      <div>
        <BasicGroup />
        <button type="button">After</button>
      </div>,
    );
    await userEvent.tab();
    expect(screen.getByLabelText("Free")).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("calls onValueChange with the selected value", async () => {
    const onValueChange = vi.fn();
    render(<BasicGroup onValueChange={onValueChange} />);
    await userEvent.click(screen.getByLabelText("Pro"));
    expect(onValueChange).toHaveBeenCalledWith({ value: "pro" });
  });

  it("supports a controlled value", async () => {
    const { rerender } = render(<BasicGroup value="free" onValueChange={() => {}} />);
    expect(screen.getByLabelText("Free")).toBeChecked();
    rerender(<BasicGroup value="pro" onValueChange={() => {}} />);
    // Ark syncs each radio input's `.checked` property (there's no reactive
    // `checked`/`defaultChecked` binding at all here — see connect.js) via
    // an effect after the value prop changes, not synchronously.
    await waitFor(() => expect(screen.getByLabelText("Pro")).toBeChecked());
    expect(screen.getByLabelText("Free")).not.toBeChecked();
  });

  it("disables the whole group and blocks interaction", async () => {
    const onValueChange = vi.fn();
    render(<BasicGroup disabled onValueChange={onValueChange} />);
    expect(screen.getByLabelText("Free")).toBeDisabled();
    expect(screen.getByLabelText("Pro")).toBeDisabled();
    await userEvent.click(screen.getByLabelText("Free"));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("disables a single item independent of the group", () => {
    render(
      <RadioGroup label="Plan">
        <RadioGroup.Item value="free">Free</RadioGroup.Item>
        <RadioGroup.Item value="pro" disabled>
          Pro
        </RadioGroup.Item>
      </RadioGroup>,
    );
    expect(screen.getByLabelText("Free")).not.toBeDisabled();
    expect(screen.getByLabelText("Pro")).toBeDisabled();
  });

  it("shows hint text and links it into aria-describedby when there is no error", () => {
    render(<BasicGroup hint="Billed monthly" />);
    const group = screen.getByRole("radiogroup");
    const hint = screen.getByText("Billed monthly");
    expect(group.getAttribute("aria-describedby")).toContain(hint.id);
  });

  it("shows the error instead of the hint, and sets aria-invalid on the group", () => {
    render(<BasicGroup hint="Billed monthly" error="Pick a plan" />);
    expect(screen.queryByText("Billed monthly")).toBeNull();
    const errorEl = screen.getByText("Pick a plan");
    const group = screen.getByRole("radiogroup");
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group.getAttribute("aria-describedby")).toContain(errorEl.id);
  });

  it("renders a decorative required asterisk next to the group label", () => {
    render(<BasicGroup required />);
    const asterisk = screen.getByText("*");
    expect(asterisk).toHaveAttribute("aria-hidden", "true");
  });

  it("defaults to vertical orientation and supports horizontal", () => {
    const { rerender } = render(<BasicGroup />);
    expect(screen.getByRole("radiogroup")).toHaveAttribute("data-orientation", "vertical");
    rerender(<BasicGroup orientation="horizontal" />);
    expect(screen.getByRole("radiogroup")).toHaveAttribute("data-orientation", "horizontal");
  });

  it.each([
    ["xs", "size-(--font-size-xs)"],
    ["md", "size-(--font-size-base)"],
    ["xl", "size-(--font-size-xl)"],
  ] as const)("applies the %s control size class to each item", (size, sizeClass) => {
    render(<BasicGroup size={size} />);
    const input = screen.getByLabelText("Free");
    const control = input.parentElement?.querySelector('[data-part="item-control"]');
    expect(control).toHaveClass(sizeClass);
  });

  it("passes an axe scan across sizes and states", async () => {
    const { container } = render(
      <div>
        <BasicGroup />
        <BasicGroup label="Selected" defaultValue="pro" />
        <BasicGroup label="Required" required />
        <BasicGroup label="Broken" error="Pick a plan" />
        <BasicGroup label="Disabled" disabled />
        <BasicGroup label="Horizontal" orientation="horizontal" />
        <BasicGroup label="Small" size="xs" />
      </div>,
    );
    expect((await axe(container)).violations.length).toBe(0);
  });
});
