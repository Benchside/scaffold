import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("associates the label with the textarea via htmlFor/id", () => {
    render(<Textarea label="Notes" />);
    const el = screen.getByLabelText("Notes");
    expect(el.tagName).toBe("TEXTAREA");
  });

  it("links description and hint into aria-describedby, same as Input", () => {
    render(<Textarea label="Notes" description="Optional" hint="Markdown supported" />);
    const el = screen.getByLabelText("Notes");
    const description = screen.getByText("Optional");
    const hint = screen.getByText("Markdown supported");
    expect(el.getAttribute("aria-describedby")).toBe(`${description.id} ${hint.id}`);
  });

  it("shows the error instead of the hint and sets aria-invalid", () => {
    render(<Textarea label="Notes" hint="Markdown supported" error="Required" />);
    expect(screen.queryByText("Markdown supported")).toBeNull();
    expect(screen.getByLabelText("Notes")).toHaveAttribute("aria-invalid", "true");
  });

  it("defaults to the prose variant with the size-based text role", () => {
    render(<Textarea label="Notes" size="md" />);
    const box = screen.getByLabelText("Notes").parentElement;
    expect(box).toHaveClass("text-label", "font-label");
    expect(box).not.toHaveClass("text-code");
  });

  it("uses the monospace code text role when variant is code, regardless of size", () => {
    render(<Textarea label="Notes" variant="code" size="md" />);
    const box = screen.getByLabelText("Notes").parentElement;
    expect(box).toHaveClass("text-code", "font-code", "tracking-code");
  });

  it("inserts a tab character instead of moving focus when variant is code", async () => {
    render(<Textarea label="Snippet" variant="code" defaultValue="ab" />);
    const el = screen.getByLabelText("Snippet") as HTMLTextAreaElement;
    el.focus();
    el.setSelectionRange(1, 1);
    await userEvent.keyboard("[Tab]");
    expect(el.value).toBe("a\tb");
  });

  it("lets Tab move focus normally in the prose variant", async () => {
    render(
      <div>
        <Textarea label="Notes" defaultValue="ab" />
        <button>Next</button>
      </div>,
    );
    const el = screen.getByLabelText("Notes");
    el.focus();
    await userEvent.keyboard("[Tab]");
    expect(el).not.toHaveFocus();
    expect((el as HTMLTextAreaElement).value).toBe("ab");
  });

  it("disables the native resize handle when autoResize is set", () => {
    render(<Textarea label="Notes" autoResize />);
    expect(screen.getByLabelText("Notes")).toHaveClass("resize-none");
  });

  it("allows native vertical resize when autoResize is not set", () => {
    render(<Textarea label="Notes" />);
    expect(screen.getByLabelText("Notes")).toHaveClass("resize-y");
  });

  it("grows the height to fit content when autoResize is set", async () => {
    render(<Textarea label="Notes" autoResize />);
    const el = screen.getByLabelText("Notes") as HTMLTextAreaElement;
    Object.defineProperty(el, "scrollHeight", { value: 120, configurable: true });
    await userEvent.type(el, "a lot of text");
    expect(el.style.height).toBe("120px");
  });

  it("shows a live character count via showCount", async () => {
    render(<Textarea label="Notes" showCount defaultValue="hi" />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows length/max when showCount and maxLength are both set", () => {
    render(<Textarea label="Notes" showCount maxLength={100} defaultValue="hi" />);
    expect(screen.getByText("2/100")).toBeInTheDocument();
  });

  it("copies the current value to the clipboard when copyable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<Textarea label="Output" copyable defaultValue="result text" />);
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("result text");
  });

  it("uses a subtle background for read-only textareas, distinct from disabled", () => {
    render(<Textarea label="Notes" />);
    const box = screen.getByLabelText("Notes").parentElement;
    expect(box).toHaveClass("has-read-only:bg-bg-subtle", "has-disabled:opacity-50");
  });

  it("lets a consumer className override the default border via tailwind-merge", () => {
    render(<Textarea label="Notes" className="border-status-error" />);
    const box = screen.getByLabelText("Notes").parentElement;
    expect(box).toHaveClass("border-status-error");
    expect(box).not.toHaveClass("border-border");
  });

  it("accepts ref as a plain prop pointing at the real textarea element", () => {
    let node: HTMLTextAreaElement | null = null;
    render(
      <Textarea
        label="Notes"
        ref={(el) => {
          node = el;
        }}
      />,
    );
    expect(node).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("passes an axe scan across variants, states, and sizes", async () => {
    const { container } = render(
      <div>
        <Textarea label="Notes" description="Helper" hint="Use markdown" />
        <Textarea label="Snippet" variant="code" defaultValue="const x = 1;" />
        <Textarea label="Broken" error="Something is wrong" />
        <Textarea label="Disabled" disabled />
        <Textarea label="Output" copyable defaultValue="result" />
        <Textarea label="Bio" showCount maxLength={100} />
        <Textarea label="Small" size="xs" />
        <Textarea label="Large" size="xl" />
      </div>,
    );
    expect((await axe(container)).violations.length).toBe(0);
  });
});
