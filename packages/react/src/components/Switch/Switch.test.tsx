import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Switch } from "./Switch";

describe("Switch", () => {
  it("associates the label via native label-wraps-input, no explicit htmlFor needed", () => {
    render(<Switch label="Enable notifications" />);
    const input = screen.getByLabelText("Enable notifications");
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("type", "checkbox");
  });

  it("toggles checked state on click", async () => {
    render(<Switch label="Enable notifications" />);
    const input = screen.getByLabelText("Enable notifications");
    expect(input).not.toBeChecked();
    await userEvent.click(input);
    expect(input).toBeChecked();
  });

  it("toggles checked state with the space key while focused", async () => {
    render(<Switch label="Enable notifications" />);
    const input = screen.getByLabelText("Enable notifications");
    input.focus();
    expect(input).not.toBeChecked();
    await userEvent.keyboard(" ");
    expect(input).toBeChecked();
  });

  it("calls onCheckedChange with the new checked state", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Enable notifications" onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByLabelText("Enable notifications"));
    expect(onCheckedChange).toHaveBeenCalledWith({ checked: true });
  });

  it("supports a controlled checked value: onCheckedChange fires, and a rerender with the new value is reflected", async () => {
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <Switch label="Enable notifications" checked={false} onCheckedChange={onCheckedChange} />,
    );
    const input = screen.getByLabelText("Enable notifications");
    await userEvent.click(input);
    expect(onCheckedChange).toHaveBeenCalledWith({ checked: true });
    rerender(
      <Switch label="Enable notifications" checked={true} onCheckedChange={onCheckedChange} />,
    );
    await waitFor(() => expect(input).toBeChecked());
  });

  it("disables the input and blocks interaction", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Enable notifications" disabled onCheckedChange={onCheckedChange} />);
    const input = screen.getByLabelText("Enable notifications");
    expect(input).toBeDisabled();
    await userEvent.click(input);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("sets aria-required and native required from the required prop", () => {
    render(<Switch label="Enable notifications" required />);
    expect(screen.getByLabelText(/Enable notifications/)).toBeRequired();
  });

  it("renders a decorative required asterisk", () => {
    render(<Switch label="Enable notifications" required />);
    const asterisk = screen.getByText("*");
    expect(asterisk).toHaveAttribute("aria-hidden", "true");
  });

  it("shows hint text and links it into aria-describedby when there is no error", () => {
    render(<Switch label="Enable notifications" hint="You can turn this off later" />);
    const input = screen.getByLabelText("Enable notifications");
    const hint = screen.getByText("You can turn this off later");
    expect(input.getAttribute("aria-describedby")).toContain(hint.id);
  });

  it("shows the error instead of the hint, and sets aria-invalid", () => {
    render(
      <Switch
        label="Enable notifications"
        hint="You can turn this off later"
        error="Something went wrong"
      />,
    );
    expect(screen.queryByText("You can turn this off later")).toBeNull();
    const errorEl = screen.getByText("Something went wrong");
    const input = screen.getByLabelText("Enable notifications");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(errorEl.id);
  });

  it("sets aria-invalid to false when there is no error", () => {
    render(<Switch label="Enable notifications" />);
    expect(screen.getByLabelText("Enable notifications")).toHaveAttribute("aria-invalid", "false");
  });

  it.each([
    ["xs", "h-(--font-size-xs)"],
    ["md", "h-(--font-size-base)"],
    ["xl", "h-(--font-size-xl)"],
  ] as const)("applies the %s track size class", (size, sizeClass) => {
    render(<Switch label="Enable notifications" size={size} />);
    const input = screen.getByLabelText("Enable notifications");
    const track = input.parentElement?.querySelector('[data-part="control"]');
    expect(track).toHaveClass(sizeClass);
  });

  it("lets a consumer className override the default border via tailwind-merge", () => {
    render(<Switch label="Enable notifications" className="border-status-error" />);
    const input = screen.getByLabelText("Enable notifications");
    const track = input.parentElement?.querySelector('[data-part="control"]');
    expect(track).toHaveClass("border-status-error");
    expect(track).not.toHaveClass("border-border");
  });

  it("accepts ref as a plain prop pointing at the real hidden checkbox input", () => {
    let node: HTMLInputElement | null = null;
    render(
      <Switch
        label="Enable notifications"
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
        <Switch label="Default" />
        <Switch label="Checked" defaultChecked />
        <Switch label="Required" required />
        <Switch label="Broken" error="Something is wrong" />
        <Switch label="Disabled" disabled />
        <Switch label="Small" size="xs" />
        <Switch label="Large" size="xl" />
      </div>,
    );
    expect((await axe(container)).violations.length).toBe(0);
  });
});
