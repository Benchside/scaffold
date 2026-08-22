import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Input } from "./Input";

describe("Input", () => {
  it("associates the label with the input via htmlFor/id", () => {
    render(<Input label="Email" />);
    const input = screen.getByLabelText("Email");
    expect(input.tagName).toBe("INPUT");
  });

  it("stacks label, box, and hint vertically instead of side by side", () => {
    const { container } = render(<Input label="Email" />);
    expect(container.firstChild).toHaveClass("flex", "flex-col");
  });

  it("keeps the label and description tighter together than the rest of the stack", () => {
    render(<Input label="Email" description="We'll never share this." />);
    const label = screen.getByText("Email");
    const header = label.parentElement as HTMLElement;
    expect(header).toHaveClass("gap-stack-2xs");
    expect(header.parentElement).toHaveClass("gap-stack-xs");
  });

  it("links the description into aria-describedby", () => {
    render(<Input label="Email" description="We'll never share this." />);
    const input = screen.getByLabelText("Email");
    const description = screen.getByText("We'll never share this.");
    expect(input.getAttribute("aria-describedby")).toContain(description.id);
  });

  it("shows hint text and links it into aria-describedby when there is no error", () => {
    render(<Input label="Email" hint="Use your work address" />);
    const input = screen.getByLabelText("Email");
    const hint = screen.getByText("Use your work address");
    expect(input.getAttribute("aria-describedby")).toContain(hint.id);
  });

  it("shows the error instead of the hint, and sets aria-invalid", () => {
    render(<Input label="Email" hint="Use your work address" error="Email is required" />);
    expect(screen.queryByText("Use your work address")).toBeNull();
    const errorEl = screen.getByText("Email is required");
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(errorEl.id);
  });

  it("does not set aria-invalid when there is no error", () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
  });

  it("renders a decorative required asterisk and passes required to the input natively", () => {
    render(<Input label="Email" required />);
    const input = screen.getByLabelText(/Email/);
    expect(input).toBeRequired();
    const asterisk = screen.getByText("*");
    expect(asterisk).toHaveAttribute("aria-hidden", "true");
  });

  it.each([
    ["xs", "px-inset-sm", "text-caption"],
    ["md", "px-inset-md", "text-label"],
    ["xl", "px-inset-lg", "text-label-lg"],
  ] as const)("applies %s size classes to the input box", (size, paddingClass, textClass) => {
    render(<Input label="Email" size={size} />);
    const box = screen.getByLabelText("Email").parentElement;
    expect(box).toHaveClass(paddingClass, textClass);
  });

  it.each([
    ["xs", "text-caption"],
    ["md", "text-label"],
    ["xl", "text-label-lg"],
  ] as const)("uses the %s label typography bucket", (size, labelClass) => {
    render(<Input label="Email" size={size} />);
    expect(screen.getByText("Email")).toHaveClass(labelClass);
  });

  it("renders prefix and suffix content", () => {
    render(<Input label="Amount" prefix={<span>$</span>} suffix={<span>USD</span>} />);
    expect(screen.getByText("$")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
  });

  it("adds a password visibility toggle for type=password", async () => {
    render(<Input label="Password" type="password" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    await userEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("lets an explicit suffix override the password toggle", () => {
    render(<Input label="Password" type="password" suffix={<span>custom</span>} />);
    expect(screen.getByText("custom")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show password" })).toBeNull();
  });

  it("focuses the input when the box padding (not prefix/suffix) is clicked", async () => {
    render(<Input label="Amount" prefix={<span>$</span>} />);
    const input = screen.getByLabelText("Amount");
    const box = input.parentElement as HTMLElement;
    await userEvent.click(box);
    expect(input).toHaveFocus();
  });

  it("lets a consumer className override the default border via tailwind-merge", () => {
    render(<Input label="Email" className="border-status-error" />);
    const box = screen.getByLabelText("Email").parentElement;
    expect(box).toHaveClass("border-status-error");
    expect(box).not.toHaveClass("border-border");
  });

  it("accepts ref as a plain prop pointing at the real input element", () => {
    let node: HTMLInputElement | null = null;
    render(
      <Input
        label="Email"
        ref={(el) => {
          node = el;
        }}
      />,
    );
    expect(node).toBeInstanceOf(HTMLInputElement);
  });

  it("shows the muted color, not the error color, on disabled inputs", () => {
    render(<Input label="Email" disabled />);
    const box = screen.getByLabelText("Email").parentElement;
    expect(box).toHaveClass("has-disabled:opacity-50");
  });

  it("uses a subtle background for read-only inputs, distinct from disabled's muted opacity", () => {
    render(<Input label="Email" />);
    const box = screen.getByLabelText("Email").parentElement;
    expect(box).toHaveClass("has-read-only:bg-bg-subtle", "has-disabled:opacity-50");
  });

  describe("showCount", () => {
    it("shows a live character count", async () => {
      render(<Input label="Bio" showCount defaultValue="hi" />);
      expect(screen.getByText("2")).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText("Bio"), "!");
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("shows length/max when maxLength is also set", () => {
      render(<Input label="Bio" showCount maxLength={10} defaultValue="hi" />);
      expect(screen.getByText("2/10")).toBeInTheDocument();
    });

    it("tracks a controlled value directly instead of relying on onChange", () => {
      const { rerender } = render(<Input label="Bio" showCount value="hi" onChange={() => {}} />);
      expect(screen.getByText("2")).toBeInTheDocument();
      rerender(<Input label="Bio" showCount value="hello" onChange={() => {}} />);
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  describe("copyable", () => {
    it("copies the current value to the clipboard", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });
      render(<Input label="API Key" copyable defaultValue="secret-123" />);
      await userEvent.click(screen.getByRole("button", { name: "Copy" }));
      expect(writeText).toHaveBeenCalledWith("secret-123");
    });

    it("lets an explicit suffix override the copy button", () => {
      render(<Input label="API Key" copyable suffix={<span>custom</span>} />);
      expect(screen.getByText("custom")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Copy" })).toBeNull();
    });
  });

  it("passes an axe scan across sizes, states, and slots", async () => {
    const { container } = render(
      <div>
        <Input label="Email" description="Helper text" hint="Use work email" />
        <Input label="Password" type="password" required />
        <Input label="Amount" prefix={<span>$</span>} suffix={<span>USD</span>} />
        <Input label="Broken" error="Something is wrong" />
        <Input label="Disabled" disabled />
        <Input label="Small" size="xs" />
        <Input label="Large" size="xl" />
      </div>,
    );
    expect((await axe(container)).violations.length).toBe(0);
  });
});
