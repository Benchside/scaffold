import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FieldFooter, FieldHeader, formatFieldCount, mergeRefs, useFieldIds } from "./field";

function IdsProbe(props: {
  id?: string;
  hasDescription: boolean;
  hasError: boolean;
  hasHint: boolean;
}) {
  const ids = useFieldIds(props);
  return <div data-testid="probe">{JSON.stringify(ids)}</div>;
}

describe("useFieldIds", () => {
  it("generates a stable id when none is provided", () => {
    render(<IdsProbe hasDescription={false} hasError={false} hasHint={false} />);
    const ids = JSON.parse(screen.getByTestId("probe").textContent ?? "{}");
    expect(ids.fieldId).toBeTruthy();
  });

  it("respects an explicit id", () => {
    render(<IdsProbe id="email" hasDescription hasError={false} hasHint={false} />);
    const ids = JSON.parse(screen.getByTestId("probe").textContent ?? "{}");
    expect(ids.fieldId).toBe("email");
    expect(ids.descriptionId).toBe("email-description");
  });

  it("prefers the error id over the hint id in describedBy, and omits the hint id entirely", () => {
    render(<IdsProbe id="email" hasDescription={false} hasError hasHint />);
    const ids = JSON.parse(screen.getByTestId("probe").textContent ?? "{}");
    expect(ids.hintId).toBeUndefined();
    expect(ids.errorId).toBe("email-error");
    expect(ids.describedBy).toBe("email-error");
  });

  it("combines description and hint ids when both are present", () => {
    render(<IdsProbe id="email" hasDescription hasError={false} hasHint />);
    const ids = JSON.parse(screen.getByTestId("probe").textContent ?? "{}");
    expect(ids.describedBy).toBe("email-description email-hint");
  });
});

describe("FieldHeader", () => {
  it("renders nothing when there is no label or description", () => {
    const { container } = render(<FieldHeader fieldId="email" size="md" />);
    expect(container.firstChild).toBeNull();
  });

  it("associates the label via htmlFor and keeps it tight with the description", () => {
    render(
      <FieldHeader
        fieldId="email"
        label="Email"
        description="We'll never share this."
        descriptionId="email-description"
        size="md"
      />,
    );
    const label = screen.getByText("Email");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveAttribute("for", "email");
    expect(label.parentElement).toHaveClass("gap-stack-2xs");
  });

  it("renders a decorative required asterisk", () => {
    render(<FieldHeader fieldId="email" label="Email" required size="md" />);
    const asterisk = screen.getByText("*");
    expect(asterisk).toHaveAttribute("aria-hidden", "true");
  });
});

describe("FieldFooter", () => {
  it("renders nothing when there is no message or count", () => {
    const { container } = render(<FieldFooter size="md" />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the error instead of the hint", () => {
    render(<FieldFooter size="md" hint="A hint" error="Broken" />);
    expect(screen.getByText("Broken")).toBeInTheDocument();
    expect(screen.queryByText("A hint")).toBeNull();
  });

  it("shows the count alongside the message", () => {
    render(<FieldFooter size="md" hint="A hint" count="12/500" />);
    expect(screen.getByText("A hint")).toBeInTheDocument();
    expect(screen.getByText("12/500")).toBeInTheDocument();
  });
});

describe("formatFieldCount", () => {
  it("shows just the length when there is no max", () => {
    expect(formatFieldCount(12)).toBe("12");
  });

  it("shows length/max when a max is given", () => {
    expect(formatFieldCount(12, 500)).toBe("12/500");
  });
});

describe("mergeRefs", () => {
  it("forwards the node to every ref", () => {
    let fromCallback: HTMLDivElement | null = null;
    const objectRef = { current: null as HTMLDivElement | null };
    render(
      <div
        ref={mergeRefs((el) => {
          fromCallback = el;
        }, objectRef)}
      />,
    );
    expect(fromCallback).toBeInstanceOf(HTMLDivElement);
    expect(objectRef.current).toBeInstanceOf(HTMLDivElement);
  });
});
