import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("associates the label via native label-wraps-input, no explicit htmlFor needed", () => {
    render(<Checkbox label="Accept terms" />);
    const input = screen.getByLabelText("Accept terms");
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("type", "checkbox");
  });

  it("toggles checked state on click", async () => {
    render(<Checkbox label="Accept terms" />);
    const input = screen.getByLabelText("Accept terms");
    expect(input).not.toBeChecked();
    await userEvent.click(input);
    expect(input).toBeChecked();
  });

  it("toggles checked state with the space key while focused", async () => {
    render(<Checkbox label="Accept terms" />);
    const input = screen.getByLabelText("Accept terms");
    input.focus();
    expect(input).not.toBeChecked();
    await userEvent.keyboard(" ");
    expect(input).toBeChecked();
  });

  it("calls onCheckedChange with the new checked state", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="Accept terms" onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByLabelText("Accept terms"));
    expect(onCheckedChange).toHaveBeenCalledWith({ checked: true });
  });

  it("supports a controlled checked value: onCheckedChange fires, and a rerender with the new value is reflected", async () => {
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <Checkbox label="Accept terms" checked={false} onCheckedChange={onCheckedChange} />,
    );
    const input = screen.getByLabelText("Accept terms");
    await userEvent.click(input);
    expect(onCheckedChange).toHaveBeenCalledWith({ checked: true });
    rerender(<Checkbox label="Accept terms" checked={true} onCheckedChange={onCheckedChange} />);
    expect(input).toBeChecked();
  });

  it("marks the native input indeterminate, distinct from checked, for indeterminate", () => {
    render(<Checkbox label="Select all" indeterminate />);
    const input = screen.getByLabelText("Select all") as HTMLInputElement;
    expect(input.indeterminate).toBe(true);
    expect(input).not.toBeChecked();
  });

  it("disables the input and blocks interaction", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="Accept terms" disabled onCheckedChange={onCheckedChange} />);
    const input = screen.getByLabelText("Accept terms");
    expect(input).toBeDisabled();
    await userEvent.click(input);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("sets aria-required and native required from the required prop", () => {
    render(<Checkbox label="Accept terms" required />);
    expect(screen.getByLabelText(/Accept terms/)).toBeRequired();
  });

  it("renders a decorative required asterisk", () => {
    render(<Checkbox label="Accept terms" required />);
    const asterisk = screen.getByText("*");
    expect(asterisk).toHaveAttribute("aria-hidden", "true");
  });

  it("shows hint text and links it into aria-describedby when there is no error", () => {
    render(<Checkbox label="Accept terms" hint="You can revoke this later" />);
    const input = screen.getByLabelText("Accept terms");
    const hint = screen.getByText("You can revoke this later");
    expect(input.getAttribute("aria-describedby")).toContain(hint.id);
  });

  it("shows the error instead of the hint, and sets aria-invalid", () => {
    render(
      <Checkbox label="Accept terms" hint="You can revoke this later" error="You must accept" />,
    );
    expect(screen.queryByText("You can revoke this later")).toBeNull();
    const errorEl = screen.getByText("You must accept");
    const input = screen.getByLabelText("Accept terms");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(errorEl.id);
  });

  it("sets aria-invalid to false when there is no error", () => {
    render(<Checkbox label="Accept terms" />);
    expect(screen.getByLabelText("Accept terms")).toHaveAttribute("aria-invalid", "false");
  });

  it.each([
    ["xs", "size-(--font-size-xs)"],
    ["md", "size-(--font-size-base)"],
    ["xl", "size-(--font-size-xl)"],
  ] as const)("applies the %s box size class", (size, sizeClass) => {
    render(<Checkbox label="Accept terms" size={size} />);
    const input = screen.getByLabelText("Accept terms");
    const control = input.parentElement?.querySelector('[data-part="control"]');
    expect(control).toHaveClass(sizeClass);
  });

  it("lets a consumer className override the default border via tailwind-merge", () => {
    render(<Checkbox label="Accept terms" className="border-status-error" />);
    const input = screen.getByLabelText("Accept terms");
    const control = input.parentElement?.querySelector('[data-part="control"]');
    expect(control).toHaveClass("border-status-error");
    expect(control).not.toHaveClass("border-border");
  });

  it("accepts ref as a plain prop pointing at the real hidden checkbox input", () => {
    let node: HTMLInputElement | null = null;
    render(
      <Checkbox
        label="Accept terms"
        ref={(el) => {
          node = el;
        }}
      />,
    );
    expect(node).toBeInstanceOf(HTMLInputElement);
  });

  it("passes an axe scan across sizes and states", async () => {
    const { container } = render(
      <div>
        <Checkbox label="Default" />
        <Checkbox label="Checked" defaultChecked />
        <Checkbox label="Indeterminate" indeterminate />
        <Checkbox label="Required" required />
        <Checkbox label="Broken" error="Something is wrong" />
        <Checkbox label="Disabled" disabled />
        <Checkbox label="Small" size="xs" />
        <Checkbox label="Large" size="xl" />
      </div>,
    );
    expect((await axe(container)).violations.length).toBe(0);
  });
});
