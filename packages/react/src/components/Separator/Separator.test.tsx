import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Separator } from "./Separator";

describe("Separator", () => {
  it("defaults to horizontal orientation", () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toHaveClass("w-full", "border-t");
  });

  it("renders the vertical orientation", () => {
    const { container } = render(<Separator orientation="vertical" />);
    expect(container.firstChild).toHaveClass("self-stretch", "border-l");
    expect(container.firstChild).not.toHaveClass("w-full", "border-t");
  });

  it("sets role=separator and aria-orientation matching the orientation prop", () => {
    const { container: horizontal } = render(<Separator />);
    expect(horizontal.firstChild).toHaveAttribute("role", "separator");
    expect(horizontal.firstChild).toHaveAttribute("aria-orientation", "horizontal");

    const { container: vertical } = render(<Separator orientation="vertical" />);
    expect(vertical.firstChild).toHaveAttribute("aria-orientation", "vertical");
  });

  it("removes role and aria-orientation when decorative", () => {
    const { container } = render(<Separator decorative />);
    expect(container.firstChild).not.toHaveAttribute("role");
    expect(container.firstChild).not.toHaveAttribute("aria-orientation");
  });

  it("defaults to the default emphasis border color", () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toHaveClass("border-border");
    expect(container.firstChild).not.toHaveClass("border-border-strong");
  });

  it("renders the strong emphasis border color", () => {
    const { container } = render(<Separator emphasis="strong" />);
    expect(container.firstChild).toHaveClass("border-border-strong");
  });

  it("never shrinks inside a flex container", () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toHaveClass("shrink-0");
  });

  it("lets a consumer className override the default emphasis via tailwind-merge", () => {
    const { container } = render(<Separator className="border-border-strong" />);
    expect(container.firstChild).toHaveClass("border-border-strong");
    expect(container.firstChild).not.toHaveClass("border-border");
  });

  it("accepts ref as a plain prop", () => {
    let node: HTMLDivElement | null = null;
    render(
      <Separator
        ref={(el) => {
          node = el;
        }}
      />,
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
  });

  it("passes an axe scan for every orientation, emphasis, and decorative combination", async () => {
    const { container } = render(
      <div>
        <Separator />
        <Separator orientation="vertical" />
        <Separator emphasis="strong" />
        <Separator decorative />
      </div>,
    );
    expect((await axe(container)).violations.length).toBe(0);
  });
});
