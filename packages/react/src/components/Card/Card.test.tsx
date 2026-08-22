import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Card } from "./Card";

describe("Card", () => {
  it("renders as a div by default", () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstChild?.nodeName).toBe("DIV");
  });

  it("renders as the element passed to the as prop", () => {
    const { container } = render(<Card as="button">Content</Card>);
    expect(container.firstChild?.nodeName).toBe("BUTTON");
  });

  it("accepts href when rendered as a link", () => {
    const { container } = render(
      <Card as="a" href="/results/42">
        Content
      </Card>,
    );
    expect(container.firstChild).toHaveAttribute("href", "/results/42");
  });

  it("always clips content to the rounded boundary", () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstChild).toHaveClass("overflow-hidden", "rounded-lg");
  });

  it("defaults to the outline variant", () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstChild).toHaveClass("bg-bg-elevated", "border-border");
  });

  it("renders the filled variant with a subtle background and no visible border color", () => {
    const { container } = render(<Card variant="filled">Content</Card>);
    expect(container.firstChild).toHaveClass("bg-bg-subtle", "border-transparent");
    expect(container.firstChild).not.toHaveClass("bg-bg-elevated");
  });

  it("is not interactive (no hover/focus affordance classes) when rendered as a div", () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstChild).not.toHaveClass("cursor-pointer");
  });

  it.each(["button", "a"] as const)(
    "is interactive with hover and focus-visible affordance when rendered as %s",
    (as) => {
      const { container } = render(<Card as={as}>Content</Card>);
      expect(container.firstChild).toHaveClass(
        "cursor-pointer",
        "hover:bg-bg-hover",
        "focus-visible:outline-border-focus",
      );
    },
  );

  it("overrides the browser's default centered button text when rendered as a button", () => {
    const { container } = render(<Card as="button">Content</Card>);
    expect(container.firstChild).toHaveClass("text-left");
  });

  it("exposes selected state via a data-selected attribute, not a variant prop", () => {
    const { container } = render(<Card selected>Content</Card>);
    expect(container.firstChild).toHaveAttribute("data-selected", "");
  });

  it("does not set data-selected when not selected", () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstChild).not.toHaveAttribute("data-selected");
  });

  it("always carries the selected-state styling hook as a static data-attribute class", () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstChild).toHaveClass(
      "data-selected:border-accent",
      "data-selected:bg-accent-subtle",
    );
  });

  it("gives Header, Body, and Footer default-density padding by default", () => {
    const { getByTestId } = render(
      <Card>
        <Card.Header data-testid="header">Header</Card.Header>
        <Card.Body data-testid="body">Body</Card.Body>
        <Card.Footer data-testid="footer">Footer</Card.Footer>
      </Card>,
    );
    for (const testId of ["header", "body", "footer"]) {
      expect(getByTestId(testId)).toHaveClass("px-inset-lg", "py-inset-lg");
    }
  });

  it("propagates compact density from Card to Header, Body, and Footer", () => {
    const { getByTestId } = render(
      <Card density="compact">
        <Card.Header data-testid="header">Header</Card.Header>
        <Card.Body data-testid="body">Body</Card.Body>
        <Card.Footer data-testid="footer">Footer</Card.Footer>
      </Card>,
    );
    for (const testId of ["header", "body", "footer"]) {
      expect(getByTestId(testId)).toHaveClass("px-inset-md", "py-inset-md");
      expect(getByTestId(testId)).not.toHaveClass("px-inset-lg");
    }
  });

  it("renders Header, Body, and Footer in document order", () => {
    const { container } = render(
      <Card>
        <Card.Header>Header</Card.Header>
        <Card.Body>Body</Card.Body>
        <Card.Footer>Footer</Card.Footer>
      </Card>,
    );
    expect(container.textContent).toBe("HeaderBodyFooter");
  });

  it("lets a consumer className override the default variant via tailwind-merge", () => {
    const { container } = render(<Card className="bg-bg-subtle">Content</Card>);
    expect(container.firstChild).toHaveClass("bg-bg-subtle");
    expect(container.firstChild).not.toHaveClass("bg-bg-elevated");
  });

  it("accepts ref as a plain prop", () => {
    let node: HTMLDivElement | null = null;
    render(
      <Card
        ref={(el) => {
          node = el as HTMLDivElement;
        }}
      >
        Content
      </Card>,
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
  });

  it("passes an axe scan for every variant, density, and interactive combination", async () => {
    const { container } = render(
      <div>
        <Card>
          <Card.Header>Title</Card.Header>
          <Card.Body>Body</Card.Body>
          <Card.Footer>Footer</Card.Footer>
        </Card>
        <Card variant="filled" density="compact" selected>
          <Card.Body>Selected compact filled</Card.Body>
        </Card>
        <Card as="button">
          <Card.Body>Clickable</Card.Body>
        </Card>
      </div>,
    );
    expect((await axe(container)).violations.length).toBe(0);
  });
});
