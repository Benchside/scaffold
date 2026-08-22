import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("exposes a status role with a default 'Loading' accessible label", () => {
    render(<Spinner />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Loading");
  });

  it("uses a custom label when provided", () => {
    render(<Spinner label="Fetching results" />);
    expect(screen.getByRole("status")).toHaveTextContent("Fetching results");
  });

  it("visually hides the label text", () => {
    render(<Spinner label="Loading" />);
    expect(screen.getByText("Loading")).toHaveClass("sr-only");
  });

  it("spins the icon and respects prefers-reduced-motion", () => {
    const { container } = render(<Spinner />);
    const icon = container.querySelector("svg");
    expect(icon).toHaveClass("animate-spin");
    expect(icon).toHaveClass("motion-reduce:animate-none");
  });

  it("marks the icon decorative (aria-hidden)", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("sizes the icon via the size prop", () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.querySelector("svg")).toHaveClass("size-(--font-size-lg)");
  });

  it("drops role=status and the label entirely when decorative, for use inside an already-labeled busy container", () => {
    render(<Spinner decorative />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("Loading")).not.toBeInTheDocument();
  });

  it("lets a consumer className override the default size via tailwind-merge", () => {
    const { container } = render(<Spinner className="size-10" />);
    expect(container.querySelector("svg")).toHaveClass("size-10");
    expect(container.querySelector("svg")).not.toHaveClass("size-(--font-size-base)");
  });

  it("accepts ref as a plain prop pointing at the root element", () => {
    let node: HTMLSpanElement | null = null;
    render(
      <Spinner
        ref={(el) => {
          node = el;
        }}
      />,
    );
    expect(node).toBeInstanceOf(HTMLSpanElement);
  });

  it("passes an axe scan across sizes and the decorative (aria-hidden) case", async () => {
    const { container } = render(
      <div>
        <Spinner label="Loading page" size="xs" />
        <Spinner label="Loading results" size="xl" />
        <Spinner decorative />
      </div>,
    );
    expect((await axe(container)).violations.length).toBe(0);
  });
});
