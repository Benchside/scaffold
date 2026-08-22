import type { ComponentPropsWithoutRef, Ref } from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { cva, type VariantProps } from "class-variance-authority";
import { axe } from "vitest-axe";
import { cn } from "../lib/cn";

/**
 * Fixture-only component. Exists to prove the component architecture
 * pattern actually works end-to-end, not as a real deliverable. See
 * CONTRIBUTING.md for the pattern this demonstrates.
 */
const swatchVariants = cva("rounded-md p-inset-sm", {
  variants: {
    tone: {
      accent: "bg-accent text-accent-text",
      neutral: "bg-bg-subtle text-text",
    },
  },
  defaultVariants: { tone: "neutral" },
});

interface SwatchProps extends ComponentPropsWithoutRef<"div">, VariantProps<typeof swatchVariants> {
  ref?: Ref<HTMLDivElement>;
  loading?: boolean;
}

function Swatch({ tone, loading, className, ref, ...props }: SwatchProps) {
  return (
    <div
      ref={ref}
      data-loading={loading ? "" : undefined}
      className={cn(swatchVariants({ tone }), className)}
      {...props}
    />
  );
}

describe("component architecture pattern", () => {
  it("accepts ref as a plain prop — no forwardRef needed on React 19", () => {
    let node: HTMLDivElement | null = null;
    render(
      <Swatch
        ref={(el) => {
          node = el;
        }}
      />,
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
  });

  it("resolves cva variants to semantic token classes, not raw values", () => {
    const { container } = render(<Swatch tone="accent" />);
    expect(container.firstChild).toHaveClass("bg-accent", "text-accent-text");
  });

  it("lets a consumer className override the default variant via tailwind-merge", () => {
    const { container } = render(<Swatch tone="accent" className="bg-accent-subtle" />);
    expect(container.firstChild).toHaveClass("bg-accent-subtle");
    expect(container.firstChild).not.toHaveClass("bg-accent");
  });

  it("exposes component state via a data-* attribute rather than a variant class", () => {
    const { container } = render(<Swatch loading />);
    expect(container.firstChild).toHaveAttribute("data-loading");
  });

  it("passes an axe scan", async () => {
    const { container } = render(<Swatch tone="accent">Label</Swatch>);
    expect((await axe(container)).violations.length).toBe(0);
  });
});
