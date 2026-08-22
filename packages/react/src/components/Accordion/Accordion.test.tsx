import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { Accordion } from "./Accordion";

function ThreeItems({
  labelPrefix = "",
  ...props
}: Partial<React.ComponentProps<typeof Accordion>> & { labelPrefix?: string } = {}) {
  return (
    <Accordion defaultValue={["first"]} {...props}>
      <Accordion.Item value="first">
        <Accordion.ItemTrigger>{labelPrefix}First</Accordion.ItemTrigger>
        <Accordion.ItemContent>{labelPrefix}First content</Accordion.ItemContent>
      </Accordion.Item>
      <Accordion.Item value="second">
        <Accordion.ItemTrigger>{labelPrefix}Second</Accordion.ItemTrigger>
        <Accordion.ItemContent>{labelPrefix}Second content</Accordion.ItemContent>
      </Accordion.Item>
      <Accordion.Item value="third" disabled>
        <Accordion.ItemTrigger>{labelPrefix}Third</Accordion.ItemTrigger>
        <Accordion.ItemContent>{labelPrefix}Third content</Accordion.ItemContent>
      </Accordion.Item>
    </Accordion>
  );
}

describe("Accordion", () => {
  it("renders each trigger as a button associated with its content region", () => {
    render(<ThreeItems />);
    const firstTrigger = screen.getByRole("button", { name: "First" });
    const firstContent = screen.getByText("First content").closest('[role="region"]');
    expect(firstContent).not.toBeNull();
    expect(firstTrigger).toHaveAttribute("aria-controls", firstContent?.id);
  });

  it("expands the item(s) given by defaultValue and marks aria-expanded accordingly", () => {
    render(<ThreeItems />);
    expect(screen.getByRole("button", { name: "First" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Second" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByText("First content")).toBeVisible();
    expect(screen.getByText("Second content")).not.toBeVisible();
  });

  it("defaults to single-expand: opening a second item collapses the first", async () => {
    render(<ThreeItems />);
    await userEvent.click(screen.getByRole("button", { name: "Second" }));
    expect(screen.getByRole("button", { name: "Second" })).toHaveAttribute("aria-expanded", "true");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "First" })).toHaveAttribute(
        "aria-expanded",
        "false",
      ),
    );
  });

  it("defaults to non-collapsible: clicking the only open item's trigger leaves it open", async () => {
    render(<ThreeItems />);
    await userEvent.click(screen.getByRole("button", { name: "First" }));
    expect(screen.getByRole("button", { name: "First" })).toHaveAttribute("aria-expanded", "true");
  });

  it("allows closing the open item when collapsible is set", async () => {
    render(<ThreeItems collapsible />);
    await userEvent.click(screen.getByRole("button", { name: "First" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "First" })).toHaveAttribute(
        "aria-expanded",
        "false",
      ),
    );
  });

  it("allows more than one item open at once when multiple is set", async () => {
    render(<ThreeItems multiple />);
    await userEvent.click(screen.getByRole("button", { name: "Second" }));
    expect(screen.getByRole("button", { name: "First" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Second" })).toHaveAttribute("aria-expanded", "true");
  });

  it("calls onValueChange with the new expanded set when a trigger is clicked", async () => {
    const onValueChange = vi.fn();
    render(<ThreeItems onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Second" }));
    expect(onValueChange).toHaveBeenCalledWith({ value: ["second"] });
  });

  it("supports a controlled value: onValueChange fires, and a rerender with the new value is reflected", async () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<ThreeItems value={["first"]} onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Second" }));
    expect(onValueChange).toHaveBeenCalledWith({ value: ["second"] });
    expect(screen.getByRole("button", { name: "First" })).toHaveAttribute("aria-expanded", "true");
    rerender(<ThreeItems value={["second"]} onValueChange={onValueChange} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Second" })).toHaveAttribute(
        "aria-expanded",
        "true",
      ),
    );
  });

  it("does not toggle a disabled item's trigger on click", async () => {
    const onValueChange = vi.fn();
    render(<ThreeItems onValueChange={onValueChange} multiple />);
    const thirdTrigger = screen.getByRole("button", { name: "Third" });
    expect(thirdTrigger).toBeDisabled();
    await userEvent.click(thirdTrigger);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("disables every item's trigger when the root disabled prop is set", () => {
    render(<ThreeItems disabled />);
    expect(screen.getByRole("button", { name: "First" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Second" })).toBeDisabled();
  });

  it("lazily mounts an item's content only after it's first expanded", async () => {
    render(<ThreeItems lazyMount />);
    expect(screen.queryByText("Second content")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Second" }));
    expect(screen.getByText("Second content")).toBeVisible();
  });

  it("unmounts an item's content once it's no longer expanded", async () => {
    render(<ThreeItems unmountOnExit />);
    expect(screen.getByText("First content")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Second" }));
    await waitFor(() => expect(screen.queryByText("First content")).not.toBeInTheDocument());
  });

  it("moves focus between triggers with ArrowDown/ArrowUp under the default vertical orientation", async () => {
    render(<ThreeItems />);
    screen.getByRole("button", { name: "First" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "Second" })).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("jumps to the first/last trigger with Home/End", async () => {
    render(
      <Accordion defaultValue={[]}>
        <Accordion.Item value="first">
          <Accordion.ItemTrigger>First</Accordion.ItemTrigger>
          <Accordion.ItemContent>First content</Accordion.ItemContent>
        </Accordion.Item>
        <Accordion.Item value="second">
          <Accordion.ItemTrigger>Second</Accordion.ItemTrigger>
          <Accordion.ItemContent>Second content</Accordion.ItemContent>
        </Accordion.Item>
        <Accordion.Item value="third">
          <Accordion.ItemTrigger>Third</Accordion.ItemTrigger>
          <Accordion.ItemContent>Third content</Accordion.ItemContent>
        </Accordion.Item>
      </Accordion>,
    );
    screen.getByRole("button", { name: "Second" }).focus();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("button", { name: "Third" })).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("does not move focus onto a disabled trigger via Home/End (native disabled buttons aren't focusable)", async () => {
    render(<ThreeItems />);
    screen.getByRole("button", { name: "Second" }).focus();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("button", { name: "Second" })).toHaveFocus();
  });

  it("moves focus with ArrowRight/ArrowLeft instead when orientation is horizontal", async () => {
    const { container } = render(<ThreeItems orientation="horizontal" />);
    expect(container.querySelector('[data-part="root"]')).toHaveAttribute(
      "data-orientation",
      "horizontal",
    );
    screen.getByRole("button", { name: "First" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Second" })).toHaveFocus();
  });

  it("reflects the open state as data-state on the item indicator", () => {
    render(<ThreeItems />);
    const firstTrigger = screen.getByRole("button", { name: "First" });
    const indicator = firstTrigger.querySelector("[data-state]");
    expect(indicator).toHaveAttribute("data-state", "open");
    const secondTrigger = screen.getByRole("button", { name: "Second" });
    expect(secondTrigger.querySelector("[data-state]")).toHaveAttribute("data-state", "closed");
  });

  it("lets a consumer className override the default item border via tailwind-merge", () => {
    render(
      <Accordion defaultValue={[]}>
        <Accordion.Item value="only" className="border-status-error">
          <Accordion.ItemTrigger>Only</Accordion.ItemTrigger>
          <Accordion.ItemContent>Only content</Accordion.ItemContent>
        </Accordion.Item>
      </Accordion>,
    );
    const item = screen.getByRole("button", { name: "Only" }).closest('[data-part="item"]');
    expect(item).toHaveClass("border-status-error");
  });

  it("accepts ref as a plain prop pointing at the root element", () => {
    let node: HTMLDivElement | null = null;
    render(
      <Accordion
        defaultValue={[]}
        ref={(el) => {
          node = el;
        }}
      >
        <Accordion.Item value="only">
          <Accordion.ItemTrigger>Only</Accordion.ItemTrigger>
          <Accordion.ItemContent>Only content</Accordion.ItemContent>
        </Accordion.Item>
      </Accordion>,
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
  });

  it("passes an axe scan across expanded/collapsed/disabled states and orientations", async () => {
    const { container } = render(
      <div>
        <ThreeItems labelPrefix="Single " />
        <ThreeItems labelPrefix="Multi " multiple defaultValue={["first", "second"]} />
        <ThreeItems labelPrefix="Horizontal " orientation="horizontal" />
      </div>,
    );
    expect((await axe(container)).violations.length).toBe(0);
  });
});
