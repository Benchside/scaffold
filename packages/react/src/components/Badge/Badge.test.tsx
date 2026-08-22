import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders as a span", () => {
    const { container } = render(<Badge>Label</Badge>);
    expect(container.firstChild?.nodeName).toBe("SPAN");
  });

  it("defaults to the neutral variant, solid appearance, pill shape, and md size", () => {
    const { container } = render(<Badge>Label</Badge>);
    expect(container.firstChild).toHaveClass(
      "bg-status-neutral-bg",
      "text-status-neutral",
      "rounded-full",
      "text-label",
    );
  });

  it.each([
    ["success", "bg-status-success-bg", "text-status-success"],
    ["warning", "bg-status-warning-bg", "text-status-warning"],
    ["error", "bg-status-error-bg", "text-status-error"],
    ["info", "bg-status-info-bg", "text-status-info"],
  ] as const)(
    "renders the %s variant with its semantic token classes in solid appearance",
    (variant, bgClass, textClass) => {
      const { container } = render(<Badge variant={variant}>Label</Badge>);
      expect(container.firstChild).toHaveClass(bgClass, textClass);
    },
  );

  it.each([
    ["success", "border-status-success", "text-status-success"],
    ["warning", "border-status-warning", "text-status-warning"],
    ["error", "border-status-error", "text-status-error"],
    ["info", "border-status-info", "text-status-info"],
  ] as const)(
    "renders the %s variant with a colored border and transparent background in outline appearance",
    (variant, borderClass, textClass) => {
      const { container } = render(
        <Badge variant={variant} appearance="outline">
          Label
        </Badge>,
      );
      expect(container.firstChild).toHaveClass("border", "bg-transparent", borderClass, textClass);
      expect(container.firstChild).not.toHaveClass(`bg-status-${variant}-bg`);
    },
  );

  it("uses the caption typography role and tighter padding for the sm size", () => {
    const { container } = render(<Badge size="sm">Label</Badge>);
    expect(container.firstChild).toHaveClass("text-caption", "px-inset-xs", "py-inset-2xs");
  });

  it("uses the label typography role and default padding for the md size", () => {
    const { container } = render(<Badge size="md">Label</Badge>);
    expect(container.firstChild).toHaveClass("text-label", "px-inset-sm", "py-inset-2xs");
  });

  it("uses the label-lg typography role and roomier padding for the lg size", () => {
    const { container } = render(<Badge size="lg">Label</Badge>);
    expect(container.firstChild).toHaveClass("text-label-lg", "px-inset-md", "py-inset-xs");
  });

  it("renders a rounded-rectangle shape instead of a pill when shape is rounded", () => {
    const { container } = render(<Badge shape="rounded">Label</Badge>);
    expect(container.firstChild).toHaveClass("rounded-md");
    expect(container.firstChild).not.toHaveClass("rounded-full");
  });

  it("lets a consumer className override the default variant via tailwind-merge", () => {
    const { container } = render(
      <Badge variant="success" className="bg-status-error-bg">
        Label
      </Badge>,
    );
    expect(container.firstChild).toHaveClass("bg-status-error-bg");
    expect(container.firstChild).not.toHaveClass("bg-status-success-bg");
  });

  it("accepts ref as a plain prop", () => {
    let node: HTMLSpanElement | null = null;
    render(
      <Badge
        ref={(el) => {
          node = el;
        }}
      >
        Label
      </Badge>,
    );
    expect(node).toBeInstanceOf(HTMLSpanElement);
  });

  it("passes an axe scan for every variant, in both appearances, at every size and shape", async () => {
    const { container } = render(
      <div>
        <Badge variant="default">Default</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="error">Error</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="success" appearance="outline">
          Outline
        </Badge>
        <Badge size="sm">Small</Badge>
        <Badge size="lg">Large</Badge>
        <Badge shape="rounded">Rounded</Badge>
      </div>,
    );
    expect((await axe(container)).violations.length).toBe(0);
  });
});
