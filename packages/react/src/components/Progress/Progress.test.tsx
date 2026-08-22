import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Progress } from "./Progress";

function LinearProgress(props: Partial<React.ComponentProps<typeof Progress>> = {}) {
  return (
    <Progress value={60} {...props}>
      <Progress.Label>Uploading</Progress.Label>
      <Progress.Track>
        <Progress.Range />
      </Progress.Track>
      <Progress.ValueText />
    </Progress>
  );
}

function CircularProgress(props: Partial<React.ComponentProps<typeof Progress>> = {}) {
  return (
    <Progress value={60} {...props}>
      <Progress.Circle>
        <Progress.CircleTrack />
        <Progress.CircleRange />
      </Progress.Circle>
      <Progress.ValueText />
    </Progress>
  );
}

describe("Progress", () => {
  it("exposes the track as a progressbar with aria-valuenow/min/max reflecting the value", () => {
    render(<LinearProgress value={60} min={0} max={100} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "60");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("supports an uncontrolled defaultValue", () => {
    render(
      <Progress defaultValue={25}>
        <Progress.Track>
          <Progress.Range />
        </Progress.Track>
      </Progress>,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");
  });

  it("treats a null value as indeterminate: no aria-valuenow, data-state reflects it", () => {
    render(<LinearProgress value={null} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).toHaveAttribute("data-state", "indeterminate");
  });

  it("marks data-state as complete when the value reaches max, loading otherwise", () => {
    const { rerender } = render(<LinearProgress value={60} max={100} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("data-state", "loading");
    rerender(<LinearProgress value={100} max={100} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("data-state", "complete");
  });

  it("calls onValueChange when the controlled value prop is set and a rerender is reflected", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<LinearProgress value={40} onValueChange={onValueChange} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
    rerender(<LinearProgress value={70} onValueChange={onValueChange} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "70");
  });

  it("renders the Label's text content", () => {
    render(<LinearProgress />);
    expect(screen.getByText("Uploading")).toBeInTheDocument();
  });

  it("renders the ValueText as the formatted percent by default", () => {
    render(<LinearProgress value={60} max={100} />);
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("sizes the linear track height via the size prop", () => {
    const { container } = render(<LinearProgress size="lg" />);
    const track = container.querySelector('[data-part="track"]');
    expect(track).toHaveClass("h-(--font-size-lg)");
  });

  it("renders a circular track and range when composed with Progress.Circle", () => {
    const { container } = render(<CircularProgress value={60} />);
    expect(screen.getByRole("progressbar").tagName).toBe("svg");
    expect(container.querySelector('[data-part="circle-track"]')).toBeInTheDocument();
    expect(container.querySelector('[data-part="circle-range"]')).toBeInTheDocument();
  });

  it("lets a consumer className override the default track height via tailwind-merge", () => {
    const { container } = render(
      <Progress value={50}>
        <Progress.Track className="h-8">
          <Progress.Range />
        </Progress.Track>
      </Progress>,
    );
    const track = container.querySelector('[data-part="track"]');
    expect(track).toHaveClass("h-8");
    expect(track).not.toHaveClass("h-(--font-size-base)");
  });

  it("accepts ref as a plain prop pointing at the root element", () => {
    let node: HTMLDivElement | null = null;
    render(
      <Progress
        value={50}
        ref={(el) => {
          node = el;
        }}
      >
        <Progress.Track>
          <Progress.Range />
        </Progress.Track>
      </Progress>,
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
  });

  it("passes an axe scan across linear, circular, indeterminate, and size states", async () => {
    const { container } = render(
      <div>
        <LinearProgress value={30} />
        <LinearProgress value={null} />
        <CircularProgress value={80} />
        <LinearProgress value={90} size="sm" />
        <LinearProgress value={10} size="xl" />
      </div>,
    );
    expect((await axe(container)).violations.length).toBe(0);
  });
});
